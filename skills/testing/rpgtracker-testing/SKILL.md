---
name: rpgtracker-testing
description: Use for test strategy and implementation across backend and frontend changes.
---

# RpgTracker Testing Skill

## Scope

- Backend Go tests in `apps/api`
- Frontend/package tests in `apps/*` and `packages/*`

## File Focus (read first)

1. Test files adjacent to changed code (same package/module)
2. Package-level test config (`package.json`, `vitest` config if present)
3. `Documentation/decision-log.md` for behavior constraints when assertions involve business rules

## Search Boundaries

- Target changed package/app first.
- Expand to shared packages only when compilation/contracts require it.
- Do not run full workspace tests by default; run targeted tests first, then broaden.

## Hard Boundary Rule

- Do **not** run whole-repo scans or full-suite tests as first action.
- Escalate to wider search/testing only when:
  1. targeted tests pass but integration still fails,
  2. failure stack traces point outside touched scope,
  3. user explicitly requests full regression.

## Workflow

1. Determine whether work is logic/API behavior or visual composition.
2. For logic/API behavior, write or update tests that fail before implementation and pass after.
3. For visual-only changes, verify against style/page guides and avoid brittle snapshot assertions.
4. Run the smallest meaningful test set first, then broader checks for touched areas.

## Verification

- Backend: `go test ./...` from `apps/api`
- Workspace: `pnpm test` (or targeted package test command)
