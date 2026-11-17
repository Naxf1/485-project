import { createInMemoryRepos } from '../../backend/src/repositories/in-memory';
import type { Repos } from '../../backend/src/repositories/types';
import type { Category } from '../../backend/src/lib/constants';
import type { Ticket } from '../../backend/src/domain/types';

const SKILLS: readonly Category[] = [
  'HVAC',
  'Plumbing',
  'Electrical',
  'Furniture',
  'IT',
  'Cleaning',
  'Other',
];

/**
 * A fresh in-memory repo per run so repeated runs cannot share state.
 * The ticket under triage is stored, because the read-only tools look it up.
 */
export const freshRepos = (ticket?: Ticket): Repos =>
  createInMemoryRepos({
    technicians: SKILLS.map((category, index) => ({
      id: `TECH-${String(index + 1).padStart(2, '0')}`,
      name: `Technician ${category}`,
      skills: [category],
      available: true,
    })),
    tickets: ticket ? [ticket] : [],
  });
