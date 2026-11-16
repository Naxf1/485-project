# Campus Maintenance Ticket Triage Agent

SWE 485 course project (KSU). A reporter submits a maintenance ticket; an AI agent
triages it (category, priority, duplicate check, technician, draft reply); a supervisor
approves or edits the suggestion before anything is saved.

- Project rules: [`AGENTS.md`](AGENTS.md)
- Specification: [`specs/spec.md`](specs/spec.md)
- Plan: [`specs/plan.md`](specs/plan.md)
- Tasks and progress: [`specs/tasks.md`](specs/tasks.md)
- Traceability: [`specs/traceability.md`](specs/traceability.md)

Status: in progress — see `specs/tasks.md`.

## Quick start

```bash
npm install
cp .env.example .env
npm run db:seed
npm run dev
npm test
```

Detailed install, seed, run and test instructions are added in the final step.
