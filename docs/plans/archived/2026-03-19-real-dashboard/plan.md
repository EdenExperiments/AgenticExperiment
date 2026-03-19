# Implementation Plan — Real Dashboard

**Spec:** `docs/specs/2026-03-19-real-dashboard/spec.md`
**Status:** APPROVED (gateway GO)

## Task List

### T1: tester — Write failing tests from spec ACs
**Owner:** tester
**Depends on:** nothing
**Files to create/modify:**
- `/home/meden/GolandProjects/RpgTracker/apps/api/internal/handlers/activity_test.go` — Go tests for AC-1, AC-2, AC-3 (activity endpoint returns 200 with correct shape, 401 for unauth, limit parameter)
- `/home/meden/GolandProjects/RpgTracker/apps/api/internal/skills/xp_activity_test.go` — Go tests for GetRecentActivity repository function
- `/home/meden/GolandProjects/RpgTracker/packages/ui/src/StatCard.test.tsx` — Vitest tests for AC-12 (renders label and value, applies className)
- `/home/meden/GolandProjects/RpgTracker/packages/ui/src/ActivityFeedItem.test.tsx` — Vitest tests for AC-13 (renders skill name, XP delta, optional note, relative time)
- `/home/meden/GolandProjects/RpgTracker/apps/rpg-tracker/app/(app)/dashboard/__tests__/DashboardPage.test.tsx` — Vitest tests for AC-4 (4 stat cards), AC-5 (correct values), AC-6 (featured skill with QuickLogSheet), AC-7 (activity feed renders), AC-8 (feed items navigate), AC-9 (empty state with CTA), AC-15 (query invalidation)

**Done condition:** All test files compile/parse. Tests fail because implementation does not exist yet. Running `pnpm vitest run` in `packages/ui` shows StatCard and ActivityFeedItem tests failing. Running `go test ./internal/handlers/...` shows activity_test.go tests failing.

---

### T2a: backend — Activity endpoint + repository
**Owner:** backend
**Depends on:** T1
**Files to create/modify:**
- `/home/meden/GolandProjects/RpgTracker/apps/api/internal/skills/xp_repository.go` — Add `ActivityEvent` struct (ID, SkillID, SkillName, XPDelta, LogNote, CreatedAt) and `GetRecentActivity(ctx, db, userID, limit)` function that joins xp_events with skills
- `/home/meden/GolandProjects/RpgTracker/apps/api/internal/handlers/activity.go` — New `ActivityHandler` with `HandleGetActivity` method; parses `limit` query param (default 10, max 50); returns JSON array
- `/home/meden/GolandProjects/RpgTracker/apps/api/internal/server/server.go` — Register `GET /api/v1/activity` route with ActivityHandler

**Done condition:** `go build ./...` succeeds. `go test ./internal/handlers/ -run TestActivity` passes (tests from T1). `go test ./internal/skills/ -run TestGetRecentActivity` passes.

---

### T2b: backend/frontend — API client types and function
**Owner:** backend (or frontend)
**Depends on:** T1 (can run parallel with T2a, T3a)
**Files to modify:**
- `/home/meden/GolandProjects/RpgTracker/packages/api-client/src/types.ts` — Add `ActivityEvent` interface: `{ id: string; skill_id: string; skill_name: string; xp_delta: number; log_note: string; created_at: string }`
- `/home/meden/GolandProjects/RpgTracker/packages/api-client/src/client.ts` — Add `getActivity(limit?: number): Promise<ActivityEvent[]>` function calling `GET /api/v1/activity?limit=N`
- `/home/meden/GolandProjects/RpgTracker/packages/api-client/src/index.ts` — Export `ActivityEvent` type and `getActivity` function

**Done condition:** `pnpm tsc --noEmit` in `packages/api-client` succeeds. New exports are available.

---

### T3a: frontend — StatCard + ActivityFeedItem components
**Owner:** frontend
**Depends on:** T1 (can run parallel with T2a, T2b)
**Files to create/modify:**
- `/home/meden/GolandProjects/RpgTracker/packages/ui/src/StatCard.tsx` — New component: renders label, value, optional icon; uses CSS custom properties for theme-aware styling (--color-bg-elevated, --color-accent, --font-display for rpg-game; --color-bg-surface, --color-text-primary, --font-body for rpg-clean)
- `/home/meden/GolandProjects/RpgTracker/packages/ui/src/ActivityFeedItem.tsx` — New component: renders skill name, +XP badge, optional note, relative timestamp; onClick navigates to skill
- `/home/meden/GolandProjects/RpgTracker/packages/ui/src/index.ts` — Export StatCard and ActivityFeedItem

**Done condition:** `pnpm vitest run` in `packages/ui` — StatCard.test.tsx and ActivityFeedItem.test.tsx pass (tests from T1). `pnpm tsc --noEmit` succeeds.

---

### T3b: frontend — Dashboard page rewrite
**Owner:** frontend
**Depends on:** T2a, T2b, T3a (all shared code must be ready)
**Files to modify:**
- `/home/meden/GolandProjects/RpgTracker/apps/rpg-tracker/app/(app)/dashboard/page.tsx` — Complete rewrite:
  - Stats row: 4 StatCard components (Total Skills, Active Gates, XP Today, Highest Tier)
  - Featured skill: most recently updated SkillCard with QuickLogSheet trigger
  - "Log XP" quick action button (defaults to featured skill)
  - Activity feed: 10 ActivityFeedItem entries from getActivity()
  - Empty state: CSS-based illustration, theme-appropriate heading, CTA to /skills/new
  - Loading skeleton state
  - Empty-activity-with-skills message
  - Query invalidation: on XP log success, invalidate both ['skills'] and ['activity']
  - rpg-game: Cinzel headers, gold stat values, animated section
  - rpg-clean: Inter headers, primary text values, clean layout

**Done condition:** `pnpm vitest run` in `apps/rpg-tracker` — DashboardPage.test.tsx passes (tests from T1). `pnpm tsc --noEmit` succeeds. Manual check: page renders in browser.

---

### T4: reviewer — Code gate review
**Owner:** reviewer
**Depends on:** T2a, T2b, T3a, T3b
**Files to read:** All files from T2a, T2b, T3a, T3b + test files from T1

**Done condition:** `review.md` written with GO verdict, or issues identified for fixing.

## Verification Commands

```bash
# Backend
cd /home/meden/GolandProjects/RpgTracker/apps/api && go test ./...

# UI components
cd /home/meden/GolandProjects/RpgTracker && pnpm --filter @rpgtracker/ui test

# Dashboard page tests
cd /home/meden/GolandProjects/RpgTracker && pnpm --filter rpg-tracker test

# Type check
cd /home/meden/GolandProjects/RpgTracker && pnpm tsc --noEmit
```
