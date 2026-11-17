export type Role = 'reporter' | 'supervisor';
export type Priority = 'Low' | 'Medium' | 'High' | 'Urgent';
export type Category =
  | 'Electrical'
  | 'Plumbing'
  | 'HVAC'
  | 'Furniture'
  | 'IT'
  | 'Cleaning'
  | 'Other';

export interface User {
  id: string;
  name: string;
  role: Role;
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

export interface Ticket {
  id: string;
  title: string;
  description: string;
  building: string;
  room: string;
  reporterId: string;
  status: string;
  category: Category | null;
  priority: Priority | null;
  assignedTo: string | null;
  duplicateOf: string | null;
  createdAt: string;
  approvedBy: string | null;
  approvedAt: string | null;
  humanOverride: boolean;
}

export interface TicketWithSuggestion extends Ticket {
  suggestion: Suggestion | null;
}

export interface Technician {
  id: string;
  name: string;
  skills: Category[];
  available: boolean;
}

export interface NewTicketInput {
  title: string;
  description: string;
  building: string;
  room: string;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fieldErrors: Record<string, string> = {},
  ) {
    super(message);
  }
}

const TOKEN_KEY = 'triage.token';

let token: string | null = localStorage.getItem(TOKEN_KEY);

export const getToken = (): string | null => token;

export function setToken(value: string | null): void {
  token = value;
  if (value) localStorage.setItem(TOKEN_KEY, value);
  else localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const payload = (body ?? {}) as {
      error?: string;
      message?: string;
      fieldErrors?: Record<string, string>;
    };
    throw new ApiError(
      response.status,
      payload.error ?? 'REQUEST_FAILED',
      payload.message ?? 'The request failed.',
      payload.fieldErrors ?? {},
    );
  }

  return body as T;
}

export const api = {
  login: (userId: string) =>
    request<{ token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    }),

  me: () => request<{ user: User }>('/api/me'),

  listTickets: () => request<{ tickets: TicketWithSuggestion[] }>('/api/tickets'),

  getTicket: (id: string) =>
    request<{ ticket: Ticket; suggestion: Suggestion | null; runs: unknown[] }>(
      `/api/tickets/${encodeURIComponent(id)}`,
    ),

  createTicket: (input: NewTicketInput) =>
    request<{ ticket: Ticket; suggestion: Suggestion }>('/api/tickets', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  approve: (id: string) =>
    request<{ ticket: Ticket }>(`/api/tickets/${encodeURIComponent(id)}/approve`, {
      method: 'POST',
    }),

  edit: (
    id: string,
    patch: { category?: Category; priority?: Priority; assignedTo?: string | null; draftReply?: string },
  ) =>
    request<{ ticket: Ticket }>(`/api/tickets/${encodeURIComponent(id)}/edit`, {
      method: 'POST',
      body: JSON.stringify(patch),
    }),

  setStatus: (id: string, status: string) =>
    request<{ ticket: Ticket }>(`/api/tickets/${encodeURIComponent(id)}/status`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    }),

  technicians: () => request<{ technicians: Technician[] }>('/api/technicians'),
};

export const BUILDINGS = [
  'Building 1',
  'Building 2',
  'Building 3',
  'Building 4',
  'Building 5',
  'Building 6',
  'Building 7',
  'Library',
  'Sports Hall',
];

export const CATEGORIES: Category[] = [
  'Electrical',
  'Plumbing',
  'HVAC',
  'Furniture',
  'IT',
  'Cleaning',
  'Other',
];

export const PRIORITIES: Priority[] = ['Low', 'Medium', 'High', 'Urgent'];
