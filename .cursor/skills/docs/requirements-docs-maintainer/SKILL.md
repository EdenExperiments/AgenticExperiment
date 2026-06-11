---
name: requirements-docs-maintainer
description: Maintain and synchronize product requirements, planning handoff, decision log, and feature tracker documents.
---

# Requirements Docs Maintainer

## When to use

Use when a change affects requirements, planning, feature status, decisions, or workflow policy and
the canonical doc set under `Documentation/` must stay synchronized.

Do not use for code-only changes with no scope/status/decision impact.

## Inputs

- The request and the change it implies
- `Documentation/README.md`, `AGENTS.md`, `docs/CURSOR-AGENT-HANDBOOK.md`
- The minimal impacted canonical docs (`product-requirements.md`, `planning-handoff.md`,
  `feature-tracker.md`, `decision-log.md`)

## Outputs

- Smallest valid set of canonical doc updates
- New tracker rows / decision entries (ISO dates, stable feature IDs)
- Explicit note of why untouched canonical docs did not need updates

## Procedure

1. Identify whether the request changes requirements, planning, feature status, decisions, or
   workflow policy.
2. Select target docs: `product-requirements.md` for behavior/scope; `planning-handoff.md` for
   sequencing; `feature-tracker.md` for readiness/status; `decision-log.md` for decisions or open
   questions; `AGENTS.md` for context routing; the handbook for workflow changes.
3. Prefer tracker rows and decision entries over narrative status buried in prose. Label inferred
   information as assumptions.
4. Check for contradictions across requirements, planning, and tracker status before finishing.
5. Leave documentation resumable: confirmed updates separated from unresolved questions.

## Examples

### Positive

- "We adopted a new target architecture for agent automation" → decision-log entries + tracker
  rows + handbook reference in the same change.

### Negative

- Editing every documentation file for a change that only affects one canonical doc.
