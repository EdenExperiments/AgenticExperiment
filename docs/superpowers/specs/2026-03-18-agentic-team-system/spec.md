# Agentic Team System — Spec

**Date:** 2026-03-18
**Status:** DRAFT
**Author:** Orchestrator (Opus 4.6)

---

## Glossary

- **claude-config** — private GitHub repo (`meden/claude-config`) holding global agents, skills, commands, and templates; symlinked into `~/.claude/` via `install.sh`
- **Agent Teams** — Claude Code's native multi-agent system: independent sessions with their own context windows, coordinating via a shared task list (file-locked) and a JSON mailbox in `~/.claude/teams/`
- **zone** — a list of directory path prefixes a session claims ownership of
- **worktree** — a git worktree (isolated branch) created for each feature session
- **T1/T2/T3** — task labels within a plan: T1 = tester, T2 = backend, T3 = frontend

---

## Problem Statement

The current Claude Code setup for RpgTracker has five planning-only agents and no implementation agents, no custom skills, and no cross-machine portability. As the project enters active development across multiple product areas (LifeQuest, mental health app), the developer needs:

- Multiple independent Opus orchestrator sessions handling different feature areas in parallel without conflicts
- Specialist agents (backend, frontend, tester, architect, UX, reviewer) tuned to each codebase
- A custom skill library that is owned, version-controlled, and tunable — not dependent on third-party plugin marketplace skills
- A private GitHub repo that syncs the global configuration to any machine via a single command
- Each new project gets agent templates it copies and tunes — no rewriting from scratch

---

## Goals

1. **Parallel Opus sessions** — multiple top-level orchestrators run simultaneously on different features without file conflicts
2. **Specialist agent team** — Opus dispatches backend/frontend/tester via Agent Teams; architect/UX/reviewer provide planning review gates
3. **Custom skill library** — owned, version-controlled, tunable — no third-party plugin marketplace dependency
4. **Cross-machine portability** — `git clone && ./install.sh` on any machine in under 2 minutes
5. **New project bootstrap** — one-session skill to copy and tune templates for a new project

---

## Out of Scope

- NutriLog or mental health app implementation (this spec is infrastructure only)
- Replacing Supabase authentication or the existing Go API
- Automated CI/CD integration with agent teams
- Real-time communication beyond native Agent Teams mailbox

---

## Repository Architecture

### `meden/claude-config` (private GitHub repo)

Installed to `~/.claude/` via symlinks by `install.sh`.

```
claude-config/
├── install.sh                    # Symlinks agents/, skills/, commands/, templates/ into ~/.claude/
├── agents/
│   ├── orchestrator.md           # Opus 4.6
│   ├── architect.md              # Sonnet
│   ├── reviewer.md               # Sonnet
│   └── ux.md                     # Sonnet
├── skills/
│   ├── plan-feature.md
│   ├── execute-plan.md
│   ├── tdd-first.md
│   ├── use-context7.md
│   ├── parallel-session.md
│   ├── new-project-bootstrap.md
│   └── abandon-feature.md
├── commands/
│   └── bootstrap.md              # Slash command: /bootstrap → runs new-project-bootstrap skill
├── templates/
│   └── agents/
│       ├── README.md             # Explains every TUNE: marker
│       ├── backend.md
│       ├── frontend.md
│       └── tester.md
└── docs/
    └── mcp-catalog.md
```

### Each project repo

```
.claude/
├── agents/
│   ├── backend.md    # tuned from template
│   ├── frontend.md   # tuned from template
│   └── tester.md     # tuned from template
└── commands/
    └── team-kickoff.md
```

Global agents (orchestrator, architect, reviewer, ux) are available in every project automatically. Project agents override globals on name conflict — templates use names backend/frontend/tester only, avoiding any shadowing of global agents.

---

## Project `docs/` Layout

Created by `new-project-bootstrap`. Must exist before any session runs.

