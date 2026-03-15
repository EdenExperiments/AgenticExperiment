# Claude Agent Team Handoff

Last updated: 2026-03-15

## Purpose

This document gives a Claude Code team an explicit starting plan, role boundaries, deliverables, and copy-ready prompts for the first planning pass.

## Shared Mission

Turn the rough project concept into a planning-ready package for a LifeQuest-first MVP, while preserving the longer-term NutriLog and cross-app vision without allowing that scope to destabilize the first build.

## Shared Ground Rules

- Treat `Documentation/` as the maintained source of truth.
- Do not treat `Requirements.txt` as canonical after structured docs exist.
- Use the checked-in project subagents in `.claude/agents/` when they fit the task.
- Use the checked-in project slash commands in `.claude/commands/` for repeatable kickoff workflows.
- Update `Documentation/feature-tracker.md` when a feature's readiness, owner, dependency, or scope changes.
- Update `Documentation/decision-log.md` when a product decision is made or a new unresolved question appears.
- Keep assumptions labeled as assumptions.
- Leave a short handoff note in your final response with: what changed, what remains open, and what the next agent should do.

## Team Sequence

| Order | Agent | Primary Goal | Main Outputs |
| --- | --- | --- | --- |
| 1 | requirements-agent | resolve product ambiguity and confirm MVP boundary | updated requirements, decisions, deferred scope |
| 2 | planning-agent | define the first release slice | MVP statement, phased slices, tracker alignment |
| 3 | architecture-agent | define domain and service boundaries | schema draft, ADRs, integration contracts |
| 4 | ux-agent | define the product shell and primary flows | IA, navigation, core journeys, mobile expectations |
| 5 | planning-agent | convert approved work into buildable backlog | first implementation backlog |
| 6 | review-agent | detect drift and readiness gaps | review findings, required corrections |

## Kickoff Exit Criteria

The first pass is complete only when:

- blocker behavior is resolved or explicitly accepted as an assumption
- the MVP boundary is explicit
- the app shell direction is explicit
- the first schema draft exists
- the first implementation backlog exists

## Role Briefs

### requirements-agent

Mission:
Resolve the main product ambiguities and make the first-release scope explicit.

Read first:

- `Documentation/product-requirements.md`
- `Documentation/decision-log.md`
- `Documentation/feature-tracker.md`

Required outputs:

- updated `product-requirements.md`
- updated `decision-log.md`
- tracker changes for any feature moved to deferred or kept in MVP

Focus:

- blocker progression rule
- MVP boundary between LifeQuest and NutriLog
- shared shell versus split-mode direction
- mobile-first expectation for release one
- what is intentionally out of scope

Starter prompt:

```text
You are the requirements-agent for this repository. Read CLAUDE.md and then the relevant docs under Documentation/. Your job is to resolve or sharply narrow the open product questions, tighten the LifeQuest-first MVP boundary, and update the maintained docs rather than adding loose notes. Preserve the distinction between confirmed decisions, assumptions, and open questions. End with a short handoff stating what changed, what remains open, and what the planning-agent should do next.
```

### planning-agent

Mission:
Convert approved product direction into a buildable release slice and then into actionable backlog structure.

Read first:

- `Documentation/planning-handoff.md`
- `Documentation/feature-tracker.md`
- `Documentation/product-requirements.md`
- `Documentation/decision-log.md`

Required outputs:

- updated `planning-handoff.md`
- updated `feature-tracker.md`
- first backlog proposal for Platform Foundation and LifeQuest Core

Focus:

- define the v1 slice
- order work to reduce schema churn
- separate true MVP from later enhancements
- assign clear ownership for near-term planning work

Starter prompt:

```text
You are the planning-agent for this repository. Read CLAUDE.md and the planning documents under Documentation/. Convert the approved product direction into a tight v1 slice, a deferred list, and a first implementation backlog for Platform Foundation and LifeQuest Core. Keep the tracker aligned with readiness and ownership. End with a short handoff stating what changed, what remains open, and what the architecture-agent should do next.
```

### architecture-agent

Mission:
Define a stable-enough domain model and service boundary plan for the first implementation pass.

Read first:

- `Documentation/product-requirements.md`
- `Documentation/planning-handoff.md`
- `Documentation/decision-log.md`
- `Documentation/feature-tracker.md`

Required outputs:

- schema draft or ADR package
- integration notes for Supabase, Claude, and food data
- tracker or decision updates if new dependencies or risks are identified

Focus:

- user, skill, XP, blocker, and log entities
- NutriLog modeling only to the extent needed to avoid future rework
- secure Claude API key storage and usage flow
- event and progression modeling that will support the MVP

Starter prompt:

```text
You are the architecture-agent for this repository. Read CLAUDE.md and the current Documentation/ set. Produce the first domain and integration design for a LifeQuest-first MVP, including the data model, service boundaries, and Claude key handling approach. Avoid over-designing deferred features, but model enough to prevent obvious future churn. Update the planning docs if new dependencies, decisions, or risks are discovered. End with a short handoff stating what changed, what remains open, and what the ux-agent should do next.
```

### ux-agent

Mission:
Define the user-facing structure and critical journeys so implementation can begin with the right shell and flow assumptions.

Read first:

- `Documentation/product-requirements.md`
- `Documentation/planning-handoff.md`
- `Documentation/decision-log.md`
- `Documentation/feature-tracker.md`

Required outputs:

- information architecture summary
- shared shell or split-mode recommendation
- core journey definitions for skill creation, quick logging, and progress display
- documentation updates for any UX-driven product clarifications

Focus:

- mobile-first expectations
- app shell and navigation
- low-friction logging
- clear progression visibility

Starter prompt:

```text
You are the ux-agent for this repository. Read CLAUDE.md and the Documentation/ set, then define the first-release information architecture, navigation direction, and core user journeys for the LifeQuest-first MVP. Optimize for low-friction logging and mobile viability. Update the maintained docs rather than creating isolated notes. End with a short handoff stating what changed, what remains open, and what the planning-agent should do next.
```

### review-agent

Mission:
Check whether the team produced a coherent, build-ready planning package and identify gaps that must be fixed before implementation.

Read first:

- all files in `Documentation/`
- any new schema or ADR files created by the team

Required outputs:

- review findings ordered by severity
- corrections requested in the maintained docs
- explicit go or no-go recommendation for implementation kickoff

Focus:

- contradictions between requirements, planning, tracker state, and decisions
- unresolved blockers hidden as assumptions
- missing dependencies or unclear ownership
- implementation starting too early without enough definition

Starter prompt:

```text
You are the review-agent for this repository. Read CLAUDE.md, all current Documentation/ files, and any new planning artifacts created in this pass. Review for contradictions, missing decisions, weak assumptions, and readiness gaps. Findings come first, ordered by severity, with file references where relevant. State clearly whether implementation should begin yet. End with a short handoff stating what changed, what remains open, and what the next responsible agent should do.
```

## Suggested Working Agreement For Claude Code

- one agent owns the document update in each turn
- one agent does not silently overwrite another agent's changes without reading them first
- final responses should mention the exact docs updated
- if an agent cannot resolve a question from repo context, it should convert it into an explicit decision-log item instead of guessing
