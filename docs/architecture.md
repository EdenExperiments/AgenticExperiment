# Architecture

pnpm workspaces + Nx. One Go API. One Supabase project for auth only. Application data is PostgreSQL (local Docker in dev) via golang-migrate.

## Target

**Web.** One authenticated Next.js app (`apps/rpg-tracker`). Landing stays a separate marketing origin. One login. One BFF (`apps/rpg-tracker/app/api/[...path]/route.ts`). Do not copy `apps/nutri-log` to spawn another Next origin.

**Apple.** Planned. Apple first. Native stack TBC. Separate App Store apps, not one tabbed app. Native clients send a Bearer JWT to Go. They skip Next. CORS is a browser problem and is not needed yet.

Collapsing web origins does not block multiple Apple binaries. The suite boundary is the Go API plus table prefixes.

## How a product lands

A product earns a prefix only if all three are true. Own recurring loop with its own screens. Own tables that no other product writes. Plausibly its own Apple app. Fewer than three means a feature inside an existing product, or a LifeQuest preset.

A slice is exactly one of product, feature of a product, LifeQuest preset, marketing origin, or suite-shared. This table is the index. Two-sentence homes live on the owner pages.

| Slice | Kind | Prefix / mount | Web | Home |
|-------|------|----------------|-----|------|
| LifeQuest | product (hub) | unprefixed | `/skills`, `/goals`, hub `/dashboard` | `docs/apps/lifequest.md` |
| NutriLog | product | `nl_*`, `/api/v1/nutrilog` | `/nutri` | `docs/apps/nutrilog.md` |
| Workout | product | `wo_*`, `/api/v1/workout` | `/workout` | `docs/apps/workout.md` |
| MindTrack | product (answers written; code later) | `mh_*`, `/api/v1/mindtrack` | `/mind` | `docs/apps/mindtrack.md` |
| Sleep | LifeQuest preset | none. Do not create `sl_*` | Sleep Hygiene preset | `docs/apps/lifequest.md` |
| Meditation | LifeQuest preset | none. Later `mh_*` | preset. Later `/mind/meditate` | `docs/apps/lifequest.md` |
| Fasting, plate-photo confirm, restaurant lookup, household pantry | NutriLog features | `nl_*` when built | `/nutri` | `docs/apps/nutrilog.md` |
| Five focus vibes | LifeQuest session config | none | skill session route | `docs/apps/lifequest.md` |
| Landing | marketing origin | none | `apps/landing` | Web routes on this page |
| Shared suite | suite-shared | `users`, `user_ai_keys` | `/account` | Auth and AI on this page, `docs/apps/api.md` |

