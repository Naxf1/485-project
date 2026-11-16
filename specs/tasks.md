# Tasks — progress ledger

Tick a box only when its test passes. Commit and push after every ticked task.
If a session ends, the first unchecked box is where the next session continues.

## Phase 0 — foundation

- [x] P-01 Write `AGENTS.md` (stack, structure, style, test rules, agent safety rules)
- [x] P-02 Create repo structure (`specs/`, `backend/`, `frontend/`, `tests/`, README, `.gitignore`, `.env.example`)

## Phase 1 — specification (step 3)

- [x] S-01 `specs/spec.md`: user stories for Reporter and Supervisor
- [x] S-02 `specs/spec.md`: functional requirements FR-01..FR-18 with Given/When/Then
- [x] S-03 `specs/spec.md`: non-functional requirements NFR-01..NFR-10
- [x] S-04 `specs/spec.md`: data formats, agent definition, priority + duplicate rules, non-goals

## Phase 2 — plan (step 4)

- [ ] A-01 `specs/plan.md`: architecture and database schema
- [ ] A-02 `specs/plan.md`: API endpoints with role access
- [ ] A-03 `specs/plan.md`: agent design (prompt, tools, 5-call loop, fallback, `LlmClient` interface)
- [ ] A-04 `specs/plan.md`: test strategy

## Phase 3 — task breakdown (step 5)

- [ ] T-00 `specs/tasks.md`: granular implementation tasks, each with requirement ID and "done when" test

## Phase 4 — implementation (step 6)

- [ ] T-01 Project setup: TypeScript, Express, Vitest, Prisma, Zod, lint
- [ ] T-02 Database schema + synthetic seed data
- [ ] T-03 Form validation [FR-xx]
- [ ] T-04 Duplicate rule [FR-05]
- [ ] T-05 Read-only tools: `search_tickets`, `get_ticket_history`, `list_technicians` [FR-06..FR-08]
- [ ] T-06 Agent loop with 5-call cap and error fallback [FR-09..FR-12]
- [ ] T-07 API endpoints + role access [FR-13..FR-16]
- [ ] T-08 Frontend: reporter form + supervisor review [FR-17..FR-18]
- [ ] T-09 AI tests: repeated-run, metamorphic, prompt-injection
- [ ] T-10 Mutation testing with Stryker

## Phase 5 — close-out (step 7)

- [ ] C-01 `specs/traceability.md` (requirement → task → test)
- [ ] C-02 README: install, seed, run, test
