## Status: DONE

## Files Changed

- `apps/api/internal/goals/forecast.go` — deterministic forecast engine (pure functions, no DB, no AI)
- `apps/api/internal/goals/forecast_repo.go` — `GetForecastData`: fetches goal + checkins + milestones in ownership-scoped queries
- `apps/api/internal/goals/forecast_test.go` — 34 unit tests covering all engine scenarios and edge cases
- `apps/api/internal/handlers/goal_forecast.go` — HTTP handler + `ForecastStore` interface + `dbGoalStore.GetForecastData` impl
- `apps/api/internal/handlers/goal_forecast_test.go` — 8 handler integration tests (stub store, no DB)
- `apps/api/internal/server/server.go` — registered `GET /api/v1/goals/{id}/forecast`

## Endpoint / Contract Summary

```
GET /api/v1/goals/{id}/forecast
Authorization: Bearer <supabase-jwt>

Response 200:
{
  "track_state":           "on_track" | "off_track" | "ahead" | "complete" | "no_data",
  "confidence_score":      0.0–1.0 (3 dp),
  "drift_pct":             float | null  (signed %; positive = ahead),
  "drift_direction":       "ahead" | "behind" | "on_pace" | "unknown",
  "expected_progress":     float | null  (0–1, fraction of time window elapsed),
  "actual_progress":       float | null  (0–1, current_value / target_value),
  "milestone_done_ratio":  float | null  (done_milestones / total_milestones),
  "checkin_count":         int,
  "days_remaining":        int | null    (negative = overdue),
  "recommend_checkin":     bool,
  "recommend_review":      bool,
  "recommend_stretch":     bool
}

Errors:
  401 — no authenticated user
  400 — invalid UUID in path
  404 — goal not found or belongs to another user
  500 — internal error
```

Ownership: `GetForecastData` delegates to `GetGoal(ctx, db, userID, goalID)` which scopes its
query to `WHERE id=$1 AND user_id=$2`, so cross-user access returns 404 (same pattern as all
other goal endpoints in T8).

## Calculation Notes

**Progress signals (priority order)**
1. Measurable: `current_value / target_value` (clamped to [0, 1])
2. Milestone ratio: `done_milestones / total_milestones` (fallback when no measurable values)
3. No signal: returns `no_data` track state; confidence = 0.5

**Expected progress**: linear interpolation between `goal.created_at` and `goal.target_date`.

**Drift**: `(actualProgress − expectedProgress) × 100`
- > +5 % → `ahead`
- < −5 % → `behind`
- otherwise → `on_pace`

**Confidence score** (base + bonuses − penalty):
- Base: `actualProgress / expectedProgress`, clamped [0, 1]
- Requires ≥ 2 % of time window elapsed; returns 0.5 (neutral) otherwise
- Check-in engagement bonus: up to +0.10 (log-scale)
- Milestone completion bonus: up to +0.05
- Overdue penalty: −0.02 per day past deadline, capped at −0.50

**Recommendation flags**
- `recommend_checkin`: no check-in in last 7 days AND deadline not yet passed
- `recommend_review`: drift < −25 % AND expected progress < 80 %
- `recommend_stretch`: drift > +30 % AND expected progress < 80 %

**Sessions not integrated**: session data is not plumbed into the forecast in v1.
The engine accepts `ForecastInput` which could be extended with session XP data
in a future iteration without changing the calculation API.

## Test Results

All 34 forecast engine unit tests pass.
All 8 forecast handler tests pass.
42 new tests total introduced by this track.

Pre-existing failures on base branch (not caused by this track, confirmed by
checking out base branch and running same tests):
- `internal/auth` — 3 intentional-red password-change tests (tagged `[INTENTIONAL RED on main]`)
- `internal/handlers/TestXPChartZeroFill` — off-by-one in xp-chart, pre-existing

## Known Risks / Dependencies

- **T8 dependency**: Bases on `origin/cursor/ai-goals-backend-c6a8-0504`. All goal domain
  types (`Goal`, `Checkin`, `Milestone`) and store pattern come from T8.
- **Sessions not integrated**: First version is conservative and does not consume session XP data
  because the session→goal mapping is not yet established in the schema. The `ForecastInput`
  struct is designed to accept session data as a future extension.
- **Linear pace assumption**: Confidence model assumes linear progress. Goals with non-linear
  effort curves (e.g. weight loss plateaus) will have inaccurate drift readings.
- **No persistence**: Forecast is computed on-demand; there is no snapshot / history table.
  Adding trend analysis would require a separate migration.
