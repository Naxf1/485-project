# Prompts

## Prompt 1

```text
Hi DevAI, I need your help building my project for my SWE 485 course at KSU.

**GitHub repo:** https://github.com/Naxf1/485-project
Work inside this repo. If it already has files, check them first and build on
them instead of starting over. Push to GitHub after every commit.

I've attached 2 files:
1. **Project brief** – the official requirements from the course.
2. **PROJECT_IDEA.md** – our project (Campus Maintenance Ticket Triage Agent).
   This is the source of truth for WHAT to build.

**Important:** the model times out if the task is too long, partition it to smaller
tasks and commit changes step by step and not in the end.

Read both files fully before starting. We will build this using
**Spec-Driven Development**: spec → plan → tasks → implement.

## How to work
- Work on your own from start to finish. Don't stop for approval between steps.
- **Only stop and ask me** when:
  - something is unclear, missing, or conflicts between the brief and the idea
  - you need something from me (e.g. an API key, repo access, a choice only I can make)
  - you want to change something that differs from the spec
  Group your questions into one short list, then wait for my answer.
- Keep each step small: only a few files, finished quickly.
- **Commit and push after every step**, not at the end. Use clear messages, e.g.
  `spec: add functional requirements`, `feat(T-07): duplicate rule [FR-05]`.
- Keep progress in `specs/tasks.md` (checkboxes). Before each step, read it to
  see what's done. After each step, tick the box, commit and push. If you time out,
  this file tells the next session where to continue.
- Use only `AGENTS.md` for project rules. Do NOT create `CLAUDE.md`.
- Never build anything in the "Non-Goals" section. Use synthetic data only.
- Never commit secrets (API keys go in `.env`, which must be in `.gitignore`;
  add a `.env.example` instead).

## Steps (commit + push after each one)
1. Create `AGENTS.md` with the project rules: tech stack, folder structure,
   coding style, test rules, and agent safety rules (read-only tools,
   max 5 tool calls, human approval before saving).
2. Set up a clean repo structure (`specs/`, `backend/`, `frontend/`, `tests/`,
   README, `.gitignore`, `.env.example`).
3. Write the spec (`specs/spec.md`): requirements with IDs (FR-xx / NFR-xx),
   user stories for the 2 roles, Given/When/Then acceptance criteria, data
   formats, agent definition, priority + duplicate rules, non-goals.
4. Write the plan (`specs/plan.md`): architecture, database schema, API endpoints
   with role access, agent design (prompt, tools, 5-call loop, error fallback),
   LLM behind an interface so tests can use a fake LLM, test strategy.
   Suggested stack: TypeScript + Node.js, Express, React + Vite, SQLite + Prisma,
   Zod, Vitest, Stryker.
5. Write the tasks (`specs/tasks.md`): small tasks, each linked to a requirement
   ID with a clear "done when" test.
6. Implement the tasks one by one: write the test, then the code, run the tests,
   tick the box, commit, push. Order: setup → database + seed data → validation →
   duplicate rule → tools → agent → API + roles → frontend → AI tests
   (repeated-run, metamorphic, prompt-injection) → mutation testing.
7. Write `specs/traceability.md` (Requirement → Task → Test) and a README
   (install, seed, run, test). Commit and push.

At the end, give me a short summary: what's done, test results, and anything
I should check.

Start with step 1 now.
```

## Prompt 2

```text
Hi DevAI, continue my SWE 485 project in https://github.com/Naxf1/485-project.
This is a new chat, so you have no memory of earlier work. Everything you need is in the repo.

1. First, check for unsaved or unpushed work from the last chat:
   - Run `git status` to find uncommitted changes. If there are any, review them,
     finish or fix them, then commit and push.
   - Run `git log origin/main..HEAD --oneline` to find commits that weren't pushed.
     If there are any, push them.
   Then run `git pull`.
2. Run `git log --oneline -10` to see the latest work.
3. Read `AGENTS.md` (rules), then `specs/tasks.md` (progress).
   Read `specs/spec.md` and `specs/plan.md` only for the parts you need for the current task.
4. Check that the last ticked task is really finished and its tests pass.
   If it's half-done, finish it first.
5. Continue from the first unchecked task, step by step.

Rules:
- The model times out if the task is too long, so partition it into smaller tasks
  and commit + push after each step, not at the end.
- Tick the box in `specs/tasks.md` after each task, then commit and push.
- Follow the spec. Don't redo finished work.
- Never commit secrets (API keys stay in `.env`).
- Only stop if something is unclear or needs my input.
```