```
docs/
├── specs/
│   ├── archived/
│   └── YYYY-MM-DD-{feature}/       # one directory per feature
│       ├── spec.md                 # requirements + acceptance criteria
│       ├── arch-review.md          # architect findings + Parallelisation Map
│       ├── ux-review.md            # UX agent findings
│       ├── gateway.md              # reviewer GO / NO-GO
│       ├── T1-tests.md             # manifest of test files written by tester
│       ├── T2-backend.md           # backend implementation notes
│       ├── T3-frontend.md          # frontend implementation notes
│       └── review.md               # reviewer code gate findings
├── plans/
│   ├── archived/
│   └── YYYY-MM-DD-{feature}/
│       └── plan.md                 # task list (orchestrator-owned, checkboxes only)
└── sessions/
    ├── {feature-slug}-active.md    # one file per live session (never shared)
    └── abandoned.md                # log of abandoned/interrupted sessions
```

---

## Zone Definition

A **zone** is a list of directory path prefixes a session claims.

### Overlap algorithm

Two sessions overlap if, for **any path A** in session 1 and **any path B** in session 2:
- A starts with B (B is a prefix of A), OR
- B starts with A (A is a prefix of B)

Examples:
- `apps/rpg-tracker/` and `apps/api/` → **no overlap** (neither is a prefix of the other)
- `apps/rpg-tracker/` and `apps/rpg-tracker/app/skills/` → **overlap** (A is a prefix of B)
- `packages/ui/src/` and `packages/ui/` → **overlap**

`packages/*` is always a conflict — any session that needs to modify a shared package must declare the specific file(s) in the `shared-packages` field and sequence that work before parallel tasks.

### Session file format

Written to `docs/sessions/{feature-slug}-active.md`. Each feature has a unique slug so no two sessions write the same file.

```yaml
feature: xp-milestones
worktree: plan-xp-milestones
paths:
  - apps/rpg-tracker/app/(app)/skills/
  - apps/api/internal/handlers/
shared-packages: []          # list packages/* files that must change, or empty
started: 2026-03-18T14:00Z
last-updated: 2026-03-18T14:00Z
```

### Session registration protocol (prevents TOCTOU race)

1. Write `docs/sessions/{feature-slug}-active.md` immediately (unique filename = no write conflict)
2. Wait 2 seconds (allows any near-simultaneous session to also write)
3. Read **all** `docs/sessions/*-active.md` files including your own
4. Run overlap check against all other session files
5. If overlap found with another session: delete your session file, report conflict to user
6. If no overlap: proceed

### Stale session recovery

If a session file has `last-updated` older than 8 hours, it is considered stale (interrupted session). A new session may:
1. Verify the worktree branch has no commits in the last 8 hours
2. Delete the stale session file
3. Log the reclaim in `docs/sessions/abandoned.md`: `YYYY-MM-DD | {feature} | reclaimed (stale)`
4. Proceed with normal registration

The orchestrator must update `last-updated` in the session file at each task boundary (before T1, before T2/T3, before final merge).

---

## Agent Roster

### Global Agents (`~/.claude/agents/`)

#### `orchestrator`
- **Model:** `claude-opus-4-6`
- **Role:** Feature planning, team dispatch, progress tracking, merge coordination
- **Skills:** `plan-feature`, `execute-plan`, `parallel-session`, `abandon-feature`
- **First action on dispatch:** read all `docs/sessions/*-active.md` to check active zones

#### `architect`
- **Model:** `claude-sonnet-4-6`
- **Role:** Schema impact, ADRs, service boundary decisions
- **Skills:** `use-context7`
- **MCP:** context7
- **Output:** `docs/specs/YYYY-MM-DD-{feature}/arch-review.md` (must include `## Parallelisation Map`)

#### `reviewer`
- **Model:** `claude-sonnet-4-6`
- **Role:** Spec gateway (Phase 4), code quality gate
- **Spec gate reads:** `spec.md`, `arch-review.md`, `ux-review.md`
- **Code gate reads:** `plan.md`, `T1-tests.md`, `T2-backend.md`, `T3-frontend.md`, **plus all actual changed files** listed in T2/T3 `## Files Changed` sections
- **Output spec gate:** `docs/specs/YYYY-MM-DD-{feature}/gateway.md`
- **Output code gate:** `docs/specs/YYYY-MM-DD-{feature}/review.md`

