# Agentic Team System

> Condensed from `2026-03-18-agentic-team-system.md`, `2026-03-18-agentic-team-system/spec.md`,
> `2026-03-19-agent-self-improvement.md`, `2026-03-18-agent-self-improvement-design.md`,
> `2026-03-15-agent-team-planning-pass.md`.
> Original plans archived in `docs/superpowers/archived/`.

---

## Agent Roles

**Global agents** (`~/claude-config/agents/`, available in all projects):

| Agent | Model | Role |
|-------|-------|------|
| `orchestrator` | Opus 4.6 | Plans features via `plan-feature`, dispatches team, merges work |
| `architect` | Sonnet | Reviews spec for schema/service impact; produces Parallelisation Map |
| `reviewer` | Sonnet | Spec gateway (Phase 4) + code quality gate (post-implementation) |
| `ux` | Sonnet | Reviews spec for UX correctness and mobile viability |

**Project agents** (`.claude/agents/`, repo-specific tuning):

| Agent | Role |
|-------|------|
| `backend` | Go API: chi handlers, pgx repositories, auth middleware |
| `frontend` | Next.js App Router, React, Tailwind v4, TanStack Query, @rpgtracker/ui |
| `tester` | Writes failing tests from spec ACs before any implementation |

---

## Five-Phase Feature Pipeline (`plan-feature` skill)

```
Phase 1  — Spec draft (requirements, ACs, zones)
Phase 1.5 — Reviewer: spec-draft mode (inline, max 2 iterations)
Phase 2  — Architect review (Parallelisation Map, schema impact)
Phase 3  — UX review (mobile viability, navigation impact)
Phase 4  — Reviewer gateway (spec approved or rejected)
Phase 5  — Plan (task slices, file paths, test manifests)
Phase 5.5 — Reviewer: plan review (AC→task mapping, max 2 iterations)
→ execute-plan
```

Quick Path (bug fixes, small changes): spec → plan → execute (skips arch/UX/gateway).

---

## Zone Overlap Rules

A zone is a list of path prefixes that an agent will read/write. Zones conflict when one prefix is a prefix of another (any overlap blocks parallel execution).

```
Zone A = ["apps/rpg-tracker/"]
Zone B = ["packages/ui/src/"]   ← conflict: packages/* always conflict
Zone C = ["apps/api/"]          ← no conflict with A or B
```

`packages/*` always conflict — never run two agents touching shared packages in parallel. Register a session file and check for overlap before starting any agent that writes shared packages.

---

## Session File Protocol

Purpose: prevents two agents writing the same paths simultaneously (TOCTOU race).

1. Write `docs/sessions/{feature}-active.md` with zones + `status: in-progress`
2. Wait 2 seconds
3. Read all `*-active.md` files — check for zone overlap
4. If overlap found: block and surface to user
5. On complete: delete the active file (or set `status: complete` before deletion)
6. Stale threshold: 8 hours — file older than 8h is assumed abandoned

---

## Self-Improvement Loop

**Retro notes** (`docs/sessions/retros/`): written after every merge. Format:
```
type: full | quick
corrections: [what the agent got wrong]
blocks: [what caused a block]
reviewer-flags: [issues raised by reviewer]
summary: clean | corrections | blocked
processed: -- (until improve skill runs)
```

**`improve` skill constraints** (guards against bloat):
- A pattern must appear in ≥2 retros before being added to a skill/agent
- Changes must be net-neutral or net-negative in line count
- Single-occurrence issues are never added
- Human approval required for every proposed change
- Only generalisable rules (not project-specific facts) go into global agents/skills

**Reviewer modes** (max 2 iterations each before surfacing to user):
- Phase 1.5: spec-draft review — checks verifiable ACs, zone completeness
- Phase 5.5: plan review — checks AC→task mapping, explicit file paths in every task

---

## Planning-Phase Agents (initial greenfield only)

`requirements-agent`, `planning-agent`, `architecture-agent`, `ux-agent`, `review-agent` were used for the initial RpgTracker planning pass (2026-03-15). They operate on `Documentation/` and are only relevant when bootstrapping a new project from scratch. For ongoing feature work, use the orchestrator + implementation agents.
