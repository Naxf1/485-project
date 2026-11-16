import { Prisma, PrismaClient } from '@prisma/client';
import type { Category, Priority, Role, TicketStatus } from '../lib/constants';
import type {
  AgentRunRecord,
  AuditEntry,
  Suggestion,
  Technician,
  Ticket,
  User,
} from '../domain/types';
import type { Repos, TicketFilter } from './types';

interface TicketRow {
  id: string;
  title: string;
  description: string;
  building: string;
  room: string;
  reporterId: string;
  status: string;
  category: string | null;
  priority: string | null;
  assignedTo: string | null;
  duplicateOf: string | null;
  createdAt: Date;
  approvedBy: string | null;
  approvedAt: Date | null;
  humanOverride: boolean;
}

interface TechnicianRow {
  id: string;
  name: string;
  skills: string;
  available: boolean;
}

interface SuggestionRow {
  ticketId: string;
  category: string;
  priority: string;
  possibleDuplicateOf: string | null;
  suggestedTechnician: string | null;
  draftReply: string;
  reason: string;
  needsHuman: boolean;
}

interface RunRow {
  ticketId: string;
  toolCalls: number;
  outcome: string;
  durationMs: number;
  error: string | null;
  createdAt: Date;
}

interface AuditRow {
  ticketId: string;
  actorId: string;
  action: string;
  field: string | null;
  oldValue: string | null;
  newValue: string | null;
  at: Date;
}

const toTicket = (row: TicketRow): Ticket => ({
  id: row.id,
  title: row.title,
  description: row.description,
  building: row.building,
  room: row.room,
  reporterId: row.reporterId,
  status: row.status as TicketStatus,
  category: row.category as Category | null,
  priority: row.priority as Priority | null,
  assignedTo: row.assignedTo,
  duplicateOf: row.duplicateOf,
  createdAt: row.createdAt.toISOString(),
  approvedBy: row.approvedBy,
  approvedAt: row.approvedAt ? row.approvedAt.toISOString() : null,
  humanOverride: row.humanOverride,
});

const toTechnician = (row: TechnicianRow): Technician => ({
  id: row.id,
  name: row.name,
  skills: row.skills
    .split(',')
    .map((skill) => skill.trim())
    .filter((skill) => skill.length > 0) as Category[],
  available: row.available,
});

const toSuggestion = (row: SuggestionRow): Suggestion => ({
  ticketId: row.ticketId,
  category: row.category as Category,
  priority: row.priority as Priority,
  possibleDuplicateOf: row.possibleDuplicateOf,
  suggestedTechnician: row.suggestedTechnician,
  draftReply: row.draftReply,
  reason: row.reason,
  needsHuman: row.needsHuman,
});

const toRun = (row: RunRow): AgentRunRecord => ({
  ticketId: row.ticketId,
  toolCalls: row.toolCalls,
  outcome: row.outcome as AgentRunRecord['outcome'],
  durationMs: row.durationMs,
  error: row.error,
  createdAt: row.createdAt.toISOString(),
});

const toAudit = (row: AuditRow): AuditEntry => ({
  ticketId: row.ticketId,
  actorId: row.actorId,
  action: row.action,
  field: row.field,
  oldValue: row.oldValue,
  newValue: row.newValue,
  at: row.at.toISOString(),
});