#### `ux`
- **Model:** `claude-sonnet-4-6`
- **Role:** UX flow review, IA correctness, mobile-first viability
- **Output:** `docs/specs/YYYY-MM-DD-{feature}/ux-review.md`

### Project Agents (`.claude/agents/`, tuned per project)

#### `backend` (RpgTracker tuning)
- **Model:** `claude-sonnet-4-6`
- **Stack:** Go, chi router, pgx v5, Supabase auth
- **File locations:** `apps/api/internal/handlers/`, `apps/api/internal/skills/`, `apps/api/internal/auth/`
- **Skills:** `use-context7`, `tdd-first`
- **MCP:** context7 → [Go, chi, pgx, Supabase Go]

#### `frontend` (RpgTracker tuning)
- **Model:** `claude-sonnet-4-6`
- **Stack:** Next.js 15 App Router, React, Tailwind v4, TanStack Query v5, `@rpgtracker/ui`
- **File locations:** `apps/rpg-tracker/app/`, `packages/ui/src/`
- **Skills:** `use-context7`, `tdd-first`
- **MCP:** context7 → [Next.js, React, TanStack Query, Tailwind]

#### `tester` (RpgTracker tuning)
- **Model:** `claude-sonnet-4-6`
- **Stack:** Vitest, React Testing Library, Go testing, pgx test patterns
- **File locations:** `apps/rpg-tracker/app/__tests__/`, `apps/api/internal/**/*_test.go`
- **Skills:** `tdd-first`, `use-context7`
- **MCP:** context7 → [Vitest, RTL, Go testing]

---

## Custom Skills

### `plan-feature.md` — Full Planning Pipeline

```
Phase 1 — Spec Draft (Orchestrator)
  Input:  feature request or user story
  Output: docs/specs/YYYY-MM-DD-{feature}/spec.md tagged DRAFT
  Steps:
    1. Read CLAUDE.md + any related existing specs/decisions
    2. Clarify requirements, edge cases, acceptance criteria
       — every AC must be a verifiable assertion (not "it should feel fast")
    3. Identify zones touched + any packages/* files that must change
    4. Write spec.md

Phase 2 — Architecture Review (Architect)
  Input:  spec.md
  Output: docs/specs/YYYY-MM-DD-{feature}/arch-review.md
  Required sections:
    ## Schema Impact         — new tables, migrations (or "none")
    ## Service Boundaries    — new or changed service contracts
    ## ADR                   — draft if needed, "none required" otherwise
    ## Shared Package Changes — specific files in packages/* that must change
    ## Parallelisation Map   — which tasks can run in parallel vs must sequence
  Approval: APPROVED or CHANGES-NEEDED → back to Phase 1 with notes

Phase 3 — UX Review (UX agent)
  Input:  spec.md
  Output: docs/specs/YYYY-MM-DD-{feature}/ux-review.md
  Required sections:
    ## Flow Correctness    — end-to-end UX sense check
    ## Mobile Viability    — works on mobile without rework?
    ## Navigation Changes  — new routes or nav tab changes?
    ## Edge Cases          — unhappy paths and empty states
  Approval: APPROVED or CHANGES-NEEDED → back to Phase 1 with notes

Phase 4 — Spec Gateway (Reviewer)
  Input:  spec.md + arch-review.md + ux-review.md
  Checks:
    - No contradictions between the three documents
    - Every AC is testable as a code assertion
    - No decisions hidden as assumptions
    - Both arch and UX phases show APPROVED
    - Shared package changes have explicit sequencing in Parallelisation Map
  Output: docs/specs/YYYY-MM-DD-{feature}/gateway.md (GO or NO-GO → Phase 1)

Phase 5 — Implementation Plan (Orchestrator, GO only)
  Input:  spec.md (APPROVED) + arch-review.md (Parallelisation Map)
  Output: docs/plans/YYYY-MM-DD-{feature}/plan.md
  Steps:
    1. Write numbered tasks with assigned owner (tester/backend/frontend/reviewer)
    2. Respect Parallelisation Map — shared-package tasks before parallel tasks
    3. T1 (tester) always before T2/T3 (implementation)
    4. Instruct orchestrator to run parallel-session skill before execute-plan
       (zone registration and worktree creation belong to parallel-session, not here)
```

