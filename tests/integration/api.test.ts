import { describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../../backend/src/app';
import { FakeLlm } from '../../backend/src/agent/fake-llm';
import { createInMemoryRepos } from '../../backend/src/repositories/in-memory';
import { buildSeedData } from '../../backend/prisma/seed-data';
import type { Repos } from '../../backend/src/repositories/types';

const now = new Date('2026-10-20T12:00:00.000Z');
const secret = 'test-secret';

const setup = (): { app: Express; repos: Repos } => {
  const repos = createInMemoryRepos(buildSeedData(now));
  const app = createApp({ repos, llm: new FakeLlm(), secret, now: () => now });
  return { app, repos };
};

const login = async (app: Express, userId: string): Promise<string> => {
  const response = await request(app).post('/api/auth/login').send({ userId });
  return response.body.token as string;
};

const validTicket = {
  title: 'AC not cooling in 2A-05',
  description: 'The AC in room 2A-05 is not cooling and the room is very hot.',
  building: 'Building 2',
  room: '2A-05',
};

describe('health and login [NFR-10, FR-14]', () => {
  it('reports health without a token', async () => {
    const { app } = setup();
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('returns a token and the user for a known id', async () => {
    const { app } = setup();
    const response = await request(app).post('/api/auth/login').send({ userId: 'U-17' });

    expect(response.status).toBe(200);
    expect(response.body.user).toEqual({ id: 'U-17', name: 'Sara Al-Harbi', role: 'reporter' });
    expect(typeof response.body.token).toBe('string');
  });

  it('rejects an unknown user with 401', async () => {
    const { app } = setup();
    const response = await request(app).post('/api/auth/login').send({ userId: 'U-404' });

    expect(response.status).toBe(401);
  });

  it('rejects a missing user id with 400', async () => {
    const { app } = setup();
    const response = await request(app).post('/api/auth/login').send({});

    expect(response.status).toBe(400);
  });

  it('returns the current user for a valid token', async () => {
    const { app } = setup();
    const token = await login(app, 'SUP-01');
    const response = await request(app).get('/api/me').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.user.role).toBe('supervisor');
  });
});

describe('submitting a ticket [FR-01, FR-02, FR-03]', () => {
  it('requires a token', async () => {
    const { app } = setup();
    const response = await request(app).post('/api/tickets').send(validTicket);

    expect(response.status).toBe(401);
  });

  it('creates a triaged ticket with a suggestion for a reporter', async () => {
    const { app, repos } = setup();
    const token = await login(app, 'U-17');

    const response = await request(app)
      .post('/api/tickets')
      .set('Authorization', `Bearer ${token}`)
      .send(validTicket);

    expect(response.status).toBe(201);
    expect(response.body.ticket.status).toBe('Triaged');
    expect(response.body.ticket.reporterId).toBe('U-17');
    expect(response.body.suggestion.category).toBe('HVAC');
    expect(response.body.suggestion.priority).toBe('High');
    const stored = await repos.suggestions.findByTicketId(response.body.ticket.id);
    expect(stored?.category).toBe('HVAC');
  });

  it('rejects invalid input with field errors and runs no agent [FR-02]', async () => {
    const { app, repos } = setup();
    const token = await login(app, 'U-17');
    const before = (await repos.tickets.list()).length;

    const response = await request(app)
      .post('/api/tickets')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...validTicket, title: '' });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('VALIDATION_FAILED');
    expect(response.body.fieldErrors.title).toBeDefined();
    expect((await repos.tickets.list()).length).toBe(before);
  });

  it('refuses a supervisor submission with 403', async () => {
    const { app } = setup();
    const token = await login(app, 'SUP-01');

    const response = await request(app)
      .post('/api/tickets')
      .set('Authorization', `Bearer ${token}`)
      .send(validTicket);

    expect(response.status).toBe(403);
  });
});

describe('reading tickets [FR-14, FR-16]', () => {
  it('shows a reporter only their own tickets', async () => {
    const { app } = setup();
    const token = await login(app, 'U-17');

    const response = await request(app)
      .get('/api/tickets')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.tickets.length).toBeGreaterThan(0);
    for (const ticket of response.body.tickets) {
      expect(ticket.reporterId).toBe('U-17');
    }
  });

  it('shows a supervisor every ticket with its suggestion', async () => {
    const { app } = setup();
    const token = await login(app, 'SUP-01');

    const response = await request(app)
      .get('/api/tickets')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.tickets).toHaveLength(12);
    const queued = response.body.tickets.find((ticket: { id: string }) => ticket.id === 'T-1048');
    expect(queued.suggestion.category).toBe('HVAC');
  });

  it('hides another reporter ticket with 403', async () => {
    const { app } = setup();
    const token = await login(app, 'U-17');

    const response = await request(app)
      .get('/api/tickets/T-1038')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(403);
  });

  it('returns 404 for an unknown ticket', async () => {
    const { app } = setup();
    const token = await login(app, 'SUP-01');

    const response = await request(app)
      .get('/api/tickets/T-9999')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(404);
  });

  it('returns one ticket with its suggestion to its owner', async () => {
    const { app } = setup();
    const token = await login(app, 'U-17');

    const response = await request(app)
      .get('/api/tickets/T-1048')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.ticket.id).toBe('T-1048');
    expect(response.body.suggestion.needsHuman).toBe(false);
  });
});

