import { z } from 'zod';
import { CATEGORIES, MAX_REPLY_LENGTH, PRIORITIES } from '../../lib/constants';
import type { Repos } from '../../repositories/types';
import type { Ticket } from '../../domain/types';

const HOUR_MS = 3_600_000;

export const TOOL_NAMES = [
  'search_tickets',
  'get_ticket_history',
  'list_technicians',
  'draft_reply',
] as const;

export type ToolName = (typeof TOOL_NAMES)[number];

export const WRITE_TOOL_NAMES = [
  'create_ticket',
  'assign_ticket',
  'close_ticket',
  'delete_ticket',
  'send_message',
] as const;

export interface ToolContext {
  repos: Repos;
  now: Date;
}

export interface ToolResult {
  tool: string;
  ok: boolean;
  data: unknown;
  error?: string;
}

export const searchTicketsArgs = z.object({
  building: z.string().min(1),
  room: z.string().min(1),
  category: z.enum(CATEGORIES),
  hoursBack: z.number().int().positive().max(720).default(48),
});

export const getTicketHistoryArgs = z.object({
  building: z.string().min(1),
  room: z.string().min(1),
});

export const listTechniciansArgs = z.object({
  category: z.enum(CATEGORIES),
});

export const draftReplyArgs = z.object({
  ticketId: z.string().min(1),
  category: z.enum(CATEGORIES),
  priority: z.enum(PRIORITIES),
});

const newestFirst = (a: Ticket, b: Ticket): number => b.createdAt.localeCompare(a.createdAt);

async function searchTickets(args: unknown, ctx: ToolContext): Promise<unknown> {
  const parsed = searchTicketsArgs.parse(args);
  const nowMs = ctx.now.getTime();
  const cutoffMs = nowMs - parsed.hoursBack * HOUR_MS;
  const tickets = await ctx.repos.tickets.list();

  return {
    ids: tickets
      .filter((ticket) => ticket.building === parsed.building)
      .filter((ticket) => ticket.room === parsed.room)
      .filter((ticket) => ticket.category === parsed.category)
      .filter((ticket) => {
        const created = new Date(ticket.createdAt).getTime();
        return created >= cutoffMs && created <= nowMs;
      })
      .sort(newestFirst)
      .map((ticket) => ticket.id),
  };
}

async function getTicketHistory(args: unknown, ctx: ToolContext): Promise<unknown> {
  const parsed = getTicketHistoryArgs.parse(args);
  const tickets = await ctx.repos.tickets.listByRoom(parsed.building, parsed.room);

  return {
    tickets: tickets.map((ticket) => ({
      id: ticket.id,
      category: ticket.category,
      status: ticket.status,
      createdAt: ticket.createdAt,
    })),
  };
}

async function listTechnicians(args: unknown, ctx: ToolContext): Promise<unknown> {
  const parsed = listTechniciansArgs.parse(args);
  const technicians = await ctx.repos.technicians.listByCategory(parsed.category);

  return {
    technicians: technicians.map((technician) => ({
      id: technician.id,
      name: technician.name,
    })),
  };
}

async function draftReply(args: unknown, ctx: ToolContext): Promise<unknown> {
  const parsed = draftReplyArgs.parse(args);
  const ticket = await ctx.repos.tickets.findById(parsed.ticketId);
  if (!ticket) throw new Error(`TICKET_NOT_FOUND:${parsed.ticketId}`);

  const text =
    `Thanks for reporting. A ${parsed.category} technician will check ` +
    `room ${ticket.room} in ${ticket.building} for this ${parsed.priority} priority issue.`;

  return { text: text.slice(0, MAX_REPLY_LENGTH) };
}

const TOOL_IMPLEMENTATIONS: Record<ToolName, (args: unknown, ctx: ToolContext) => Promise<unknown>> =
  {
    search_tickets: searchTickets,
    get_ticket_history: getTicketHistory,
    list_technicians: listTechnicians,
    draft_reply: draftReply,
  };

export function isToolName(name: string): name is ToolName {
  return (TOOL_NAMES as readonly string[]).includes(name);
}

export async function executeTool(
  name: string,
  args: unknown,
  ctx: ToolContext,
): Promise<ToolResult> {
  if (!isToolName(name)) {
    return { tool: name, ok: false, data: null, error: 'TOOL_NOT_ALLOWED' };
  }

  try {
    const data = await TOOL_IMPLEMENTATIONS[name](args, ctx);
    return { tool: name, ok: true, data };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      tool: name,
      ok: false,
      data: null,
      error: message.startsWith('TICKET_NOT_FOUND') ? message : 'INVALID_ARGS',
    };
  }
}
