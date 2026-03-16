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
- `claude-agent-team.md`: Claude Code team briefs and starter prompts

## Current State

The project has completed its full planning pass and is ready for implementation. All release-1 product decisions are confirmed (decision-log has no open questions). The complete Phase 1 and Phase 2 implementation backlog is defined in `planning-handoff.md`. All 8 release-1 features are `ready-for-build`. The delivery-agent can begin at TASK-101.
