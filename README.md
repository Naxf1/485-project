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

## Run it (step by step)

Six steps from a fresh clone to a running app. Steps 1–4 use the built-in fake model, so
everything works with no key and no network; step 5 puts Gemini in the loop.

### 1. Prerequisites

- Node.js 24 (any current LTS works) and npm 10+
- git
- For step 5 only: a free Gemini API key from <https://aistudio.google.com> — "Get API key",
  no credit card

### 2. Clone and install

```bash
git clone https://github.com/Naxf1/485-project.git
cd 485-project
npm install
```

### 3. Create `.env` and the database

```bash
cp .env.example .env      # Windows: copy .env.example .env
npm run db:generate       # Prisma client
npm run db:push           # create the SQLite schema
npm run db:seed           # 3 users, 6 technicians, 12 tickets, suggestions
```

`db:seed` prints the row counts it created. The database file is `backend/prisma/dev.db` and
is git-ignored.

### 4. Build and start

```bash
npm run build             # lint + frontend type-check + Vite build into frontend/dist
npm start                 # http://localhost:3000
```

Startup prints the active provider, for example:

```
Triage API listening on http://localhost:3000 (LLM: fake / deterministic fake)
```

For hot reload instead of a build, use two terminals:

```bash
npm run dev               # API on http://localhost:3000
npm run dev:web           # UI on http://localhost:5173 (proxies /api to 3000)
```

### 5. Switch the agent to Gemini

Add the key to `.env` and change two lines — nothing else in the project moves:

```bash
# .env
LLM_PROVIDER=gemini
LLM_MODEL=gemini-3.5-flash-lite     # any Gemini model id; empty falls back to this default
LLM_API_KEY=your-key-from-aistudio.google.com
```

Restart `npm start`. `.env` is read once at startup, and real environment variables win over the
file, so `LLM_PROVIDER=gemini npm start` also works for a one-off run (PowerShell:
`$env:LLM_PROVIDER="gemini"; npm start`).

The startup line must now read:

```
Triage API listening on http://localhost:3000 (LLM: gemini / gemini-3.5-flash-lite)
```

That line is the proof the real model is in the loop — if it still says `fake`, the provider did
not load. Real keys never belong in the repository: `.env` is git-ignored and the test suite
always uses `FakeLlm`, so `npm test` needs no key.

The adapter (`backend/src/agent/gemini-llm.ts`) talks to Gemini's OpenAI-compatible endpoint, so
`LLM_BASE_URL` can point at any compatible server instead. Everything around it is unchanged: the
same four read-only tools, the 5-call cap, the 15 s deadline, Zod validation of the output and the
`Other` + `needsHuman` fallback. Free-tier limits (roughly 10 requests/minute, 1,500/day) return
`LLM_HTTP_429`, which the loop turns into a fallback suggestion flagged for a human.

### 6. Confirm the model is really answering

Open <http://localhost:3000>, sign in as `U-17`, and submit a ticket for **Building 6 / 2A-15**
describing a broken AC. A real run takes 3–11 s — one model call per tool step — while the fake
model answers instantly, so latency is the quickest tell.

Measured with `gemini-3.5-flash-lite` on 2026-11-17: one AC ticket → `HVAC` / `High`, duplicate
`T-1038`, technician `TECH-01`, 2 tool calls, 3.6 s, `needsHuman: false`.

From a terminal instead of the UI:

```bash
curl http://localhost:3000/api/health        # {"status":"ok"}

TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "content-type: application/json" -d '{"userId":"U-17"}' | jq -r .token)

curl -s -X POST http://localhost:3000/api/tickets \
  -H "content-type: application/json" -H "Authorization: Bearer $TOKEN" \
  -d '{"title":"AC not cooling","description":"The AC in room 2A-15 is not cooling and the room is very hot.","building":"Building 6","room":"2A-15"}'
```

### If something goes wrong

| Symptom | Cause and fix |
|---|---|
| `LLM_API_KEY is required` | provider is `gemini` but the key line in `.env` is empty |
| `LLM_HTTP_401` | wrong or revoked key |
| `LLM_HTTP_404 ... no longer available` | that model is closed to new keys — set `LLM_MODEL=gemini-3.5-flash-lite` |
| `LLM_HTTP_503` | model overloaded — retry, or pick another id |
| `LLM_HTTP_429` | free-tier quota hit (about 10 requests/minute); wait a minute |
| Suggestion is `Other` + `needsHuman: true` | the run failed or passed the 15 s deadline; `GET /api/tickets/:id` shows the run and its error |
| `EADDRINUSE :::3000` | an earlier server still holds the port — stop it and start again |

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
npm test          # 229 tests, ~1.7 s, no network
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
| `LLM_MODEL` | `gemini-3.5-flash-lite` for gemini | model id; `fake-triage-v1` is ignored by the Gemini adapter |
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
