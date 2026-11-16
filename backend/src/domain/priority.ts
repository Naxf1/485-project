import type { Priority } from '../lib/constants';

const URGENT_PATTERNS: readonly RegExp[] = [
  /\bspark/i,
  /\bsmoke/i,
  /\bgas\b/i,
  /\bshock/i,
  /exposed wire/i,
  /\bfire\b/i,
  /water[^.]*(power|electric|socket|strip|outlet)/i,
];

const HIGH_PATTERNS: readonly RegExp[] = [
  /\bno ac\b/i,
  /not cooling/i,
  /no cooling/i,
  /hot air/i,
  /\bprojector\b/i,
  /no water/i,
  /toilet[^.]*(not working|broken)/i,
  /\belevator\b/i,
  /\bflood/i,
];

const LOW_PATTERNS: readonly RegExp[] = [/wobbl/i, /scratch/i, /cosmetic/i, /sticky/i, /\bdust/i];

const matches = (text: string, patterns: readonly RegExp[]): boolean =>
  patterns.some((pattern) => pattern.test(text));

/**
 * Priority rules from the spec (FR-04):
 * Urgent = safety risk, High = room unusable, Medium = usable with a problem, Low = cosmetic.
 */
export function suggestPriority(text: string): Priority {
  if (matches(text, URGENT_PATTERNS)) return 'Urgent';
  if (matches(text, HIGH_PATTERNS)) return 'High';
  if (matches(text, LOW_PATTERNS)) return 'Low';
  return 'Medium';
}
