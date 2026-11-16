import { describe, expect, it } from 'vitest';
import type { Ticket } from '../../backend/src/domain/types';
import { createInMemoryRepos } from '../../backend/src/repositories/in-memory';

const ticket = (over: Partial<Ticket> & Pick<Ticket, 'id' | 'createdAt'>): Ticket => ({
  title: 'Broken projector',
  description: 'The projector in the room does not turn on at all.',
  building: 'Building 6',
  room: '2A-15',
  reporterId: 'U-17',
  status: 'New',
  category: 'IT',
  priority: 'High',
  assignedTo: null,
  duplicateOf: null,
  approvedBy: null,
  approvedAt: null,
  humanOverride: false,
  ...over,
});

describe('in-memory ticket repository', () => {
  it('generates sequential ids from the highest existing ticket [FR-01]', async () => {
    const repos = createInMemoryRepos({
      tickets: [
        ticket({ id: 'T-1041', createdAt: '2026-10-20T08:00:00.000Z' }),
        ticket({ id: 'T-1042', createdAt: '2026-10-20T09:00:00.000Z' }),
      ],
    });

    expect(await repos.tickets.nextId()).toBe('T-1043');
  });

  it('starts at T-1001 when there are no tickets [FR-01]', async () => {
    const repos = createInMemoryRepos();

    expect(await repos.tickets.nextId()).toBe('T-1001');
  });

  it('stores and reads a ticket by id [FR-01]', async () => {
    const repos = createInMemoryRepos();
    const created = ticket({ id: 'T-1001', createdAt: '2026-10-20T09:30:00.000Z' });

    await repos.tickets.create(created);

    expect(await repos.tickets.findById('T-1001')).toEqual(created);
    expect(await repos.tickets.findById('T-9999')).toBeNull();
  });

  it('lists newest first and filters by reporter and status [FR-14, FR-16]', async () => {
    const repos = createInMemoryRepos({
      tickets: [
        ticket({ id: 'T-1001', createdAt: '2026-10-20T08:00:00.000Z', reporterId: 'U-17' }),
        ticket({
          id: 'T-1002',
          createdAt: '2026-10-20T10:00:00.000Z',
          reporterId: 'U-18',
          status: 'Assigned',
        }),
      ],
    });

    expect((await repos.tickets.list()).map((t) => t.id)).toEqual(['T-1002', 'T-1001']);
    expect((await repos.tickets.list({ reporterId: 'U-17' })).map((t) => t.id)).toEqual(['T-1001']);
    expect((await repos.tickets.list({ status: 'Assigned' })).map((t) => t.id)).toEqual(['T-1002']);
  });

  it('filters tickets by building and room [FR-07]', async () => {
    const repos = createInMemoryRepos({
      tickets: [
        ticket({ id: 'T-1001', createdAt: '2026-10-20T08:00:00.000Z' }),
        ticket({
          id: 'T-1002',
          createdAt: '2026-10-20T09:00:00.000Z',
          building: 'Building 2',
          room: '1A-10',
        }),
      ],
    });

    const room = await repos.tickets.listByRoom('Building 6', '2A-15');

    expect(room.map((t) => t.id)).toEqual(['T-1001']);
  });

  it('merges an update without changing the id [FR-12]', async () => {
    const repos = createInMemoryRepos({
      tickets: [ticket({ id: 'T-1001', createdAt: '2026-10-20T08:00:00.000Z' })],
    });

    const updated = await repos.tickets.update('T-1001', { status: 'Assigned', assignedTo: 'TECH-01' });

    expect(updated.id).toBe('T-1001');
    expect(updated.status).toBe('Assigned');
    expect(updated.assignedTo).toBe('TECH-01');
    expect((await repos.tickets.findById('T-1001'))?.status).toBe('Assigned');
  });
});

describe('in-memory technician repository', () => {
  const technicians = [
    { id: 'TECH-01', name: 'Ahmed', skills: ['HVAC' as const], available: true },
    { id: 'TECH-02', name: 'Yousef', skills: ['HVAC' as const], available: false },
    { id: 'TECH-03', name: 'Fatima', skills: ['Plumbing' as const], available: true },
  ];

  it('returns only available technicians with the requested skill [FR-08]', async () => {
    const repos = createInMemoryRepos({ technicians });

    const hvac = await repos.technicians.listByCategory('HVAC');

    expect(hvac.map((technician) => technician.id)).toEqual(['TECH-01']);
  });
});

describe('in-memory suggestion repository', () => {
  it('replaces a suggestion for the same ticket [FR-12]', async () => {
    const repos = createInMemoryRepos();

    await repos.suggestions.upsert({
      ticketId: 'T-1001',
      category: 'HVAC',
      priority: 'High',
      possibleDuplicateOf: null,
      suggestedTechnician: 'TECH-01',
      draftReply: 'Thanks.',
      reason: 'First pass.',
      needsHuman: false,
    });
    await repos.suggestions.upsert({
      ticketId: 'T-1001',
      category: 'Plumbing',
      priority: 'Medium',
      possibleDuplicateOf: null,
      suggestedTechnician: null,
      draftReply: 'Updated.',
      reason: 'Second pass.',
      needsHuman: true,
    });

    const stored = await repos.suggestions.findByTicketId('T-1001');

    expect(stored?.category).toBe('Plumbing');
    expect(stored?.needsHuman).toBe(true);
  });
});
