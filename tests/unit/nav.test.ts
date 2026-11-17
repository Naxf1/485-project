import { describe, expect, it } from 'vitest';
import { homeHrefFor, homeViewFor } from '../../frontend/src/nav';

describe('brand link target [FR-16]', () => {
  it('sends a reporter to the new ticket view', () => {
    expect(homeViewFor('reporter')).toBe('new');
    expect(homeHrefFor('reporter')).toBe('#/new');
  });

  it('sends a supervisor to the queue', () => {
    expect(homeViewFor('supervisor')).toBe('queue');
    expect(homeHrefFor('supervisor')).toBe('#/queue');
  });

  it('sends a signed-out visitor to the login page', () => {
    expect(homeHrefFor(null)).toBe('#/login');
  });
});
