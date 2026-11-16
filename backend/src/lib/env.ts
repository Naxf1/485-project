export type LlmProvider = 'fake' | 'openai' | 'anthropic';

export interface Env {
  port: number;
  sessionSecret: string;
  llmProvider: LlmProvider;
  databaseUrl: string;
}

const DEV_SECRET = 'dev-only-secret-do-not-use-in-production';

export function readEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const port = Number.parseInt(source.PORT ?? '3000', 10);
  const llmProvider = (source.LLM_PROVIDER ?? 'fake') as LlmProvider;
  const sessionSecret = source.SESSION_SECRET ?? '';

  if (!sessionSecret && source.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET is required in production.');
  }

  return {
    port: Number.isFinite(port) ? port : 3000,
    sessionSecret: sessionSecret || DEV_SECRET,
    llmProvider,
    databaseUrl: source.DATABASE_URL ?? 'file:./dev.db',
  };
}
