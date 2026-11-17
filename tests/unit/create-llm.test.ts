import { describe, expect, it } from 'vitest';
import { createLlm } from '../../backend/src/agent/create-llm';
import { FakeLlm } from '../../backend/src/agent/fake-llm';
import { GeminiLlm } from '../../backend/src/agent/gemini-llm';
import type { Env } from '../../backend/src/lib/env';
import { readEnv } from '../../backend/src/lib/env';

const envWith = (over: Partial<Env> = {}): Env => ({
  ...readEnv({}),
  ...over,
});

describe('createLlm — provider selection [FR-19]', () => {
  it('returns the fake model for the offline demo', () => {
    expect(createLlm(envWith())).toBeInstanceOf(FakeLlm);
  });

  it('returns the Gemini adapter when a key is configured', () => {
    const llm = createLlm(
      envWith({ llmProvider: 'gemini', llmApiKey: 'test-key-123', llmModel: 'gemini-test-flash' }),
    );

    expect(llm).toBeInstanceOf(GeminiLlm);
  });

  it('refuses to start Gemini without a key', () => {
    expect(() => createLlm(envWith({ llmProvider: 'gemini', llmApiKey: '' }))).toThrow(
      'LLM_API_KEY is required',
    );
  });

  it('still rejects a provider with no adapter', () => {
    expect(() => createLlm(envWith({ llmProvider: 'openai', llmApiKey: 'test-key-123' }))).toThrow(
      'has no adapter',
    );
  });

  it('falls back to the default Gemini model when LLM_MODEL is unset', () => {
    const llm = createLlm(
      envWith({ llmProvider: 'gemini', llmApiKey: 'test-key-123', llmModel: '' }),
    );

    expect(llm).toBeInstanceOf(GeminiLlm);
    expect((llm as GeminiLlm).model).toBe('gemini-2.5-flash');
  });

  it('keeps an explicit Gemini model', () => {
    const llm = createLlm(
      envWith({ llmProvider: 'gemini', llmApiKey: 'test-key-123', llmModel: 'gemini-3.8-flash' }),
    );

    expect((llm as GeminiLlm).model).toBe('gemini-3.8-flash');
  });
});
