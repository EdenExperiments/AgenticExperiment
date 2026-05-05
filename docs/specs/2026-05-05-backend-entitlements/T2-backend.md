## Status: DONE

## Branch
`cursor/backend-entitlements-c6a8-0504`
Based on: `origin/cursor/ai-goal-planner-c6a8-0504` (Wave 3 AI planner — cherry-picked commits `7e42788` and `35b3baa` to bring in goals domain and planner handler).

## Files Changed

### New files
- `apps/api/db/migrations/000013_subscription_tier.up.sql` — adds `subscription_tier TEXT NOT NULL DEFAULT 'free' CHECK (IN ('free','pro'))` to `public.users`
- `apps/api/db/migrations/000013_subscription_tier.down.sql` — drops the column
- `apps/api/internal/entitlements/entitlements.go` — Tier type, Feature constants, Checker, pure gate logic
- `apps/api/internal/entitlements/middleware.go` — `Checker.RequireFeature()` chi middleware
- `apps/api/internal/entitlements/entitlements_test.go` — 7 unit tests (pure logic, no DB)
- `apps/api/internal/entitlements/middleware_test.go` — 4 middleware tests (httptest, no DB)
- `apps/api/internal/handlers/goal_plan_entitlement_test.go` — 2 additional handler tests for entitlement boundary cases

### Modified files
- `apps/api/internal/server/server.go` — imports `entitlements` package; registers `POST /api/v1/goals/plan` with `entitlementChecker.RequireFeature(FeatureAIGoalPlanner)` middleware; adds goals domain routes (cherry-picked from Wave 3)
- `apps/api/internal/users/service.go` — adds `SubscriptionTier string` field to `User` struct; all three user-returning queries now select `COALESCE(subscription_tier, 'free')`

### Cherry-picked from Wave 3 (not authored here)
- `apps/api/db/migrations/000012_goals.up.sql` / `000012_goals.down.sql`
- `apps/api/internal/goals/goals.go`
- `apps/api/internal/handlers/goal.go` + `goal_plan.go` + test files
- `apps/api/internal/planner/planner.go` + `planner_test.go`

## Entitlement Contract

### Tiers
| Tier | Value | Default |
|------|-------|---------|
| Free | `"free"` | Yes (existing users unaffected) |
| Pro  | `"pro"` | No |

### Feature gates
| Feature constant | Feature ID | Minimum tier | Endpoint |
|-----------------|------------|--------------|----------|
| `FeatureAIGoalPlanner` | `ai_goal_planner` | `pro` | `POST /api/v1/goals/plan` |
| `FeatureAIGoalForecast` | `ai_goal_forecast` | `pro` | (not yet routed; declared for future use) |

### Error response for 403 (entitlement denied)
```json
{
  "error": "subscription_required",
  "detail": "this feature requires a Pro subscription — upgrade at account settings",
  "feature": "ai_goal_planner",
  "required": "pro"
}
```

### Account API change
`GET /api/v1/account` now returns `subscription_tier` in the user object:
```json
{
  "id": "...",
  "email": "...",
  "subscription_tier": "free"
}
```

## Migration Notes

- Migration `000013` is additive (ALTER TABLE ADD COLUMN with DEFAULT). No data backfill required; existing rows get `'free'` automatically.
- The CHECK constraint enforces `'free' | 'pro'` only. New tiers require a new migration to extend the constraint — no ALTER TYPE lock needed (TEXT, not ENUM).
- Provider-specific billing IDs (Stripe customer_id, etc.) are NOT stored in this migration. When a payment provider is chosen, a separate `billing_accounts` table should be added.
- The `COALESCE(subscription_tier, 'free')` defensive fallback in all user queries guards against pre-migration rows if the column is somehow NULL.

## Test Results

```
ok  github.com/meden/rpgtracker/internal/entitlements   11 tests PASS
ok  github.com/meden/rpgtracker/internal/handlers        (all handler tests PASS including 2 new entitlement boundary tests)
ok  github.com/meden/rpgtracker/internal/server          PASS
ok  github.com/meden/rpgtracker/internal/planner         PASS
ok  github.com/meden/rpgtracker/internal/auth            PASS
```

Pre-existing failure (not introduced by this branch):
- `TestXPChartZeroFill` — date-boundary off-by-one; fails at month/day edge. Present on base commit `35b3baa` before any entitlement code was added.

## Known Risks / Dependencies

1. **Wave 3 not yet merged to main**: This branch cherry-picks two Wave 3 commits (`7e42788`, `35b3baa`) for the goals domain and planner handler. When Wave 3 merges to main, the cherry-picked commits will need to be reconciled (likely via a merge of the merged main into this branch). The cherry-picks should apply cleanly since the conflict was already resolved.

2. **No admin UI for tier management**: There is no endpoint to upgrade a user's tier. Until a billing/admin route exists, tier changes must be applied via direct DB update (`UPDATE public.users SET subscription_tier = 'pro' WHERE id = '...'`). This is intentional — provider-agnostic until a payment provider is selected.

3. **`TestXPChartZeroFill` pre-existing failure**: Not our regression. The test expects 29 zero-fill days but the implementation produces 30 at certain dates. Should be fixed independently.

4. **`FeatureAIGoalForecast` declared but unrouted**: The feature constant is registered in `featureRequirements` (so it can be unit-tested) but no endpoint uses it yet. When the forecast endpoint is added, it should be wired with `RequireFeature(FeatureAIGoalForecast)`.
