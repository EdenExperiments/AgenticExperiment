## Status: DONE

## Files Changed
- `apps/api/db/migrations/000012_goals.up.sql` — goals, goal_milestones, goal_checkins schema
- `apps/api/db/migrations/000012_goals.down.sql` — rollback migration
- `apps/api/internal/goals/goals.go` — repository layer (all DB operations)
- `apps/api/internal/handlers/goal.go` — HTTP handler layer (GoalStore interface + DB-backed impl + handlers)
- `apps/api/internal/handlers/goal_test.go` — 27 handler-layer tests
- `apps/api/internal/server/server.go` — 12 new routes registered under /api/v1/goals

## API Contract

### Goals

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST   | /api/v1/goals | JWT | Create a goal |
| GET    | /api/v1/goals | JWT | List goals (optional `?status=active\|completed\|abandoned`) |
| GET    | /api/v1/goals/{id} | JWT | Get a single goal |
| PUT    | /api/v1/goals/{id} | JWT | Replace/update a goal |
| DELETE | /api/v1/goals/{id} | JWT | Delete goal (cascades milestones + checkins) |

**POST/PUT body (JSON):**
```json
{
  "title": "Run a marathon",         // required
  "description": "",                 // optional
  "skill_id": "<uuid>",              // optional FK to skills
  "status": "active",                // active|completed|abandoned (PUT only)
  "target_date": "2026-12-31T00:00:00Z",  // optional nullable
  "current_value": 0.0,              // optional; must pair with target_value
  "target_value": 42.2,              // optional; must pair with current_value
  "unit": "km",                      // optional label
  "position": 0                      // sort position (client-managed)
}
```

**Response (200/201):** Full Goal object with all fields.

### Milestones

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST   | /api/v1/goals/{id}/milestones | JWT | Create a milestone on a goal |
| GET    | /api/v1/goals/{id}/milestones | JWT | List milestones (ordered by position) |
| PUT    | /api/v1/goals/{id}/milestones/{mid} | JWT | Update a milestone |
| DELETE | /api/v1/goals/{id}/milestones/{mid} | JWT | Delete a milestone |

**POST/PUT body (JSON):**
```json
{
  "title": "Complete 10k",    // required
  "description": "",          // optional
  "is_done": false,           // false→true sets done_at automatically
  "position": 0,              // display order
  "due_date": "2026-06-01T00:00:00Z"  // optional
}
```

### Check-ins

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST   | /api/v1/goals/{id}/checkins | JWT | Append a check-in |
| GET    | /api/v1/goals/{id}/checkins | JWT | List check-ins (newest first) |

**POST body (JSON):** At least one of `note` or `value_snapshot` is required.
```json
{
  "note": "Ran 8k today",
  "value_snapshot": 8.0    // if provided, updates goals.current_value atomically
}
```

## Schema Notes

- `goal_status` is a Postgres ENUM: `active | completed | abandoned`
- `goals.skill_id` is optional FK with `ON DELETE SET NULL` — deleting a skill does not delete goals
- `goals.current_value / target_value` must be set together or both omitted (DB CHECK constraint)
- `goal_milestones.is_done = true` preserves the original `done_at` timestamp on re-updates (SQL: `COALESCE(done_at, now())`)
- `goal_checkins` is append-only — no update/delete endpoint by design
- `set_updated_at()` PL/pgSQL trigger function is introduced in this migration and shared by `goals` and `goal_milestones`; it is not dropped in down.sql to avoid breaking future migrations that may reference it
- RLS is enabled on all three tables (aspirational scaffolding per architecture.md §4.2); primary enforcement is `WHERE user_id = $1` in every repository query

## Ownership Enforcement

Every write path enforces ownership via `WHERE user_id = $N`:
- Goal operations: direct `WHERE id=$1 AND user_id=$2`
- Milestone create/list: `goalOwned()` pre-check, then `WHERE goal_id=$1 AND user_id=$2` in all queries
- Milestone update/delete: `WHERE id=$1 AND user_id=$2` (user_id is denormalised on the row)
- Checkin create/list: `goalOwned()` pre-check + `WHERE user_id=$2` on insert/query
- No URL parameter is trusted for authorization — user ID always comes from JWT context

## Test Results

27 new handler tests — all pass:
```
TestHandlePostGoal_OK
TestHandlePostGoal_MissingTitle
TestHandlePostGoal_MeasurablePairValidation
TestHandlePostGoal_Unauthorized
TestHandleGetGoals_Empty
TestHandleGetGoals_StatusFilter_Invalid
TestHandleGetGoals_StatusFilter_Valid
TestHandleGetGoal_NotFound
TestHandleGetGoal_OK
TestHandleGetGoal_InvalidID
TestHandlePutGoal_InvalidStatus
TestHandlePutGoal_OwnershipEnforced
TestHandleDeleteGoal_OK
TestHandleDeleteGoal_NotFound
TestHandlePostMilestone_OK
TestHandlePostMilestone_MissingTitle
TestHandlePostMilestone_GoalNotFound
TestHandleGetMilestones_OrderedByPosition
TestHandlePutMilestone_OwnershipEnforced
TestHandleDeleteMilestone_OK
TestHandlePostCheckin_OK
TestHandlePostCheckin_WithValueSnapshot
TestHandlePostCheckin_EmptyPayload
TestHandleGetCheckins_GoalNotFound
TestHandleGetCheckins_ReturnsEmptyArray
TestHandlePostCheckin_OwnershipEnforced
```

Pre-existing failures (unrelated to T8):
- `auth` package: 3 intentional-red regression tests (password change behaviour, labelled `[INTENTIONAL RED on main]`)
- `handlers.TestXPChartZeroFill`: date-sensitive test that fails depending on run date

## Known Risks and Dependencies for T9/T10/T11

**T9 (AI goal suggestion / assistant)**
- The `goals` table has no AI-specific fields by design (Wave 2 T8 = manual foundation)
- AI can write to `title`, `description`, `target_value`, `unit` via the existing PUT endpoint — no schema change needed
- If AI needs to attach metadata (e.g. generated_by, prompt_version), add a nullable `ai_context JSONB` column in a new migration

**T10 (frontend goals UI)**
- The `skill_id` FK is optional — frontend can link goals to skills but doesn't have to
- `position` field exists for client-managed drag-and-drop ordering
- `milestone.is_done` toggle is a single boolean; frontend controls UX for partial-done states
- Dates use Go `time.Time` → ISO 8601 JSON; frontend should send RFC3339 strings

**T11 (XP integration / goal completion rewards)**
- No XP is awarded on goal/milestone completion in T8 — that bridge belongs in T11
- When T11 lands, add an XP event in the same transaction as `status = 'completed'` update
- The `skill_id` FK on goals gives the XP target when present; goals without `skill_id` will need a policy decision (award to a default skill? no XP?)

**Migration sequencing**
- Migration 000012 depends on `public.users` (001) and `public.skills` (005) being applied first
- The `set_updated_at()` function created in 000012 may be used by future migrations — do not add a DROP in any down.sql without checking dependents
