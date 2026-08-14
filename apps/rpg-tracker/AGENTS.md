# TypeScript Frontend Stack Guide (Layer 2)

Applies to work under `apps/rpg-tracker/` (and by extension the other Next.js apps —
`apps/nutri-log/`, `apps/mental-health/`). Inherits the base layer; shared-package guidance lives
in `packages/AGENTS.md`. Development uses pstack `/poteto-mode`; there is no repo-managed TS
test-writer/implementer agent (D-063).

## Toolchain

- Framework: Next.js 15 App Router + React 19, BFF proxy pattern, TanStack Query v5 for server
  state, Tailwind CSS v4 tokens.
- Test (the named verification command for TS tasks): `pnpm test:ci` (Vitest + React Testing
  Library); targeted runs via the package-level `test` script.
- Build: `pnpm build` (Nx-orchestrated).

## Patterns

- Visual work uses `docs/ui.md` and `packages/ui` tokens — never hardcoded colour classes.
- Logic/API needs tests; pure visual composition is reviewed against tokens, not faux-TDD.
- Auth cookies via `@supabase/ssr` helpers in `packages/auth`; API access via the typed client in
  `packages/api-client` — keep BFF/API contract alignment when frontend contracts change.

## Read First

1. `docs/apps/lifequest.md` (or nutrilog/mindtrack for those apps) and `docs/ui.md`.
2. The target app's routes for existing patterns.
3. `packages/ui/src/` only when shared components/tokens are touched.

## Boundaries

- Start in the target app directory; include `packages/ui/` or `packages/api-client/` only when the
  task genuinely crosses the boundary.
- Do not scan other apps unless the request is explicitly cross-app.
- If a lasting product rule changed, update `docs/` (two sentences). Do not add a tracker row.