Do not dump a new habit into `skill_presets` when it is meant to be a product. Strength Training as a preset is not Workout. Calorie Track is not NutriLog. Intermittent Fast is not a fasting product.

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
  (app)/workout/*          Workout
  (app)/mind/*             when the first MindTrack slice exists
  api/[...path]/route.ts   the only BFF
```

The product layout owns chrome and `data-theme`. Product identity is not the `rpgt-theme` cookie. That cookie is the LifeQuest skin (minimal, retro, modern). Import the product token file in `apps/rpg-tracker/tokens.css` when the route group ships.

`@rpgtracker/ui` stays dumb. Pass nav items as props. Do not put a product registry in the UI package.

New products start in this tree. Do not collapse leftover Next origins as a prerequisite for the next slice.

Landing is a marketing origin at `apps/landing` (:3004), not a product. It stays its own Next origin with no domain tables and no Apple binary. Sign In on `apps/landing/app/page.tsx` goes to `${appUrl}/login` on LifeQuest.

## Go backend

One binary. One chi router. One `/api/v1` group with JWT, tx, and `ensureUser`. Do not split into per-product services.

New products export `Routes()` from `apps/api/internal/<name>/` (persistence and HTTP in that package) and mount under `/api/v1/<name>`. Web `/workout` pairs with `/api/v1/workout`. NutriLog is the one name mismatch. Do not rewrite LifeQuest handlers before the next product. `internal/handlers` stays until a file is touched.

Domain tables are `<prefix>_*` with `user_id → public.users(id)` only. No FKs to `skills`. Unprefixed tables are LifeQuest. Nothing new is unprefixed.

LifeQuest `public.goals` is LifeQuest. NutriLog calorie or weight goals are `nl_*`, not those tables. Workout sessions are `wo_*`, not `training_sessions`. `training_sessions` is LifeQuest pomodoro and manual sessions (`internal/handlers/session.go`).

Shared suite routes stay under Auth below. Freeze an OpenAPI file when Apple work starts, not before.

## Auth

Keep Supabase Auth. Email and password today. Apple Sign In later through the same project. Go verifies JWTs via JWKS (`NewJWTMiddleware`). `ensureUser` upserts `public.users`.

Do not replace Supabase with home-grown sessions. The cookie session path (`NewSessionMiddleware`, Go login/register) is deleted. Password change that is already mounted can stay until the Next app owns it.

Go `WHERE user_id = $1` is the ACL. Delete RLS rather than finish it. Policies use `app.current_user_id`. TxMiddleware sets `app.user_id`. The API role is table owner, and nothing is `FORCE`d. Do not copy decorative RLS onto `wo_` or `mh_`. MindTrack sensitivity is product rules (no XP, no log leakage, no therapy claims), not a second database.

Shared suite is `/account`, `/account/api-key`, and `GET /api/v1/account/ai-entitlement`. One `subscription_tier` (`free` or `pro`). Stripe is not wired. One Claude key per user, encrypted in Go. There is no `/account/ai-entitlement` page (`useAIEntitlement.ts` plus `PaywallCTA`). Native shared endpoints wait on mockups. Apple apps call the same `/api/v1/...` paths.

## Design spec

Lasting rules live here and in `docs/apps/<name>.md` (one page of rough logic). Visual contract is `packages/ui/tokens/` plus `docs/ui.md`. Behaviour is tests. Mockups and long plans go in `docs/briefs/` and get deleted after promote. Do not revive `Documentation/style-guide` or per-page novels.

## Today

| App | Path | Port | Role |
|-----|------|------|------|
| LifeQuest | `apps/rpg-tracker` | 3000 | Hub: skills, sessions, goals |
| NutriLog | `/nutri` in the shell; leftover origin `apps/nutri-log` | 3000 / 3002 | Weight, goals, diary shipped |
| Workout | `/workout` in the shell | 3000 | Sessions, sets, volume |
| MindTrack | `apps/mental-health` | 3003 | Answers in `docs/apps/mindtrack.md`. `/mind` not built |
| Landing | `apps/landing` | 3004 | Marketing |
| API | `apps/api` | 8080 | All domain HTTP |

Four Next origins still exist. Target is one authenticated app plus landing. LifeQuest BFF `apps/rpg-tracker/app/api/[...path]/route.ts` forwards `${GO_API_URL}/api/${path}` with no double `v1`. Leftover NutriLog and MindTrack origins still double-prefix. Hub cards for NutriLog and Workout are live. Cookie session path is gone. Decorative RLS on `nl_weight_logs` is dropped. Localhost ports share cookies; real hosts would not.

## Data

- Identity: Supabase Auth JWT, JWKS in Go. `public.users` mirrors `auth.users.id`.
- LifeQuest: `skills`, `xp_events`, `blocker_gates`, goals tables, `training_sessions`. Levels from `xpcurve`. Max level 200.
- NutriLog: `nl_*`. Weight, goals, foods, diary.
- Workout: `wo_*` sessions, exercises, sets.
- MindTrack when built: `mh_*`. Extra sensitivity. No XP in v1.
- Cross-app XP is a later integration layer, not a FK.

`primary_skill_id` on `public.users` couples suite identity to LifeQuest. Leave it until a second product needs a thin users row.

## AI

User Claude key, AES-256-GCM at the Go layer, decrypt only at request time. Never in HTML, cookies, logs, or API responses. One key per user, Claude format today. Entitlement today is a stored key plus a `pro` check (`GET /api/v1/account/ai-entitlement`). Only `POST /goals/plan` is server-gated.

Do not add a conversation transcript table or embed user logs for memory. Prompts are assembled from that product’s tables for the request. We do not train on user logs or send them to a platform training corpus.

## Sharing

Share packages, auth, and the Go API. Do not share domain tables.

Keep Supabase JWT in Go, `ensureUser`, prefixed tables, `LogXP` as LifeQuest, theme tokens, and Nx.

Leave for a later change: one shared BFF module, collapse leftover Next origins. File-touch cleanups stay named on the owner pages, not here.
