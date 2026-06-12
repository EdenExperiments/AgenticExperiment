---
name: requirements-docs-maintainer
description: Maintain and synchronize product requirements, planning handoff, decision log, and feature tracker documents.
---

# Requirements Docs Maintainer

## When to use

When a change affects product scope/vision, feature status, or binding decisions and canonical docs must stay synchronized.

Do not use for code-only changes with no scope/status/decision impact.

## Inputs

- The request and the change it implies
- `Documentation/README.md`, `AGENTS.md` (documentation contract D-059)
- Impacted canonical docs as needed

## Outputs

- Minimal doc updates per the 2-tier contract
- New tracker rows / decision entries (ISO dates, stable feature IDs)
- Explicit note when untouched docs did not need updates

## Procedure

1. **Always tier:** update `feature-tracker.md` when status/scope changes; update `decision-log.md` when a binding decision is made or a major open question appears.
2. **Delivery tier:** per-feature requirements live in `Documentation/delivery/` artifacts — do not mirror into `product-requirements.md` unless product scope/vision changed.
3. **PRD tier:** update `product-requirements.md` only when product scope or vision changes (not per delivery task).
4. **Routing/docs:** update `AGENTS.md` or `docs/CURSOR-AGENT-HANDBOOK.md` only when repository routing or workflow/CI behavior changes.
5. Prefer tracker rows and decision entries over narrative status buried in prose.

## Examples

### Positive

- Pipeline adoption → decision-log D-055–D-058 + tracker rows; PRD unchanged.

### Negative

- Updating planning-handoff, roadmap, and PRD for every feature delivery task.
