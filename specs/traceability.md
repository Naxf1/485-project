# Traceability — requirement → task → test

Every requirement in `specs/spec.md` maps to at least one automated test (AGENTS.md §5).
Measured on 2026-11-17: **14 test files, 187 tests, 1.4 s** (`npm test`).

Paths are relative to the repository root. Test counts are the tests in the named `describe`
block, not the whole file.

## 1. User stories

| Story | Requirement(s) | View | Test |
|---|---|---|---|
| US-01 submit a ticket | FR-01 | `frontend/src/views/NewTicketView.tsx` | `tests/integration/api.test.ts` › creates a triaged ticket… |
| US-02 field errors | FR-02 | `NewTicketView.tsx` | `tests/unit/validation.test.ts`, `api.test.ts` › rejects invalid input… |
| US-03 see own status | FR-16 | `MyTicketsView.tsx` | `api.test.ts` › shows a reporter only their own tickets |
| US-04 classified without waiting | FR-03, FR-04 | `NewTicketView.tsx` | `tests/unit/agent.test.ts` › classifies an HVAC ticket… |
| US-05 queue with suggestion | FR-16, FR-12 | `QueueView.tsx` | `api.test.ts` › shows a supervisor every ticket… |
| US-06 approve unchanged | FR-12 | `ReviewView.tsx` | `api.test.ts` › approves a suggestion and assigns the ticket |
| US-07 edit before saving | FR-13 | `ReviewView.tsx` | `api.test.ts` › records a human override… |
| US-08 see human corrections | FR-13 | `ReviewView.tsx` | `api.test.ts` › records a human override… (asserts `humanOverride` + audit) |
| US-09 move through lifecycle | FR-15 | `ReviewView.tsx` | `api.test.ts` › status lifecycle (4 tests) |

## 2. Functional requirements

| ID | Task | Test file | Tests | Status |
|---|---|---|---|---|
| FR-01 Submit a ticket | T-02, T-07 | `tests/unit/repositories.test.ts`, `tests/unit/seed-data.test.ts`, `tests/integration/api.test.ts` | sequential ids, T-1001 start, store/read, twelve `T-####` ids, creates a triaged ticket | covered |
| FR-02 Reject invalid input | T-03, T-07 | `tests/unit/validation.test.ts`, `tests/unit/constants.test.ts`, `tests/integration/api.test.ts`, `tests/integration/nfr.test.ts` | 13 boundary tests (4/5/80/81, 9/10/1000/1001, building, room), room pattern, field errors, zero agent calls | covered |
| FR-03 Suggest a category | T-06 | `tests/unit/agent.test.ts`, `tests/unit/constants.test.ts` | classifies an HVAC ticket, exactly seven categories | covered |
| FR-04 Suggest a priority | T-06 | `tests/unit/priority.test.ts`, `tests/unit/constants.test.ts`, `tests/unit/agent.test.ts` | 15 rule tests, four levels, happy path | covered |
| FR-05 Duplicate by plain code | T-04, T-06 | `tests/unit/duplicate.test.ts`, `tests/unit/agent.test.ts`, `tests/unit/seed-data.test.ts` | 12 rule tests (2 h, 48 h, 49 h, room, building, category, earliest, empty, future, no category, 100-run determinism), model value ignored and recomputed | covered |
| FR-06 `search_tickets` | T-05 | `tests/unit/tools.test.ts` | 5 tests (newest first, window, default 48 h, category, empty) | covered |
| FR-07 `get_ticket_history` | T-05 | `tests/unit/tools.test.ts`, `tests/unit/repositories.test.ts` | room history newest first with documented fields, unknown room, repository filter by building + room | covered |
| FR-08 `list_technicians` | T-05, T-07 | `tests/unit/tools.test.ts`, `tests/unit/repositories.test.ts`, `tests/integration/api.test.ts`, `tests/unit/seed-data.test.ts` | skill + availability filter, empty list, API list, 403 for a reporter, six seeded technicians | covered |
| FR-09 `draft_reply` | T-05 | `tests/unit/tools.test.ts` | names the room, ≤ 300 chars, unknown ticket fails without throwing | covered |
| FR-10 Stopping conditions | T-06 | `tests/unit/agent.test.ts`, `tests/unit/constants.test.ts` | stops after exactly 5 calls, timeout fallback, `Other` on model error, cap constant | covered |
| FR-11 Agent cannot write | T-05, T-06 | `tests/unit/tools.test.ts`, `tests/unit/agent.test.ts` | registry exposes only four tools, no write tool, `TOOL_NOT_ALLOWED`, repositories unchanged, never writes a ticket or suggestion | covered |
| FR-12 Supervisor approves | T-07 | `tests/integration/api.test.ts`, `tests/unit/repositories.test.ts`, `tests/unit/seed-data.test.ts` | approves and assigns, second approval 409, suggestion replaced, every `New` ticket has a suggestion | covered |
| FR-13 Supervisor edits | T-07 | `tests/integration/api.test.ts` | human override recorded, invalid edit 400 | covered |
| FR-14 Role-based access | T-07 | `tests/integration/api.test.ts`, `tests/unit/seed-data.test.ts`, `tests/unit/repositories.test.ts` | login 200/401/400, `me`, missing token 401, reporter 403 on submit/approve/status/technicians, reporter isolation, two reporters + one supervisor | covered |
| FR-15 Ticket lifecycle | T-07 | `tests/integration/api.test.ts` | Assigned → InProgress, illegal transition 409, unknown status 400, reporter 403 | covered |
| FR-16 Reporter sees status | T-07, T-08 | `tests/integration/api.test.ts`, `tests/unit/repositories.test.ts` | own tickets only, one ticket with suggestion, other reporter 403, list filter by reporter | covered |
| FR-17 Agent run audit | T-06 | `tests/unit/agent.test.ts` | four tool calls and an `ok` run with duration | covered |
| FR-18 Injection resistance | T-05, T-09 | `tests/unit/injection.test.ts`, `tests/unit/agent.test.ts`, `tests/ai/injection.test.ts` | 56 stripping tests, instruction text treated as data, 3 AI-level fixture tests | covered |

