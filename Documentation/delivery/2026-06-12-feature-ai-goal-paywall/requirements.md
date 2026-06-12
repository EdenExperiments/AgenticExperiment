# Requirements — AI Goal Planning Paywall / Upgrade UX (F-049 Lane B)

**Feature tracker:** F-049 (in-progress)  
**Delivery folder:** `Documentation/delivery/2026-06-12-feature-ai-goal-paywall/`  
**Date drafted:** 2026-06-12

## Goal

Polish the paywall and upgrade experience for AI Goal Coach so users understand **why** a feature is locked (Pro subscription vs Claude API key) and are routed to the correct next step, with funnel analytics wired per F-048.

## Non-goals

- Payment provider integration, checkout, or server-side trial enforcement (F-040 / D-039 remain deferred).
- Changes to AI planner prompt logic, `degraded_response` contract, or milestone acceptance flow.
- Gating the deterministic goal forecast endpoint (`GET /api/v1/goals/{id}/forecast`) — it is currently ungated and AI-free; forecast paywall UI alignment is limited to removing or correcting misleading copy (see AC-7).
- NutriLog / MindTrack surfaces.
- Visual theme/Stylish mode work (D-035, D-043).

## Current state (exploration summary)

| Layer | Shipped | Paywall gap |
| --- | --- | --- |
| API `POST /api/v1/goals/plan` | Pro-tier middleware (`403 subscription_required`) + handler `402` when no API key (D-015) | No composite entitlement read endpoint for the frontend |
| API `GET /api/v1/account` | Returns `subscription_tier` in JSON | `packages/api-client` `Account` type omits tier; UI does not surface it |
| Frontend `getAIEntitlement()` | Proxies API-key status only (`has_key`) | Ignores subscription tier; free users with a key can enter the wizard then fail on `planGoal` |
| `PaywallCTA` | Reusable component; `upgrade_clicked` fires on CTA | All copy says "API key"; no `paywall_viewed`; no subscription variant |
| `/goals/ai/new` | Gates on API key via `useAIEntitlement` | Mislabels subscription blocks; inline errors conflate `402` and `403` |
| `/goals` list | Locked "AI Plan" button → `/account` | Does not deep-link to paywall wizard or reason-specific setup |
| `/goals/[id]` forecast | Shows paywall on `403` | Forecast API is not entitlement-gated today — paywall is test-only / misleading |

## Binding constraints

| ID | Relevance |
| --- | --- |
| **D-015** | Claude API keys: AES-256-GCM envelope encryption; never log or return key material; entitlement endpoint must not expose keys. |
| **D-036** | Logic/behavior changes require tests; pure visual composition validated against style guides. |
| **D-059** | Update `feature-tracker.md` when F-049 paywall polish ships. |

## Assumptions

1. **Two-step unlock model stands:** Pro subscription (`subscription_tier = 'pro'`) **and** a stored Claude API key are both required for `POST /api/v1/goals/plan`. Subscription alone is insufficient.
2. **Upgrade CTA is informational until billing ships:** "Upgrade to Pro" links to a dedicated account subsection (or anchor) with 14-day trial messaging per F-040 — not an external checkout URL.
3. **Entitlement read endpoint is the single source of truth** for proactive UI gating; inline API errors remain a fallback for race conditions.
4. **`paywall_viewed.trigger`** uses `feature_gate` for proactive gates and `upgrade_prompt` for subscription CTAs (per `analytics-instrumentation.md` schema).

## Open questions (need sign-off)

| # | Question | Default if unanswered |
| --- | --- | --- |
| OQ-1 | Should free-tier users with an API key see the wizard input step (fail on generate) or a subscription paywall before input? | **Subscription paywall before input** (fail fast, matches API order). |
| OQ-2 | Where should "Upgrade to Pro" navigate — `/account#subscription` anchor, a new `/account/upgrade` page, or external waitlist URL? | **`/account#subscription` anchor** on a new account subscription section. |
| OQ-3 | Should goal-detail forecast paywall be removed until forecast is API-gated, or should forecast gain Pro middleware in this lane? | **Remove misleading forecast paywall**; show forecast to all authenticated users (matches current API). |

## Acceptance criteria

Each criterion is independently verifiable.

| ID | Criterion | Verification |
| --- | --- | --- |
| AC-1 | `GET /api/v1/account/ai-entitlement` returns `{ entitled, reason, subscription_tier, has_api_key }` where `reason` is one of `ready`, `subscription_required`, `no_api_key`. `entitled` is true only when tier is `pro` **and** `has_api_key` is true. | `go test ./internal/handlers/... -run AIEntitlement` from `apps/api/` |
| AC-2 | Endpoint never returns API key material or hints beyond existing `has_api_key` boolean (D-015). | Code review + handler test asserting response shape |
| AC-3 | `packages/api-client` `getAIEntitlement()` calls the new endpoint; `AIEntitlement.reason` includes `subscription_required`. | `pnpm --filter @rpgtracker/api-client test` |
| AC-4 | `PaywallCTA` supports distinct subscription vs API-key copy presets; mounting emits `paywall_viewed` once per render with correct `surface` and `trigger`. | Vitest in `apps/rpg-tracker` |
| AC-5 | `/goals/ai/new` shows subscription paywall when `reason === 'subscription_required'`, API-key paywall when `reason === 'no_api_key'`, and wizard when `reason === 'ready'`. | `apps/rpg-tracker/app/__tests__/paywall-gating.test.tsx` |
| AC-6 | `planGoal` `403 subscription_required` inline error shows subscription upgrade CTA (not API-key copy). `402` continues to show API-key setup CTA. | `apps/rpg-tracker/app/__tests__/ai-goal-wizard.test.tsx` |
| AC-7 | Goal-detail forecast section does not show a paywall for the current ungated forecast API (OQ-3 default). | `paywall-gating.test.tsx` forecast cases updated |
| AC-8 | Goals list locked "AI Plan" navigates to `/goals/ai/new` (paywall) instead of `/account` when user lacks entitlement. | `paywall-gating.test.tsx` |
| AC-9 | Account page shows subscription tier and an upgrade/trial CTA section (no checkout). | Manual/visual review + optional account page test |
| AC-10 | `upgrade_clicked` continues to fire on paywall CTA clicks with correct `surface`. | Existing + extended analytics tests |

## Affected paths

| Zone | Paths |
| --- | --- |
| Go API | `apps/api/internal/handlers/` (new entitlement handler), `apps/api/internal/server/server.go` |
| API client | `packages/api-client/src/client.ts`, `packages/api-client/src/types.ts`, `packages/api-client/src/__tests__/` |
| RPG Tracker | `apps/rpg-tracker/lib/useAIEntitlement.ts`, `apps/rpg-tracker/components/PaywallCTA.tsx`, `apps/rpg-tracker/app/(app)/goals/`, `apps/rpg-tracker/app/(app)/account/page.tsx`, `apps/rpg-tracker/lib/analytics.ts`, `apps/rpg-tracker/app/__tests__/` |

## Sign-off

```
Signed off by: Macaulay on 12/06/2026
```
