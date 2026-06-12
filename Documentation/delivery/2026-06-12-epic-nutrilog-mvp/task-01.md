# Task 01 — NutriLog Weight Logs API (Go)

**Epic:** `2026-06-12-epic-nutrilog-mvp`  
**Depends on:** Signed `requirements.md`  
**Blocks:** task-02, task-03

## Summary

Add the first NutriLog database table and authenticated REST endpoints for weight logging and trend charting under the `/api/v1/nutrilog/` namespace.

## Target paths

- `apps/api/db/migrations/000015_nl_weight_logs.up.sql` (+ `.down.sql`)
- `apps/api/internal/nutrilog/` — repository, types, chart aggregation
- `apps/api/internal/handlers/nutrilog_weight.go` — HTTP handlers
- `apps/api/internal/handlers/nutrilog_weight_test.go`
- `apps/api/internal/server/server.go` — route registration

## Acceptance criteria (from requirements)

| ID | Criterion |
|----|-----------|
| AC-1 | Migration creates `nl_weight_logs` with `user_id` FK to `public.users` |
| AC-2 | Authenticated POST creates a log; unauthenticated returns 401 |
| AC-3 | GET list returns only the authenticated user's logs (newest first) |
| AC-4 | GET weight-chart returns date-ordered series for `days` (default 30, max 365) |
| AC-5 | DELETE removes own log; other user's log returns 404 |
| AC-10 | No `xp_events` or LifeQuest table changes |

## API contract

### `POST /api/v1/nutrilog/weight-logs`

Request body (JSON):

```json
{
  "weight_kg": 72.5,
  "note": "optional string",
  "measured_at": "2026-06-12T08:00:00Z"
}
```

- `weight_kg` required, positive `NUMERIC`.
- `measured_at` optional; default `now()`. Reject if older than 30 days (configurable constant).
- Response `201`: created entry with `id`, `weight_kg`, `note`, `measured_at`, `created_at`.

### `GET /api/v1/nutrilog/weight-logs?limit=50`

- Response `200`: array of entries, newest `measured_at` first.
- Default `limit=50`, max `200`.

### `GET /api/v1/nutrilog/weight-chart?days=30`

- Response `200`:

```json
{
  "days": 30,
  "unit": "kg",
  "data": [
    { "date": "2026-05-14", "weight_kg": null },
    { "date": "2026-06-12", "weight_kg": 72.5 }
  ]
}
```

- One point per calendar day (UTC). If multiple logs on same day, use latest `measured_at`.
- Days without logs: `weight_kg: null` (sparse) OR omit from series — pick one and test it; prefer null + full day range (match XP chart zero-fill pattern).

### `DELETE /api/v1/nutrilog/weight-logs/{id}`

- Response `204` on success.
- `404` if id not found or not owned by user.

## Schema sketch

```sql
CREATE TABLE public.nl_weight_logs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    weight_kg   NUMERIC(6,2) NOT NULL CHECK (weight_kg > 0),
    note        TEXT NOT NULL DEFAULT '',
    measured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_nl_weight_logs_user_measured ON public.nl_weight_logs (user_id, measured_at DESC);
```

- Enable RLS per goals migration pattern unless sign-off chooses app-layer only (Q5).
- Policy: user can CRUD own rows only.

## Implementation notes

- Follow existing handler patterns: `ActivityHandler`, `XPChartHandler` (auth from context, `database.MustQuerier`, `api.RespondJSON`).
- New package `internal/nutrilog` keeps LifeQuest handlers clean.
- Register routes inside existing `/api/v1` protected group in `server.go`.

## Verification command

```bash
cd apps/api && go test ./...
```

## Out of scope

- Typed client (`packages/api-client`) — task-02.
- Any frontend — task-03.
- `nl_goals`, `nl_food_logs`, hub XP, LifeQuest routes.
- Edit/update endpoint (unless Q1 resolved to include edit at sign-off).

## TDD dispatch

1. `test-writer-go` — handler + repository tests for AC-1–AC-5 (red).
2. `implementer-go` — migration, repository, handlers (green).
3. `verifier` — confirm `go test ./...` and contract matches task spec.
