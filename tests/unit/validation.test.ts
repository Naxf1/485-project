import { describe, expect, it } from 'vitest';
import { validateNewTicket } from '../../backend/src/domain/validation';

const valid = {
  title: 'AC not working',
  description: 'The AC in room 2A-15 has been blowing hot air since morning.',
  building: 'Building 6',
  room: '2A-15',
};

describe('new ticket validation [FR-02]', () => {
  it('accepts a valid ticket and trims text', () => {
    const result = validateNewTicket({ ...valid, title: '  AC not working  ' });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.title).toBe('AC not working');
      expect(result.value.building).toBe('Building 6');
    }
  });

  it('rejects a title shorter than 5 characters', () => {
    const result = validateNewTicket({ ...valid, title: 'AC n' });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(Object.keys(result.fieldErrors)).toEqual(['title']);
      expect(result.fieldErrors.title).toContain('5');
    }
  });

  it('accepts a 5 character title and an 80 character title', () => {
    expect(validateNewTicket({ ...valid, title: 'AC n0' }).ok).toBe(true);
    expect(validateNewTicket({ ...valid, title: 'a'.repeat(80) }).ok).toBe(true);
  });

  it('rejects an 81 character title', () => {
    const result = validateNewTicket({ ...valid, title: 'a'.repeat(81) });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors.title).toContain('80');
  });

  it('rejects a whitespace-only title', () => {
    const result = validateNewTicket({ ...valid, title: '     ' });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors.title).toBeDefined();
  });

  it('rejects a description shorter than 10 characters', () => {
    const result = validateNewTicket({ ...valid, description: 'too short' });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors.description).toContain('10');
  });

  it('accepts a 10 character and a 1000 character description', () => {
    expect(validateNewTicket({ ...valid, description: 'a'.repeat(10) }).ok).toBe(true);
    expect(validateNewTicket({ ...valid, description: 'a'.repeat(1000) }).ok).toBe(true);
  });

  it('rejects a 1001 character description', () => {
    const result = validateNewTicket({ ...valid, description: 'a'.repeat(1001) });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors.description).toContain('1000');
  });

  it('rejects a building that is not in the fixed list', () => {
    const result = validateNewTicket({ ...valid, building: 'Building 99' });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors.building).toBe('Choose a building from the list.');
  });

  it('rejects a malformed room', () => {
    const result = validateNewTicket({ ...valid, room: 'room 15' });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors.room).toContain('2A-15');
  });

  it('reports every bad field at once', () => {
    const result = validateNewTicket({ title: '', description: 'short', building: 'Nowhere', room: '' });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(Object.keys(result.fieldErrors).sort()).toEqual([
        'building',
        'description',
        'room',
        'title',
      ]);
    }
  });

  it('reports a form-level error for a non-object payload', () => {
    const result = validateNewTicket(null);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors._form).toBeDefined();
  });

  it('ignores unknown fields instead of failing', () => {
    const result = validateNewTicket({ ...valid, reporterId: 'U-99', extra: true });

    expect(result.ok).toBe(true);
    if (result.ok) expect(Object.keys(result.value).sort()).toEqual([
      'building',
      'description',
      'room',
      'title',
    ]);
  });
});