### `execute-plan.md` — Agent Teams Execution

**Agent Teams primer:** Teammates are independent Claude Code sessions. They share a task list with file locking (tasks: pending → in_progress → done) and a JSON mailbox in `~/.claude/teams/`. Use `spawnTeam` to create the team, assign tasks to teammates, monitor via task states (not file polling), and use `SendMessage` for peer-to-peer communication.

```
1. Read plan.md (tasks) + arch-review.md (Parallelisation Map)
   — confirm docs/specs/YYYY-MM-DD-{feature}/gateway.md = GO before proceeding
   — update session file last-updated
2. Rebase worktree from main
3. Dispatch tester as teammate → assign T1
   — wait for T1 task state = done (do not poll files)
   — T1 done means: test code committed to worktree, T1-tests.md manifest exists,
     tests verified failing
   — update session file last-updated
4. Read Parallelisation Map from arch-review.md
   — if shared-package changes required: dispatch as its own task first,
     merge to main, rebase all worktrees before dispatching T2/T3
5. Dispatch backend (T2) and frontend (T3) per Parallelisation Map
   — parallel where map allows; sequential where it requires
   — use SendMessage for blockers between teammates
   — monitor task states; a teammate sets BLOCKED (not done) if tests fail
   — update session file last-updated when T2+T3 both done
6. Rebase from main
7. Dispatch reviewer as teammate → code gate
   — reviewer reads plan.md, T1-tests.md, T2-backend.md, T3-frontend.md,
     AND all actual source files listed in ## Files Changed sections
8. On reviewer GO → merge worktree to main, delete session file,
   git worktree remove ../{branch}
9. On reviewer NO-GO → surface specific review.md findings,
   re-dispatch relevant agent(s) with targeted fix instructions

Resume protocol (after interruption):
  1. Read plan.md — identify tasks with state done vs pending/in_progress
  2. Re-enter execute-plan at the first incomplete task
  3. Rebase from main before re-dispatching
  4. Update session file last-updated (or re-register if file was deleted)
```

### `tdd-first.md` — TDD Discipline (Tester Agent)

```
Steps:
  1. Read 2–3 existing test files in project test directories to learn:
     — file naming conventions
     — required wrappers (e.g., QueryClientProvider, test DB setup)
     — mock patterns (vi.mock hoisting, alias mocks, etc.)
     — assertion style
  2. Read spec.md acceptance criteria only — do not open any implementation files
  3. Map each AC to one or more named test cases
  4. Write actual runnable test code to the worktree (not a prose description)
  5. Verify tests fail — implementation must not exist yet (red state)
  6. Write T1-tests.md manifest (see format below)
  7. Commit test code + manifest
  8. Signal T1 task done via Agent Teams task state
  9. Never write implementation code — if implementation is needed, stop
     and SendMessage to the backend or frontend agent

Task state rules for T1:
  done    — tests written, committed, verified failing
  blocked — spec ACs cannot be expressed as assertions (report which ones)

Red flags to check before writing:
  - AC that cannot be expressed as a test assertion
  - Missing test infrastructure (no mock for a required dependency)
  - Exact duplicate of existing test coverage
```

