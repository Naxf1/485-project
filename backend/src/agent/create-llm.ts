import type { Env } from '../lib/env';
import { FakeLlm } from './fake-llm';
import { DEFAULT_GEMINI_MODEL, GeminiLlm } from './gemini-llm';
import type { LlmClient } from './llm';

const FAKE_MODEL = 'fake-triage-v1';

/**
 * Pick the model client from the environment (FR-19). `fake` stays the default so
 * tests and the offline demo never touch the network.
 */
export function createLlm(env: Env): LlmClient {
  if (env.llmProvider === 'fake') return new FakeLlm();

  if (env.llmProvider === 'gemini') {
    if (!env.llmApiKey) {
      throw new Error(
        'LLM_API_KEY is required when LLM_PROVIDER=gemini. ' +
          'Create a free key at https://aistudio.google.com and put it in .env.',
      );
    }

    const model = env.llmModel && env.llmModel !== FAKE_MODEL ? env.llmModel : DEFAULT_GEMINI_MODEL;

    return new GeminiLlm({
      apiKey: env.llmApiKey,
      model,
      timeoutMs: env.llmTimeoutMs,
      ...(env.llmBaseUrl ? { baseUrl: env.llmBaseUrl } : {}),
    });
  }

  throw new Error(
    `LLM_PROVIDER=${env.llmProvider} has no adapter in this build. ` +
      'Use LLM_PROVIDER=fake or LLM_PROVIDER=gemini.',
  );
}
