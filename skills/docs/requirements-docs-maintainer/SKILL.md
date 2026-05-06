---

## name: requirements-docs-maintainer
description: Maintain and synchronize product requirements, planning handoff, decision log, and feature tracker documents.

# Requirements Docs Maintainer

Start with `Documentation/README.md`, then inspect the request and affected docs before editing.

## File Focus (read first)

1. `Documentation/README.md`
2. `AGENTS.md`
3. `docs/CURSOR-AGENT-HANDBOOK.md`
4. The minimal impacted canonical docs (`product-requirements.md`, `planning-handoff.md`, `feature-tracker.md`, `decision-log.md`)

## Search Boundaries

- Primary: `Documentation/`
- Secondary: `AGENTS.md`, `docs/CURSOR-AGENT-HANDBOOK.md`, and relevant app README when operational wording is involved.
- Avoid scanning specs/plans archives unless a historical conflict must be resolved.

## Hard Boundary Rule

- Do **not** scan all documentation trees by default.
- Start with canonical docs only, then expand if:
  1. a contradiction cannot be resolved from canonical files,
  2. historical wording must be traced for migration notes,
  3. user explicitly asks for archive-wide audit.

## Core Workflow

1. Identify whether the request changes requirements, planning, feature status, decisions, or workflow policy.
2. Update the smallest valid set of canonical docs under `Documentation/`.
3. Keep `Documentation/feature-tracker.md` synchronized for meaningful feature/scope/status changes.
4. Record unresolved questions or new decisions in `Documentation/decision-log.md`.
5. Preserve the distinction between confirmed requirements, assumptions, and open questions.

## Document Selection

- Edit `AGENTS.md` when repository directory/context routing changes.
- Edit `docs/CURSOR-AGENT-HANDBOOK.md` when Cursor operating workflow changes.
- Edit `Documentation/product-requirements.md` for product behavior, scope, goals, or requirements.
- Edit `Documentation/planning-handoff.md` for sequencing and delivery framing.
- Edit `Documentation/feature-tracker.md` for readiness, ownership, blockers, or status.
- Edit `Documentation/decision-log.md` when a decision is made or clarification is needed.
- Edit `Documentation/README.md` when canonical documentation routes change.

## Tracking Rules

- Prefer tracker rows and decision entries over narrative status buried in prose.
- Use ISO dates for new entries.
- Keep feature IDs stable once created.
- Label inferred information as assumptions.
- If only one canonical doc changes, explain why related docs did not need updates.

## Before Finishing

1. Check for contradictions across requirements, planning, and tracker status.
2. Ensure the latest request is reflected in the canonical doc set.
3. Summarize unresolved questions separately from confirmed updates.
4. Leave documentation in a state where another agent can continue quickly.

For document roles and update expectations, read `references/doc-set.md`.