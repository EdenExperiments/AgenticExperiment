# Agentic Team System — Spec

**Date:** 2026-03-18
**Status:** DRAFT
**Author:** Orchestrator (Opus 4.6)

---

## Problem Statement

The current Claude Code setup for RpgTracker has five planning-only agents and no implementation agents, no custom skills, and no cross-machine portability. As the project enters active development across multiple product areas (LifeQuest, mental health app), the developer needs:

- Multiple independent Opus orchestrator sessions handling different feature areas in parallel
- Specialist agents (backend, frontend, tester, architect, UX, reviewer) that are tuned to this codebase
- A custom skill library that is owned, version-controlled, and tunable — not dependent on third-party plugins
- A private GitHub repo that syncs the global configuration to any machine via a single command
- Each new project gets agent templates it copies and tunes — no rewriting from scratch

---

## Goals

1. **Parallel Opus sessions** — multiple top-level orchestrator sessions can run simultaneously on different features/products without stepping on each other
2. **Specialist agent team** — Opus orchestrator dispatches specialist subagents (backend, frontend, tester) via Agent Teams; planning agents (architect, UX, reviewer) provide review gates
3. **Custom skill library** — owned skills covering workflow (plan, execute, TDD) and domain knowledge (Context7 usage, parallel session protocol)
4. **Cross-machine portability** — `git clone && ./install.sh` installs the global config on any machine in under 2 minutes
5. **New project bootstrap** — a skill that walks through copying and tuning agent templates for a new project in one session

---

## Out of Scope

- NutriLog or mental health app implementation (this spec is infrastructure only)
- Replacing Supabase authentication or the existing Go API
- Automated CI/CD integration with agent teams
- Real-time agent-to-agent communication beyond native Agent Teams mailbox

---

## Repository Architecture

### `meden/claude-config` (private GitHub repo)

Installed to `~/.claude/` via symlinks by `install.sh`.

```
claude-config/
├── install.sh                    # Symlinks agents/, skills/, commands/ into ~/.claude/
├── agents/
│   ├── orchestrator.md           # Opus 4.6 — planning, dispatch, coordination
│   ├── architect.md              # System design, ADRs, schema decisions
│   ├── reviewer.md               # Code review, spec gateway, quality gate
│   └── ux.md                     # UX flows, IA, mobile-first checks
├── skills/
│   ├── plan-feature.md           # Full planning pipeline (Phases 1–5)
│   ├── execute-plan.md           # Execution via Agent Teams
│   ├── tdd-first.md              # TDD discipline for tester agent
│   ├── use-context7.md           # Context7 resolve + query workflow
│   ├── parallel-session.md       # Multi-session protocol (zones, worktrees, active.md)
│   ├── new-project-bootstrap.md  # Checklist for tuning templates into a new project
│   └── abandon-feature.md        # Cleanup: archive spec, remove zone, delete worktree
├── commands/
│   └── bootstrap.md              # Slash command: run new-project-bootstrap skill
├── templates/
│   └── agents/
│       ├── README.md             # How to tune these templates
│       ├── backend.md            # Template: tune for stack + file locations
│       ├── frontend.md           # Template: tune for framework + component patterns
│       └── tester.md             # Template: tune for test runner + mock conventions
└── docs/
    └── mcp-catalog.md            # Reference: all MCPs, purpose, which agents use them
```

### Each project repo (e.g., RpgTracker)

Project-specific config lives in `.claude/` and travels with the repo.

```
.claude/
├── agents/
│   ├── backend.md       # Tuned from template: Go, chi, pgx, Supabase — knows file locations
│   ├── frontend.md      # Tuned from template: Next.js App Router, React, Tailwind v4, TanStack Query
│   └── tester.md        # Tuned from template: Vitest, RTL, Go test patterns, mock conventions
└── commands/
    └── team-kickoff.md  # (existing) planning kickoff
```

Global agents (orchestrator, architect, reviewer, ux) are available in every project without duplication.

---

## Agent Roster

### Global Agents (`~/.claude/agents/`)

#### `orchestrator`
- **Model:** `claude-opus-4-6`
- **Role:** Feature planning, team dispatch, progress tracking, merge coordination
- **Tools & Resources:**
  - Skill: `plan-feature` — full planning pipeline
  - Skill: `execute-plan` — dispatch and monitor Agent Teams
  - Skill: `parallel-session` — zone declaration and shared package rules
  - Skill: `abandon-feature` — cleanup on cancellation
  - Read: `docs/sessions/active.md` on every session start

