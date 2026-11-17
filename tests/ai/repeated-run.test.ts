import { describe, expect, it } from 'vitest';
import { FakeLlm } from '../../backend/src/agent/fake-llm';
import { runTriage } from '../../backend/src/agent/triage-agent';
import { FIXTURES, NOW, ticketFrom } from '../fixtures/ai-fixtures';
import { freshRepos } from '../fixtures/triage-harness';

const RUNS = 20;
const THRESHOLD = 0.95;

interface Measurement {
  id: string;
  expected: string;
  agreement: number;
}

/**
 * NFR-04: the same ticket triaged 20 times must give the same category at least
 * 95 % of the time. Each run uses a fresh repo and a different `variationSeed`,
 * which only changes wording and tie-breaking in the fake model.
 */
async function measure(): Promise<{ results: Measurement[]; overall: number }> {
  const results: Measurement[] = [];

  for (const fixture of FIXTURES) {
    let matching = 0;

    for (let run = 0; run < RUNS; run += 1) {
      const ticket = ticketFrom(fixture);
      const result = await runTriage(ticket, {
        repos: freshRepos(ticket),
        llm: new FakeLlm({ variationSeed: run + 1 }),
        now: NOW,
      });

      if (result.suggestion.category === fixture.category) matching += 1;
    }

    results.push({ id: fixture.id, expected: fixture.category, agreement: matching / RUNS });
  }

  const overall =
    results.reduce((sum, entry) => sum + entry.agreement, 0) / (results.length || 1);

  return { results, overall };
}

describe('AI behaviour — repeated runs [NFR-04]', () => {
  it('keeps the category stable over 20 runs for every fixture', async () => {
    const { results, overall } = await measure();

    const report = results
      .map((entry) => `${entry.id} ${entry.expected}: ${(entry.agreement * 100).toFixed(0)}%`)
      .join(' | ');
    console.log(
      `[NFR-04] ${FIXTURES.length} tickets x ${RUNS} runs — agreement ` +
        `${(overall * 100).toFixed(1)}% (threshold ${THRESHOLD * 100}%)\n${report}`,
    );

    for (const entry of results) {
      expect(entry.agreement, `${entry.id} agreement`).toBeGreaterThanOrEqual(THRESHOLD);
    }
    expect(overall).toBeGreaterThanOrEqual(THRESHOLD);
  });

  it('records the measured pass rate in the test output', async () => {
    const { overall } = await measure();

    console.log(`[NFR-04] measured category pass rate: ${(overall * 100).toFixed(1)}%`);
    expect(overall).toBeGreaterThan(0);
    expect(overall).toBeLessThanOrEqual(1);
  });
});