## 3. Non-functional requirements

| ID | Task | Test / evidence | Measure | Status |
|---|---|---|---|---|
| NFR-01 Validation is fast and cheap | T-03, C-01a | `tests/integration/nfr.test.ts` › validation cost (2 tests) | 100 invalid submissions < 100 ms, zero model calls | covered |
| NFR-02 Agent runtime is bounded | T-06, C-01a | `tests/unit/agent.test.ts` › agent timeout (2 tests) | ≤ 5 tool calls, 15 s hard deadline (`AGENT_TIMEOUT_MS`), hung model falls back | covered |
| NFR-03 Rules are deterministic | T-04 | `tests/unit/duplicate.test.ts` › is deterministic across 100 runs | identical result over 100 runs | covered |
| NFR-04 AI output is stable | T-09 | `tests/ai/repeated-run.test.ts`, `tests/ai/metamorphic.test.ts` | 10 tickets × 20 runs = 100.0 % agreement (≥ 95 %), rewordings keep the label | covered |
| NFR-05 Injection resistant | T-09 | `tests/ai/injection.test.ts` | 100 % of injection fixtures keep the content-derived category and priority | covered |
| NFR-06 Tests fast and meaningful | T-01, T-10 | `npm test` output; Stryker report `reports/mutation/index.html` | suite 1.4 s (< 60 s); mutation score **77.10 %** (≥ 60 %) | covered (measured) |
| NFR-07 No secrets, synthetic data | T-02, C-01a | `tests/unit/seed-data.test.ts`, `tests/integration/nfr.test.ts` | fictional users/technicians/tickets, no `sk-`/`AKIA`/private-key/`ghp_` pattern, `.env` ignored, `.env.example` placeholders | covered |
| NFR-08 Accessible UI | T-08, C-01a | `tests/integration/nfr.test.ts` › accessible UI source | every control labelled, real buttons, `:focus-visible`, 44 px targets | covered (static check) |
| NFR-09 API latency | T-07, C-01a | `tests/integration/nfr.test.ts` › API latency | p95 of 20 `GET /api/tickets` < 300 ms | covered |
| NFR-10 Reproducible setup | T-01, T-02, C-02 | `tests/integration/api.test.ts` › health and login, `npm run db:seed`, README quick start | fresh clone: install → seed → test | covered |

## 4. Acceptance scenarios

| Scenario | Test |
|---|---|
| A1 happy path | `api.test.ts` › creates a triaged ticket with a suggestion for a reporter; › approves a suggestion and assigns the ticket |
| A2 duplicate | `agent.test.ts` › links the earlier ticket in the same room and category; `seed-data.test.ts` › provides the HVAC duplicate original from two hours ago |
| A3 outside the window | `duplicate.test.ts` › does not match a ticket from 49 hours ago |
| A4 invalid input | `api.test.ts` › rejects invalid input with field errors and runs no agent; `nfr.test.ts` › never calls the model for an invalid submission |
| A5 injection | `ai/injection.test.ts` › keeps the content-derived category and priority and flags a human; `agent.test.ts` › treats instruction text as data |
| A6 call limit | `agent.test.ts` › stops after exactly five tool calls and flags a human |
| A7 role violation | `api.test.ts` › refuses approval by a reporter with 403 |

## 5. Open items

- NFR-06 has no assertion of its own: the suite duration and the mutation score are measured by
  `npm test` and `npm run mutation`, and the numbers above are the recorded run.
- NFR-08 is a static source check (labels, buttons, focus styles, target size), not a browser
  audit; a manual keyboard pass over the five views backs it up.
