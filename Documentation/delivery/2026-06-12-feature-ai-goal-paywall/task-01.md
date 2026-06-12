# Task 01 — Composite AI Entitlement Read Endpoint

**Delivery:** `Documentation/delivery/2026-06-12-feature-ai-goal-paywall/`  
**Requirements:** AC-1, AC-2  
**Stack:** Go (`apps/api/`)  
**Subagents:** `test-writer-go` → `implementer-go` → `verifier`

## Scope

Add `GET /api/v1/account/ai-entitlement` returning a composite readiness check for AI Goal Coach proactive UI gating.

### Response contract

```json
{
  "entitled": false,
  "reason": "subscription_required",
  "subscription_tier": "free",
  "has_api_key": true
}
```

| Field | Type | Rules |
| --- | --- | --- |
| `entitled` | bool | `true` iff `subscription_tier == "pro"` **and** `has_api_key == true` |
| `reason` | string | `ready` \| `subscription_required` \| `no_api_key` — evaluated in that priority order |
| `subscription_tier` | string | `free` \| `pro` from `users.subscription_tier` |
| `has_api_key` | bool | Whether encrypted key row exists (reuse existing key-store lookup; no decryption needed) |

### Handler behaviour

- `401` when unauthenticated (consistent with other account routes).
- `500` on unexpected DB/key-store errors.
- Must **not** return key material, hints, or decrypted values (D-015).

### Wiring

- Register route in `apps/api/internal/server/server.go` under authenticated account routes.
- Reuse `entitlements.Checker` for tier lookup and existing `KeyStore` / `GetAPIKeyStatus` pattern for `has_api_key`.

## Acceptance criteria (from requirements)

- **AC-1:** Response shape and reason priority as specified.
- **AC-2:** No key leakage in response.

## Target paths

- `apps/api/internal/handlers/` — new handler file (e.g. `ai_entitlement.go`) + tests
- `apps/api/internal/server/server.go` — route registration
- May import: `internal/entitlements`, existing key-store interfaces from calibrate/account handlers

## Verification command

```bash
cd apps/api && go test ./internal/handlers/... -run AIEntitlement -count=1
```

## Out of scope

- Changing `POST /api/v1/goals/plan` middleware or handler logic.
- Billing webhooks or `subscription_tier` mutation endpoints.
- Forecast endpoint gating.

## Depends on

None.

## Notes for implementer

- Mirror JSON field naming used by existing entitlement middleware (`subscription_required`) for frontend consistency.
- Add table-driven tests for all four combinations: free/no-key, free/key, pro/no-key, pro/key.