describe('supervisor approval and override [FR-12, FR-13]', () => {
  it('refuses approval by a reporter with 403', async () => {
    const { app } = setup();
    const token = await login(app, 'U-17');

    const response = await request(app)
      .post('/api/tickets/T-1048/approve')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(403);
  });

  it('approves a suggestion and assigns the ticket', async () => {
    const { app, repos } = setup();
    const token = await login(app, 'SUP-01');

    const response = await request(app)
      .post('/api/tickets/T-1048/approve')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.ticket.status).toBe('Assigned');
    expect(response.body.ticket.category).toBe('HVAC');
    expect(response.body.ticket.assignedTo).toBe('TECH-01');
    expect(response.body.ticket.approvedBy).toBe('SUP-01');
    expect(response.body.ticket.humanOverride).toBe(false);
    const audit = await repos.audit.listByTicket('T-1048');
    expect(audit).toHaveLength(1);
  });

  it('refuses a second approval with 409', async () => {
    const { app } = setup();
    const token = await login(app, 'SUP-01');

    await request(app).post('/api/tickets/T-1048/approve').set('Authorization', `Bearer ${token}`);
    const response = await request(app)
      .post('/api/tickets/T-1048/approve')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(409);
  });

  it('records a human override when the supervisor edits a field', async () => {
    const { app, repos } = setup();
    const token = await login(app, 'SUP-01');

    const response = await request(app)
      .post('/api/tickets/T-1048/edit')
      .set('Authorization', `Bearer ${token}`)
      .send({ priority: 'Urgent', assignedTo: 'TECH-03' });

    expect(response.status).toBe(200);
    expect(response.body.ticket.humanOverride).toBe(true);
    expect(response.body.ticket.priority).toBe('Urgent');
    expect(response.body.ticket.assignedTo).toBe('TECH-03');
    const audit = await repos.audit.listByTicket('T-1048');
    expect(audit.map((entry) => entry.field).sort()).toEqual(['assignedTo', 'priority']);
    expect(audit[0]?.actorId).toBe('SUP-01');
  });

  it('rejects an invalid edit with 400', async () => {
    const { app } = setup();
    const token = await login(app, 'SUP-01');

    const response = await request(app)
      .post('/api/tickets/T-1048/edit')
      .set('Authorization', `Bearer ${token}`)
      .send({ category: 'Roofing' });

    expect(response.status).toBe(400);
  });
});

describe('status lifecycle [FR-15]', () => {
  it('moves an assigned ticket to InProgress', async () => {
    const { app } = setup();
    const token = await login(app, 'SUP-01');

    const response = await request(app)
      .post('/api/tickets/T-1038/status')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'InProgress' });

    expect(response.status).toBe(200);
    expect(response.body.ticket.status).toBe('InProgress');
  });

  it('refuses an illegal transition with 409', async () => {
    const { app } = setup();
    const token = await login(app, 'SUP-01');

    const response = await request(app)
      .post('/api/tickets/T-1038/status')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'New' });

    expect(response.status).toBe(409);
  });

  it('refuses an unknown status with 400', async () => {
    const { app } = setup();
    const token = await login(app, 'SUP-01');

    const response = await request(app)
      .post('/api/tickets/T-1038/status')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'Cancelled' });

    expect(response.status).toBe(400);
  });

  it('refuses a status change by a reporter with 403', async () => {
    const { app } = setup();
    const token = await login(app, 'U-17');

    const response = await request(app)
      .post('/api/tickets/T-1038/status')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'InProgress' });

    expect(response.status).toBe(403);
  });
});

describe('technicians [FR-08]', () => {
  it('lists technicians for a supervisor', async () => {
    const { app } = setup();
    const token = await login(app, 'SUP-01');

    const response = await request(app)
      .get('/api/technicians')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.technicians).toHaveLength(6);
  });

  it('refuses a reporter with 403', async () => {
    const { app } = setup();
    const token = await login(app, 'U-17');

    const response = await request(app)
      .get('/api/technicians')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(403);
  });
});
