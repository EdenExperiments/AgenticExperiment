# Shared Packages Stack Guide (Layer 2)

Applies to work under `packages/*`. Inherits the base layer. These are shared zones: changes here
ripple into every app, so coordinate explicitly.

## Zones

- `packages/ui/` — design tokens, components, theme behavior (three-layer theme system, D-035).
- `packages/auth/` — Supabase SSR/browser auth helpers.
- `packages/api-client/` — typed API integration layer; must stay aligned with the Go API contract
  in `apps/api` and `Documentation/architecture.md`.
- `packages/cursor-agents/` — CI/CD agent automation (`@cursor/sdk`): `dep-assess` (Renovate highlights),
  `security-triage`, `fix-attempt` (gated SDK remediation), `maintenance-queue`, digest/metrics.
  PR review is Bugbot-only (D-060). Follow `docs/CURSOR-AGENT-HANDBOOK.md` (marker idempotency,
  `model-fallback.ts` per D-054, kill-switch respect).

## Toolchain

- Test: `pnpm test:ci` at root, or the package-level `test` script for targeted runs
  (`pnpm --filter <pkg> test`).
- `packages/cursor-agents` has its own Vitest suite (`pnpm --filter @rpg/cursor-agents test`).

## Rules

- Cross-cutting changes (tokens, auth, API client types) require checking each consuming app
  compiles and its tests pass before completion.
- Record sequencing/dependencies for cross-zone work in the active spec or task artifact before
  implementation.
- Component/behavior changes in `packages/ui` require behavior tests; visual-only changes follow
  the style guides (D-036).
