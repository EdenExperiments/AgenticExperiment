# Architecture

pnpm workspaces + Nx. One Go API. One Supabase project for auth only. Application data is PostgreSQL (local Docker in dev) via golang-migrate.

## Target

**Web.** One authenticated Next.js app. LifeQuest is the shell. NutriLog, Workout, and MindTrack become route groups when they have a first slice (`/nutri`, later `/workout`, `/mind`). A separate landing origin for marketing is fine. One login. One BFF module that forwards to Go.

**Apple.** Planned. Apple first. Native stack is still TBC. Separate App Store apps, not one tabbed app. Phone screens are too small to share chrome across products. Those apps call the same Go API where it makes sense. Which endpoints they share waits on mockups. Native clients send a Bearer JWT to Go. They do not go through Next BFFs. CORS is a browser problem.

Collapsing the web origins does not block multiple Apple binaries. The suite boundary is the Go API plus table prefixes (`nl_`, `wo_`, `mh_`).

Do not copy `apps/nutri-log` to spawn another Next origin. Do not split Go into per-product services. Four Next processes today is leftover, not practice for native.

## Today

| App | Path | Port | Role |
|-----|------|------|------|
| LifeQuest | `apps/rpg-tracker` | 3000 | Hub: skills, sessions, goals |
| NutriLog | `apps/nutri-log` | 3002 | Weight shipped. Diary, pantry, recipes next |
| MindTrack | `apps/mental-health` | 3003 | Scaffold until `docs/apps/mindtrack.md` is answered |
| Landing | `apps/landing` | 3004 | Marketing |
| API | `apps/api` | 8080 | All domain HTTP |
| Workout | not created | - | Planned. `wo_` tables. Not a LifeQuest skill |

Frontends today are Next.js App Router with a per-app BFF `app/api/[...path]` to Go. Shared packages: `@rpgtracker/ui`, `@rpgtracker/auth`, `@rpgtracker/api-client`. Localhost ports accidentally share cookies. Real hosts would not. That is one reason the web collapse is the target.

## Data

- Identity: Supabase Auth JWT, JWKS in Go. `public.users` mirrors `auth.users.id`.
- LifeQuest: `skills`, `xp_events`, `blocker_gates`, goals tables. Levels from `xpcurve`. Max level 200.
- NutriLog: `nl_*`, always `user_id → public.users`. No FKs to LifeQuest. Weight: `nl_weight_logs`.
- Workout when built: `wo_*`, `user_id → public.users`. Isolation in Go. RLS is off.
- MindTrack when built: `mh_*`, extra sensitivity, no XP in v1.
- Cross-app XP is a later integration layer, not a FK.

Domain tables FK only to `users.id`. Thin `public.users` later if `primary_skill_id` keeps coupling suite identity to LifeQuest.

## Identity

Web cookies are host-only. After the collapse, one origin means one session. Native uses Bearer JWT against Go, same `ensureUser` path.

Go `WHERE user_id` is the real ACL. RLS is decorative today. Finish it or delete it. Do not add a second auth story.

## AI

User Claude key, AES-256-GCM at the Go layer, decrypt only at request time. Never in HTML, cookies, logs, or API responses. Entitlement today: stored key + `pro` check (`GET /api/v1/account/ai-entitlement`). One billing story later. Stripe is not wired.

## Sharing

Share packages, auth, and the Go API. Do not share domain tables. New web products are a route group in `apps/rpg-tracker` plus a prefix and Go routes. Apple apps come later as their own binaries.

Keep: Supabase JWT in Go, `ensureUser`, prefixed tables, `LogXP` as LifeQuest, theme tokens, Nx.

Leave for a later change, not this file's job to implement: wire or hide gate clear, drop unused cookie-auth paths and copy-paste BFFs once the web shell exists.
