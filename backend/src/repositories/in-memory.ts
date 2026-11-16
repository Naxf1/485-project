import type { Category, TicketStatus } from '../lib/constants';
import type {
  AgentRunRecord,
  AuditEntry,
  Suggestion,
  Technician,
  Ticket,
  User,
} from '../domain/types';
import type { Repos, TicketFilter } from './types';

export interface SeedData {
  users?: User[];
  technicians?: Technician[];
  tickets?: Ticket[];
  suggestions?: Suggestion[];
}

const byNewest = (a: Ticket, b: Ticket): number => b.createdAt.localeCompare(a.createdAt);

export function createInMemoryRepos(seed: SeedData = {}): Repos {
  const users: User[] = [...(seed.users ?? [])];
  const technicians: Technician[] = [...(seed.technicians ?? [])];
  const tickets: Ticket[] = (seed.tickets ?? []).map((ticket) => ({ ...ticket }));
  const suggestions: Suggestion[] = (seed.suggestions ?? []).map((s) => ({ ...s }));
  const runs: AgentRunRecord[] = [];
  const audit: AuditEntry[] = [];

  const nextNumericId = (): number => {
    const numbers = tickets
      .map((ticket) => Number.parseInt(ticket.id.replace(/^T-/, ''), 10))
      .filter((value) => Number.isFinite(value));
    return (numbers.length === 0 ? 1000 : Math.max(...numbers)) + 1;
  };

  return {
    users: {
      async findById(id) {
        return users.find((user) => user.id === id) ?? null;
      },
      async list() {
        return [...users];
      },
    },
    technicians: {
      async findById(id) {
        return technicians.find((technician) => technician.id === id) ?? null;
      },
      async list() {
        return [...technicians];
      },
      async listByCategory(category: Category) {
        return technicians.filter(
          (technician) => technician.available && technician.skills.includes(category),
        );
      },
    },
    tickets: {
      async nextId() {
        return `T-${nextNumericId()}`;
      },
      async create(ticket) {
        tickets.push({ ...ticket });
        return { ...ticket };
      },
      async findById(id) {
        const found = tickets.find((ticket) => ticket.id === id);
        return found ? { ...found } : null;
      },
      async update(id, patch) {
        const index = tickets.findIndex((ticket) => ticket.id === id);
        if (index === -1) throw new Error(`TICKET_NOT_FOUND:${id}`);
        const current = tickets[index] as Ticket;
        const updated: Ticket = { ...current, ...patch, id: current.id };
        tickets[index] = updated;
        return { ...updated };
      },
      async list(filter: TicketFilter = {}) {
        return tickets
          .filter((ticket) => !filter.reporterId || ticket.reporterId === filter.reporterId)
          .filter((ticket) => !filter.status || ticket.status === filter.status)
          .sort(byNewest)
          .map((ticket) => ({ ...ticket }));
      },
      async listByRoom(building, room) {
        return tickets
          .filter((ticket) => ticket.building === building && ticket.room === room)
          .sort(byNewest)
          .map((ticket) => ({ ...ticket }));
      },
    },
    suggestions: {
      async upsert(suggestion) {
        const index = suggestions.findIndex((s) => s.ticketId === suggestion.ticketId);
        if (index === -1) suggestions.push({ ...suggestion });
        else suggestions[index] = { ...suggestion };
        return { ...suggestion };
      },
      async findByTicketId(ticketId) {
        const found = suggestions.find((suggestion) => suggestion.ticketId === ticketId);
        return found ? { ...found } : null;
      },
    },
    runs: {
      async record(run) {
        runs.push({ ...run });
      },
      async listByTicket(ticketId) {
        return runs.filter((run) => run.ticketId === ticketId).map((run) => ({ ...run }));
      },
    },
    audit: {
      async record(entry) {
        audit.push({ ...entry });
      },
      async listByTicket(ticketId) {
        return audit.filter((entry) => entry.ticketId === ticketId).map((entry) => ({ ...entry }));
      },
    },
  };
}

export function statusIs(ticket: Ticket, status: TicketStatus): boolean {
  return ticket.status === status;
}
