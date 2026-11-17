# Tasks — progress ledger

Tick a box only when its test passes. Commit and push after every ticked task.
If a session ends, the first unchecked box is where the next session continues.

## Phase 0 — foundation

- [x] P-01 Write `AGENTS.md` (stack, structure, style, test rules, agent safety rules)
- [x] P-02 Create repo structure (`specs/`, `backend/`, `frontend/`, `tests/`, README, `.gitignore`, `.env.example`)

## Phase 1 — specification

- [x] S-01 `specs/spec.md`: user stories for Reporter and Supervisor
- [x] S-02 `specs/spec.md`: functional requirements FR-01..FR-18 with Given/When/Then
- [x] S-03 `specs/spec.md`: non-functional requirements NFR-01..NFR-10
- [x] S-04 `specs/spec.md`: data formats, agent definition, priority + duplicate rules, non-goals

## Phase 2 — plan

- [x] A-01 `specs/plan.md`: architecture, options, ADRs, risk register, database schema
- [x] A-02 `specs/plan.md`: API endpoints with role access
- [x] A-03 `specs/plan.md`: agent design (prompt, tools, 5-call loop, fallback, `LlmClient`)
- [x] A-04 `specs/plan.md`: test strategy

## Phase 3 — task breakdown

- [x] T-00 `specs/tasks.md`: granular implementation tasks with requirement IDs and "done when"

## Phase 4 — implementation

### T-01 Project setup — [NFR-10]
- [x] T-01a `package.json`, TypeScript strict config, Vitest config, lint script
- [x] T-01b **Done when:** `npm install && npm test` runs a smoke test that passes

### T-02 Database and synthetic seed data — [NFR-10, FR-01]
- [x] T-02a Prisma schema with the 6 tables from the plan
- [x] T-02b Repository interfaces + in-memory implementation
- [x] T-02c Prisma repository implementation
- [x] T-02d Seed script with synthetic users, technicians and tickets
- [x] T-02e **Done when:** `npm run db:seed` creates 3 users, 6 technicians, 12 tickets, and a repository test reads them back

### T-03 Form validation — [FR-01, FR-02]
- [x] T-03a Zod schema `newTicketSchema` (title 5–80, description 10–1000, building list, room pattern)
- [x] T-03b Field-level error mapping
- [x] T-03c **Done when:** tests cover every boundary (4/5/80/81 chars, 9/10/1000/1001, bad building, bad room) and assert exact error keys

### T-04 Duplicate rule — [FR-05, NFR-03]
- [x] T-04a Pure `findDuplicate(ticket, candidates, now)` (building + room + category + 48 h)
- [x] T-04b **Done when:** tests cover a match at 2 h, a non-match at 49 h, different room, different category, earliest-wins, empty history

### T-05 Read-only tools — [FR-06, FR-07, FR-08, FR-09]
- [x] T-05a `search_tickets`, `get_ticket_history`, `list_technicians`, `draft_reply`
- [x] T-05b Tool registry with no write tool exposed
- [x] T-05c **Done when:** each tool has tests for filtering, ordering and read-only behaviour; reply ≤ 300 chars

### T-06 Triage agent — [FR-03, FR-04, FR-10, FR-11, FR-17]
- [x] T-06a `LlmClient` interface + `FakeLlm` deterministic policy
- [x] T-06b `runTriage` loop with 5-call cap, Zod validation of output, error fallback
- [x] T-06c Technician verification against the repository
- [x] T-06d AgentRun audit record (tool calls, outcome, duration)
- [x] T-06e **Done when:** tests prove the 5-call cap, the `Other` + `needsHuman` fallback on model error, no writes during a run, and a valid suggestion for an HVAC ticket

### T-07 API and role access — [FR-01, FR-12, FR-13, FR-14, FR-15, FR-16]
- [x] T-07a Token auth (`login`, bearer, `requireRole`)
- [x] T-07b Ticket routes: create + triage, list with role scoping, get one
- [x] T-07c Supervisor routes: approve, edit (override + audit), status transition
- [x] T-07d **Done when:** Supertest tests cover 201/400/401/403/404/409, reporter sees only own tickets, override writes an audit row

### T-08 Frontend — [FR-16, NFR-08]
- [x] T-08a Vite + React app shell, API client, login view
- [x] T-08b Reporter: new ticket form with field errors, my tickets view
- [x] T-08c Supervisor: queue, review with approve/edit/status
- [x] T-08d **Done when:** `npm run build` succeeds and the flow works against the API

### T-09 AI behaviour tests — [NFR-04, NFR-05, FR-18]
- [x] T-09a Repeated-run test: 20 runs, category agreement ≥ 95 %, pass rate printed
- [x] T-09b Metamorphic test: rewording does not change category
- [x] T-09c Prompt-injection test: instruction text does not change category or priority, flags `needsHuman`
- [x] T-09d **Done when:** all three suites pass and the measured pass rate is recorded in the test output

### T-10 Mutation testing — [NFR-06]
- [x] T-10a Stryker config for `domain/` and `agent/tools/`
- [x] T-10b **Done when:** `npm run mutation` produces a report with score ≥ 60 % (measured: 77.10 %)

## Phase 5 — close-out

- [x] C-01a Close the NFR test gaps: validation cost (NFR-01), agent deadline (NFR-02),
      secret scan (NFR-07), accessible UI source (NFR-08), API latency (NFR-09)
- [x] C-01b `specs/traceability.md` (requirement → task → test)
- [x] C-02 README: install, seed, run, test
