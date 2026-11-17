import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../../backend/src/app';
import { FakeLlm } from '../../backend/src/agent/fake-llm';
import type { LlmClient, LlmStep } from '../../backend/src/agent/llm';
import { validateNewTicket } from '../../backend/src/domain/validation';
import { createInMemoryRepos } from '../../backend/src/repositories/in-memory';
import { buildSeedData } from '../../backend/prisma/seed-data';

const now = new Date('2026-10-20T12:00:00.000Z');

const setup = (llm: LlmClient = new FakeLlm()): Express =>
  createApp({ repos: createInMemoryRepos(buildSeedData(now)), llm, secret: 'test-secret', now: () => now });

const login = async (app: Express, userId: string): Promise<string> => {
  const response = await request(app).post('/api/auth/login').send({ userId });
  return response.body.token as string;
};

const invalidSubmission = {
  title: '',
  description: 'short',
  building: 'Nowhere',
  room: 'x',
};

describe('validation cost [NFR-01]', () => {
  it('rejects 100 invalid submissions in under 100 ms', () => {
    const startedAt = performance.now();

    for (let index = 0; index < 100; index += 1) {
      expect(validateNewTicket(invalidSubmission).ok).toBe(false);
    }

    expect(performance.now() - startedAt).toBeLessThan(100);
  });

  it('never calls the model for an invalid submission', async () => {
    let calls = 0;
    const counting: LlmClient = {
      async next(): Promise<LlmStep> {
        calls += 1;
        return { kind: 'final', text: '{}' };
      },
    };
    const app = setup(counting);
    const token = await login(app, 'U-17');

    const response = await request(app)
      .post('/api/tickets')
      .set('Authorization', `Bearer ${token}`)
      .send(invalidSubmission);

    expect(response.status).toBe(400);
    expect(response.body.fieldErrors.title).toBeDefined();
    expect(calls).toBe(0);
  });
});

describe('API latency [NFR-09]', () => {
  it('keeps p95 under 300 ms for non-AI endpoints', async () => {
    const app = setup();
    const token = await login(app, 'SUP-01');
    const samples: number[] = [];

    for (let index = 0; index < 20; index += 1) {
      const startedAt = performance.now();
      const response = await request(app)
        .get('/api/tickets')
        .set('Authorization', `Bearer ${token}`);
      samples.push(performance.now() - startedAt);
      expect(response.status).toBe(200);
    }

    samples.sort((left, right) => left - right);
    const p95 = samples[Math.ceil(samples.length * 0.95) - 1] ?? Number.POSITIVE_INFINITY;

    expect(p95).toBeLessThan(300);
  });
});

const filesUnder = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? filesUnder(path) : [path];
  });

const readAll = (dirs: readonly string[]): string =>
  dirs
    .flatMap(filesUnder)
    .map((path) => readFileSync(path, 'utf8'))
    .join('\n');

describe('synthetic data and no secrets [NFR-07]', () => {
  it('contains no provider key or private key in the tracked source', () => {
    const text = readAll(['backend/src', 'frontend/src', 'tests', 'specs', 'docs']);

    expect(text).not.toMatch(/sk-[A-Za-z0-9]{20,}/);
    expect(text).not.toMatch(/AKIA[0-9A-Z]{16}/);
    expect(text).not.toMatch(/-----BEGIN [A-Z ]*PRIVATE KEY-----/);
    expect(text).not.toMatch(/\bghp_[A-Za-z0-9]{30,}/);
  });

  it('keeps .env ignored and .env.example on placeholder values', () => {
    const gitignore = readFileSync('.gitignore', 'utf8');
    const example = readFileSync('.env.example', 'utf8');

    expect(gitignore.split(/\r?\n/)).toContain('.env');
    expect(example).toContain('LLM_API_KEY=replace-with-your-key');
    expect(example).toContain('SESSION_SECRET=change-me-local-only');
  });
});

describe('accessible UI source [NFR-08]', () => {
  const viewFiles = filesUnder('frontend/src').filter((path) => path.endsWith('.tsx'));

  it('gives every form control a matching label', () => {
    let controlCount = 0;

    for (const file of viewFiles) {
      const source = readFileSync(file, 'utf8');
      const controls = [...source.matchAll(/<(input|select|textarea)\b([^>]*)>/g)];
      const labels = new Set(
        [...source.matchAll(/<label\b[^>]*htmlFor="([^"]+)"/g)].map((match) => match[1]),
      );
      controlCount += controls.length;

      for (const control of controls) {
        const attributes = control[2] ?? '';
        const id = /id="([^"]+)"/.exec(attributes)?.[1];
        const hasAriaLabel = /aria-label=/.test(attributes);
        const labelled = hasAriaLabel || (id !== undefined && labels.has(id));

        expect(labelled, `${file}: ${control[0]} needs a label`).toBe(true);
      }
    }

    expect(viewFiles.length).toBeGreaterThanOrEqual(5);
    expect(controlCount).toBeGreaterThanOrEqual(8);
  });


  it('uses real buttons for actions and marks focus visibly', () => {
    const css = readFileSync('frontend/src/styles.css', 'utf8');

    expect(css).toMatch(/:focus-visible/);
    expect(css).toMatch(/min-height:\s*44px/);

    for (const file of viewFiles) {
      const source = readFileSync(file, 'utf8');
      expect(source).not.toMatch(/<div[^>]*onClick=/);
    }
  });
});
