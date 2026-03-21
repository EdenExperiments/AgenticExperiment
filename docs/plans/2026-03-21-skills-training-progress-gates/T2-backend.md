## Status: BLOCKED

## Files Changed

### New files
- `apps/api/db/migrations/000007_skills_training_gates.up.sql` — adds timezone column to users, streak/active-use columns to skills, creates training_sessions and gate_submissions tables, adds training_session_id FK to xp_events, disables RLS on new tables
- `apps/api/db/migrations/000007_skills_training_gates.down.sql` — reversal migration
- `apps/api/internal/skills/bonus_xp.go` — implements ComputeBonus and ComputeBonusAbandoned pure functions
- `apps/api/internal/skills/streak.go` — implements ComputeStreak pure function and StreakResult type
- `apps/api/internal/skills/training_types.go` — defines TrainingSession, CreateSessionRequest, CreateSessionResult, DailyXP, GateSubmission, CreateGateSubmissionRequest types
- `apps/api/internal/handlers/session.go` — POST /api/v1/skills/{id}/sessions handler (SessionStore interface, SessionHandler, NewSessionHandlerWithStore)
- `apps/api/internal/handlers/gate.go` — POST /api/v1/blocker-gates/{id}/submit handler (GateStore, RawClaudeCaller interfaces, GateHandler, NewGateHandlerWithStore)
- `apps/api/internal/handlers/xpchart.go` — GET /api/v1/skills/{id}/xp-chart handler (XPChartStore interface, XPChartHandler, NewXPChartHandlerWithStore)
- `apps/api/internal/handlers/claude_raw.go` — httpRawClaudeCaller implementation and newHTTPClient helper

### Modified files
- `apps/api/internal/handlers/account.go` — added HandlePatchAccount method to existing UserHandler (validates IANA timezone, returns 422 on invalid)
- `apps/api/internal/users/service.go` — added UpdateTimezone function

## Test Results

86 tests pass, 1 test failing:

**FAILING:** `TestBonusXPPartialCompletion/ratio_0.75_standard_→_25%*0.75=18%`

```
bonus_xp_test.go:98: bonus_pct: got 19 want 18 (ratio=0.750)
```

## Notes

### Test inconsistency in bonus_xp_test.go

The test `TestBonusXPPartialCompletion` has three table-driven subtests that are mathematically inconsistent with any single rounding formula:

| ratio | expected pct | math.Round result | floor result |
|-------|-------------|-------------------|--------------|
| 0.75  | 18          | 19                | 18 ✓         |
| 0.50  | 13          | 13 ✓              | 12           |
| 0.94  | 24          | 24 ✓              | 23           |

The test comment for the 0.75 case reads `// round(25 * 0.75) = 18.75 → 19?` — the `?` indicates the test author was uncertain. The `wantBonusPct: 18` appears to be a typo; the correct value using `math.Round` (which matches the spec's "rounded to nearest whole %") is 19.

Implemented `math.Round` which satisfies 2 of 3 subtests in `TestBonusXPPartialCompletion` (the 0.50 and 0.94 cases), plus all subtests in `TestBonusXPBoundary` and `TestBonusXPFullCompletion`. This is the mathematically correct implementation per the spec. Changing to truncation/floor would fix the 0.75 subtest but would break the 0.50 and 0.94 subtests (and the 0.949 boundary test), resulting in 4 failures instead of 1.

**Resolution needed:** The test's `wantBonusPct` for `ratio=0.75` should be changed from 18 to 19 to match the spec and the other test cases' rounding formula.

### Migration numbering

Migration was written as `000007` (not `000006` as specified in the plan) because `000006_disable_aspirational_rls` already exists in the codebase.

### Streak timezone handling

The `ComputeStreak` function treats `lastLogDate` as a DATE value stored as UTC midnight (matching how PostgreSQL DATE columns are represented). The calendar date comparison extracts year/month/day from `lastLogDate` in UTC, then compares against today's date in the user's timezone from `now`. This correctly handles the timezone test case where a log at 22:00 UTC and "now" at 01:00 UTC the next day are both on the same calendar day in New_York (EDT, UTC-4).

### DB implementations

The `dbGateStore` and `dbXPChartStore` implementations are stubs (return nil errors, no actual DB queries). Full DB implementation is deferred — the interfaces and handler logic are complete and testable via the stub stores used in T1 tests.
