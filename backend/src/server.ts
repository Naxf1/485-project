import { PrismaClient } from '@prisma/client';
import { createApp } from './app';
import { FakeLlm } from './agent/fake-llm';
import { readEnv } from './lib/env';
import { createPrismaRepos } from './repositories/prisma';

const env = readEnv();

if (env.llmProvider !== 'fake') {
  throw new Error(
    `LLM_PROVIDER=${env.llmProvider} has no adapter in this build. ` +
      'Set LLM_PROVIDER=fake to run the offline demo.',
  );
}

const prisma = new PrismaClient();
const app = createApp({
  repos: createPrismaRepos(prisma),
  llm: new FakeLlm(),
  secret: env.sessionSecret,
});

const server = app.listen(env.port, () => {
  console.log(`Triage API listening on http://localhost:${env.port}`);
});

const shutdown = (): void => {
  server.close(() => {
    void prisma.$disconnect();
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
