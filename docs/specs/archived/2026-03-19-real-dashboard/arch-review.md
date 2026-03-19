# Architecture Review — Real Dashboard

## Schema Impact

None. The `xp_events` table already has `created_at TIMESTAMPTZ NOT NULL DEFAULT now()` (migration 000005). The `skills` table already has all needed columns. No new migration required.

## Service Boundaries

New endpoint: `GET /api/v1/activity?limit=N`
- New `ActivityHandler` in `apps/api/internal/handlers/activity.go`
- New `GetRecentActivity` function in `apps/api/internal/skills/xp_repository.go` that joins `xp_events` with `skills` to get `skill_name`
- Route registration in `apps/api/internal/server/server.go`
- Reuses existing session middleware for auth

The endpoint returns a flat JSON array (not paginated). This is appropriate for a dashboard feed capped at 50 items.

## ADR

None required. This is a read-only endpoint following existing patterns (query -> handler -> JSON response).

## Shared Package Changes

- `packages/api-client/src/types.ts` — add `ActivityEvent` interface
- `packages/api-client/src/client.ts` — add `getActivity(limit?: number)` function
- `packages/api-client/src/index.ts` — export `ActivityEvent` and `getActivity`
- `packages/ui/src/StatCard.tsx` — new component
- `packages/ui/src/StatCard.test.tsx` — tests
- `packages/ui/src/ActivityFeedItem.tsx` — new component
- `packages/ui/src/ActivityFeedItem.test.tsx` — tests
- `packages/ui/src/index.ts` — export new components

## Parallelisation Map

Tasks that MUST be sequenced:
1. **T1 (tester)** writes failing tests BEFORE T2/T3 implementation — TDD gate
2. **Shared packages** (`packages/api-client`, `packages/ui`) must be updated BEFORE the dashboard page can import from them
3. **Backend endpoint** (`GET /api/v1/activity`) must exist before frontend integration tests can pass against it

Tasks that CAN run in parallel:
- T2-backend (Go handler + repository) and T2-shared-api-client (types + client function) can run in parallel after T1
- T3-shared-ui (StatCard, ActivityFeedItem) and T2-backend can run in parallel after T1
- T3-dashboard-page depends on all shared packages being ready

Recommended task order:
```
T1: tester — write all failing tests
T2a: backend — activity handler + repository + server route (parallel with T2b, T3a)
T2b: backend/frontend — api-client types + function (parallel with T2a, T3a)
T3a: frontend — StatCard + ActivityFeedItem components (parallel with T2a, T2b)
T3b: frontend — dashboard page rewrite (after T2a, T2b, T3a complete)
T4: reviewer — code gate review
```

## Approval

APPROVED
