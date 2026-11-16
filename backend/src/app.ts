import express from 'express';
import type { ErrorRequestHandler, Express } from 'express';
import type { LlmClient } from './agent/llm';
import type { Repos } from './repositories/types';
import { authenticate, currentUser } from './http/middleware';
import { authRoutes } from './http/routes/auth';
import { ticketRoutes } from './http/routes/tickets';
import { technicianRoutes } from './http/routes/technicians';
import type { AppContext } from './http/context';

export interface CreateAppDeps {
  repos: Repos;
  llm: LlmClient;
  secret: string;
  now?: () => Date;
}

const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof SyntaxError) {
    res.status(400).json({ error: 'INVALID_JSON', message: 'Body is not valid JSON.' });
    return;
  }

  console.error(error);
  res.status(500).json({ error: 'INTERNAL', message: 'Something went wrong.' });
};

export function createApp(deps: CreateAppDeps): Express {
  const ctx: AppContext = {
    repos: deps.repos,
    llm: deps.llm,
    secret: deps.secret,
    now: deps.now ?? (() => new Date()),
  };

  const app = express();
  app.use(express.json({ limit: '32kb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/auth', authRoutes(ctx));

  app.use('/api', authenticate(ctx));
  app.get('/api/me', (_req, res) => {
    res.json({ user: currentUser(res) });
  });
  app.use('/api/tickets', ticketRoutes(ctx));
  app.use('/api/technicians', technicianRoutes(ctx));

  app.use((_req, res) => {
    res.status(404).json({ error: 'NOT_FOUND', message: 'Unknown endpoint.' });
  });
  app.use(errorHandler);

  return app;
}
