# Documentation Index

Use this file as the canonical map for project documentation.

## Core Canonical Documents

- `product-requirements.md` - product vision, scope, requirements, and release framing.
- `architecture.md` - domain model, API and schema contracts, and implementation constraints.
- `decision-log.md` - binding decisions and unresolved questions.
- `feature-tracker.md` - feature status, readiness, and deferred backlog.
- `planning-handoff.md` - delivery sequencing context and planning history.
- `PLATFORM-DECISIONS.md` - platform-level rationale (monorepo, BFF, theme system, pipeline split).

## Design Implementation References

- `style-guide/` - shared + per-theme design rules.
- `page-guides/` - page-specific implementation briefs (EXISTING/NEW/MODIFIED components).
- `Design_Discussion.md` - historical design rationale source material.

## Agent Workflow References

- `../AGENTS.md` - root directory for repository zones and context links.
- `../docs/CURSOR-AGENT-HANDBOOK.md` - Cursor-first operating workflow for local agents, cloud agents, and CI automation.

## Pruning And Archive Policy

- Keep canonical docs concise and current; avoid duplicating the same guidance in multiple files.
- When replacing a document, move the old content to `../docs/archive/` with a short deprecation note and replacement link.
- Keep historical implementation artifacts in `../docs/specs/`, `../docs/plans/`, and `../docs/sessions/retros/` unless explicitly archived.
- Prefer updating canonical docs over creating new ad hoc narrative files.

## Update Expectations

For substantive product/planning changes, review:

1. `product-requirements.md`
2. `planning-handoff.md`
3. `feature-tracker.md`
4. `decision-log.md`

If only one or two files change, explicitly state why the others were not updated.