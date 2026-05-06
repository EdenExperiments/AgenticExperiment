---
name: rpgtracker-backend
description: Use for Go API work in apps/api including chi handlers, repositories, auth middleware, and migrations.
---

# RpgTracker Backend Skill

## Scope

- `apps/api/cmd/server/`
- `apps/api/internal/`
- `apps/api/db/migrations/`

## File Focus (read first)

1. `apps/api/cmd/server/main.go`
2. `apps/api/internal/server/server.go`
3. `apps/api/internal/config/config.go`
4. `apps/api/internal/database/`
5. `apps/api/db/migrations/`
6. `Documentation/architecture.md` and `Documentation/decision-log.md`

## Search Boundaries

- Primary search root: `apps/api/`
- Secondary docs root: `Documentation/`
- Avoid whole-repo scans unless dependency tracing explicitly requires shared packages.

## Hard Boundary Rule

- Do **not** run whole-repo search by default.
- Expand beyond `apps/api/` only when one of these is true:
  1. the task explicitly touches shared packages (`packages/*`),
  2. compilation/test output points to external dependency breakage,
  3. the user explicitly requests cross-repo impact analysis.

## Workflow

1. Confirm API contract and decision constraints in `Documentation/architecture.md` and `Documentation/decision-log.md`.
2. Implement minimal handler/repository/middleware changes needed for the task.
3. Add or update tests in the touched backend package.
4. Run `go test ./...` from `apps/api` before completion.

## Guardrails

- Preserve user isolation and auth boundaries.
- Keep migrations forward/backward compatible where possible.
- If backend behavior changes user-facing functionality, update `Documentation/feature-tracker.md`.
