# Claude Code Guide — RpgTracker

This project is in active development. Planning docs are under `Documentation/`. The agentic team system is under `docs/`.

## Quick Start

**Starting a new feature:** Use the orchestrator agent → it runs `plan-feature` then `execute-plan`.

**Implementation:** Use the orchestrator. It dispatches backend, frontend, tester, architect, reviewer.

## Repository Zones

| Zone | Paths | Agent |
|------|-------|-------|
| Go API | `apps/api/` | backend |
| Next.js UI | `apps/rpg-tracker/` | frontend |
| NutriLog UI | `apps/nutri-log/` | frontend |
| Mental Health UI | `apps/mental-health/` | frontend |
| Shared UI components | `packages/ui/src/` | frontend (shared — coordinate) |
| API client | `packages/api-client/src/` | backend or frontend (shared — coordinate) |
| Auth package | `packages/auth/src/` | backend (shared — coordinate) |

**Shared packages** (`packages/*`) require coordination — see `parallel-session` skill.

## Agentic Team

Global agents (loaded from `~/.claude/agents/` via `~/claude-config`):
- `orchestrator` — Opus 4.6. Plans features, dispatches team, merges work.
- `architect` — Reviews specs for schema/service impact. Produces Parallelisation Map.
- `reviewer` — Spec gateway (Phase 4) and code quality gate.
- `ux` — Reviews specs for UX correctness and mobile viability.

Project agents (in `.claude/agents/`):
- `backend` — Go API: chi handlers, pgx repositories, auth middleware.
- `frontend` — Next.js App Router, React, Tailwind v4, TanStack Query, @rpgtracker/ui.
- `tester` — Writes failing tests from spec ACs before any implementation.

## Development Pipeline

Two paths based on work type (D-036):

| Path | Flow | Gate |
|------|------|------|
| **Logic/API** | spec → TDD (tester) → implement → code review | Tests must pass |
| **UI/Visual** | style guide → page brief → implement → visual review | Reviewer checks tokens, themes, a11y |

Tests are required for business logic, API contracts, and component behaviour. Tests are NOT required for visual composition, layout, or theme rendering.

> **Current state (2026-03-22):** LifeQuest logic/API is complete. Responsive layout shipped. The current UI is structurally correct but uses the old two-theme system (`rpg-game`/`rpg-clean`). The three-theme visual design system (Minimal, Retro, Modern) is **designed but not yet implemented** — style guides and page guides are in `Documentation/style-guide/` and `Documentation/page-guides/`. All UI work must follow these guides. Page guides mark elements as EXISTING/NEW/MODIFIED — check before creating new components.

## Skills (global, from `~/.claude/skills/`)

- `plan-feature` — Phase 0 scale check, then quick path (bug fixes) or full 5-phase pipeline
- `execute-plan` — Agent Teams execution with TDD gate (logic) or visual review (UI)
- `tdd-first` — TDD discipline for the tester agent (logic/API work only — not for visual work)
- `use-context7` — Context7 library doc lookup
- `parallel-session` — Zone registration and worktree creation
- `abandon-feature` — Clean up cancelled/interrupted features
- `what-next` — Resume after interruption; reads session state and reports exact next action
- `correct-course` — Mid-implementation correction when spec, plan, or approach is wrong
- `new-project-bootstrap` — (for new projects) sets up agents + docs from templates

## Key Files

- `docs/sessions/` — active session zone files + abandoned log
- `docs/sessions/retros/` — post-merge retro notes
- `docs/specs/` — feature specs (DRAFT → APPROVED → archived)
- `docs/plans/` — implementation plans
- `docs/AGENTIC-SYSTEM.md` — agent roles, zone rules, session protocol, self-improvement
- `Documentation/PLATFORM-DECISIONS.md` — why monorepo, BFF, design tokens, theme system, hub architecture, pipeline split
- `Documentation/product-requirements.md` — product vision, three-theme system, hub architecture, Release 2+ roadmap
- `Documentation/feature-tracker.md` — all features (F-001–F-031), release status
- `Documentation/decision-log.md` — binding decisions (D-001–D-037)
- `Documentation/architecture.md` — domain model, schema, integration contracts, XP curve
- `Documentation/style-guide/` — shared + per-theme style guides (shared.md, minimal.md, retro.md, modern.md)
- `Documentation/page-guides/` — per-page design briefs (landing, dashboard, skills-list, skill-detail, skill-create, skill-edit, account, auth, nutri-placeholder, session)
- `Documentation/Design_Discussion.md` — finalised design direction (source material for the guides above)
- `Documentation/design-inspiration/` — theme reference images

> **For the orchestrator / architect agent:** When planning any feature that touches XP, levels, tiers, or the DB schema, read `Documentation/decision-log.md` (binding constants: XP curve D-014, tier structure D-016, color system D-020, security constraints D-015) and `Documentation/architecture.md` (current schema, integration contracts). These are not optional — they contain decisions that cannot be reopened without a new decision-log entry.

> **For the orchestrator / frontend agent:** When planning any UI work, read the relevant page guide in `Documentation/page-guides/` and the theme guides in `Documentation/style-guide/`. Also read `Documentation/PLATFORM-DECISIONS.md` (three-theme system, pipeline split). All new components must be theme-aware. Use design tokens, never hardcoded values. Check the page guide's element table for EXISTING/NEW/MODIFIED status before building.
- `apps/api/` — Go REST API (chi, pgx, Supabase JWT)
- `apps/rpg-tracker/` — Next.js 15 App Router — LifeQuest (fully implemented)
- `apps/nutri-log/` — Next.js 15 App Router — NutriLog (scaffolded)
- `apps/mental-health/` — Next.js 15 App Router — MindTrack (scaffolded)
- `packages/ui/` — shared React component library
- `packages/api-client/` — typed API client (used by all frontends)
- `packages/auth/` — Supabase auth helpers (browser + server)

## On a New Machine

```bash
git clone git@github.com:EdenExperiments/claude-config.git ~/claude-config
cd ~/claude-config && ./install.sh
# Then clone any project repo — its .claude/ agents are already tuned
```
