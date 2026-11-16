import { z } from 'zod';
import {
  BUILDINGS,
  DESCRIPTION_MAX,
  DESCRIPTION_MIN,
  ROOM_PATTERN,
  TITLE_MAX,
  TITLE_MIN,
} from '../lib/constants';
import type { NewTicketInput } from './types';

export const newTicketSchema = z.object({
  title: z
    .string({ required_error: 'Title is required.', invalid_type_error: 'Title is required.' })
    .trim()
    .min(TITLE_MIN, `Title must be ${TITLE_MIN}–${TITLE_MAX} characters.`)
    .max(TITLE_MAX, `Title must be ${TITLE_MIN}–${TITLE_MAX} characters.`),
  description: z
    .string({
      required_error: 'Description is required.',
      invalid_type_error: 'Description is required.',
    })
    .trim()
    .min(DESCRIPTION_MIN, `Description must be ${DESCRIPTION_MIN}–${DESCRIPTION_MAX} characters.`)
    .max(DESCRIPTION_MAX, `Description must be ${DESCRIPTION_MIN}–${DESCRIPTION_MAX} characters.`),
  building: z.enum(BUILDINGS, {
    errorMap: () => ({ message: 'Choose a building from the list.' }),
  }),
  room: z
    .string({ required_error: 'Room is required.', invalid_type_error: 'Room is required.' })
    .trim()
    .regex(ROOM_PATTERN, 'Room must look like 2A-15.'),
});

export type ValidationResult =
  | { ok: true; value: NewTicketInput }
  | { ok: false; fieldErrors: Record<string, string> };

export function validateNewTicket(input: unknown): ValidationResult {
  const parsed = newTicketSchema.safeParse(input);

  if (parsed.success) {
    return { ok: true, value: parsed.data };
  }

  const fieldErrors: Record<string, string> = {};
  for (const issue of parsed.error.issues) {
    const key = issue.path.length > 0 ? String(issue.path[0]) : '_form';
    if (fieldErrors[key] === undefined) {
      fieldErrors[key] = issue.message;
    }
  }

  return { ok: false, fieldErrors };
}