export function createPrismaRepos(prisma: PrismaClient): Repos {
  return {
    users: {
      async findById(id) {
        const row = await prisma.user.findUnique({ where: { id } });
        return row ? { id: row.id, name: row.name, role: row.role as Role } : null;
      },
      async list() {
        const rows = await prisma.user.findMany({ orderBy: { id: 'asc' } });
        return rows.map((row) => ({ id: row.id, name: row.name, role: row.role as Role }));
      },
    },
    technicians: {
      async findById(id) {
        const row = await prisma.technician.findUnique({ where: { id } });
        return row ? toTechnician(row) : null;
      },
      async list() {
        const rows = await prisma.technician.findMany({ orderBy: { id: 'asc' } });
        return rows.map(toTechnician);
      },
      async listByCategory(category) {
        const rows = await prisma.technician.findMany({ orderBy: { id: 'asc' } });
        return rows
          .map(toTechnician)
          .filter((technician) => technician.available && technician.skills.includes(category));
      },
    },
    tickets: {
      async nextId() {
        const rows = await prisma.ticket.findMany({ select: { id: true } });
        const numbers = rows
          .map((row) => Number.parseInt(row.id.replace(/^T-/, ''), 10))
          .filter((value) => Number.isFinite(value));
        const next = (numbers.length === 0 ? 1000 : Math.max(...numbers)) + 1;
        return `T-${next}`;
      },
      async create(ticket) {
        const row = await prisma.ticket.create({
          data: {
            id: ticket.id,
            title: ticket.title,
            description: ticket.description,
            building: ticket.building,
            room: ticket.room,
            reporterId: ticket.reporterId,
            status: ticket.status,
            category: ticket.category,
            priority: ticket.priority,
            assignedTo: ticket.assignedTo,
            duplicateOf: ticket.duplicateOf,
            createdAt: new Date(ticket.createdAt),
            approvedBy: ticket.approvedBy,
            approvedAt: ticket.approvedAt ? new Date(ticket.approvedAt) : null,
            humanOverride: ticket.humanOverride,
          },
        });
        return toTicket(row);
      },
      async findById(id) {
        const row = await prisma.ticket.findUnique({ where: { id } });
        return row ? toTicket(row) : null;
      },
      async update(id, patch) {
        const data: Record<string, unknown> = {};
        const scalars = [
          'title',
          'description',
          'building',
          'room',
          'status',
          'category',
          'priority',
          'assignedTo',
          'duplicateOf',
          'approvedBy',
          'humanOverride',
        ] as const;
        for (const key of scalars) {
          if (patch[key] !== undefined) data[key] = patch[key];
        }
        if (patch.approvedAt !== undefined) {
          data.approvedAt = patch.approvedAt ? new Date(patch.approvedAt) : null;
        }
        const row = await prisma.ticket.update({
          where: { id },
          data: data as Prisma.TicketUpdateInput,
        });
        return toTicket(row);
      },
      async list(filter: TicketFilter = {}) {
        const rows = await prisma.ticket.findMany({
          where: {
            ...(filter.reporterId ? { reporterId: filter.reporterId } : {}),
            ...(filter.status ? { status: filter.status } : {}),
          },
          orderBy: { createdAt: 'desc' },
        });
        return rows.map(toTicket);
      },
      async listByRoom(building, room) {
        const rows = await prisma.ticket.findMany({
          where: { building, room },
          orderBy: { createdAt: 'desc' },
        });
        return rows.map(toTicket);
      },
    },
    suggestions: {
      async upsert(suggestion) {
        const data = {
          category: suggestion.category,
          priority: suggestion.priority,
          possibleDuplicateOf: suggestion.possibleDuplicateOf,
          suggestedTechnician: suggestion.suggestedTechnician,
          draftReply: suggestion.draftReply,
          reason: suggestion.reason,
          needsHuman: suggestion.needsHuman,
          createdAt: new Date(),
        };
        const row = await prisma.triageSuggestion.upsert({
          where: { ticketId: suggestion.ticketId },
          create: { ticketId: suggestion.ticketId, ...data },
          update: data,
        });
        return toSuggestion(row);
      },
      async findByTicketId(ticketId) {
        const row = await prisma.triageSuggestion.findUnique({ where: { ticketId } });
        return row ? toSuggestion(row) : null;
      },
    },
    runs: {
      async record(run) {
        await prisma.agentRun.create({
          data: {
            ticketId: run.ticketId,
            toolCalls: run.toolCalls,
            outcome: run.outcome,
            durationMs: run.durationMs,
            error: run.error,
            createdAt: new Date(run.createdAt),
          },
        });
      },
      async listByTicket(ticketId) {
        const rows = await prisma.agentRun.findMany({
          where: { ticketId },
          orderBy: { createdAt: 'asc' },
        });
        return rows.map(toRun);
      },
    },
    audit: {
      async record(entry) {
        await prisma.auditLog.create({
          data: {
            ticketId: entry.ticketId,
            actorId: entry.actorId,
            action: entry.action,
            field: entry.field,
            oldValue: entry.oldValue,
            newValue: entry.newValue,
            at: new Date(entry.at),
          },
        });
      },
      async listByTicket(ticketId) {
        const rows = await prisma.auditLog.findMany({
          where: { ticketId },
          orderBy: { at: 'asc' },
        });
        return rows.map(toAudit);
      },
    },
  };
}
