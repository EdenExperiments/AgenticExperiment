# NutriLog MVP — Weight Logging (Epic Requirements)

**Epic ID:** `2026-06-12-epic-nutrilog-mvp`  
**Lane:** E — NutriLog/MindTrack Suite Preparation  
**Status:** Awaiting sign-off  
**Related features:** F-013 (primary); F-014–F-018, F-020 explicitly out of scope  
**Binding constraints:** D-004 (NutriLog post-release-1), D-037 (hub architecture), architecture §3 (`nl_` prefix)

---

## Goal

Ship the first vertical slice of NutriLog: authenticated users can record body-weight measurements and view a trend chart in the standalone NutriLog app (`apps/nutri-log/`). This establishes the `nl_` schema namespace, Go API surface, typed client, and frontend patterns for subsequent NutriLog features.

## Non-goals

- Calorie and macro logging (F-014) — blocked by food data provider decision (Open Food Facts vs equivalent).
- Barcode scanning (F-015), saved meals (F-016), AI recipes (F-017).
- Goal setting and weekly rate (F-018) — deferred to a follow-up slice after logging exists.
- Cross-app XP integration (F-020) — no hub XP awards, no LifeQuest dashboard live metrics in this epic.
- Hub placeholder replacement (`apps/rpg-tracker/app/(app)/nutri/page.tsx`, `HubPlaceholderCard` on dashboard).
- MindTrack (`apps/mental-health/`) — see `mindtrack-deferred.md`.
- Progress photos, TDEE estimation, streak/consistency gamification, AI weekly review (F-019).
- PWA, push notifications, data export.

---

## Recommended MVP slice

**Weight logging with trend chart (F-013).**

### Rationale

| Criterion | Weight (F-013) | Calorie/macro (F-014) | Goals (F-018) |
|-----------|----------------|----------------------|---------------|
| Schema complexity | One table (`nl_weight_logs`) | `nl_food_logs` + `nl_foods` + provider cache | `nl_goals`; needs targets without logging is weak |
| External dependencies | None | Food provider TBD (architecture §4.4) | Depends on logging context |
| Codebase patterns | Mirrors XP chart handler (`xpchart.go`) | New search/barcode UX | Overlaps LifeQuest `goals` domain conceptually |
| Scaffold readiness | BFF proxy + auth packages wired | Same infra, more domain design | Less value without logs |

NutriLog is scaffold-only today: root redirect, theme (`nutri-saas`), BFF proxy — no dashboard, login routes, or API endpoints. Weight logging is the smallest end-to-end slice that validates the full stack.

---

## Confirmed requirements

1. **Schema:** Create `public.nl_weight_logs` anchored to `public.users(id)` per architecture §3 (`user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE`).
2. **API (authenticated):**
   - `POST /api/v1/nutrilog/weight-logs` — create a weight entry.
   - `GET /api/v1/nutrilog/weight-logs` — list entries for the authenticated user (newest first; optional `limit` query param).
   - `GET /api/v1/nutrilog/weight-chart?days=N` — time-series for charting (default 30 days, max 365; ascending date order; carry-forward or point-per-entry semantics documented in task-01).
   - `DELETE /api/v1/nutrilog/weight-logs/{id}` — delete own entry (404 if not found or not owned).
3. **Typed client:** Methods and types in `packages/api-client` aligned with the Go contract.
4. **NutriLog UI (`apps/nutri-log/`):**
   - Auth-gated app shell (login + dashboard route; reuse `@rpgtracker/auth` patterns from LifeQuest).
   - Weight log form (value + optional note; unit per assumptions below).
   - Recent entries list.
   - Trend chart (reuse chart visualization patterns from LifeQuest skill detail where practical).
5. **Tests:** Go handler/repository tests (TDD); api-client contract tests; frontend behavior tests for log submission and list rendering (D-036 logic split).
6. **User isolation:** All queries scoped by authenticated `user_id`; same middleware stack as existing `/api/v1` routes.

---

## Assumptions (not commitments)

- **Hub XP (F-020):** A future integration *may* award XP to nutrition-related skills (e.g. preset category `nutrition`) when a weight log is created. This epic stores data only; no `xp_events` writes, no hub card updates.
- **Unit:** MVP stores weight in **kilograms** (`kg`) as a `NUMERIC` column; UI displays `kg`. lbs support and user preference deferred.
- **Measured time:** Server accepts optional `measured_at` (ISO 8601); defaults to `now()` if omitted. Backdating allowed within a reasonable window (e.g. 30 days — confirm at sign-off).
- **Chart semantics:** Chart endpoint returns one point per calendar day (latest entry wins if multiple logs same day), zero-filled or sparse series — match XP chart UX expectations.
- **Theme:** NutriLog ships with `nutri-saas` theme (already in layout); page guide for weight dashboard to be added during UI task (visual review, not blocking sign-off).
- **Deployment:** NutriLog runs as a separate Next.js app; users reach it via direct URL. Hub `/nutri` placeholder remains until a later hub-integration epic.

---

## Open questions (human sign-off required)

| # | Question | Default if unanswered |
|---|----------|----------------------|
| Q1 | Allow **edit** of past weight entries in MVP, or create + delete only? | Create + delete only |
| Q2 | Max **backdate** window for `measured_at`? | 30 days |
| Q3 | **Chart default range** — 30 days (match XP chart) or 90 days (common for weight)? | 30 days |
| Q4 | Should NutriLog **share the LifeQuest login session** when both apps run on sibling subdomains (cookie domain), or is separate origin acceptable for MVP? | Same Supabase project; cookie scope as today |
| Q5 | Enable **RLS** on `nl_weight_logs` (defence-in-depth, per `goals` migration) or app-layer only for MVP? | RLS enabled (match goals pattern) |

---

## Acceptance criteria

Each criterion is independently verifiable.

| ID | Criterion | Verification |
|----|-----------|--------------|
| AC-1 | Migration creates `nl_weight_logs` with `user_id` FK to `public.users` | `go test ./internal/database/...` + migration review |
| AC-2 | Authenticated user can POST a weight log; unauthenticated request returns 401 | Go handler test |
| AC-3 | User can list only their own weight logs | Go handler test |
| AC-4 | Weight chart endpoint returns correct date-ordered series for `days` param | Go handler test |
| AC-5 | User can delete their own log; cannot delete another user's log | Go handler test |
| AC-6 | `packages/api-client` exposes typed create/list/chart/delete methods | `pnpm --filter @rpgtracker/api-client test` |
| AC-7 | NutriLog login flow gates dashboard behind session | Vitest + manual auth check |
| AC-8 | User can submit weight from NutriLog UI; entry appears in list | Vitest |
| AC-9 | Trend chart renders from chart API response | Vitest (data wiring); visual review for chart styling |
| AC-10 | No `xp_events` or hub dashboard changes in this epic | `git diff` scope check |

---

## Affected zones

| Zone | Paths |
|------|-------|
| Go API | `apps/api/db/migrations/`, `apps/api/internal/handlers/`, `apps/api/internal/nutrilog/` (new), `apps/api/internal/server/server.go` |
| Typed client | `packages/api-client/src/types.ts`, `packages/api-client/src/client.ts`, `packages/api-client/src/__tests__/` |
| NutriLog app | `apps/nutri-log/app/` |
| Docs (post-implementation) | `Documentation/feature-tracker.md` (F-013 status) |

**Out of scope paths:** `apps/rpg-tracker/`, `apps/mental-health/`, hub XP integration layer.

---

## Sign-off

```
Signed off by: Macaulay on 12/06/2026
```

Until signed, downstream TDD dispatch must not start.
