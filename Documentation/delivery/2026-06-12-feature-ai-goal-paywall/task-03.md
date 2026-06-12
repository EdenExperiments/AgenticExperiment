# Task 03 — PaywallCTA Variants and `paywall_viewed` Analytics

**Delivery:** `Documentation/delivery/2026-06-12-feature-ai-goal-paywall/`  
**Requirements:** AC-4, AC-10 (partial)  
**Stack:** TypeScript (`apps/rpg-tracker/`)  
**Subagents:** `test-writer-ts` → `implementer-ts` → `verifier`

## Scope

Extend shared paywall component and analytics wiring so downstream surfaces can render reason-specific messaging.

### `PaywallCTA` changes

Add a `gate` prop (or equivalent) with presets:

| `gate` | Title (default) | CTA label (default) | `ctaHref` (default) |
| --- | --- | --- | --- |
| `api_key` | AI features require an API key | Set up AI in Account | `/account/api-key` |
| `subscription` | AI Goal Coach requires Pro | Upgrade to Pro | `/account#subscription` |

- Existing call sites without `gate` default to `api_key` for backward compatibility during rollout.
- Accept optional `surface` prop for analytics (`ai_goal_coach` \| `weekly_review` \| `account`).

### Analytics

- On mount (useEffect), emit `paywall_viewed` once with:
  - `surface` from prop (default `ai_goal_coach`)
  - `trigger`: `feature_gate` for `api_key`, `upgrade_prompt` for `subscription`
- Preserve existing `upgrade_clicked` on CTA click.

### Tests

New or extended tests in `apps/rpg-tracker/app/__tests__/`:

- Subscription preset renders correct title/CTA href.
- API-key preset unchanged from current behaviour.
- `paywall_viewed` dispatched with expected payload (mock `trackEvent` or analytics dispatcher).
- `upgrade_clicked` still fires on CTA click.

## Acceptance criteria

- **AC-4:** Distinct presets; `paywall_viewed` on mount.
- **AC-10:** `upgrade_clicked` preserved.

## Target paths

- `apps/rpg-tracker/components/PaywallCTA.tsx`
- `apps/rpg-tracker/lib/analytics.ts` (only if type tweaks needed)
- `apps/rpg-tracker/app/__tests__/paywall-gating.test.tsx` or new `paywall-cta.test.tsx`

## Verification command

```bash
cd apps/rpg-tracker && pnpm exec vitest run app/__tests__/paywall-gating.test.tsx -t "PaywallCTA"
```

(If tests live in a dedicated file, run that file instead.)

## Out of scope

- Wiring into wizard, goals list, or account page (task-04, task-05).
- `useAIEntitlement` hook changes.

## Depends on

- **task-02** (types available for downstream; this task does not call API directly).

## Notes for implementer

- D-036: behaviour changes require tests; visual token usage stays on existing CSS variables.
- Use `data-testid` values: `paywall-cta`, `paywall-upgrade-btn` (unchanged).
