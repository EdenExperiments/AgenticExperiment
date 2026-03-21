# RpgTracker API

Go REST API for the RpgTracker platform. Serves all three frontends (LifeQuest, NutriLog, MindTrack) via a BFF proxy in each Next.js app.

## Stack

- **Runtime:** Go 1.22+
- **Router:** chi v5
- **DB driver:** pgx v5 (connection pool via `pgxpool`)
- **Auth:** Supabase JWTs — validated via JWKS endpoint (RS256 / ES256)
- **Migrations:** golang-migrate (file-based, `db/migrations/`)
- **DB:** PostgreSQL (Supabase-hosted)

## Running locally

```bash
# From repo root
cp apps/api/.env.example apps/api/.env   # fill in Supabase credentials
cd apps/api
go run ./cmd/server
# Listening on :8080
```

Environment variables required (see `internal/config/config.go`):

| Variable | Description |
|---|---|
| `DATABASE_URL` | `postgresql://...` connection string |
| `SUPABASE_PROJECT_URL` | e.g. `https://abcxyz.supabase.co` |
| `SUPABASE_ANON_KEY` | Public anon key from Supabase dashboard |
| `MASTER_KEY` | 32-byte hex key for AES-encrypted API keys |
| `PORT` | HTTP port (default `8080`) |

## Running tests

```bash
cd apps/api
go test ./...
```

Tests use an injected in-memory store interface — no live DB required.

## Route map

All routes under `/api/v1` require a valid Supabase JWT (via `Authorization: Bearer` header, forwarded by the BFF proxy).

| Method | Path | Handler |
|---|---|---|
| GET | `/health` | health check |
| GET | `/api/v1/account` | get user account |
| PUT | `/api/v1/account` | update display name |
| GET | `/api/v1/account/api-key` | get encrypted AI key |
| PUT | `/api/v1/account/api-key` | set AI key |
| DELETE | `/api/v1/account/api-key` | remove AI key |
| GET | `/api/v1/presets` | list skill presets |
| GET | `/api/v1/presets/{id}` | get single preset |
| POST | `/api/v1/skills` | create skill |
| GET | `/api/v1/skills` | list user's skills |
| GET | `/api/v1/skills/{id}` | get skill + gates |
| PUT | `/api/v1/skills/{id}` | update skill name/description |
| DELETE | `/api/v1/skills/{id}` | soft-delete skill |
| POST | `/api/v1/skills/{id}/xp` | log XP |
| GET | `/api/v1/activity` | recent XP activity feed |
| POST | `/api/v1/calibrate` | admin XP calibration |
| POST | `/api/v1/auth/signout` | sign out |

## Database schema overview

Tables in the `public` schema (migrations in `db/migrations/`):

| Table | Description |
|---|---|
| `users` | Application user profiles (mirrors Supabase `auth.users`) |
| `user_ai_keys` | AES-encrypted AI API keys per user |
| `skill_categories` | Global read-only skill categories (seeded) |
| `skill_presets` | Global read-only skill presets per category (seeded) |
| `user_category_interests` | User's chosen categories (onboarding scaffold) |
| `skills` | User-owned skill records with XP + level state |
| `xp_events` | Immutable XP ledger — one row per log action |
| `blocker_gates` | 10 tier gates per skill; cleared by user to unlock next tier |

## Database architecture: split-DB setup

**Important:** Auth and application data are in two completely separate databases.

| Database | Where | What lives there |
|---|---|---|
| Supabase (cloud) | `https://[project].supabase.co` | `auth.users`, JWT signing keys only |
| Local Docker postgres | `localhost:5432/rpgtracker` | ALL application tables (`public.users`, `public.skills`, etc.) |

The Go API validates JWTs against Supabase's JWKS endpoint, but reads/writes all data against the local Docker container. **The Supabase SQL Editor cannot see your application tables** — they don't exist there.

> This also means any Supabase database trigger fires in the Supabase cloud postgres only, and cannot write to the local container. The `ensureUserMiddleware` in `server.go` is the only mechanism that creates `public.users` rows locally.

## Inspecting data as a developer

### Start the database

```bash
# From repo root
docker compose up -d db
```

### Option 1: psql (quickest)

```bash
psql postgresql://rpgtracker:rpgtracker@localhost:5432/rpgtracker

# Useful commands once connected:
\dt public.*           -- list all application tables
\d public.skills       -- describe a table schema
```

Common queries:

```sql
-- All users
SELECT id, email, display_name, created_at FROM public.users ORDER BY created_at DESC;

-- Skills for a specific user (paste UUID from server logs or Supabase auth dashboard)
SELECT id, name, current_level, current_xp, deleted_at
FROM public.skills
WHERE user_id = 'YOUR-USER-UUID-HERE'
ORDER BY updated_at DESC;

-- XP history for a skill
SELECT xp_delta, log_note, created_at
FROM public.xp_events
WHERE skill_id = 'YOUR-SKILL-UUID-HERE'
ORDER BY created_at DESC;

-- Blocker gates for a skill
SELECT gate_level, title, is_cleared, cleared_at
FROM public.blocker_gates
WHERE skill_id = 'YOUR-SKILL-UUID-HERE'
ORDER BY gate_level;

-- Find user by email
SELECT id, email FROM public.users WHERE email = 'user@example.com';

-- Check which Supabase UUIDs are missing a local app row
-- (run this when debugging FK violations)
-- Step 1: get UUIDs from Supabase auth dashboard → Users tab
-- Step 2: check local postgres:
SELECT id FROM public.users WHERE id = 'SUPABASE-UUID-HERE';
-- If 0 rows returned → user is missing their app row (see fix below)
```

### Option 2: GUI (TablePlus / pgAdmin / DBeaver)

| Field | Value |
|---|---|
| Host | `localhost` |
| Port | `5432` |
| Database | `rpgtracker` |
| User | `rpgtracker` |
| Password | `rpgtracker` |

### Option 3: psql inside the Docker container

```bash
docker compose exec db psql -U rpgtracker rpgtracker
```

## Debugging 500 errors

All handler errors now log to stdout with the user ID and operation:

```
ERROR: CreateSkill user=<uuid>: <postgres error detail>
ERROR: ensureUser for <uuid>: <postgres error detail>
```

Watch the Go API terminal while reproducing the error to see the full Postgres error.

### Deleted + re-added user scenario

1. User is deleted from Supabase auth → they get a **new UUID** when re-registered
2. The new UUID has no row in the local `public.users` table
3. `ensureUserMiddleware` (runs on every `/api/v1` request) calls `GetOrCreateUser` → inserts the row
4. Subsequent handler operations (create skill, log XP, etc.) succeed

If you need to manually insert a missing user row:

```sql
-- Connect to local postgres first (see above), then:
INSERT INTO public.users (id, email)
VALUES ('SUPABASE-UUID-HERE', 'user@example.com')
ON CONFLICT DO NOTHING;
```

You can find the UUID in the **Supabase dashboard → Authentication → Users** tab.

## Architecture notes

- **User isolation:** enforced in the Go layer via `WHERE user_id = $userID` in every query. RLS is disabled (migration 000006) — the Go middleware is the access control boundary.
- **Soft deletes:** skills use `deleted_at IS NULL` filter; XP history is preserved after deletion.
- **XP curve:** defined in `internal/xpcurve/` — constants from decision-log D-014. Do not modify without a new decision-log entry.
- **Blocker gates:** 10 per skill, created automatically on skill creation at levels 9, 19, ..., 99.
