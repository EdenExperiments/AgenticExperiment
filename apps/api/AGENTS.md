# Go API Stack Guide (Layer 2)

Applies to all work under `apps/api/`. Inherits the base layer (root `AGENTS.md`,
`.cursor/rules/security-baseline.mdc`, hooks). Role mechanics live in `.cursor/agents/*-go.md`.

## Toolchain

- Build: `go build ./...` from `apps/api/`
- Test (the named verification command for Go tasks): `go test ./...` from `apps/api/`
- Migrations: plain SQL via golang-migrate under `apps/api/db/migrations/`

## Patterns

- Routing/handlers: chi. Repositories use pgx/v5. Auth middleware validates Supabase JWTs via JWKS
  (1-hour TTL cache, single re-fetch on unknown kid — R-001).
- XP/level computation is a pure function in the `xpcurve` package; `MaxLevel = 200` (R-005).
  Effective-level capping happens in the Go handler layer, never client-side (R-004).
- XP writes are three-way atomic: `xp_events` insert + `skills.current_xp` + `skills.current_level`
  in one transaction (R-003).
- Claude API keys: AES-256-GCM envelope encryption at the Go layer; key material never logged or
  returned to clients (D-015). Fresh `crypto/rand` nonce per encryption (R-002).
- Supabase Storage access uses direct REST calls, not a Go SDK (D-042).

## Read First

1. `apps/api/cmd/server/main.go`, `apps/api/internal/server/server.go`
2. `apps/api/internal/config/config.go`, `apps/api/internal/database/`
3. `Documentation/architecture.md` and `Documentation/decision-log.md` for binding constraints

## Boundaries

- Search root is `apps/api/`; expand to `packages/*` only for shared-contract changes, dependency
  breakage in test output, or explicit cross-repo requests.
- Keep migrations forward/backward compatible where possible.
- Preserve user isolation and auth boundaries in every handler/repository change.
- If behavior changes user-facing functionality, update `Documentation/feature-tracker.md` in the
  same change.
