import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaClient } from '@prisma/client';
import { createApp } from './app';
import { createLlm } from './agent/create-llm';
import { loadDotEnv, readEnv } from './lib/env';
import { createPrismaRepos } from './repositories/prisma';

loadDotEnv();

const env = readEnv();
const llm = createLlm(env);

const prisma = new PrismaClient();
const staticDir = join(process.cwd(), 'frontend', 'dist');

const app = createApp({
  repos: createPrismaRepos(prisma),
  llm,
  secret: env.sessionSecret,
  agentTimeoutMs: env.llmTimeoutMs,
  ...(existsSync(staticDir) ? { staticDir } : {}),
});

const server = app.listen(env.port, () => {
  const model = 'model' in llm ? String(llm.model) : 'deterministic fake';
  console.log(`Triage API listening on http://localhost:${env.port} (LLM: ${env.llmProvider} / ${model})`);
});

const shutdown = (): void => {
  server.close(() => {
    void prisma.$disconnect();
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
