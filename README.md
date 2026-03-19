# RpgTracker Platform

A self-improvement platform built as a Turborepo monorepo. Three apps share a single Go API, auth layer, and React component library.

| App | Path | Status |
|-----|------|--------|
| **LifeQuest** — RPG-style skill/XP tracker | `apps/rpg-tracker` | Fully implemented |
| **NutriLog** — Nutrition and weight tracking | `apps/nutri-log` | Scaffolded |
| **MindTrack** — Mental wellness tracking | `apps/mental-health` | Scaffolded |
| **Go API** — Shared REST backend | `apps/api` | Fully implemented |

## Stack

- **Frontend:** Next.js 15 App Router · React 19 · Tailwind v4 · TanStack Query · Framer Motion
- **Backend:** Go · chi router · pgx v5 · Supabase JWT auth
- **Shared packages:** `@rpgtracker/ui` · `@rpgtracker/auth` · `@rpgtracker/api-client`
- **Monorepo:** Turborepo · pnpm workspaces
- **Database:** PostgreSQL via Supabase · golang-migrate
- **Auth:** Supabase Auth (email/password)
- **AI:** Claude API — user-supplied key, stored AES-256-GCM encrypted server-side

## Local Development

**Requirements:** Node ≥ 20, pnpm ≥ 9, Go 1.23+, Docker

```bash
# 1. Install JS dependencies
pnpm install

# 2. Set up Go API environment
cp apps/api/.env.example apps/api/.env
# Edit apps/api/.env — fill in SUPABASE_PROJECT_URL, SUPABASE_ANON_KEY, MASTER_KEY

# 3. Start the database
cd apps/api && make db-up

# 4. Run migrations
make migrate-up

# 5. One-time Supabase auth trigger (first setup only)
# See docs/setup.md — must be run manually in the Supabase SQL Editor

# 6. Start the Go API (from apps/api/)
make run

# 7. Start all Next.js apps (from repo root, separate terminal)
cd ../.. && pnpm dev
```

Each app runs on its own port. The Next.js apps proxy API requests to the Go server at `http://localhost:8080`.

## Tests

```bash
# Frontend (Vitest + React Testing Library)
pnpm test

# Go API
cd apps/api && go test ./...
```

78 tests total — all green.

## Project Structure

```
apps/
  api/              Go REST API (chi, pgx, Supabase JWT)
  rpg-tracker/      LifeQuest — Next.js 15 App Router
  nutri-log/        NutriLog  — Next.js 15 App Router (scaffolded)
  mental-health/    MindTrack — Next.js 15 App Router (scaffolded)
packages/
  ui/               Shared React components + design tokens
  auth/             Supabase SSR helpers (browser + server)
  api-client/       Typed fetch client for the Go API
  tsconfig/         Shared TypeScript config
docs/
  AGENTIC-SYSTEM.md Agent roles, zone rules, session protocol
  setup.md          One-time Supabase trigger setup
  specs/archived/   Completed feature specs
  plans/archived/   Completed implementation plans
Documentation/
  architecture.md   DB schema, domain model, integration contracts
  decision-log.md   Confirmed product and architectural decisions (D-001–D-022)
  feature-tracker.md Per-feature status and deferred list
```

## Design System

Two themes for LifeQuest, switchable via account settings:

- **`rpg-game`** — Dark/dramatic, gold accents, Cinzel serif headings, full Framer Motion animation budget (`--motion-scale: 1`)
- **`rpg-clean`** — Dark/minimal, indigo accents, Inter, no animations (`--motion-scale: 0`)

Theme tokens live in `packages/ui/tokens/`. The `--motion-scale` CSS variable gates all animations — components read it via the `useMotionPreference` hook.

## Agentic Development

This project uses an AI agent team for feature development. See `CLAUDE.md` for the full agent roster and zone map. New features: use the `orchestrator` agent with the `plan-feature` skill.
