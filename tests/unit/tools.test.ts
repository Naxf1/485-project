import { describe, expect, it } from 'vitest';
import {
  TOOL_NAMES,
  WRITE_TOOL_NAMES,
  executeTool,
  isToolName,
} from '../../backend/src/agent/tools/index';
import { createInMemoryRepos } from '../../backend/src/repositories/in-memory';
import type { Ticket } from '../../backend/src/domain/types';

const now = new Date('2026-10-20T12:00:00.000Z');

const hoursAgo = (hours: number): string =>
  new Date(now.getTime() - hours * 3_600_000).toISOString();

const ticket = (over: Partial<Ticket> & Pick<Ticket, 'id' | 'createdAt'>): Ticket => ({
  title: 'AC not working',
  description: 'The AC in room 2A-15 is blowing hot air.',
  building: 'Building 6',
  room: '2A-15',
  reporterId: 'U-17',
  status: 'New',
  category: 'HVAC',
  priority: 'High',
  assignedTo: null,
  duplicateOf: null,
  approvedBy: null,
  approvedAt: null,
  humanOverride: false,
  ...over,
});

const repos = createInMemoryRepos({
  technicians: [
    { id: 'TECH-01', name: 'Ahmed', skills: ['HVAC'], available: true },
    { id: 'TECH-02', name: 'Yousef', skills: ['HVAC'], available: false },
    { id: 'TECH-03', name: 'Fatima', skills: ['Plumbing'], available: true },
  ],
  tickets: [
    ticket({ id: 'T-1038', createdAt: hoursAgo(2) }),
    ticket({ id: 'T-1039', createdAt: hoursAgo(10) }),
    ticket({ id: 'T-1040', createdAt: hoursAgo(49) }),
    ticket({ id: 'T-1041', createdAt: hoursAgo(3), category: 'Electrical' }),
    ticket({ id: 'T-1042', createdAt: hoursAgo(3), building: 'Building 2', room: '1A-10' }),
  ],
});

const ctx = { repos, now };

describe('tool registry [FR-11]', () => {
  it('exposes exactly the four permitted tools', () => {
    expect([...TOOL_NAMES]).toEqual([
      'search_tickets',
      'get_ticket_history',
      'list_technicians',
      'draft_reply',
    ]);
  });

  it('exposes no write tool', () => {
    for (const writeTool of WRITE_TOOL_NAMES) {
      expect(isToolName(writeTool)).toBe(false);
    }
  });

  it('refuses a write tool with TOOL_NOT_ALLOWED', async () => {
    const result = await executeTool('delete_ticket', { id: 'T-1038' }, ctx);

    expect(result.ok).toBe(false);
    expect(result.error).toBe('TOOL_NOT_ALLOWED');
    expect(result.data).toBeNull();
  });

  it('refuses malformed arguments with INVALID_ARGS', async () => {
    const result = await executeTool('search_tickets', { building: 'Building 6' }, ctx);

    expect(result.ok).toBe(false);
    expect(result.error).toBe('INVALID_ARGS');
  });
});

describe('search_tickets [FR-06]', () => {
  it('returns matching ids newest first', async () => {
    const result = await executeTool(
      'search_tickets',
      { building: 'Building 6', room: '2A-15', category: 'HVAC', hoursBack: 48 },
      ctx,
    );

    expect(result.ok).toBe(true);
    expect(result.data).toEqual({ ids: ['T-1038', 'T-1039'] });
  });

  it('excludes a ticket outside a narrow look-back window', async () => {
    const result = await executeTool(
      'search_tickets',
      { building: 'Building 6', room: '2A-15', category: 'HVAC', hoursBack: 5 },
      ctx,
    );

    expect(result.data).toEqual({ ids: ['T-1038'] });
  });

  it('defaults to a 48 hour window', async () => {
    const result = await executeTool(
      'search_tickets',
      { building: 'Building 6', room: '2A-15', category: 'HVAC' },
      ctx,
    );

    expect(result.data).toEqual({ ids: ['T-1038', 'T-1039'] });
  });

  it('excludes a different category', async () => {
    const result = await executeTool(
      'search_tickets',
      { building: 'Building 6', room: '2A-15', category: 'Electrical', hoursBack: 48 },
      ctx,
    );

    expect(result.data).toEqual({ ids: ['T-1041'] });
  });

  it('returns an empty list when nothing matches', async () => {
    const result = await executeTool(
      'search_tickets',
      { building: 'Building 3', room: '9Z-99', category: 'Cleaning', hoursBack: 48 },
      ctx,
    );

    expect(result.data).toEqual({ ids: [] });
  });
});

