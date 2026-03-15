# Repository Agent Guide

This repository is in the requirements and planning stage. Treat the structured documents under `Documentation/` as the maintained source of truth for product intent, planning state, and handoff context.

## Working Rules

- Start by reading `Documentation/README.md`.
- If using Claude Code, also read `CLAUDE.md`.
- When requirements change, update the relevant document in `Documentation/` in the same turn.
- When a feature, dependency, or decision changes, update `Documentation/feature-tracker.md`.
- When a product decision is made or a major unresolved question is identified, update `Documentation/decision-log.md`.
- Keep planning-oriented sequencing in `Documentation/planning-handoff.md`.
- Preserve the distinction between confirmed requirements, assumptions, and open questions.

## Multi-Agent Expectations

- Record work in a way that another agent can resume without rereading the whole repo.
- Prefer small, explicit status updates in the tracker over burying state in prose.
- Mark blockers, dependencies, and missing decisions directly in the docs.
- If implementation work begins later, ensure each feature being built can be traced back to a tracker entry and a requirement section.

## Required Outputs For Requirements Work

For any substantive product or planning change, update as needed:

1. `Documentation/product-requirements.md`
2. `Documentation/planning-handoff.md`
3. `Documentation/feature-tracker.md`
4. `Documentation/decision-log.md`

If the change only affects one of those documents, state why the others did not need updating.