**T1-tests.md manifest format:**
```markdown
## Test Files Written
- apps/rpg-tracker/app/__tests__/xp-milestones.test.tsx
- apps/api/internal/handlers/xp_test.go

## Coverage Map
- AC-1 (XP logged correctly) → xp-milestones.test.tsx:12
- AC-2 (milestone notification fires) → xp-milestones.test.tsx:28
- AC-3 (POST /skills/{id}/xp returns milestone) → xp_test.go:45
```

### `use-context7.md` — Context7 Workflow

```
When to use:
  Any third-party library API you are not 100% certain of, or that may have
  changed since training cutoff. Specifically: React hooks, TanStack Query,
  Next.js App Router, chi router, pgx, Supabase client, Vitest, RTL.

Steps:
  1. mcp__plugin_context7_context7__resolve-library-id with library name
     e.g., "react" → "/facebook/react"
  2. mcp__plugin_context7_context7__query-docs with returned ID + topic
     e.g., "/facebook/react" + "useEffect cleanup"
  3. Extract the exact API/pattern needed

Fallback (if Context7 unavailable):
  - Use training knowledge
  - Add inline comment: // Context7 unavailable — verify this API against current docs
  - Never block on unavailability — flag and continue
```

### `parallel-session.md` — Multi-Session Protocol

```
On session start:
  1. Run session registration protocol:
     a. Write docs/sessions/{feature-slug}-active.md (unique name — no write conflict)
     b. Wait 2 seconds
     c. Read all docs/sessions/*-active.md files
     d. Run overlap check (prefix algorithm — see Zone Definition)
        — also check shared-packages fields for package-level conflicts
     e. If overlap: delete your session file, report conflict, stop
     f. If no overlap: proceed
  2. Create worktree: git worktree add -b {branch} ../{branch} main
  3. Rebase from main

Shared package sequencing:
  - List specific packages/* files in shared-packages field of session entry
  - Complete shared package changes as their own task before parallel tasks
  - Merge shared package changes to main, rebase all active worktrees, then proceed
  - Never have two sessions modifying the same shared package file simultaneously

Rebase checkpoints (tied to task boundaries):
  - Before T1 dispatch
  - Before T2/T3 dispatch
  - After any shared package merge
  - Before final merge to main

Session file maintenance:
  - Update last-updated in session file at each rebase checkpoint

On session end:
  1. Delete docs/sessions/{feature-slug}-active.md
  2. git worktree remove ../{branch}
```

### `abandon-feature.md` — Cleanup

```
When to use: feature cancelled, blocked indefinitely, superseded, or session interrupted

Steps:
  1. Move docs/specs/YYYY-MM-DD-{feature}/ → docs/specs/archived/YYYY-MM-DD-{feature}/
  2. Move docs/plans/YYYY-MM-DD-{feature}/ → docs/plans/archived/YYYY-MM-DD-{feature}/
  3. Delete docs/sessions/{feature-slug}-active.md
  4. git worktree remove ../{branch} (if exists)
  5. git branch -d {branch} (safe delete — warns on unmerged commits)
  6. Append to docs/sessions/abandoned.md:
     "YYYY-MM-DD | {feature} | {reason}"
```

### `new-project-bootstrap.md` — New Project Setup

```
Steps:

1. Copy ~/.claude/templates/agents/ → project/.claude/agents/
   Fill every <!-- TUNE: --> marker in each file:

   backend.md:
     - Stack: language, framework, ORM/DB client, auth
     - File locations: handler dirs, repository dirs, test dirs
     - Context7 libraries: all third-party libs this agent will use

   frontend.md:
     - Framework + version
     - Component library path
     - Context7 libraries: all third-party libs this agent will use

   tester.md:
     - Test runner + assertion library
     - Two or three existing test files to read for conventions
     - Known mock patterns specific to this project

2. Write project CLAUDE.md:
   - Start here: most important files to read first
   - Zones: which paths belong to which product area
   - Shared packages: list all packages/* directories explicitly

3. Create docs/ structure:
   mkdir -p docs/specs/archived docs/plans/archived docs/sessions
   printf "# Abandoned Features\n" > docs/sessions/abandoned.md

4. Commit .claude/ and docs/ scaffolding to main

5. Verify: run orchestrator, confirm it can dispatch architect agent
```

