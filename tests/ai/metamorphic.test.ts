import { describe, expect, it } from 'vitest';
import { FakeLlm } from '../../backend/src/agent/fake-llm';
import { runTriage } from '../../backend/src/agent/triage-agent';
import { FIXTURES, NOW, REWORDINGS, ticketFrom } from '../fixtures/ai-fixtures';
import { freshRepos } from '../fixtures/triage-harness';

const byId = new Map(FIXTURES.map((fixture) => [fixture.id, fixture]));

const triage = async (id: string, title: string, description: string) => {
  const fixture = byId.get(id);
  if (!fixture) throw new Error(`unknown fixture ${id}`);

  const ticket = ticketFrom(fixture, { title, description });
  const result = await runTriage(ticket, {
    repos: freshRepos(ticket),
    llm: new FakeLlm(),
    now: NOW,
  });

  return result.suggestion;
};

/**
 * NFR-04 / T-09b: rewording the same fault must not move the category or the
 * priority. Only the phrasing changes, the reported problem stays the same.
 */
describe('AI behaviour — metamorphic rewording [NFR-04]', () => {
  it('covers every fixture with at least one rewording', () => {
    const covered = new Set(REWORDINGS.map((entry) => entry.fixtureId));

    expect([...covered].sort()).toEqual(FIXTURES.map((fixture) => fixture.id).sort());
  });

  it('keeps the category and priority for each rewording', async () => {
    const mismatches: string[] = [];

    for (const entry of REWORDINGS) {
      const fixture = byId.get(entry.fixtureId);
      if (!fixture) throw new Error(`unknown fixture ${entry.fixtureId}`);

      const baseline = await triage(fixture.id, fixture.title, fixture.description);
      expect(baseline.category, `${fixture.id} baseline`).toBe(fixture.category);

      for (const variant of entry.variants) {
        const result = await triage(fixture.id, fixture.title, variant);

        if (result.category !== baseline.category) {
          mismatches.push(`${fixture.id} category: ${baseline.category} -> ${result.category}`);
        }
        if (result.priority !== baseline.priority) {
          mismatches.push(`${fixture.id} priority: ${baseline.priority} -> ${result.priority}`);
        }
      }
    }

    expect(mismatches).toEqual([]);
  });

  it('keeps the decision when the sentences are reordered and spaced differently', async () => {
    const fixture = byId.get('T-2001');
    if (!fixture) throw new Error('missing fixture T-2001');

    const baseline = await triage(fixture.id, fixture.title, fixture.description);
    const reordered = await triage(
      fixture.id,
      'Room 2A-15 is very hot',
      '  The AC is not cooling.   The room is very hot.  ',
    );

    expect(reordered.category).toBe(baseline.category);
    expect(reordered.priority).toBe(baseline.priority);
  });
});