#### `architect`
- **Model:** `claude-sonnet-4-6`
- **Role:** Technical review of specs, schema impact, service boundary decisions, ADRs
- **Tools & Resources:**
  - Skill: `use-context7` — for library API verification
  - MCP: context7
  - Outputs: `arch-review.md` including required `## Parallelisation Map` section

#### `reviewer`
- **Model:** `claude-sonnet-4-6`
- **Role:** Spec gateway (Phase 4), code quality gate, regression checks
- **Tools & Resources:**
  - Reads: spec files, arch-review, ux-review before spec gateway
  - Reads: plan, test output, agent output files before code review
  - Outputs: `gateway.md` (spec gate) or `review.md` (code gate)

#### `ux`
- **Model:** `claude-sonnet-4-6`
- **Role:** UX flow review, IA correctness, mobile-first viability
- **Outputs:** `ux-review.md`

### Project Agents (`.claude/agents/`, tuned per project)

#### `backend` (RpgTracker tuning)
- **Model:** `claude-sonnet-4-6`
- **Knows:** Go, chi router, pgx v5, Supabase auth middleware, existing handler/repository patterns
- **File locations:** `apps/api/internal/handlers/`, `apps/api/internal/skills/`, `apps/api/internal/auth/`
- **Tools & Resources:**
  - Skill: `use-context7` — MCP: context7 → [Go standard library, chi, pgx, Supabase Go]
  - Skill: `tdd-first` (reads T1-tests.md and implements against it)
  - Read: `docs/mcp-catalog.md`

#### `frontend` (RpgTracker tuning)
- **Model:** `claude-sonnet-4-6`
- **Knows:** Next.js 15 App Router, React, Tailwind v4, TanStack Query v5, `@rpgtracker/ui` component library
- **File locations:** `apps/rpg-tracker/app/`, `packages/ui/src/`
- **Tools & Resources:**
  - Skill: `use-context7` — MCP: context7 → [Next.js, React, TanStack Query, Tailwind]
  - Skill: `tdd-first` (reads T1-tests.md and implements against it)
  - Read: `docs/mcp-catalog.md`

#### `tester` (RpgTracker tuning)
- **Model:** `claude-sonnet-4-6`
- **Knows:** Vitest, React Testing Library, Go testing, pgx test patterns, mock conventions specific to this repo
- **File locations:** `apps/rpg-tracker/app/__tests__/`, `apps/api/internal/**/*_test.go`
- **Tools & Resources:**
  - Skill: `tdd-first` — core discipline
  - Skill: `use-context7` — MCP: context7 → [Vitest, React Testing Library, Go testing]
  - First action: read 2–3 existing test files to learn project conventions before writing

---

## Custom Skills Library

### `plan-feature.md` — Full Planning Pipeline

```
Phase 1 — Spec Draft (Orchestrator)
  Input:  feature request or user story
  Output: docs/specs/YYYY-MM-DD-{feature}/spec.md tagged DRAFT
  Steps:
    1. Read CLAUDE.md + existing related specs/decisions
    2. Clarify requirements, edge cases, acceptance criteria
       — acceptance criteria must be written as verifiable assertions
    3. Identify zones touched (which apps, which shared packages)
    4. Write spec.md

Phase 2 — Architecture Review (Architect agent)
  Input:  spec.md
  Output: docs/specs/YYYY-MM-DD-{feature}/arch-review.md
  Required sections:
    - Schema impact (new tables, migrations, changes)
    - Service boundary changes
    - ADR needed? (yes/no + draft if yes)
    - Shared package changes required (list files)
    - ## Parallelisation Map (which tasks can run parallel vs must sequence)
  Approval: APPROVED or CHANGES-NEEDED (returns to Phase 1 with notes)

Phase 3 — UX Review (UX agent)
  Input:  spec.md
  Output: docs/specs/YYYY-MM-DD-{feature}/ux-review.md
  Required sections:
    - Flow correctness
    - Mobile-first viable?
    - Navigation changes required?
    - Edge cases in user journey
  Approval: APPROVED or CHANGES-NEEDED (returns to Phase 1 with notes)

Phase 4 — Spec Gateway (Reviewer agent)
  Input:  spec.md + arch-review.md + ux-review.md
  Checks:
    - No contradictions between phases
    - All acceptance criteria are testable as assertions
    - No decisions hidden as assumptions
    - Shared package changes are flagged with owner
  Output: docs/specs/YYYY-MM-DD-{feature}/gateway.md
  Approval: GO (tags spec APPROVED) or NO-GO (specific fixes required, returns to Phase 1)

Phase 5 — Implementation Plan (Orchestrator, GO only)
  Input:  spec.md (APPROVED) + arch-review.md (Parallelisation Map)
  Output: docs/plans/YYYY-MM-DD-{feature}/plan.md
  Steps:
    1. Write numbered tasks with assigned owner
    2. Respect Parallelisation Map (sequence shared package tasks before parallel tasks)
    3. Declare worktree name + zone in docs/sessions/active.md
    4. T1 (tester) always precedes T2/T3 (implementation)
```