---

## MCP Catalog (`docs/mcp-catalog.md`)

| MCP | Purpose | Agents |
|-----|---------|--------|
| `context7` | Up-to-date library API docs — resolve ID then query topic | backend, frontend, tester, architect |

**Usage pattern:**
```
1. resolve-library-id: "tanstack/react-query" → "/tanstack/query"
2. query-docs: "/tanstack/query" + topic: "useQuery options"
```

---

## File Efficiency Rules

- **One file per concern** — agents never append to another agent's file
- **Single writer per file** — two agents never write the same file simultaneously
- **Orchestrator is sole writer of `plan.md`** — agents signal via Agent Teams task states
- **200-line soft limit** — if a file exceeds this, split by concern before continuing
- **Reviewer (code gate) reads actual changed source files** — not bound by the 4-file limit; uses T2/T3 file lists to know what to read

**Agent read/write table:**

| Agent | Reads | Writes |
|-------|-------|--------|
| Architect | `spec.md` | `arch-review.md` |
| UX | `spec.md` | `ux-review.md` |
| Reviewer (spec gate) | `spec.md`, `arch-review.md`, `ux-review.md` | `gateway.md` |
| Tester | `spec.md` + 2–3 existing test files | `T1-tests.md` (manifest) + test code in worktree |
| Backend | `spec.md`, `plan.md`, `T1-tests.md` + test files in manifest | `T2-backend.md` |
| Frontend | `spec.md`, `plan.md`, `T1-tests.md` + test files in manifest | `T3-frontend.md` |
| Reviewer (code gate) | `plan.md`, `T1-tests.md`, `T2-backend.md`, `T3-frontend.md` + all files in ## Files Changed | `review.md` |
| Orchestrator | everything | `plan.md` (checkboxes only), session file |

**T2-backend.md / T3-frontend.md format:**
```markdown
## Status: DONE / BLOCKED
## Files Changed
- path/to/changed/file.go
## Notes
[Deviations from spec, edge cases encountered]
## Test Results
[All T1 tests pass / N tests failing — list which]
```

*Task state = `done` only when ## Status is DONE and ## Test Results shows all T1 tests pass.*
*Task state = `blocked` when tests are failing or a dependency is missing.*

---

## Install & Sync

```bash
# On any new machine:
git clone git@github.com:meden/claude-config.git ~/claude-config
cd ~/claude-config && ./install.sh

# install.sh creates symlinks and ensures ~/.claude/teams/ exists:
mkdir -p ~/.claude/teams
ln -sf ~/claude-config/agents    ~/.claude/agents
ln -sf ~/claude-config/skills    ~/.claude/skills
ln -sf ~/claude-config/commands  ~/.claude/commands
ln -sf ~/claude-config/templates ~/.claude/templates

# Update on any machine (symlinks = live immediately):
cd ~/claude-config && git pull
```

---

## Acceptance Criteria

1. `git clone && ./install.sh` makes all global agents, skills, commands, and templates available in Claude Code on a new machine
2. A new project can be fully bootstrapped (agents tuned, docs scaffolded, CLAUDE.md written) in one orchestrator session using the `new-project-bootstrap` skill
3. Two Opus sessions can run simultaneously on different features without file conflicts — verified by `docs/sessions/` containing two separate `*-active.md` files with non-overlapping zones (confirmed by prefix overlap algorithm)
4. A feature goes through the full pipeline (spec → arch review → UX review → gateway → TDD → implementation → code review → merge) using only the custom skills — no dependency on third-party plugin marketplace skills
5. Each agent (except reviewer code gate, which must read actual changed files) reads no more than 4 files from the spec/plan directory when dispatched
6. Tester writes failing test code to the worktree before any implementation exists; those same tests pass after implementation without modification to the test code
7. An interrupted session can be resumed by re-running execute-plan, which detects completed tasks and re-enters at the first incomplete one
