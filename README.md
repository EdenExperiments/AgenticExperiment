# RpgTracker Platform

A self-improvement platform built as a Turborepo monorepo. Three apps share a single Go API, auth layer, and React component library.


| App                                          | Path                 | Status            |
| -------------------------------------------- | -------------------- | ----------------- |
| **LifeQuest** — RPG-style skill/XP tracker   | `apps/rpg-tracker`   | Fully implemented |
| **NutriLog** — Nutrition and weight tracking | `apps/nutri-log`     | Scaffolded        |
| **MindTrack** — Mental wellness tracking     | `apps/mental-health` | Scaffolded        |
| **Go API** — Shared REST backend             | `apps/api`           | Fully implemented |


## Stack

- **Frontend:** Next.js 15 App Router · React 19 · Tailwind v4 · TanStack Query · Framer Motion
- **Backend:** Go · chi router · pgx v5 · Supabase JWT auth
- **Shared packages:** `@rpgtracker/ui` · `@rpgtracker/auth` · `@rpgtracker/api-client`
- **Monorepo:** Turborepo · pnpm workspaces
- **Database:** Local Docker PostgreSQL (application data) · golang-migrate
- **Auth:** Supabase Auth (email/password + JWT validation) — auth only, not application data
- **AI:** Claude API — user-supplied key, stored AES-256-GCM encrypted server-side

## AI Features

- **AI goal planning:** Natural-language objectives (for example, "I want to learn Chinese this year") can be converted into structured plans via `POST /api/v1/goals/plan`.
- **Where it is documented:** Backend contract and route behavior in `apps/api/README.md`; frontend flow and UX in `apps/rpg-tracker/README.md`.
- **Access model:** Planner requires saved AI key plus backend entitlement checks; degraded responses return a safe fallback plan with `degraded_response: true`.
- **How to test:** Use the manual checklist in `apps/api/README.md` ("Manual testing: AI planner + membership tiers").

## Local Development

**Requirements:** Node ≥ 20, pnpm ≥ 9, Go 1.23+, Docker

```bash
# 1. Install JS dependencies
pnpm install

# 2. Set up Go API environment
cp apps/api/.env.example apps/api/.env
# Edit apps/api/.env — fill in SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, MASTER_KEY

# 3. Start the database
docker compose up -d db
# ⚠️  Use plain `docker compose down` to stop — never `down -v` unless you want a full reset.
# The -v flag deletes the db_data volume and all local application data permanently.

# 4. Start the Go API (migrations run automatically on startup)
cd apps/api && make run

# 5. Start all Next.js apps (from repo root, separate terminal)
cd ../.. && pnpm dev
```

Each app runs on its own port. The Next.js apps proxy API requests to the Go server at `http://localhost:8080`.

> **Database architecture:** Supabase handles authentication only (`auth.users`, JWT signing). All application data (`public.users`, `public.skills`, etc.) lives in the local Docker postgres container. The Supabase SQL Editor does not contain these tables. See `apps/api/README.md` for how to query local data.

## Tests

```bash
# Install JS dependencies first if needed
pnpm install

# JS workspace build and test checks (matches CI)
pnpm build
pnpm test

# Go API
cd apps/api && go test ./...
```

GitHub Actions runs the same practical checks on pull requests to `main` and pushes to `main` or `cursor/**`: `pnpm build`, `pnpm test`, and `go test ./...` in `apps/api`.

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
  CURSOR-AGENT-HANDBOOK.md Cursor-first workflow and CI/CD agent model
  setup.md          One-time Supabase trigger setup
  specs/archived/   Completed feature specs
  plans/archived/   Completed implementation plans
Documentation/
  architecture.md   DB schema, domain model, integration contracts
  decision-log.md   Confirmed product and architectural decisions
  feature-tracker.md Per-feature status and deferred list
  README.md         Canonical documentation index
```

## Design System

LifeQuest uses a three-theme system, switchable in account settings:

- **Minimal** — clean, data-forward productivity styling
- **Retro** — RPG-inspired visual language
- **Modern** — polished sci-fi command-center styling

Theme tokens live in `packages/ui/tokens/` and all components are expected to be theme-aware.

## Agentic Development

This project uses Cursor-first agentic workflows for feature development, review, and CI/CD automation.

- Repository context directory: `AGENTS.md`
- Canonical documentation map: `Documentation/README.md`
- Operating workflow (IDE, cloud agent chat, CI/CD SDK agents): `docs/CURSOR-AGENT-HANDBOOK.md`

## CI/CD Agent Automation

Additional automation workflows:

- `.github/workflows/cursor-pr-review.yml` - Cursor SDK PR review summaries/comments
- `.github/workflows/cursor-security-triage.yml` - Dependabot/code-scanning triage
- `.github/workflows/codeql.yml` - code scanning signal generation
- `.github/dependabot.yml` - dependency update PR generation

Required repository secret:

- `CURSOR_API_KEY` - key used by CI workflows that call `@cursor/sdk`
