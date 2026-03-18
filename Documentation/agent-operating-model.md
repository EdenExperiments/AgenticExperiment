# Agent Operating Model

Last updated: 2026-03-18

> **Current status (2026-03-18):** The first planning pass (requirements → planning → architecture → UX → review) is **complete**. Phase 1 is shipped. The active phase is **Phase 2 implementation**, which runs through the agentic team system documented in the root `CLAUDE.md`. The planning-phase agent roles below (requirements-agent, planning-agent, architecture-agent, ux-agent, review-agent) remain available for scope changes or new product decisions. Implementation work uses orchestrator → backend/frontend/tester specialists via `plan-feature` + `execute-plan` skills.

## Purpose

Multiple agents may contribute to requirements, planning, and later feature work. This document defines the minimum coordination model so work stays traceable and consistent.

## Roles

- Requirements agent: refines product intent and updates requirement documents
- Planning agent: converts approved requirements into epics, slices, and implementation sequencing
- Delivery agent: implements approved work and reports status back into the tracker
- Review agent: checks for drift between implementation, planning, and requirements

One agent may fill multiple roles in a given turn, but the outputs should still follow the same document responsibilities.

## Coordination Rules

- Every substantial feature should have a tracker entry in `feature-tracker.md`.
- Every unresolved product question should exist in `decision-log.md`.
- Requirements changes should land before or with planning changes, not after implementation.
- If an implementation choice changes product behavior, route that change back into the requirements docs.
- Leave explicit notes when work is blocked by missing product decisions.

## Handoff Standard

Each handoff should make these items obvious:

- what changed
- what remains open
- what document is now authoritative
- what the next agent should do next

## First Team Pass

For the first coordinated planning pass, use this order:

1. requirements-agent resolves product questions and confirms MVP boundaries
2. planning-agent turns the approved scope into the first MVP slice and deferred list
3. architecture-agent produces schema and integration boundaries
4. ux-agent defines shell, navigation, and primary user journeys
5. planning-agent converts approved outputs into buildable slices
6. review-agent checks for drift and missing dependencies

If any step introduces a new product decision, send it back through `decision-log.md` before continuing.

## Minimum Tracking Standard

Before concluding a requirements or planning update, verify:

1. affected features have current statuses
2. unresolved decisions are logged
3. assumptions are labeled as assumptions
4. the next team can identify the next planning or implementation slice
