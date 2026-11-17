import { existsSync, readFileSync } from 'node:fs';
import { AGENT_TIMEOUT_MS } from './constants';

export const LLM_PROVIDERS = ['fake', 'gemini', 'openai', 'anthropic'] as const;

export type LlmProvider = (typeof LLM_PROVIDERS)[number];

export interface Env {
  port: number;
  sessionSecret: string;
  llmProvider: LlmProvider;
  /** Key for the selected provider; empty for the fake model. */
  llmApiKey: string;
  /** Model id; empty means "use the provider default". */
  llmModel: string;
  /** Optional override for an OpenAI-compatible endpoint. */
  llmBaseUrl: string;
  databaseUrl: string;
  /** Hard deadline for one agent run in milliseconds (NFR-02). */
  llmTimeoutMs: number;
}

const DEV_SECRET = 'dev-only-secret-do-not-use-in-production';

const isProvider = (value: string): value is LlmProvider =>
  (LLM_PROVIDERS as readonly string[]).includes(value);

export function readEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const port = Number.parseInt(source.PORT ?? '3000', 10);
  const providerName = source.LLM_PROVIDER ?? 'fake';
  const sessionSecret = source.SESSION_SECRET ?? '';
  const rawTimeout = Number.parseInt(source.LLM_TIMEOUT_MS ?? '', 10);

  if (!isProvider(providerName)) {
    throw new Error(
      `LLM_PROVIDER=${providerName} is not a known provider (${LLM_PROVIDERS.join(' | ')}).`,
    );
  }

  if (!sessionSecret && source.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET is required in production.');
  }

  return {
    port: Number.isFinite(port) ? port : 3000,
    sessionSecret: sessionSecret || DEV_SECRET,
    llmProvider: providerName,
    llmApiKey: source.LLM_API_KEY ?? '',
    llmModel: source.LLM_MODEL ?? '',
    llmBaseUrl: source.LLM_BASE_URL ?? '',
    databaseUrl: source.DATABASE_URL ?? 'file:./dev.db',
    llmTimeoutMs: Number.isFinite(rawTimeout) && rawTimeout > 0 ? rawTimeout : AGENT_TIMEOUT_MS,
  };
}

/**
 * Load a `.env` file into `target` without adding a dependency. Values already set in
 * the real environment win, so `LLM_PROVIDER=gemini npm start` still overrides the file.
 */
export function loadDotEnv(path = '.env', target: NodeJS.ProcessEnv = process.env): void {
  if (!existsSync(path)) return;

  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const separator = trimmed.indexOf('=');
    if (separator <= 0) continue;

    const key = trimmed.slice(0, separator).trim();
    if (!key || target[key] !== undefined) continue;

    let value = trimmed.slice(separator + 1).trim();
    const quoted =
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"));
    if (quoted && value.length >= 2) value = value.slice(1, -1);

    target[key] = value;
  }
}
