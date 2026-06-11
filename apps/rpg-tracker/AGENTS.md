# TypeScript Frontend Stack Guide (Layer 2)

Applies to work under `apps/rpg-tracker/` (and by extension the other Next.js apps —
`apps/nutri-log/`, `apps/mental-health/`). Inherits the base layer; shared-package guidance lives
in `packages/AGENTS.md`. Role mechanics live in `.cursor/agents/*-ts.md`.

## Toolchain

- Framework: Next.js 15 App Router + React 19, BFF proxy pattern, TanStack Query v5 for server
  state, Tailwind CSS v4 tokens.
- Test (the named verification command for TS tasks): `pnpm test:ci` (Vitest + React Testing
  Library); targeted runs via the package-level `test` script.
- Build: `pnpm build` (Turbo-orchestrated).

## Patterns

- Visual work follows `Documentation/style-guide/` (shared + per-theme) and
  `Documentation/page-guides/` before implementation; use design tokens and theme layers — never
  hardcode visual values (D-035, three-layer theme architecture).
- Delivery split (D-036): logic/component behavior requires tests; pure visual composition is
  validated by visual review against the guides, not faux-TDD.
- Auth cookies via `@supabase/ssr` helpers in `packages/auth`; API access via the typed client in
  `packages/api-client` — keep BFF/API contract alignment when frontend contracts change.

## Read First

1. The relevant `Documentation/page-guides/` file, then `Documentation/style-guide/shared.md` plus
   the active theme guide.
2. The target app's `src/` for existing patterns.
3. `packages/ui/src/` only when shared components/tokens are touched.

## Boundaries

- Start in the target app directory; include `packages/ui/` or `packages/api-client/` only when the
  task genuinely crosses the boundary.
- Do not scan other apps unless the request is explicitly cross-app.
- If feature scope or readiness changes, update `Documentation/feature-tracker.md` in the same
  change.
