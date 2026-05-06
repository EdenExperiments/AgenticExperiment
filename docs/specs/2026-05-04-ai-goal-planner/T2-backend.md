## Status: DONE

## Files Changed

- `apps/api/internal/planner/planner.go` — domain types (PlanRequest, PlanResponse, Milestone, WeekCadence, Risk), prompt construction (BuildPrompt, SystemPrompt), response parser (ParseResponse + stripFences + validate + fallback)
- `apps/api/internal/planner/planner_test.go` — 14 deterministic unit tests for parser robustness and prompt construction
- `apps/api/internal/handlers/goal_plan.go` — GoalPlanHandler (PlannerAICaller interface, httpPlannerCaller, NewGoalPlanHandler, NewGoalPlanHandlerForTest, HandlePostGoalPlan)
- `apps/api/internal/handlers/goal_plan_test.go` — 10 handler-layer tests covering all HTTP response codes and AI failure modes
- `apps/api/internal/server/server.go` — POST /api/v1/goals/plan route registered

## Endpoint Contract

### POST /api/v1/goals/plan

**Auth:** JWT (Supabase session token in Authorization header)

**Request body (JSON):**

```json
{
  "goal_statement": "Run a 10k race in under 60 minutes",
  "deadline": "2026-12-31T00:00:00Z",
  "context": "Current 5k time is 35 min, training 3x/week"
}
```


| Field            | Type             | Required | Notes                                            |
| ---------------- | ---------------- | -------- | ------------------------------------------------ |
| `goal_statement` | string           | yes      | Free-text description of the goal                |
| `deadline`       | RFC3339 datetime | no       | Target completion date                           |
| `context`        | string           | no       | Background info (skill level, constraints, etc.) |


**Response (200 OK — normal):**

```json
{
  "plan": {
    "objective": "Complete a 10k race in under 60 minutes by December 2026.",
    "milestones": [
      {"title": "Run 7k non-stop", "description": "...", "week_offset": 4},
      {"title": "Complete 10k time trial", "description": "...", "week_offset": 12}
    ],
    "weekly_cadence": [
      {"week": 1, "focus": "Base building", "task_summary": "..."},
      ...
    ],
    "risks": [
      {"description": "Overuse injury", "mitigation": "..."}
    ],
    "fallback_plan": "..."
  },
  "degraded_response": false
}
```

**Response (200 OK — degraded fallback):**
Same structure but `degraded_response: true` and `plan` contains a safe static fallback.
This happens when the AI returns non-parseable output. The client should surface a
"plan could not be fully generated" message.

**Error responses:**


| Status | Condition                                         |
| ------ | ------------------------------------------------- |
| 400    | Malformed JSON body                               |
| 401    | Missing/invalid JWT                               |
| 402    | No AI key configured for user                     |
| 422    | `goal_statement` empty or whitespace-only         |
| 429    | Claude API rate limit hit                         |
| 500    | DB error fetching API key                         |
| 502    | AI call failed (network error, unexpected status) |


## Fallback Behavior

1. **No AI key (402):** Hard error — user must add their Claude API key in settings.
2. **AI unavailable (502):** Hard error — instructs client to retry later.
3. **Malformed AI output:** Soft degradation — 200 with `degraded_response: true` and a minimal static plan. The raw AI text is logged at WARN level without being surfaced to the user or logged verbatim (protects against model leaking sensitive context).
4. **Schema validation failure:** Same as (3) — any missing required field triggers fallback.

## Security (D-015 compliance)

- API key retrieved via `keys.GetDecryptedKey` (AES-256-GCM envelope encryption, master key from env)
- API key is passed directly to HTTP header — never logged, never included in error messages
- Raw AI model output is NOT logged (it may echo user context)
- The `plannerHTTPError` body captures only a 512-byte truncated error response from Anthropic (not user data)
- No new DB schema required — AI planner is stateless (generate-on-demand)

## AI Service Architecture

The `PlannerAICaller` interface in `handlers/goal_plan.go` decouples the HTTP transport
from the handler logic, enabling full test coverage without live AI calls:

```go
type PlannerAICaller interface {
    CallRaw(ctx context.Context, apiKey, systemPrompt, userPrompt string) (string, error)
}
```

Production implementation: `httpPlannerCaller` (Anthropic `claude-haiku-4-5-20251001`, 2048 max_tokens, 60s timeout)
Test implementation: `stubPlannerCaller` (in `goal_plan_test.go`)

The `planner` package is entirely pure Go with no HTTP or DB imports — all parser logic
is deterministically testable.

## Test Results

### New tests — all pass

`**internal/planner` (14 tests):**

- `TestParseResponse_ValidJSON`
- `TestParseResponse_MarkdownFences_Stripped`
- `TestParseResponse_PlainFences_Stripped`
- `TestParseResponse_InvalidJSON_ReturnsFallback`
- `TestParseResponse_MissingObjective_ReturnsFallback`
- `TestParseResponse_EmptyMilestones_ReturnsFallback`
- `TestParseResponse_EmptyWeeklyCadence_ReturnsFallback`
- `TestParseResponse_EmptyFallbackPlan_ReturnsFallback`
- `TestParseResponse_ExtraFields_Ignored`
- `TestBuildPrompt_ContainsGoalStatement`
- `TestBuildPrompt_ContainsDeadline`
- `TestBuildPrompt_NoDeadline_OmitsDeadlineLine`
- `TestBuildPrompt_ContextIncluded`
- `TestSystemPrompt_NotEmpty`

`**internal/handlers` — new GoalPlan tests (10 tests):**

- `TestHandlePostGoalPlan_Returns200_ValidPlan`
- `TestHandlePostGoalPlan_Returns401_Unauthorized`
- `TestHandlePostGoalPlan_Returns422_MissingGoalStatement`
- `TestHandlePostGoalPlan_Returns400_BadJSON`
- `TestHandlePostGoalPlan_Returns402_NoAPIKey`
- `TestHandlePostGoalPlan_Returns500_KeyStoreError`
- `TestHandlePostGoalPlan_Returns502_AICallFailure`
- `TestHandlePostGoalPlan_Returns200_DegradedOnMalformedAIOutput`
- `TestHandlePostGoalPlan_Returns200_WithDeadlineAndContext`
- `TestHandlePostGoalPlan_MarkdownFenceStrippedSuccessfully`

### Pre-existing failures (not introduced by T12)

- `internal/auth`: 3 tests marked `[INTENTIONAL RED on main]` (password change behaviour)
- `internal/goals`: 2 forecast confidence tests (date-sensitive math, pre-existing from T8)
- `internal/handlers.TestXPChartZeroFill`: date-sensitive, pre-existing

## Known Risks and Dependencies

**Depends on T8 (`cursor/ai-goals-backend-c6a8-0504`):**

- Branched from T8 — includes goals CRUD schema and handler layer
- The `KeyStore` interface and `dbKeyStore` from `calibrate.go` are reused directly

**For T10 (frontend):**

- Endpoint is `POST /api/v1/goals/plan`
- Response always has `plan` object and `degraded_response` boolean
- `degraded_response: true` → show a "plan generation incomplete" banner; still display the fallback plan
- No goal is persisted automatically — the frontend should offer "Save this plan as a goal"

**For future AI model changes:**

- Model name (`claude-haiku-4-5-20251001`) and `max_tokens` (2048) are hardcoded in `httpPlannerCaller`
- To change model or increase token budget, edit `goal_plan.go` only — the interface is stable

**Schema extension (if needed):**

- If goal plans need to be persisted, add `goal_plans` table + `POST /goals/{id}/plan` route
- No migration included in T12 — stateless by design

