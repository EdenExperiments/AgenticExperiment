# Task 05 — Account Subscription Section and Forecast Paywall Cleanup

**Delivery:** `Documentation/delivery/2026-06-12-feature-ai-goal-paywall/`  
**Requirements:** AC-7, AC-9  
**Stack:** TypeScript (`apps/rpg-tracker/`)  
**Subagents:** `test-writer-ts` → `implementer-ts` → `verifier`

## Scope

Complete the upgrade path destination and remove misleading forecast gating UI.

### Account page (`apps/rpg-tracker/app/(app)/account/page.tsx`)

Add a **Subscription** section with `id="subscription"` anchor:

- Display current tier: "Free" or "Pro" (fetch via `getAccount()` — extend `Account` type in api-client to include optional `subscription_tier` if not already present from task-02).
- When tier is `free`:
  - Show F-040 14-day trial messaging (copy from `Documentation/page-guides/auth.md` or existing landing patterns).
  - Primary CTA: "Start free trial" or "Upgrade to Pro" — **informational only** (no checkout); may use `PaywallCTA` with `gate="subscription"`, `surface="account"`, `variant="inline"`.
- When tier is `pro`:
  - Show "You're on Pro" status; link to API key section if key missing.

### Goal detail forecast (`apps/rpg-tracker/app/(app)/goals/[id]/page.tsx`)

Per OQ-3 default (**remove misleading paywall**):

- Remove `PaywallCTA` branch for forecast `403` entitlement errors.
- Forecast errors show existing "Forecast unavailable" status message.
- Update `paywall-gating.test.tsx` forecast paywall tests: expect forecast content or unavailable message, not paywall CTA.

## Acceptance criteria

- **AC-7:** No forecast paywall for ungated API.
- **AC-9:** Account shows tier + upgrade/trial CTA.

## Target paths

- `apps/rpg-tracker/app/(app)/account/page.tsx`
- `apps/rpg-tracker/app/(app)/goals/[id]/page.tsx`
- `packages/api-client/src/types.ts` (add `subscription_tier` to `Account` if needed)
- `apps/rpg-tracker/app/__tests__/paywall-gating.test.tsx`

## Verification command

```bash
cd apps/rpg-tracker && pnpm exec vitest run app/__tests__/paywall-gating.test.tsx
```

## Out of scope

- Payment integration, Stripe, or `subscription_tier` mutation API.
- Adding Pro middleware to forecast endpoint.
- Visual/Stylish mode polish beyond existing tokens.

## Depends on

- **task-02** (account may need `subscription_tier` on `Account` type).
- **Recommended after task-04** to avoid concurrent edits to `paywall-gating.test.tsx`.

## Notes for implementer

- D-036: account subscription section logic (tier conditional rendering) warrants a focused test; pure typography is visual review.
- Ensure `#subscription` anchor is keyboard-accessible and visible in page layout.