### `execute-plan.md` — Agent Teams Execution

```
1. Read plan.md — confirm all tasks, owners, dependencies
2. Confirm Phase 4 gateway.md = GO before proceeding
3. Dispatch tester as teammate → T1 (failing tests)
   — wait for T1 task state = done before continuing
4. Read Parallelisation Map from arch-review.md
5. Dispatch backend + frontend as teammates (parallel where map allows)
6. Monitor Agent Teams task states — do not poll files manually
7. Use SendMessage to communicate blockers between teammates
8. When T2+T3 done → dispatch reviewer as teammate
9. On reviewer GO → merge worktree, remove zone from active.md, clean up worktree
10. On reviewer NO-GO → surface specific issues, re-dispatch relevant agents
```

### `tdd-first.md` — TDD Discipline

```
Rules (tester agent only):
  1. Read 2–3 existing test files in the project to learn conventions
     — mock patterns, wrapper requirements (QueryClientProvider etc.), file naming
  2. Read spec.md acceptance criteria ONLY — do not read implementation files
  3. Map each acceptance criterion to one or more test cases
  4. Write failing tests — implementation must not exist yet
  5. Commit failing tests before signalling T1 complete
  6. Never write implementation code — if tempted, stop and signal the backend/frontend agent

Red flags to catch and report:
  - Acceptance criteria that cannot be expressed as a test assertion
  - Missing mock setup that would make tests impossible to run
  - Test cases that duplicate existing coverage exactly
```

### `use-context7.md` — Context7 Workflow

```
When to use:
  - Any third-party library API call you are not 100% certain of
  - Any library that may have changed since training cutoff
  - Before writing code that uses: React hooks, TanStack Query, Next.js App Router,
    chi router, pgx, Supabase client, Vitest, React Testing Library

Steps:
  1. mcp__plugin_context7_context7__resolve-library-id with the library name
  2. Use the returned library ID with mcp__plugin_context7_context7__query-docs
  3. Extract the specific API/pattern you need
  4. If Context7 is unavailable or slow: use training knowledge, flag with
     comment: "// Context7 unavailable — verify this API against current docs"

Never block on Context7 unavailability — flag and continue.
```

### `parallel-session.md` — Multi-Session Protocol

```
On session start:
  1. Read docs/sessions/active.md
  2. Check no other session claims your intended zone
  3. Add entry: "Session: {feature} — worktree: {branch} — zone: {paths} — started: {date}"
  4. git worktree add -b {branch} ../{branch} main

Shared package rules:
  - packages/* are neutral territory — treat as read-only by default
  - If you need a shared package change:
      a. Check arch-review.md Parallelisation Map — it should already list this
      b. Complete shared package change as its own task BEFORE parallel tasks
      c. Merge shared package change to main before dispatching parallel agents
  - Never have two sessions modifying the same shared package file simultaneously

Rebase discipline:
  - rebase from main at session start and before dispatching any subagent
  - merge small increments frequently — do not let branches diverge > 1 day

On session end:
  1. Remove zone entry from docs/sessions/active.md
  2. git worktree remove ../{branch}
```

### `abandon-feature.md` — Cleanup

```
When to use: feature cancelled, blocked indefinitely, or superseded

Steps:
  1. Move docs/specs/YYYY-MM-DD-{feature}/ → docs/specs/archived/YYYY-MM-DD-{feature}/
  2. Move docs/plans/YYYY-MM-DD-{feature}/ → docs/plans/archived/YYYY-MM-DD-{feature}/
  3. Remove zone from docs/sessions/active.md
  4. git worktree remove ../{branch} (if exists)
  5. git branch -d {branch} (if safe — check for unmerged commits first)
  6. Log reason in docs/sessions/abandoned.md: feature, date, reason
```

### `new-project-bootstrap.md` — New Project Setup

