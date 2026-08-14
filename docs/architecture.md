# Architecture

pnpm workspaces + Nx. One Go API. One Supabase project for auth only. Application data is PostgreSQL (local Docker in dev) via golang-migrate.

## Target

**Web.** One authenticated Next.js app (`apps/rpg-tracker`). Landing stays a separate marketing origin. One login. One BFF (`apps/rpg-tracker/app/api/[...path]/route.ts`). Do not copy `apps/nutri-log` to spawn another Next origin.

**Apple.** Planned. Apple first. Native stack TBC. Separate App Store apps, not one tabbed app. Native clients send a Bearer JWT to Go. They skip Next. CORS is a browser problem and is not needed yet.

Collapsing web origins does not block multiple Apple binaries. The suite boundary is the Go API plus table prefixes.

## How a product lands

A product earns a prefix only if all three are true. Own recurring loop with its own screens. Own tables that no other product writes. Plausibly its own Apple app. Fewer than three means a feature inside an existing product, or a LifeQuest preset.

| Item | Result |
|------|--------|
| Workout | Product. Web `/workout`. Tables `wo_*`. Package `internal/workout`. Theme of its own. Not a LifeQuest skill. |
| MindTrack | Product when `docs/apps/mindtrack.md` is answered. Web `/mind`. Tables `mh_*`. Theme `mental-calm`. No XP in v1. |
| NutriLog | Product. Web `/nutri`. API `/api/v1/nutrilog` (grandfathered name). Tables `nl_*`. |
| Sleep, meditation, fasting, pantry, plate photo | Not products yet. Sleep and meditation stay LifeQuest presets until they pass the test. Fasting and pantry are NutriLog features on `nl_*`. Do not reserve `sl_` or scaffold `apps/meditation`. |

Do not dump a new habit into `skill_presets` when it is meant to be a product. Strength Training as a preset is not Workout.

## Web routes

`/dashboard` is the suite hub. Cards enter a product. LifeQuest chrome (sidebar and tab bar) is LifeQuest-only. Skills, goals, account. Do not add NutriLog, Workout, or MindTrack as LifeQuest tabs.

Each product is a route group with its own nested layout.

```
apps/rpg-tracker/app/
  (auth)/login, register
  auth/callback
  (app)/dashboard          hub
  (app)/account/*
  (app)/skills/*, goals/*  LifeQuest
  (app)/nutri/*            NutriLog
  (app)/workout/*          when the first slice exists
  (app)/mind/*             when MindTrack is unblocked
  api/[...path]/route.ts   the only BFF
```

The product layout owns chrome and `data-theme`. Product identity is not the `rpgt-theme` cookie. That cookie is the LifeQuest skin (minimal, retro, modern). Import the product token file in `apps/rpg-tracker/tokens.css` when the route group ships.

`@rpgtracker/ui` stays dumb. Pass nav items as props. Do not put a product registry in the UI package.

Move NutriLog's shipped pages when that product is next touched. New products start in this tree. Do not collapse four origins as a prerequisite for Workout.

## Go backend

One binary. One chi router. One `/api/v1` group with JWT, tx, and `ensureUser`. Do not split into per-product services.

New products export `Routes()` from `apps/api/internal/<name>/` (persistence and HTTP in that package) and mount under `/api/v1/<name>`. Web `/workout` pairs with `/api/v1/workout`. NutriLog is the one name mismatch. Do not rewrite LifeQuest handlers before the next product. `internal/handlers` stays until a file is touched.

Domain tables are `<prefix>_*` with `user_id → public.users(id)` only. No FKs to `skills`. Unprefixed tables are LifeQuest. Nothing new is unprefixed.

LifeQuest `public.goals` is LifeQuest. NutriLog calorie or weight goals are `nl_*`, not those tables. Workout sessions are `wo_*`, not `training_sessions`.

Shared suite routes stay `/account`, `/account/api-key`, `/account/ai-entitlement`. Native apps call the same `/api/v1/...` paths with a Bearer token. Freeze an OpenAPI file when Apple work starts, not before.

## Auth

Keep Supabase Auth. Email and password today. Apple Sign In later through the same project. Go verifies JWTs via JWKS (`NewJWTMiddleware`). `ensureUser` upserts `public.users`.

Do not replace Supabase with home-grown sessions. Do not wire `NewSessionMiddleware` or the unmounted Go login and register handlers. Delete that cookie path when next in `internal/auth`. Password change that is already mounted can stay until the Next app owns it.

Go `WHERE user_id = $1` is the ACL. Delete RLS rather than finish it. Policies use two GUC names (`app.user_id` vs `app.current_user_id`), the API role is table owner, and nothing is `FORCE`d. Do not copy `000015` policies onto `wo_` or `mh_`. MindTrack sensitivity is product rules (no XP, no log leakage, no therapy claims), not a second database.

One suite `subscription_tier` on `users` (`free` or `pro`). Stripe later. Do not invent per-product billing until there is a second paid feature that needs it.

## Design spec

Lasting rules live here and in `docs/apps/<name>.md` (one page of rough logic). Visual contract is `packages/ui/tokens/` plus `docs/ui.md`. Behaviour is tests. Mockups and long plans go in `docs/briefs/` and get deleted after promote. Do not revive `Documentation/style-guide` or per-page novels.

## Today

| App | Path | Port | Role |
|-----|------|------|------|
| LifeQuest | `apps/rpg-tracker` | 3000 | Hub: skills, sessions, goals |
| NutriLog | `apps/nutri-log` | 3002 | Weight shipped. Diary, pantry, recipes next |
| MindTrack | `apps/mental-health` | 3003 | Scaffold until `docs/apps/mindtrack.md` is answered |
| Landing | `apps/landing` | 3004 | Marketing |
| API | `apps/api` | 8080 | All domain HTTP |
| Workout | not created | - | Planned. `wo_` tables. Not a LifeQuest skill |

Frontends today are Next.js App Router with a per-app BFF. NutriLog and MindTrack BFFs prepend `/api/v1/` onto a client path that already includes `v1`. LifeQuest's BFF does not. Shared packages: `@rpgtracker/ui`, `@rpgtracker/auth`, `@rpgtracker/api-client`. Localhost ports accidentally share cookies. Real hosts would not.

## Data

- Identity: Supabase Auth JWT, JWKS in Go. `public.users` mirrors `auth.users.id`.
- LifeQuest: `skills`, `xp_events`, `blocker_gates`, goals tables. Levels from `xpcurve`. Max level 200.
- NutriLog: `nl_*`. Weight: `nl_weight_logs`.
- Workout when built: `wo_*`.
- MindTrack when built: `mh_*`. Extra sensitivity. No XP in v1.
- Cross-app XP is a later integration layer, not a FK.

`primary_skill_id` on `public.users` couples suite identity to LifeQuest. Leave it until a second product needs a thin users row.

## AI

User Claude key, AES-256-GCM at the Go layer, decrypt only at request time. Never in HTML, cookies, logs, or API responses. One key per user, Claude format today. Entitlement today: stored key + `pro` check (`GET /api/v1/account/ai-entitlement`). Only `POST /goals/plan` is server-gated.

## Sharing

Share packages, auth, and the Go API. Do not share domain tables.

Keep: Supabase JWT in Go, `ensureUser`, prefixed tables, `LogXP` as LifeQuest, theme tokens, Nx.

Leave for a later change: wire or hide gate clear, drop unused cookie-auth paths, one shared BFF module, drop decorative RLS policies, move NutriLog pages into `/nutri`.
