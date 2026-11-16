import { Router } from 'express';
import { z } from 'zod';
import { CATEGORIES, MAX_REPLY_LENGTH, PRIORITIES, STATUSES } from '../../lib/constants';
import type { TicketStatus } from '../../lib/constants';
import type { Ticket } from '../../domain/types';
import { validateNewTicket } from '../../domain/validation';
import { runTriage } from '../../agent/triage-agent';
import { canTransition } from '../../services/lifecycle';
import { currentUser, requireRole } from '../middleware';
import type { AppContext } from '../context';

const editSchema = z
  .object({
    category: z.enum(CATEGORIES).optional(),
    priority: z.enum(PRIORITIES).optional(),
    assignedTo: z.string().min(1).nullable().optional(),
    draftReply: z.string().min(1).max(MAX_REPLY_LENGTH).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'Provide at least one field.' });

const statusSchema = z.object({ status: z.enum(STATUSES) });

const toFieldErrors = (issues: z.ZodIssue[]): Record<string, string> => {
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path.length > 0 ? String(issue.path[0]) : '_form';
    if (errors[key] === undefined) errors[key] = issue.message;
  }
  return errors;
};

export function ticketRoutes(ctx: AppContext): Router {
  const router = Router();

  router.post('/', requireRole('reporter'), async (req, res, next) => {
    try {
      const user = currentUser(res);
      if (!user) {
        res.status(401).json({ error: 'UNAUTHENTICATED', message: 'Sign in first.' });
        return;
      }

      const validation = validateNewTicket(req.body);
      if (!validation.ok) {
        res.status(400).json({
          error: 'VALIDATION_FAILED',
          message: 'Some fields need attention.',
          fieldErrors: validation.fieldErrors,
        });
        return;
      }

      const at = ctx.now();
      const ticket: Ticket = {
        id: await ctx.repos.tickets.nextId(),
        title: validation.value.title,
        description: validation.value.description,
        building: validation.value.building,
        room: validation.value.room,
        reporterId: user.id,
        status: 'New',
        category: null,
        priority: null,
        assignedTo: null,
        duplicateOf: null,
        createdAt: at.toISOString(),
        approvedBy: null,
        approvedAt: null,
        humanOverride: false,
      };

      await ctx.repos.tickets.create(ticket);

      const { suggestion } = await runTriage(ticket, { repos: ctx.repos, llm: ctx.llm, now: at });
      await ctx.repos.suggestions.upsert(suggestion);
      const triaged = await ctx.repos.tickets.update(ticket.id, { status: 'Triaged' });

      res.status(201).json({ ticket: triaged, suggestion });
    } catch (error) {
      next(error);
    }
  });

  router.get('/', async (req, res, next) => {
    try {
      const user = currentUser(res);
      if (!user) {
        res.status(401).json({ error: 'UNAUTHENTICATED', message: 'Sign in first.' });
        return;
      }

      const requested = req.query.status;
      if (requested !== undefined && !STATUSES.includes(requested as TicketStatus)) {
        res.status(400).json({ error: 'INVALID_STATUS', message: 'Unknown status filter.' });
        return;
      }

      const status = requested as TicketStatus | undefined;
      const tickets = await ctx.repos.tickets.list(
        user.role === 'supervisor'
          ? status
            ? { status }
            : {}
          : { reporterId: user.id, ...(status ? { status } : {}) },
      );

      const withSuggestions = await Promise.all(
        tickets.map(async (ticket) => ({
          ...ticket,
          suggestion: await ctx.repos.suggestions.findByTicketId(ticket.id),
        })),
      );

      res.json({ tickets: withSuggestions });
    } catch (error) {
      next(error);
    }
  });

  router.get('/:id', async (req, res, next) => {
    try {
      const user = currentUser(res);
      if (!user) {
        res.status(401).json({ error: 'UNAUTHENTICATED', message: 'Sign in first.' });
        return;
      }

      const ticket = await ctx.repos.tickets.findById(req.params.id ?? '');
      if (!ticket) {
        res.status(404).json({ error: 'NOT_FOUND', message: 'Unknown ticket.' });
        return;
      }

      if (user.role !== 'supervisor' && ticket.reporterId !== user.id) {
        res.status(403).json({ error: 'FORBIDDEN', message: 'This ticket is not yours.' });
        return;
      }

      const suggestion = await ctx.repos.suggestions.findByTicketId(ticket.id);
      const runs = await ctx.repos.runs.listByTicket(ticket.id);
      res.json({ ticket, suggestion, runs });
    } catch (error) {
      next(error);
    }
  });

  router.post('/:id/approve', requireRole('supervisor'), async (req, res, next) => {
    try {
      const user = currentUser(res);
      if (!user) {
        res.status(401).json({ error: 'UNAUTHENTICATED', message: 'Sign in first.' });
        return;
      }

      const ticket = await ctx.repos.tickets.findById(req.params.id ?? '');
      if (!ticket) {
        res.status(404).json({ error: 'NOT_FOUND', message: 'Unknown ticket.' });
        return;
      }

      if (!canTransition(ticket.status, 'Assigned')) {
        res.status(409).json({
          error: 'ILLEGAL_TRANSITION',
          message: `A ${ticket.status} ticket cannot be assigned.`,
        });
        return;
      }

      const suggestion = await ctx.repos.suggestions.findByTicketId(ticket.id);
      if (!suggestion) {
        res.status(400).json({ error: 'NO_SUGGESTION', message: 'This ticket has no suggestion.' });
        return;
      }

      const at = ctx.now().toISOString();
      const updated = await ctx.repos.tickets.update(ticket.id, {
        status: 'Assigned',
        category: suggestion.category,
        priority: suggestion.priority,
        assignedTo: suggestion.suggestedTechnician,
        duplicateOf: suggestion.possibleDuplicateOf,
        approvedBy: user.id,
        approvedAt: at,
        humanOverride: false,
      });

      await ctx.repos.audit.record({
        ticketId: ticket.id,
        actorId: user.id,
        action: 'approve',
        field: 'status',
        oldValue: ticket.status,
        newValue: 'Assigned',
        at,
      });

      res.json({ ticket: updated });
    } catch (error) {
      next(error);
    }
  });

  router.post('/:id/edit', requireRole('supervisor'), async (req, res, next) => {
    try {
      const user = currentUser(res);
      if (!user) {
        res.status(401).json({ error: 'UNAUTHENTICATED', message: 'Sign in first.' });
        return;
      }

      const parsed = editSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        res.status(400).json({
          error: 'VALIDATION_FAILED',
          message: 'Some fields need attention.',
          fieldErrors: toFieldErrors(parsed.error.issues),
        });
        return;
      }

      const ticket = await ctx.repos.tickets.findById(req.params.id ?? '');
      if (!ticket) {
        res.status(404).json({ error: 'NOT_FOUND', message: 'Unknown ticket.' });
        return;
      }

      if (!canTransition(ticket.status, 'Assigned')) {
        res.status(409).json({
          error: 'ILLEGAL_TRANSITION',
          message: `A ${ticket.status} ticket cannot be assigned.`,
        });
        return;
      }

      const at = ctx.now().toISOString();
      const patch: Partial<Ticket> = {
        status: 'Assigned',
        approvedBy: user.id,
        approvedAt: at,
        humanOverride: true,
      };
      const changes: { field: string; oldValue: string | null; newValue: string | null }[] = [];

      if (parsed.data.category !== undefined && parsed.data.category !== ticket.category) {
        patch.category = parsed.data.category;
        changes.push({ field: 'category', oldValue: ticket.category, newValue: parsed.data.category });
      }

      if (parsed.data.priority !== undefined && parsed.data.priority !== ticket.priority) {
        patch.priority = parsed.data.priority;
        changes.push({ field: 'priority', oldValue: ticket.priority, newValue: parsed.data.priority });
      }

      if (parsed.data.assignedTo !== undefined && parsed.data.assignedTo !== ticket.assignedTo) {
        patch.assignedTo = parsed.data.assignedTo;
        changes.push({
          field: 'assignedTo',
          oldValue: ticket.assignedTo,
          newValue: parsed.data.assignedTo,
        });
      }

      if (parsed.data.draftReply !== undefined) {
        const suggestion = await ctx.repos.suggestions.findByTicketId(ticket.id);
        if (suggestion) {
          await ctx.repos.suggestions.upsert({ ...suggestion, draftReply: parsed.data.draftReply });
          changes.push({
            field: 'draftReply',
            oldValue: suggestion.draftReply,
            newValue: parsed.data.draftReply,
          });
        }
      }

      const updated = await ctx.repos.tickets.update(ticket.id, patch);

      for (const change of changes) {
        await ctx.repos.audit.record({
          ticketId: ticket.id,
          actorId: user.id,
          action: 'override',
          field: change.field,
          oldValue: change.oldValue,
          newValue: change.newValue,
          at,
        });
      }

      res.json({ ticket: updated });
    } catch (error) {
      next(error);
    }
  });

  router.post('/:id/status', requireRole('supervisor'), async (req, res, next) => {
    try {
      const user = currentUser(res);
      if (!user) {
        res.status(401).json({ error: 'UNAUTHENTICATED', message: 'Sign in first.' });
        return;
      }

      const parsed = statusSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        res.status(400).json({
          error: 'VALIDATION_FAILED',
          message: 'Some fields need attention.',
          fieldErrors: toFieldErrors(parsed.error.issues),
        });
        return;
      }

      const ticket = await ctx.repos.tickets.findById(req.params.id ?? '');
      if (!ticket) {
        res.status(404).json({ error: 'NOT_FOUND', message: 'Unknown ticket.' });
        return;
      }

      if (!canTransition(ticket.status, parsed.data.status)) {
        res.status(409).json({
          error: 'ILLEGAL_TRANSITION',
          message: `A ${ticket.status} ticket cannot become ${parsed.data.status}.`,
        });
        return;
      }

      const at = ctx.now().toISOString();
      const updated = await ctx.repos.tickets.update(ticket.id, { status: parsed.data.status });

      await ctx.repos.audit.record({
        ticketId: ticket.id,
        actorId: user.id,
        action: 'status',
        field: 'status',
        oldValue: ticket.status,
        newValue: parsed.data.status,
        at,
      });

      res.json({ ticket: updated });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