## Prompt 3

```text
Project: Fixlane (campus maintenance ticket triage app, TypeScript/Node, web frontend).
Two fixes are needed in the top navigation bar. Please make both changes, keep the current style
(teal primary color, light background, rounded pills), and don't change any other behavior.

## 1. Make the "Fixlane" brand clickable
Right now, clicking "Fixlane" (top left) does nothing.
- Wrap the logo and the "Fixlane" text in one link that goes to the home page for the current user's role:
  - reporter   → "New ticket" page
  - supervisor → "Queue" page
  - not logged in → login page
- Use the router's Link/navigation component, not a full page reload.
- Show cursor: pointer, give a small hover effect (slight opacity or underline-free color change),
  and show a visible focus outline for keyboard users.
- Add aria-label="Fixlane home".
- The brand should not look like an active nav tab (no highlighted pill background).

## 2. Create a logo and place it before "Fixlane"
Replace the small teal square/dot currently left of "Fixlane" with a real logo.
- Make it an inline SVG component (e.g. `FixlaneLogo.tsx`) so it scales cleanly and needs no image file.
- Design idea: a rounded-square badge in the app's teal (match the existing primary button color),
  with a simple white wrench whose handle turns into a curved road/lane line.
  Keep it simple and flat: 2 colors max, no gradients, no text inside the icon.
- Size: about 28×28px in the navbar, vertically centered with the "Fixlane" text, with ~8px gap.
- Accept `size` and `className` props so it can be reused.
- Add `role="img"` and `<title>Fixlane</title>` inside the SVG for accessibility.
- Also export the same SVG as `public/favicon.svg` and link it in the HTML head so the browser tab shows the logo.

## Done when
- Clicking the logo or "Fixlane" as Sara (reporter) opens New ticket; as Khalid (supervisor) opens Queue.
- The logo appears before "Fixlane" on every page (reporter and supervisor views) and looks sharp at any zoom.
- Add a small test that checks the brand link points to the correct route for each role.

## 3. Add a dark theme
- Add a theme toggle button in the top navbar, just to the left of "Sign out". Use a sun icon in dark
  mode and a moon icon in light mode, and give it aria-label="Toggle dark mode".
- Three options: Light, Dark, System (follow the OS setting via `prefers-color-scheme`).
  Use System by default.
- Save the user's choice in localStorage (wrapped in try/catch) so it stays after a page reload.
- To avoid a white flash, apply the theme before the page renders (a small inline script in the HTML head
  that sets `data-theme="dark"` on <html>).
- Set up all colors as CSS variables (background, card, text, muted text, border, primary, input,
  badge colors) and switch them with `[data-theme="dark"]`. Don't hard-code any colors in components.
- Dark palette suggestion:
  - page background #121615, cards #1B2120, borders #2A3230
  - main text #E6ECEA, muted text #9AA6A3
  - primary teal: a slightly brighter version of the current teal so it stays readable
- Check that everything stays readable in dark mode: status badges (New, Triaged, Assigned, InProgress,
  Resolved), priority badges (Low, Medium, High, Urgent), tables, form inputs, dropdowns, placeholders,
  focus outlines, and the "Approve suggestion" and "Save changes" buttons.
- Text must meet WCAG AA contrast (4.5:1).
- The logo must look good in both themes. Keep the teal badge with the white wrench, and in dark mode
  add a subtle border if the badge blends into the background.

## Done when (theme)
- The toggle switches themes instantly on every page for both reporter and supervisor.
- The choice survives a page refresh, and there is no white flash on load.
- Add a test that checks the toggle sets `data-theme` and saves the choice.
```
