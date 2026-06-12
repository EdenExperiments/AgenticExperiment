# Task 04 — AI Wizard and Goals List Paywall Integration

**Delivery:** `Documentation/delivery/2026-06-12-feature-ai-goal-paywall/`  
**Requirements:** AC-5, AC-6, AC-8, AC-10  
**Stack:** TypeScript (`apps/rpg-tracker/`)  
**Subagents:** `test-writer-ts` → `implementer-ts` → `verifier`

## Scope

Wire composite entitlement reasons into proactive gates and inline API error handling.

### `useAIEntitlement` (`apps/rpg-tracker/lib/useAIEntitlement.ts`)

- Expose full `reason` from updated `getAIEntitlement()` (including `subscription_required`).
- Extend `isEntitlementError` or add `isSubscriptionError` helper to detect `403` with `subscription_required` body if available from api-client error shape.

### `/goals/ai/new` wizard

| `reason` | UI |
| --- | --- |
| `subscription_required` | `PaywallCTA` with `gate="subscription"`, surface `ai_goal_coach` |
| `no_api_key` | `PaywallCTA` with `gate="api_key"` |
| `ready` | Existing wizard |
| loading | Keep optimistic wizard render (current behaviour) |

### `AiErrorMessage` inline errors (wizard input step)

| API response | UI |
| --- | --- |
| `402` / no API key | Existing API-key message + link to `/account/api-key` |
| `403` / `subscription_required` | Subscription upgrade message + link to `/account#subscription` |
| Other errors | Unchanged |

### `/goals` list (`apps/rpg-tracker/app/(app)/goals/page.tsx`)

- When `!entitled`, "AI Plan" locked control links to **`/goals/ai/new`** (paywall page) instead of `/account`.
- Update `aria-label` to reflect "unlock AI goal planning" rather than "set up AI".
- When `entitled`, behaviour unchanged (`/goals/ai/new`).

### Tests to update

- `apps/rpg-tracker/app/__tests__/paywall-gating.test.tsx` — subscription vs API-key paywall cases.
- `apps/rpg-tracker/app/__tests__/ai-goal-wizard.test.tsx` — `403 subscription_required` inline error.
- `apps/rpg-tracker/app/__tests__/ai-contract-regression.test.tsx` — if entitlement mocks change.

## Acceptance criteria

- **AC-5:** Wizard gates by `reason`.
- **AC-6:** Inline `403` vs `402` messaging.
- **AC-8:** Goals list links to wizard paywall.
- **AC-10:** Upgrade clicks still tracked.

## Target paths

- `apps/rpg-tracker/lib/useAIEntitlement.ts`
- `apps/rpg-tracker/app/(app)/goals/ai/new/page.tsx`
- `apps/rpg-tracker/app/(app)/goals/page.tsx`
- `apps/rpg-tracker/app/__tests__/paywall-gating.test.tsx`
- `apps/rpg-tracker/app/__tests__/ai-goal-wizard.test.tsx`

## Verification command

```bash
cd apps/rpg-tracker && pnpm exec vitest run app/__tests__/paywall-gating.test.tsx app/__tests__/ai-goal-wizard.test.tsx
```

## Out of scope

- Account page subscription section (task-05).
- Goal-detail forecast section (task-05).
- API or api-client changes.

## Depends on

- **task-03** (PaywallCTA `gate` prop and analytics).

## Notes for implementer

- Default OQ-1: subscription paywall blocks wizard input entirely.
- Mock `getAIEntitlement` with `{ reason: 'subscription_required', entitled: false }` in tests.
