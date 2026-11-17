# Fixlane

An agent that suggests, a supervisor who decides.

## Campus Maintenance Ticket Triage Agent

SWE 485 course project (King Saud University). A reporter submits a maintenance ticket; one
AI triage agent reads it, uses read-only tools to look at recent tickets, room history and
available technicians, and returns a **suggestion** — category, priority, possible duplicate,
technician, draft reply and a short reason. A supervisor **approves or edits** that suggestion
before anything is saved or assigned. The agent never writes.

- Rules for humans and agents working here: [`AGENTS.md`](AGENTS.md)
- Requirements (FR/NFR, user stories, acceptance scenarios): [`specs/spec.md`](specs/spec.md)
- Architecture, schema, API, agent design: [`specs/plan.md`](specs/plan.md)
- Task ledger with progress: [`specs/tasks.md`](specs/tasks.md)
- Requirement → task → test matrix: [`specs/traceability.md`](specs/traceability.md)

All data is synthetic: three fictional users, six technicians and twelve tickets. There is no
connection to any real KSU system.

## Requirements

- Node.js 24 (any current LTS works)
- npm 10+

## Install and seed

```bash
npm install
cp .env.example .env      # Windows: copy .env.example .env
npm run db:generate       # Prisma client
npm run db:push           # create the SQLite schema
npm run db:seed           # 3 users, 6 technicians, 12 tickets, suggestions
```

`db:seed` prints the row counts it created. The database file is `backend/prisma/dev.db` and
is git-ignored.

## Run

**Single server (built frontend, one port).** This is the demo path:

```bash
npm run build             # lint + frontend type-check + Vite build into frontend/dist
npm start                 # http://localhost:3000
```

**Development (two terminals, hot reload):**

```bash
npm run dev               # API on http://localhost:3000
npm run dev:web           # UI on http://localhost:5173 (proxies /api to 3000)
```

### Run with a real model (Gemini)

`LLM_PROVIDER=fake` is the default: a deterministic stand-in, no network. To run the same agent
loop against a real model, put a free Gemini key in `.env` and switch the provider:

```bash
# .env
LLM_PROVIDER=gemini
LLM_MODEL=gemini-2.5-flash     # any Gemini model id; empty falls back to this default
LLM_API_KEY=your-key-from-aistudio.google.com
```

Get a key at <https://aistudio.google.com> ("Get API key", no credit card). `npm start` loads
`.env` itself and prints the active provider and model on startup. Real keys never belong in the
repository: `.env` is git-ignored and tests always use `FakeLlm`.

The adapter (`backend/src/agent/gemini-llm.ts`) talks to Gemini's OpenAI-compatible endpoint, so
`LLM_BASE_URL` can point at any compatible server instead. Everything around it is unchanged: the
same four read-only tools, the 5-call cap, the 15 s deadline, Zod validation of the output and the
`Other` + `needsHuman` fallback. Free-tier limits (roughly 10 requests/minute, 1,500/day) return
`LLM_HTTP_429`, which the loop turns into a fallback suggestion flagged for a human.

### Sign in

There is no password. Pick one of the seeded users, which stands in for a session:

| User | Role | Use |
|---|---|---|
| `U-17` — Sara Al-Harbi | reporter | submit tickets, see own tickets |
| `U-18` — Omar Al-Qahtani | reporter | second reporter, for the isolation demo |
| `SUP-01` — Khalid Al-Otaibi | supervisor | queue, approve, edit, change status |

### Five-minute demo

1. Sign in as `U-17`, submit a ticket for **Building 6 / 2A-15** describing a broken AC.
   The agent suggests `HVAC` / `High` and points at the seeded duplicate from two hours ago.
2. Sign out, sign in as `SUP-01`. The ticket is in the queue with the suggestion and reason.
3. Approve one ticket unchanged; on another, change the technician or priority and save — that
   ticket is marked as a human override and an audit entry is written.
4. Move an approved ticket through `InProgress` → `Resolved`.
5. Sign back in as `U-17` to see the new status.

## Tests

