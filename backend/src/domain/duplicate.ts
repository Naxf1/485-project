import { DUPLICATE_WINDOW_HOURS } from '../lib/constants';
import type { Category } from '../lib/constants';
import type { Ticket } from './types';

export interface DuplicateQuery {
  building: string;
  room: string;
  category: Category | null;
}

const HOUR_MS = 3_600_000;

const createdAtMs = (ticket: Ticket): number => new Date(ticket.createdAt).getTime();

/**
 * Duplicate rule (FR-05): same building, same room, same category, created within
 * the previous 48 hours. The earliest matching ticket is the original.
 * Plain deterministic code — never a model decision.
 */
export function findDuplicate(
  query: DuplicateQuery,
  candidates: readonly Ticket[],
  now: Date,
): string | null {
  if (query.category === null) return null;

  const nowMs = now.getTime();
  const cutoffMs = nowMs - DUPLICATE_WINDOW_HOURS * HOUR_MS;

  const matches = candidates.filter((ticket) => {
    if (ticket.building !== query.building) return false;
    if (ticket.room !== query.room) return false;
    if (ticket.category !== query.category) return false;

    const created = createdAtMs(ticket);
    return created >= cutoffMs && created <= nowMs;
  });

  if (matches.length === 0) return null;

  let earliest = matches[0] as Ticket;
  for (const match of matches) {
    if (createdAtMs(match) < createdAtMs(earliest)) {
      earliest = match;
    }
  }

  return earliest.id;
}
