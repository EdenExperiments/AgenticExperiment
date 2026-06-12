# Task 02 — API Client Entitlement Integration

**Delivery:** `Documentation/delivery/2026-06-12-feature-ai-goal-paywall/`  
**Requirements:** AC-3  
**Stack:** TypeScript (`packages/api-client/`)  
**Subagents:** `test-writer-ts` → `implementer-ts` → `verifier`

## Scope

Replace the client-side API-key-only `getAIEntitlement()` shim with a call to `GET /api/v1/account/ai-entitlement`.

### Type updates (`packages/api-client/src/types.ts`)

```ts
export interface AIEntitlement {
  entitled: boolean
  reason: 'ready' | 'subscription_required' | 'no_api_key' | 'unknown'
  subscription_tier?: 'free' | 'pro'
  has_api_key?: boolean
}
```

### Client updates (`packages/api-client/src/client.ts`)

- `getAIEntitlement()` → `request<AIEntitlement>('/api/v1/account/ai-entitlement')`
- On network/unexpected errors, return `{ entitled: false, reason: 'unknown' }` (preserve current fail-closed behaviour).

### Tests

- Mock `fetch`/request layer to assert endpoint path and response mapping.
- Cover all `reason` values and error fallback.

## Acceptance criteria

- **AC-3:** Client calls new endpoint; `subscription_required` is a typed reason.

## Target paths

- `packages/api-client/src/types.ts`
- `packages/api-client/src/client.ts`
- `packages/api-client/src/__tests__/ai-contracts.test.ts` (or new dedicated test file)

## Verification command

```bash
pnpm --filter @rpgtracker/api-client test
```

## Out of scope

- Frontend hook or UI changes (`useAIEntitlement` updated in task-04).
- Adding `subscription_tier` to `Account` interface (optional follow-up; not required for AC-3).

## Depends on

- **task-01** (endpoint must exist; tests may use mocked responses if API not running).

## Notes for implementer

- Keep backward compatibility: consumers checking `entitled` boolean continue to work.
- Do not break existing `ai-contracts.test.ts` regression cases — extend, don't remove coverage.