```bash
npm test          # 227 tests, ~1.7 s, no network
npm run lint      # TypeScript strict check
npm run mutation  # Stryker on domain/ and agent/tools/ (~2 min, report in reports/mutation)
```
| Suite | What it proves |
|---|---|
| `tests/unit/` | validation boundaries, priority rules, duplicate rule, the four read-only tools, the agent loop, the Gemini adapter, env parsing |
| `tests/integration/` | API status codes 201/400/401/403/404/409, role isolation, approval, override + audit, NFR checks |
| `tests/ai/` | repeated-run stability, metamorphic rewording, prompt-injection resistance |

Recorded evidence (2026-11-17):

- Category agreement over 10 tickets × 20 runs: **100.0 %** (requirement ≥ 95 %).
- Mutation score on `domain/` + `agent/tools/`: **77.10 %** (requirement ≥ 60 %).
- Prompt-injection fixtures: **100 %** keep the content-derived category and priority and are
  flagged `needsHuman: true`.

The model is always faked in tests through the `LlmClient` interface (`FakeLlm`), so runs are
deterministic and offline; the Gemini adapter is tested against a stubbed `fetch`.

## Agent safety rules

| Rule | Implementation |
|---|---|
| Read-only tools | `search_tickets`, `get_ticket_history`, `list_technicians` only read; `draft_reply` returns text and sends nothing |
| Max 5 tool calls | the loop stops at 5 and sets `needsHuman: true` |
| Hard deadline | 15 s per run (`AGENT_TIMEOUT_MS`, override with `LLM_TIMEOUT_MS`); a hung model falls back |
| No side effects | the model output is parsed with Zod; invalid output falls back to `Other` + `needsHuman: true` |
| Human approval | a supervisor must approve or edit before a ticket is saved, assigned or marked duplicate |
| Injection resistance | instruction-like sentences in ticket text are stripped before classification and the run is flagged |

## API

Ten endpoints, two roles. Bearer token from `POST /api/auth/login`.

| Method | Path | Role | Purpose |
|---|---|---|---|
| GET | `/api/health` | none | liveness |
| POST | `/api/auth/login` | none | `{ userId }` → `{ token, user }` |
| GET | `/api/me` | any | current user |
| POST | `/api/tickets` | reporter | validate, create, triage |
| GET | `/api/tickets` | any | reporter: own tickets; supervisor: all |
| GET | `/api/tickets/:id` | any | one ticket with its suggestion |
| POST | `/api/tickets/:id/approve` | supervisor | approve the suggestion → `Assigned` |
| POST | `/api/tickets/:id/edit` | supervisor | override fields, writes an audit entry |
| POST | `/api/tickets/:id/status` | supervisor | lifecycle transition |
| GET | `/api/technicians` | supervisor | technicians for assignment |

Ticket status: `New → Triaged → Assigned → InProgress → Resolved`, or `New → Duplicate`.
An illegal transition is rejected with `409`.

## Configuration

`.env` is git-ignored; `.env.example` holds placeholders only.

| Variable | Default | Meaning |
|---|---|---|
| `PORT` | `3000` | API port |
| `DATABASE_URL` | `file:./dev.db` | SQLite file (relative to `backend/prisma`) |
| `LLM_PROVIDER` | `fake` | `fake` (deterministic, offline) or `gemini` (real model) |
| `LLM_MODEL` | `gemini-2.5-flash` for gemini | model id; `fake-triage-v1` is ignored by the Gemini adapter |
| `LLM_API_KEY` | — | required when `LLM_PROVIDER=gemini`; never commit it |
| `LLM_BASE_URL` | Gemini OpenAI-compatible endpoint | override for any OpenAI-compatible server |
| `LLM_TIMEOUT_MS` | `15000` | hard deadline for one agent run |
| `SESSION_SECRET` | dev fallback | required when `NODE_ENV=production` |

## Project structure

```
backend/src/
  domain/        pure rules: validation, priority, duplicate, injection stripping
  agent/         LlmClient, FakeLlm, GeminiLlm, prompt, read-only tools, triage loop
  http/          Express app, token auth, role middleware, routes
  repositories/  in-memory and Prisma implementations behind one interface
backend/prisma/  schema, seed script, synthetic seed data
frontend/src/    React + Vite: login, new ticket, my tickets, queue, review
tests/           unit, integration, ai, fixtures
specs/           spec, plan, tasks, traceability
```

## Non-goals

No real KSU data or systems, no automatic assignment without human approval, no email or SMS,
no mobile app, no image uploads, and exactly one agent — never a multi-agent setup.
