import { describe, expect, it } from 'vitest';
import {
  BUILDINGS,
  CATEGORIES,
  MAX_TOOL_CALLS,
  PRIORITIES,
  ROOM_PATTERN,
} from '../../backend/src/lib/constants';

describe('product constants', () => {
  it('caps the agent at five tool calls [FR-10]', () => {
    expect(MAX_TOOL_CALLS).toBe(5);
  });

  it('has exactly seven categories [FR-03]', () => {
    expect(CATEGORIES).toEqual([
      'Electrical',
      'Plumbing',
      'HVAC',
      'Furniture',
      'IT',
      'Cleaning',
      'Other',
    ]);
  });

  it('has four priority levels [FR-04]', () => {
    expect(PRIORITIES).toEqual(['Low', 'Medium', 'High', 'Urgent']);
  });

  it('accepts a valid room and rejects a malformed one [FR-02]', () => {
    expect(ROOM_PATTERN.test('2A-15')).toBe(true);
    expect(ROOM_PATTERN.test('room 15')).toBe(false);
  });

  it('includes Building 6 in the fixed building list [FR-02]', () => {
    expect(BUILDINGS).toContain('Building 6');
  });
});
