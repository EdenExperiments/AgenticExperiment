---

## name: local-dev-and-ci

description: Use for local environment setup, CI baseline checks, and operational workflow updates.

# Local Dev And CI Skill

## Scope

- `README.md`
- `apps/*/README.md`
- `.github/workflows/`
- local run/test commands

## File Focus (read first)

1. `README.md`
2. `apps/api/README.md`
3. `.github/workflows/ci.yml`
4. `.github/workflows/cursor-pr-review.yml`
5. `.github/workflows/cursor-security-triage.yml`
6. `packages/cursor-agents/src/`

## Search Boundaries

- Primary: docs/readme and workflow files only.
- Include app/package files only when a workflow step references them.
- Avoid broad scans of product docs for CI-only tasks.

## Hard Boundary Rule

- Do **not** scan the full repository for ops/CI tasks.
- Expand beyond workflow + setup docs only when:
  1. workflow command failures identify specific app/package paths,
  2. environment assumptions are ambiguous and require targeted source confirmation,
  3. user asks for full operational audit.

## Workflow

1. Keep local setup instructions accurate and minimal.
2. Keep CI baseline checks clear (`build`, `test`, and language-specific checks).
3. Introduce automation incrementally: read-only summaries before write/fix behavior.
4. Document required secrets/permissions for CI automation.

## Guardrails

- Prefer least-privilege GitHub permissions.
- Keep CI workflows composable and easy to debug.
- Align docs with actual workflow behavior to avoid drift.