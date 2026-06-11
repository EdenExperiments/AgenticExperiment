---
name: local-dev-and-ci
description: Use for local environment setup, CI baseline checks, and operational workflow updates.
---

# Local Dev And CI

## When to use

Use for local environment setup, CI baseline maintenance, and operational workflow documentation.

Do not use for product feature work or agent-pipeline policy changes (see the handbook and the
agentic-pipeline brief for those).

## Inputs

- `README.md` and `apps/*/README.md`
- `.github/workflows/` (CI baseline + agent workflows)
- `packages/cursor-agents/src/` when workflow steps reference automation scripts

## Outputs

- Accurate, minimal local setup instructions
- Clear CI baseline checks (`build`, `test`, language-specific checks)
- Documented secrets/permissions for CI automation

## Procedure

1. Keep local setup instructions accurate and minimal.
2. Keep CI baseline checks clear and separate from agent automation workflows.
3. Introduce automation incrementally: read-only summaries before write/fix behavior.
4. Prefer least-privilege GitHub permissions; keep workflows composable and debuggable.
5. Align docs with actual workflow behavior to avoid drift.

## Examples

### Positive

- "CI is failing on a new Node version" → fix the workflow, update README prerequisites, document
  the change.

### Negative

- Scanning product documentation trees for a CI-only task.
