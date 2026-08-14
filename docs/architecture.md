# Architecture

pnpm workspaces + **Nx** orchestrate tasks. One Go API. One Supabase project for **auth only**. Application data is PostgreSQL (local Docker in dev) via golang-migrate.

## Apps

| App | Path | Port | Role |
|-----|------|------|------|
| LifeQuest | `apps/rpg-tracker` | 3000 | Hub: skills, sessions, goals |
| NutriLog | `apps/nutri-log` | 3002 | Weight (shipped), diary, pantry, recipes |
| MindTrack | `apps/mental-health` | 3003 | Scaffold until `docs/apps/mindtrack.md` is answered |
| Landing | `apps/landing` | 3004 | Marketing |
| API | `apps/api` | 8080 | All domain HTTP |
| Workout | not created | — | Planned; `wo_` tables; do not dump into a LifeQuest skill |

Frontends: Next.js App Router, BFF `app/api/[...path]` → Go. Shared: `@rpgtracker/ui`, `@rpgtracker/auth`, `@rpgtracker/api-client`.

## Data

- Identity: Supabase Auth JWT (JWKS in Go). `public.users` mirrors `auth.users.id`.
- LifeQuest: `skills`, `xp_events`, `blocker_gates`, goals tables. Levels from `xpcurve` (not a levels table). Max level 200.
- NutriLog: `nl_*`, always `user_id → public.users`. No FKs to LifeQuest. Weight: `nl_weight_logs`.
- Workout (when built): `wo_*`, same FK/RLS pattern.
- MindTrack (when built): `mh_*`, extra sensitivity, no XP in v1.
- Cross-app XP is a later integration layer, not a FK.

## AI

User Claude key, AES-256-GCM at the Go layer, decrypt only at request time. Never in HTML, cookies, logs, or API responses. Entitlement today: stored key + `pro` check (`GET /api/v1/account/ai-entitlement`).

## Sharing

Share packages, auth, and API. Do not share domain tables. New suite apps copy NutriLog’s Next.js scaffold (theme token file, BFF, login), not LifeQuest’s three-theme switcher, unless they *are* LifeQuest.
