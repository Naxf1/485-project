import { describe, expect, it } from 'vitest';
import { suggestPriority } from '../../backend/src/domain/priority';

describe('priority rules [FR-04]', () => {
  it.each([
    ['The wall socket sparks when a laptop is plugged in.', 'Urgent'],
    ['There is a smell of gas near the lab door.', 'Urgent'],
    ['Water is pooling next to a power strip under the sink.', 'Urgent'],
    ['An exposed wire is hanging from the ceiling.', 'Urgent'],
  ])('treats a safety risk as Urgent: %s', (text, expected) => {
    expect(suggestPriority(text)).toBe(expected);
  });

  it.each([
    ['The AC is not cooling and the room is very hot.', 'High'],
    ['The projector does not turn on before a lecture.', 'High'],
    ['There is no water in the washroom on the second floor.', 'High'],
  ])('treats an unusable room as High: %s', (text, expected) => {
    expect(suggestPriority(text)).toBe(expected);
  });

  it.each([
    ['The light flickers constantly.', 'Medium'],
    ['The sink drains very slowly.', 'Medium'],
    ['The tap keeps running and will not close.', 'Medium'],
  ])('treats a usable room with a problem as Medium: %s', (text, expected) => {
    expect(suggestPriority(text)).toBe(expected);
  });

  it.each([
    ['One chair has a loose leg and wobbles.', 'Low'],
    ['The desk surface is scratched.', 'Low'],
    ['The floor is sticky after a spilled drink.', 'Low'],
  ])('treats a cosmetic problem as Low: %s', (text, expected) => {
    expect(suggestPriority(text)).toBe(expected);
  });

  it('falls back to Medium when nothing matches', () => {
    expect(suggestPriority('Something feels wrong in the room.')).toBe('Medium');
  });

  it('is case insensitive', () => {
    expect(suggestPriority('THE SOCKET SPARKS')).toBe('Urgent');
  });
});
