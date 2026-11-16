import type { Category, TicketStatus } from '../lib/constants';
import type {
  AgentRunRecord,
  AuditEntry,
  Suggestion,
  Technician,
  Ticket,
  User,
} from '../domain/types';

export interface TicketFilter {
  reporterId?: string;
  status?: TicketStatus;
}

export interface UserRepository {
  findById(id: string): Promise<User | null>;
  list(): Promise<User[]>;
}

export interface TechnicianRepository {
  findById(id: string): Promise<Technician | null>;
  list(): Promise<Technician[]>;
  listByCategory(category: Category): Promise<Technician[]>;
}

export interface TicketRepository {
  nextId(): Promise<string>;
  create(ticket: Ticket): Promise<Ticket>;
  findById(id: string): Promise<Ticket | null>;
  update(id: string, patch: Partial<Ticket>): Promise<Ticket>;
  list(filter?: TicketFilter): Promise<Ticket[]>;
  listByRoom(building: string, room: string): Promise<Ticket[]>;
}

export interface SuggestionRepository {
  upsert(suggestion: Suggestion): Promise<Suggestion>;
  findByTicketId(ticketId: string): Promise<Suggestion | null>;
}

export interface AgentRunRepository {
  record(run: AgentRunRecord): Promise<void>;
  listByTicket(ticketId: string): Promise<AgentRunRecord[]>;
}

export interface AuditRepository {
  record(entry: AuditEntry): Promise<void>;
  listByTicket(ticketId: string): Promise<AuditEntry[]>;
}

export interface Repos {
  users: UserRepository;
  technicians: TechnicianRepository;
  tickets: TicketRepository;
  suggestions: SuggestionRepository;
  runs: AgentRunRepository;
  audit: AuditRepository;
}
