import type { TicketStatus } from '../lib/constants';

export const ALLOWED_TRANSITIONS: Record<TicketStatus, readonly TicketStatus[]> = {
  New: ['Triaged', 'Assigned', 'Duplicate'],
  Triaged: ['Assigned', 'Duplicate'],
  Assigned: ['InProgress', 'Resolved'],
  InProgress: ['Resolved'],
  Resolved: [],
  Duplicate: [],
};

export function canTransition(from: TicketStatus, to: TicketStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}
