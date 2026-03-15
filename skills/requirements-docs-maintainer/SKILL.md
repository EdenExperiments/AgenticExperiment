---
name: requirements-docs-maintainer
description: Maintain and update the product requirements, planning handoff, decision log, and feature tracker for this repository. Use when refining rough requirements, converting brainstorming notes into shareable docs, keeping planning documents synchronized, or preparing handoff-ready requirement material for other agents or teams.
---

# Requirements Docs Maintainer

Start with `Documentation/README.md`, then inspect the current request and the affected docs before editing anything.

## Core Workflow

1. Identify whether the request changes product requirements, planning, feature status, decisions, or agent workflow.
2. Update the smallest valid set of documents under `Documentation/`.
3. Keep `feature-tracker.md` synchronized for every meaningful feature or status change.
4. Record unresolved questions or new decisions in `decision-log.md`.
5. Preserve the difference between confirmed requirements, assumptions, and open questions.

## Document Selection

- Edit `CLAUDE.md` when Claude Code entry guidance or team execution order changes.
- Edit `Documentation/product-requirements.md` for product behavior, scope, goals, or functional requirements.
- Edit `Documentation/planning-handoff.md` for epics, sequencing, dependencies, and recommended delivery order.
- Edit `Documentation/feature-tracker.md` for readiness, ownership, blockers, or status.
- Edit `Documentation/decision-log.md` when a decision is made or clarification is still needed.
- Edit `Documentation/agent-operating-model.md` when the team workflow, handoff expectations, or tracking standard changes.
- Edit `Documentation/claude-agent-team.md` when Claude Code role briefs, prompts, or team sequencing changes.

## Tracking Rules

- Do not bury status in prose when a tracker row or decision entry is the better place.
- Use ISO dates for new entries.
- Keep feature IDs stable once created.
- If information is inferred rather than confirmed by the user, label it as an assumption.
- If only one document changes, explain why the other related docs did not need updates.

## Source Material

- Treat `Requirements.txt` as rough intake unless the user explicitly asks to maintain that file too.
- Use the structured documentation set as the maintained source of truth after it exists.

## Before Finishing

1. Check for contradictions between requirements, planning, and tracker status.
2. Ensure the latest request is reflected in the right document set.
3. Summarize unresolved questions separately from confirmed updates.
4. Leave the repo in a state where another agent can continue without rereading the entire rough brief.

For document roles and update expectations, read `references/doc-set.md`.
