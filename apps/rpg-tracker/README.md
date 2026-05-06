# LifeQuest (rpg-tracker)

Next.js 15 App Router frontend for the LifeQuest application — the RPG-themed habit and skill tracker.

## Stack

- **Framework:** Next.js 15 (App Router)
- **UI library:** `@rpgtracker/ui` (shared components in `packages/ui/`)
- **Auth:** Supabase via `@rpgtracker/auth` package
- **Data fetching:** TanStack Query v5
- **Styling:** Tailwind v4
- **Testing:** Vitest + React Testing Library, Playwright (E2E)

## Running locally

```bash
# From repo root (starts all apps + API via Turborepo)
pnpm dev

# Or just this app
cd apps/rpg-tracker
pnpm dev
# http://localhost:3000
```

Environment variables (`.env.local`):

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Same value as `SUPABASE_URL` in `apps/api/.env` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Same value as `SUPABASE_PUBLISHABLE_KEY` in `apps/api/.env` |
| `GO_API_URL` | Go API address (default: `http://localhost:8080`) |

## Architecture: BFF Proxy

All API calls go through `app/api/[...path]/route.ts` — a Next.js Route Handler that:

1. Reads the Supabase session cookie server-side
2. Attaches the `Authorization: Bearer <access_token>` header
3. Forwards the request to the Go API at `GO_API_URL`

This means **the browser never touches the Go API directly** and the JWT is never exposed to client-side JavaScript.

```
Browser → POST /api/v1/skills (cookie auth)
  → Next.js BFF route handler
    → reads session from Supabase cookie
    → adds Authorization: Bearer <jwt>
    → forwards to Go API :8080/api/v1/skills
      → response proxied back to browser
```

## Running tests

```bash
cd apps/rpg-tracker
pnpm test          # Vitest unit tests
pnpm test:e2e      # Playwright E2E (needs dev server running)
```

## Key directories

```
app/
  (auth)/         # Login + register pages (public)
  (app)/          # Authenticated pages
    dashboard/    # XP activity feed
    skills/       # Skill list, detail, new, edit
    goals/        # Goals CRUD, AI planning wizard, forecasts, check-ins
    account/      # Profile, API key management
  api/[...path]/  # BFF proxy to Go API
```

## AI goal planner UX

- Entry point: `/goals/ai/new`
- User enters a natural-language objective (for example: "I want to learn Chinese this year")
- Frontend calls `POST /api/v1/goals/plan` via `@rpgtracker/api-client`
- If API returns `degraded_response: true`, UI still shows a usable fallback plan plus a degraded-mode banner
- Planner access depends on API key presence and backend entitlement checks

### Quick QA flow

1. Go to `/goals/ai/new`
2. Enter a natural-language objective (e.g. "I want to learn Chinese this year")
3. Generate plan and verify preview renders milestones/cadence/risks
4. Confirm degraded banner only appears when `degraded_response` is true
5. Verify gating:
   - No API key -> CTA to set up key
   - Free tier -> subscription required behavior from backend
   - Pro tier + key -> planner works end to end

## Database architecture note

Auth and application data are in **separate databases**:

- **Supabase (cloud)** — authentication only. The Supabase SQL Editor does not contain application tables like `public.users` or `public.skills`.
- **Local Docker postgres** (`localhost:5432`) — all application data. Run `docker compose up -d db` from the repo root.

See `apps/api/README.md` for full DB access instructions.

## Debugging

- **500 from POST /api/v1/skills** — check the Go API logs (not the browser). Most likely a missing `public.users` row in the local Docker postgres for a newly created or re-created Supabase user. The `ensureUserMiddleware` in the Go API handles this automatically on first request.
- **Session not forwarding** — verify the `access_token` cookie is set after login. The BFF proxy reads this cookie server-side.
- **503 upstream unavailable** — the Go API at `GO_API_URL` isn't reachable. Ensure `docker compose up -d db` is running and the Go API server is started.
