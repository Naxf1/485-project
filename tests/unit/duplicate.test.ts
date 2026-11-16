import { describe, expect, it } from 'vitest';
import { findDuplicate } from '../../backend/src/domain/duplicate';
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

const query = { building: 'Building 6', room: '2A-15', category: 'HVAC' as const };

describe('duplicate rule [FR-05]', () => {
  it('matches a ticket from two hours ago in the same building, room and category', () => {
    const candidates = [ticket({ id: 'T-1038', createdAt: hoursAgo(2) })];

    expect(findDuplicate(query, candidates, now)).toBe('T-1038');
  });

  it('does not match a ticket from 49 hours ago', () => {
    const candidates = [ticket({ id: 'T-1038', createdAt: hoursAgo(49) })];

    expect(findDuplicate(query, candidates, now)).toBeNull();
  });

  it('includes a ticket exactly 48 hours old', () => {
    const candidates = [ticket({ id: 'T-1038', createdAt: hoursAgo(48) })];

    expect(findDuplicate(query, candidates, now)).toBe('T-1038');
  });

  it('does not match a different room', () => {
    const candidates = [ticket({ id: 'T-1038', createdAt: hoursAgo(2), room: '2A-16' })];

    expect(findDuplicate(query, candidates, now)).toBeNull();
  });

  it('does not match a different building', () => {
    const candidates = [ticket({ id: 'T-1038', createdAt: hoursAgo(2), building: 'Building 2' })];

    expect(findDuplicate(query, candidates, now)).toBeNull();
  });

  it('does not match a different category', () => {
    const candidates = [ticket({ id: 'T-1038', createdAt: hoursAgo(2), category: 'Electrical' })];

    expect(findDuplicate(query, candidates, now)).toBeNull();
  });

  it('returns the earliest matching ticket when several match', () => {
    const candidates = [
      ticket({ id: 'T-1040', createdAt: hoursAgo(1) }),
      ticket({ id: 'T-1038', createdAt: hoursAgo(30) }),
      ticket({ id: 'T-1039', createdAt: hoursAgo(10) }),
    ];

    expect(findDuplicate(query, candidates, now)).toBe('T-1038');
  });

  it('returns null when there is no history', () => {
    expect(findDuplicate(query, [], now)).toBeNull();
  });

  it('ignores candidates created in the future', () => {
    const candidates = [ticket({ id: 'T-1038', createdAt: hoursAgo(-1) })];

    expect(findDuplicate(query, candidates, now)).toBeNull();
  });

  it('never matches a candidate without a category', () => {
    const candidates = [ticket({ id: 'T-1038', createdAt: hoursAgo(2), category: null })];

    expect(findDuplicate(query, candidates, now)).toBeNull();
  });

  it('returns null when the query has no category', () => {
    const candidates = [ticket({ id: 'T-1038', createdAt: hoursAgo(2) })];

    expect(findDuplicate({ ...query, category: null }, candidates, now)).toBeNull();
  });

  it('is deterministic across 100 runs [NFR-03]', () => {
    const candidates = [
      ticket({ id: 'T-1038', createdAt: hoursAgo(30) }),
      ticket({ id: 'T-1039', createdAt: hoursAgo(2) }),
    ];
    const results = new Set(
      Array.from({ length: 100 }, () => findDuplicate(query, candidates, now)),
    );

    expect([...results]).toEqual(['T-1038']);
  });
});
