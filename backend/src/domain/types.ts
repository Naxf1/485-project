import type { Category, Priority, Role, TicketStatus } from '../lib/constants';

export interface User {
  id: string;
  name: string;
  role: Role;
}

export interface Technician {
  id: string;
  name: string;
  skills: Category[];
  available: boolean;
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  building: string;
  room: string;
  reporterId: string;
  status: TicketStatus;
  category: Category | null;
  priority: Priority | null;
  assignedTo: string | null;
  duplicateOf: string | null;
  createdAt: string;
  approvedBy: string | null;
  approvedAt: string | null;
  humanOverride: boolean;
}

export interface Suggestion {
  ticketId: string;
  category: Category;
  priority: Priority;
  possibleDuplicateOf: string | null;
  suggestedTechnician: string | null;
  draftReply: string;
  reason: string;
  needsHuman: boolean;
}

export type AgentOutcome = 'ok' | 'limit' | 'error';

export interface AgentRunRecord {
  ticketId: string;
  toolCalls: number;
  outcome: AgentOutcome;
  durationMs: number;
  error: string | null;
  createdAt: string;
}

export interface AuditEntry {
  ticketId: string;
  actorId: string;
  action: string;
  field: string | null;
  oldValue: string | null;
  newValue: string | null;
  at: string;
}

export interface NewTicketInput {
  title: string;
  description: string;
  building: string;
  room: string;
}
