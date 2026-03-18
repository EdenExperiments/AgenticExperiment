Can# Claude Code Guide — RpgTracker

This project is in active development. Planning docs are under `Documentation/`. The agentic team system is under `docs/`.

## Quick Start

**Starting a new feature:** Use the orchestrator agent → it runs `plan-feature` then `execute-plan`.

**Reviewing planning docs:** Use `requirements-agent`, `planning-agent`, `architecture-agent`, `ux-agent`, `review-agent` in `.claude/agents/` (planning-phase agents, operate on `Documentation/`).

**Implementation:** Use the orchestrator. It dispatches backend, frontend, tester, architect, reviewer.

## Repository Zones

| Zone | Paths | Agent |
|------|-------|-------|
| Go API | `apps/api/` | backend |
| Next.js UI | `apps/rpg-tracker/` | frontend |
| Shared UI components | `packages/ui/src/` | frontend (shared — coordinate) |
| API client | `packages/api-client/src/` | backend or frontend (shared — coordinate) |
| Auth package | `packages/auth/src/` | backend (shared — coordinate) |

**Shared packages** (`packages/*`) require coordination — see `parallel-session` skill.

## Agentic Team — Implementation Phase

Global agents (loaded from `~/.claude/agents/` via `~/claude-config`):
- `orchestrator` — Opus 4.6. Plans features, dispatches team, merges work.
- `architect` — Reviews specs for schema/service impact. Produces Parallelisation Map.
- `reviewer` — Spec gateway (Phase 4) and code quality gate.
- `ux` — Reviews specs for UX correctness and mobile viability.

Project agents (in `.claude/agents/`):
- `backend` — Go API: chi handlers, pgx repositories, auth middleware.
- `frontend` — Next.js App Router, React, Tailwind v4, TanStack Query, @rpgtracker/ui.
- `tester` — Writes failing tests from spec ACs before any implementation.

## Agentic Team — Planning Phase

Use these agents for documentation-level planning (operate on `Documentation/`):
- `requirements-agent` — resolves product ambiguity, tightens MVP scope
- `planning-agent` — converts decisions into backlog slices
- `architecture-agent` — produces schema and service boundary design
- `ux-agent` — defines IA and core journeys
- `review-agent` — reviews planning package for gaps

## Skills (global, from `~/.claude/skills/`)

- `plan-feature` — 5-phase pipeline: spec → arch review → UX review → gateway → plan
- `execute-plan` — Agent Teams execution with TDD gate
- `tdd-first` — TDD discipline for the tester agent
- `use-context7` — Context7 library doc lookup
- `parallel-session` — Zone registration and worktree creation
- `abandon-feature` — Clean up cancelled/interrupted features
- `new-project-bootstrap` — (for new projects) sets up agents + docs from templates

## Key Files

- `docs/sessions/` — active session zone files + abandoned log
- `docs/specs/` — feature specs (DRAFT → APPROVED → archived)
- `docs/plans/` — implementation plans
- `Documentation/` — product requirements, decisions, feature tracker (planning phase)
- `apps/api/` — Go REST API (chi, pgx, Supabase JWT)
- `apps/rpg-tracker/` — Next.js 15 App Router frontend
- `packages/ui/` — shared React component library
- `packages/api-client/` — typed API client (used by frontend)
- `packages/auth/` — Supabase auth helpers (browser + server)

## On a New Machine

```bash
git clone git@github.com:EdenExperiments/claude-config.git ~/claude-config
cd ~/claude-config && ./install.sh
# Then clone any project repo — its .claude/ agents are already tuned
```