```
Run this skill when starting a new project. Steps:

1. Copy claude-config/templates/agents/ → project/.claude/agents/
2. Open each template and fill every <!-- TUNE: --> marker:
   backend.md:
     - Stack: [language, framework, ORM, auth]
     - File locations: [handlers, repositories, tests]
     - Context7 libraries: [list all third-party libs]
   frontend.md:
     - Framework: [Next.js / Remix / etc.]
     - Component library location
     - Context7 libraries: [list all third-party libs]
   tester.md:
     - Test runner + assertion library
     - Existing test file to read for patterns
     - Known mock conventions

3. Write project CLAUDE.md:
   - Start here: [most important files to read]
   - Zones: [which paths belong to which product area]
   - Shared packages: [list them explicitly]

4. Create docs/ structure:
   mkdir -p docs/specs docs/plans docs/sessions
   echo "# Active Sessions\n" > docs/sessions/active.md
   echo "# Abandoned Features\n" > docs/sessions/abandoned.md

5. Commit .claude/ and docs/ scaffolding
6. Verify: run orchestrator, confirm it can dispatch architect agent
```

---

## MCP Catalog (`docs/mcp-catalog.md`)

| MCP | Purpose | Agents that use it |
|-----|---------|-------------------|
| `context7` | Up-to-date library docs — resolve library ID then query | backend, frontend, tester, architect |

**Context7 usage pattern:**
```
1. resolve-library-id: "react" → "/facebook/react"
2. query-docs: "/facebook/react" + topic: "useEffect cleanup"
```

**Fallback:** If unavailable, use training knowledge and add inline comment flagging uncertainty.

---

## File Efficiency Rules

All skills enforce:

- **One file per concern** — no appending review findings to the spec file
- **Single writer per file** — two agents never write to the same file simultaneously
- **Agent reads minimally:**

| Agent | Reads | Writes |
|-------|-------|--------|
| Architect | `spec.md` | `arch-review.md` |
| UX | `spec.md` | `ux-review.md` |
| Reviewer (spec gate) | `spec.md`, `arch-review.md`, `ux-review.md` | `gateway.md` |
| Tester | `spec.md`, `gateway.md` + 2–3 existing test files | `T1-tests.md` |
| Backend | `spec.md`, `plan.md`, `T1-tests.md` | `T2-backend.md` |
| Frontend | `spec.md`, `plan.md`, `T1-tests.md` | `T3-frontend.md` |
| Reviewer (code gate) | `plan.md`, `T2-backend.md`, `T3-frontend.md` | `review.md` |
| Orchestrator | everything | `plan.md` (checkboxes only), `active.md` |

- **`plan.md` = task checkboxes only** — no prose, no notes. Notes go in agent output files.
- **200-line soft limit** — if a file exceeds it, split by concern before continuing.
- **Orchestrator is sole writer of `plan.md`** — agents signal via Agent Teams task states, not by editing plan.md.

---

## Parallel Session Protocol Summary

```
Two Opus sessions running simultaneously (e.g., LifeQuest + mental health):

Session A (LifeQuest):
  - worktree: plan-lifequest-xp-gates
  - zone: apps/rpg-tracker/app/(app)/skills/
  - active.md entry added on start

Session B (mental health):
  - worktree: plan-mental-health-onboarding
  - zone: apps/mental-health/
  - active.md entry added on start

Shared packages: neither session touches packages/* without
sequencing a shared-package task first (per Parallelisation Map).

Communication: Agent Teams mailbox for intra-session teammates.
Cross-session awareness: docs/sessions/active.md only.
```

---

## Install & Sync

```bash
# On any new machine:
git clone git@github.com:meden/claude-config.git ~/claude-config
cd ~/claude-config && ./install.sh

# install.sh creates symlinks:
ln -sf ~/claude-config/agents    ~/.claude/agents
ln -sf ~/claude-config/skills    ~/.claude/skills
ln -sf ~/claude-config/commands  ~/.claude/commands

# Update skills/agents on any machine:
cd ~/claude-config && git pull
# (symlinks mean changes are live immediately — no reinstall needed)
```

---

## Acceptance Criteria

1. `git clone && ./install.sh` makes all global agents and skills available in Claude Code on a new machine
2. A new project can be fully bootstrapped (agents tuned, docs scaffolded, CLAUDE.md written) in one orchestrator session using the `new-project-bootstrap` skill
3. Two Opus sessions can run simultaneously on different features without file conflicts, verified by `docs/sessions/active.md` showing two active zones with no overlap
4. A feature goes through the full pipeline (spec → arch review → UX review → gateway → TDD → implementation → code review → merge) using only the custom skills — no superpowers dependency
5. Each agent file reads fewer than 3 files from the spec/plan directory when dispatched
6. Tester writes failing tests from spec before any implementation exists; tests pass after implementation without modification
