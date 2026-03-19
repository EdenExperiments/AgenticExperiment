# Implementation Plan -- Skill Interaction Polish + Animations

**Spec:** `docs/specs/2026-03-19-skill-polish/spec.md`
**Status:** APPROVED (gateway GO)

## Task List

### T1: tester -- Write failing tests
**Owner:** tester
**Depends on:** nothing
**Files to create:**
- `/home/meden/GolandProjects/RpgTracker/packages/ui/src/useMotionPreference.test.ts` -- Tests for AC-1, AC-2
- `/home/meden/GolandProjects/RpgTracker/apps/rpg-tracker/components/__tests__/XPGainAnimation.test.tsx` -- Tests for AC-3, AC-4
- `/home/meden/GolandProjects/RpgTracker/apps/api/internal/handlers/activity_skill_filter_test.go` -- Tests for AC-14

**Done condition:** Test files parse/compile. Tests fail because implementation doesn't exist.

---

### T2a: backend -- Add skill_id filter to activity endpoint
**Owner:** backend
**Depends on:** T1
**Files to modify:**
- `/home/meden/GolandProjects/RpgTracker/apps/api/internal/handlers/activity.go` -- Parse optional `skill_id` query param, pass to store
- `/home/meden/GolandProjects/RpgTracker/apps/api/internal/skills/xp_repository.go` -- Add `skillID *uuid.UUID` param to `GetRecentActivity`, add WHERE clause when non-nil
- `/home/meden/GolandProjects/RpgTracker/packages/api-client/src/client.ts` -- Update `getActivity` to accept optional `skillId` param

**Done condition:** `go test ./internal/handlers/ -run TestActivity` passes. `getActivity('skill-uuid')` compiles.

---

### T3a: frontend -- useMotionPreference hook
**Owner:** frontend
**Depends on:** T1
**Files to create/modify:**
- `/home/meden/GolandProjects/RpgTracker/packages/ui/src/useMotionPreference.ts` -- Hook implementation
- `/home/meden/GolandProjects/RpgTracker/packages/ui/src/index.ts` -- Export hook

**Done condition:** `pnpm --filter @rpgtracker/ui test` passes useMotionPreference tests.

---

### T3b: frontend -- XPGainAnimation component
**Owner:** frontend
**Depends on:** T3a
**Files to create/modify:**
- `/home/meden/GolandProjects/RpgTracker/apps/rpg-tracker/components/XPGainAnimation.tsx` -- Framer Motion component
- `/home/meden/GolandProjects/RpgTracker/apps/rpg-tracker/app/(app)/dashboard/page.tsx` -- Integrate animation after XP log
- `/home/meden/GolandProjects/RpgTracker/apps/rpg-tracker/app/(app)/skills/[id]/page.tsx` -- Integrate animation after XP log

**Done condition:** XPGainAnimation tests pass. Dashboard and detail page show animation on XP log.

---

### T3c: frontend -- Skills list sorting/filtering
**Owner:** frontend
**Depends on:** T1
**Files to modify:**
- `/home/meden/GolandProjects/RpgTracker/apps/rpg-tracker/app/(app)/skills/page.tsx` -- Add sort/filter controls and client-side logic

**Done condition:** Skills list page has sort controls. Selecting sort re-orders cards. Tier filter works.

---

### T3d: frontend -- Richer skill detail page
**Owner:** frontend
**Depends on:** T2a, T3a
**Files to modify:**
- `/home/meden/GolandProjects/RpgTracker/apps/rpg-tracker/app/(app)/skills/[id]/page.tsx` -- Hero stats, date-grouped history, font-display styling

**Done condition:** Skill detail page shows hero stats with display font. XP history is date-grouped.

---

### T3e: frontend -- Better empty states
**Owner:** frontend
**Depends on:** T1
**Files to modify:**
- `/home/meden/GolandProjects/RpgTracker/apps/rpg-tracker/app/(app)/skills/page.tsx` -- Enhanced empty state

**Done condition:** Empty states include CSS-based illustrations.

---

### T3f: frontend -- SkillCard micro-interactions
**Owner:** frontend
**Depends on:** T3a
**Files to modify:**
- `/home/meden/GolandProjects/RpgTracker/packages/ui/src/SkillCard.tsx` -- Add data-motion-scale, hover/press CSS
- `/home/meden/GolandProjects/RpgTracker/packages/ui/src/SkillCard.test.tsx` -- Test hover class is conditional

**Done condition:** SkillCard has hover scale that only applies when motion-scale is 1.

---

### T4: reviewer -- Code gate review
**Owner:** reviewer
**Depends on:** T2a, T3a-T3f
**Done condition:** review.md with GO verdict.

## Verification Commands

```bash
# Backend
cd /home/meden/GolandProjects/RpgTracker/apps/api && go test ./...

# UI components
cd /home/meden/GolandProjects/RpgTracker && pnpm --filter @rpgtracker/ui test

# rpg-tracker app tests
cd /home/meden/GolandProjects/RpgTracker && pnpm --filter rpg-tracker test
```
