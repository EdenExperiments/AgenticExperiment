# Documentation Set

Last updated: 2026-03-15

## Purpose

This folder turns the rough project brief into a maintained set of planning documents that can be shared with planning teams and used by multiple agents without losing context.

## Source Of Truth

- `Requirements.txt`: original rough intake and brainstorming source
- `product-requirements.md`: current product requirements source of truth
- `planning-handoff.md`: current planning and sequencing source of truth
- `feature-tracker.md`: current execution and readiness source of truth
- `decision-log.md`: current decision and clarification source of truth

## Update Workflow

1. Read the user request and identify whether it changes requirements, planning, status, or decisions.
2. Update the smallest set of affected documents.
3. Ensure `feature-tracker.md` reflects the latest state for impacted features.
4. Log any new unresolved questions in `decision-log.md`.
5. Leave enough traceability that another agent can resume without re-parsing `Requirements.txt`.

## Document Map

- `product-requirements.md`: product vision, scope, user experience goals, feature requirements
- `planning-handoff.md`: implementation phases, epics, delivery sequencing, prerequisites
- `feature-tracker.md`: feature inventory with owners, dependencies, and readiness
- `decision-log.md`: accepted decisions and open questions requiring user input
- `agent-operating-model.md`: coordination standards for teams of agents
- `archived/claude-agent-team-planning-pass.md`: Claude Code team briefs from the first planning pass (archived — planning complete)

## Current State

**Phase 1 complete (2026-03-16).** F-001 (app shell/navigation), F-002 (Supabase auth), and F-003 (Claude API key storage) are shipped and verified running.

**Phase 2 is the active work slice** — F-004 through F-009 (Skill CRUD, XP logging, progression display, blocker gates, AI calibration). Implementation runs through the agentic team system: use the orchestrator agent with `plan-feature` to start a feature. See root `CLAUDE.md` for the agent roster and zone map.

All release-1 product decisions are confirmed (decision-log has no open questions). The Phase 2 task backlog in `planning-handoff.md` remains valid as spec reference.
