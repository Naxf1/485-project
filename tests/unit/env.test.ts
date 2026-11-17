import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadDotEnv, readEnv } from '../../backend/src/lib/env';

const tempEnvFile = (content: string): string => {
  const dir = mkdtempSync(join(tmpdir(), 'fixlane-env-'));
  const file = join(dir, '.env');
  writeFileSync(file, content, 'utf8');
  return file;
};

describe('readEnv — provider settings [FR-19]', () => {
  it('defaults to the fake provider with no key or model', () => {
    const env = readEnv({});

    expect(env.llmProvider).toBe('fake');
    expect(env.llmApiKey).toBe('');
    expect(env.llmModel).toBe('');
    expect(env.llmBaseUrl).toBe('');
  });

  it('accepts the gemini provider and reads its key, model and base url', () => {
    const env = readEnv({
      LLM_PROVIDER: 'gemini',
      LLM_API_KEY: 'test-key-123',
      LLM_MODEL: 'gemini-test-flash',
      LLM_BASE_URL: 'http://localhost:8080/v1',
    });

    expect(env.llmProvider).toBe('gemini');
    expect(env.llmApiKey).toBe('test-key-123');
    expect(env.llmModel).toBe('gemini-test-flash');
    expect(env.llmBaseUrl).toBe('http://localhost:8080/v1');
  });

  it('rejects a provider name with no adapter', () => {
    expect(() => readEnv({ LLM_PROVIDER: 'gemmini' })).toThrow('LLM_PROVIDER');
  });
});

describe('loadDotEnv [FR-19]', () => {
  it('loads KEY=VALUE pairs into an empty target', () => {
    const file = tempEnvFile('LLM_PROVIDER=gemini\nLLM_MODEL=gemini-test-flash\n');
    const target: NodeJS.ProcessEnv = {};

    loadDotEnv(file, target);

    expect(target.LLM_PROVIDER).toBe('gemini');
    expect(target.LLM_MODEL).toBe('gemini-test-flash');
  });

  it('ignores comments, blank lines and strips surrounding quotes', () => {
    const file = tempEnvFile(
      ['# a comment', '', 'DATABASE_URL="file:./dev.db"', 'PORT=3100'].join('\n'),
    );
    const target: NodeJS.ProcessEnv = {};

    loadDotEnv(file, target);

    expect(target.DATABASE_URL).toBe('file:./dev.db');
    expect(target.PORT).toBe('3100');
    expect(Object.keys(target).sort()).toEqual(['DATABASE_URL', 'PORT']);
  });

  it('never overrides a value already set in the real environment', () => {
    const file = tempEnvFile('LLM_PROVIDER=gemini\n');
    const target: NodeJS.ProcessEnv = { LLM_PROVIDER: 'fake' };

    loadDotEnv(file, target);

    expect(target.LLM_PROVIDER).toBe('fake');
  });

  it('does nothing when the file is missing', () => {
    const target: NodeJS.ProcessEnv = {};

    expect(() => loadDotEnv(join(tmpdir(), 'fixlane-no-such-file.env'), target)).not.toThrow();
    expect(target).toEqual({});
  });
});
