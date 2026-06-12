# Task 03 — NutriLog App Shell + Weight Logging UI

**Epic:** `2026-06-12-epic-nutrilog-mvp`  
**Depends on:** task-02  
**Blocks:** — (terminal task for this epic)

## Summary

Build the authenticated NutriLog experience: login flow, dashboard layout, weight entry form, recent logs list, and trend chart — using `@rpgtracker/api-client`, `@rpgtracker/auth`, and `@rpgtracker/ui` with the `nutri-saas` theme.

## Target paths

- `apps/nutri-log/app/(auth)/login/page.tsx` (or equivalent auth route)
- `apps/nutri-log/app/(app)/dashboard/page.tsx`
- `apps/nutri-log/app/(app)/layout.tsx` — app shell, nav
- `apps/nutri-log/app/page.tsx` — session redirect (already exists; adjust if needed)
- `apps/nutri-log/proxy.ts` — align `defaultTheme` with `nutri-saas` if inconsistent
- `apps/nutri-log/app/__tests__/` — behavior tests
- Optional: `Documentation/page-guides/nutrilog-dashboard.md` (visual guide for D-036 review)

## Acceptance criteria

| ID | Criterion |
|----|-----------|
| AC-7 | Unauthenticated users cannot access dashboard; redirected to login |
| AC-8 | User can submit weight; new entry appears in recent list without full page reload |
| AC-9 | Trend chart renders from `getWeightChart()` response |
| AC-10 | No changes to `apps/rpg-tracker/` or hub XP |

## UI scope

### App shell

- Reuse LifeQuest auth patterns (`createSupabaseServerClient`, `createAuthMiddleware`).
- Minimal nav: Dashboard (weight home); link back to LifeQuest hub URL via env or config if available (optional teaser link — not required for AC).
- Mobile-first layout; `nutri-saas` tokens — no hardcoded colors (D-035).

### Dashboard page

1. **Log weight** — numeric input (kg), optional note, submit button. Client validation: positive number.
2. **Recent entries** — list last N logs with date, weight, note; delete action per row (calls `deleteWeightLog`).
3. **Trend chart** — 30-day default; reuse chart component/pattern from LifeQuest skill detail (`getXPChart` usage in `apps/rpg-tracker/app/(app)/skills/[id]/page.tsx`) if extractable without cross-app import; otherwise implement a slim chart in nutri-log.

### Data fetching

- TanStack Query v5 (match LifeQuest) for `listWeightLogs`, `getWeightChart`, mutations for create/delete with cache invalidation.

## Implementation notes

- BFF proxy at `app/api/[...path]/route.ts` already forwards JWT — no proxy changes expected.
- Root `page.tsx` redirects to `/dashboard` or `/login` — ensure `/dashboard` route exists after this task.
- `proxy.ts` currently sets `defaultTheme: 'minimal'` while layout uses `nutri-saas`; align to `nutri-saas`.
- Visual polish: follow `Documentation/style-guide/shared.md`; add page guide if chart/layout needs visual sign-off (D-036).

## Verification command

```bash
pnpm --filter nutri-log test
```

Supplementary (manual): run `pnpm --filter nutri-log dev` with API + Supabase; log weight end-to-end.

## Out of scope

- LifeQuest hub placeholder update (`/nutri`, `HubPlaceholderCard`).
- Goals UI (F-018), calorie logging (F-014).
- Cross-app XP notifications.
- lbs unit toggle, progress photos, streaks.
- MindTrack.

## TDD dispatch

1. `test-writer-ts` — tests for form submission, list render, auth redirect (red).
2. `implementer-ts` — pages, components, query hooks (green).
3. `verifier` — `pnpm --filter nutri-log test` + visual review checklist for chart/shell.