describe('get_ticket_history [FR-07]', () => {
  it('returns the room history newest first with the documented fields', async () => {
    const result = await executeTool(
      'get_ticket_history',
      { building: 'Building 6', room: '2A-15' },
      ctx,
    );

    expect(result.data).toEqual({
      tickets: [
        { id: 'T-1038', category: 'HVAC', status: 'New', createdAt: hoursAgo(2) },
        { id: 'T-1041', category: 'Electrical', status: 'New', createdAt: hoursAgo(3) },
        { id: 'T-1039', category: 'HVAC', status: 'New', createdAt: hoursAgo(10) },
        { id: 'T-1040', category: 'HVAC', status: 'New', createdAt: hoursAgo(49) },
      ],
    });
  });

  it('returns an empty list for an unknown room', async () => {
    const result = await executeTool(
      'get_ticket_history',
      { building: 'Library', room: '9Z-99' },
      ctx,
    );

    expect(result.data).toEqual({ tickets: [] });
  });
});

describe('list_technicians [FR-08]', () => {
  it('returns only available technicians with the skill', async () => {
    const result = await executeTool('list_technicians', { category: 'HVAC' }, ctx);

    expect(result.data).toEqual({ technicians: [{ id: 'TECH-01', name: 'Ahmed' }] });
  });

  it('returns an empty list when nobody has the skill', async () => {
    const result = await executeTool('list_technicians', { category: 'Cleaning' }, ctx);

    expect(result.data).toEqual({ technicians: [] });
  });
});

describe('draft_reply [FR-09]', () => {
  it('returns a short reply that names the room', async () => {
    const result = await executeTool(
      'draft_reply',
      { ticketId: 'T-1038', category: 'HVAC', priority: 'High' },
      ctx,
    );

    const data = result.data as { text: string };
    expect(result.ok).toBe(true);
    expect(data.text).toContain('2A-15');
    expect(data.text.length).toBeLessThanOrEqual(300);
  });

  it('never exceeds 300 characters', async () => {
    const result = await executeTool(
      'draft_reply',
      { ticketId: 'T-1038', category: 'Electrical', priority: 'Urgent' },
      ctx,
    );

    const data = result.data as { text: string };
    expect(data.text.length).toBeLessThanOrEqual(300);
  });

  it('fails for an unknown ticket without throwing', async () => {
    const result = await executeTool(
      'draft_reply',
      { ticketId: 'T-9999', category: 'HVAC', priority: 'High' },
      ctx,
    );

    expect(result.ok).toBe(false);
    expect(result.error).toBe('TICKET_NOT_FOUND:T-9999');
  });
});

describe('tools are read-only [FR-11]', () => {
  it('leaves every repository unchanged after all four tools run', async () => {
    const before = await repos.tickets.list();

    await executeTool(
      'search_tickets',
      { building: 'Building 6', room: '2A-15', category: 'HVAC', hoursBack: 48 },
      ctx,
    );
    await executeTool('get_ticket_history', { building: 'Building 6', room: '2A-15' }, ctx);
    await executeTool('list_technicians', { category: 'HVAC' }, ctx);
    await executeTool(
      'draft_reply',
      { ticketId: 'T-1038', category: 'HVAC', priority: 'High' },
      ctx,
    );

    expect(await repos.tickets.list()).toEqual(before);
  });
});
