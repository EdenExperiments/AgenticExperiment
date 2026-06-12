# Task 02 — Typed NutriLog Weight Client

**Epic:** `2026-06-12-epic-nutrilog-mvp`  
**Depends on:** task-01 (API contract stable)  
**Blocks:** task-03

## Summary

Extend `packages/api-client` with TypeScript types and fetch helpers for NutriLog weight log endpoints implemented in task-01.

## Target paths

- `packages/api-client/src/types.ts`
- `packages/api-client/src/client.ts`
- `packages/api-client/src/index.ts` (re-exports if needed)
- `packages/api-client/src/__tests__/nutrilog-weight.test.ts`

## Acceptance criteria

| ID | Criterion |
|----|-----------|
| AC-6 | Typed create, list, chart, and delete methods exported |
| AC-6 | Tests mock `fetch` and assert correct paths, methods, and body shapes |

## API surface

Add to `client.ts`:

```typescript
// Types (types.ts)
export interface WeightLog {
  id: string
  weight_kg: number
  note: string
  measured_at: string
  created_at: string
}

export interface WeightChartPoint {
  date: string
  weight_kg: number | null
}

export interface WeightChartResponse {
  days: number
  unit: 'kg'
  data: WeightChartPoint[]
}

// Functions (client.ts)
export function createWeightLog(data: {
  weight_kg: number
  note?: string
  measured_at?: string
}): Promise<WeightLog>

export function listWeightLogs(params?: { limit?: number }): Promise<WeightLog[]>

export function getWeightChart(days?: number): Promise<WeightChartResponse>

export function deleteWeightLog(id: string): Promise<void>
```

### Path mapping (via app BFF proxy)

All requests use relative paths (same as existing client):

- `POST /api/v1/nutrilog/weight-logs` — JSON body
- `GET /api/v1/nutrilog/weight-logs?limit=N`
- `GET /api/v1/nutrilog/weight-chart?days=N`
- `DELETE /api/v1/nutrilog/weight-logs/{id}`

Use `request<T>()` helper with JSON for POST (unlike form-encoded skill endpoints).

## Implementation notes

- Match error handling: `ApiRequestError` on non-OK responses.
- DELETE expects `204` — ensure `request()` handles 204 (already does).
- Export new types from package entrypoint.

## Verification command

```bash
pnpm --filter @rpgtracker/api-client test
```

## Out of scope

- NutriLog UI — task-03.
- Go API changes unless task-01 contract bug found (escalate, don't expand scope).
- Hub or LifeQuest client consumers.

## TDD dispatch

1. `test-writer-ts` — contract tests against mocked fetch (red).
2. `implementer-ts` — types + client methods (green).
3. `verifier` — `pnpm --filter @rpgtracker/api-client test`.
