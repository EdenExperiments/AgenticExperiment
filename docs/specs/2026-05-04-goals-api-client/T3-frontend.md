## Status: DONE

## Files Changed
- `packages/api-client/src/types.ts` — added Goal, Milestone, CheckIn, GoalStatus, and six request interfaces
- `packages/api-client/src/client.ts` — added 11 goal-domain client functions
- `packages/api-client/src/__tests__/goals.test.ts` — 26 new tests covering all endpoints

## Notes

### Typed API Surface

**Types added (`types.ts`):**
- `GoalStatus` — `'active' | 'completed' | 'abandoned'`
- `Goal` — full goal response shape
- `Milestone` — full milestone response shape
- `CheckIn` — full check-in response shape
- `CreateGoalRequest` — POST /goals payload
- `UpdateGoalRequest` — PUT /goals/:id payload (all fields optional, nulls allowed for clearing)
- `CreateMilestoneRequest` — POST /goals/:id/milestones payload
- `UpdateMilestoneRequest` — PUT /goals/:id/milestones/:mid payload
- `CreateCheckInRequest` — POST /goals/:id/checkins payload

**Client functions added (`client.ts`):**
| Function | Method | URL |
|---|---|---|
| `listGoals(params?)` | GET | `/api/v1/goals[?status=…]` |
| `getGoal(id)` | GET | `/api/v1/goals/:id` |
| `createGoal(data)` | POST | `/api/v1/goals` |
| `updateGoal(id, data)` | PUT | `/api/v1/goals/:id` |
| `deleteGoal(id)` | DELETE | `/api/v1/goals/:id` |
| `listMilestones(goalId)` | GET | `/api/v1/goals/:id/milestones` |
| `createMilestone(goalId, data)` | POST | `/api/v1/goals/:id/milestones` |
| `updateMilestone(goalId, mid, data)` | PUT | `/api/v1/goals/:id/milestones/:mid` |
| `deleteMilestone(goalId, mid)` | DELETE | `/api/v1/goals/:id/milestones/:mid` |
| `listCheckIns(goalId)` | GET | `/api/v1/goals/:id/checkins` |
| `createCheckIn(goalId, data)` | POST | `/api/v1/goals/:id/checkins` |

### Conventions
- POST/PUT mutations use `JSON.stringify` body (not form-encoded), consistent with `submitGate`/`updateAccount` precedent for structured/nested payloads.
- `Content-Type: application/json` is sent via the shared `request()` helper default header.
- DELETE returns `void` via the existing 204 short-circuit in `request()`.
- `listGoals` status filter builds a simple `?status=` string (single-value enum, no multi-value needed).

### Known Risks
- The backend must accept `Content-Type: application/json` on POST/PUT goal endpoints. If the Go handlers expect form-encoded bodies, callers will get 400s. This is the only alignment risk — verify when T8 backend is deployed.
- `current_value`/`target_value` are typed as nullable pairs; the API contract requires both or neither, but enforcement is server-side only.

## Test Results
29 passed (26 new goals tests, 3 existing client tests) — `pnpm --filter @rpgtracker/api-client test`
