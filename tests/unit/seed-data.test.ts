import { describe, expect, it } from 'vitest';
import { buildSeedData, SEED_COUNTS } from '../../backend/prisma/seed-data';
import { CATEGORIES } from '../../backend/src/lib/constants';

const now = new Date('2026-10-20T12:00:00.000Z');
const data = buildSeedData(now);

describe('synthetic seed data', () => {
  it('has two reporters and one supervisor [FR-14]', () => {
    const users = data.users ?? [];

    expect(users).toHaveLength(SEED_COUNTS.users);
    expect(users.filter((user) => user.role === 'reporter')).toHaveLength(2);
    expect(users.filter((user) => user.role === 'supervisor')).toHaveLength(1);
  });

  it('has six technicians with valid categories [FR-08]', () => {
    const technicians = data.technicians ?? [];

    expect(technicians).toHaveLength(SEED_COUNTS.technicians);
    for (const technician of technicians) {
      expect(technician.skills.length).toBeGreaterThan(0);
      for (const skill of technician.skills) {
        expect(CATEGORIES).toContain(skill);
      }
    }
  });

  it('has twelve tickets with T-#### ids [FR-01]', () => {
    const tickets = data.tickets ?? [];

    expect(tickets).toHaveLength(SEED_COUNTS.tickets);
    for (const ticket of tickets) {
      expect(ticket.id).toMatch(/^T-\d{4}$/);
      expect(ticket.title.length).toBeGreaterThanOrEqual(5);
      expect(ticket.description.length).toBeGreaterThanOrEqual(10);
    }
  });

  it('keeps every ticket in the past [FR-01]', () => {
    for (const ticket of data.tickets ?? []) {
      expect(new Date(ticket.createdAt).getTime()).toBeLessThan(now.getTime());
    }
  });

  it('provides the HVAC duplicate original from two hours ago [FR-05]', () => {
    const original = (data.tickets ?? []).find((ticket) => ticket.id === 'T-1038');

    expect(original).toBeDefined();
    expect(original?.building).toBe('Building 6');
    expect(original?.room).toBe('2A-15');
    expect(original?.category).toBe('HVAC');
    expect(now.getTime() - new Date(original?.createdAt ?? 0).getTime()).toBe(2 * 3_600_000);
  });

  it('gives every New ticket a suggestion so the supervisor queue is usable [FR-12]', () => {
    const newTickets = (data.tickets ?? []).filter((ticket) => ticket.status === 'New');
    const suggestedIds = (data.suggestions ?? []).map((suggestion) => suggestion.ticketId);

    expect(newTickets).toHaveLength(3);
    for (const ticket of newTickets) {
      expect(suggestedIds).toContain(ticket.id);
    }
  });

  it('never sets a real approvedAt on an unapproved ticket [FR-12]', () => {
    for (const ticket of data.tickets ?? []) {
      if (ticket.status === 'New') {
        expect(ticket.approvedAt).toBeNull();
        expect(ticket.approvedBy).toBeNull();
      }
    }
  });
});
