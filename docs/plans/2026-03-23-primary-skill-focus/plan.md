# Implementation Plan: Primary Skill Focus + Quick Session (Phase 4)

**Spec:** `docs/specs/2026-03-23-primary-skill-focus/spec.md` (APPROVED)
**Work type:** mixed (TDD gate for logic ACs, visual reviewer gate for UI ACs)
**Features:** F-034, F-035
**Date:** 2026-03-23

---

## Task Overview

| Task | Agent | Description | Depends On | Parallel? |
|------|-------|-------------|------------|-----------|
| T1a | tester | Go handler tests (AC-L1–L5) | — | Yes (with T1b) |
| T1b | tester | TS algorithm unit tests (AC-L6) | — | Yes (with T1a) |
| T2 | backend | Migration + User struct + handler + route | T1a | Sequential |
| T3a | frontend | API client types + setPrimarySkill function | — | Yes (with T1a, T1b, T2) |
| T3b | frontend | PrimarySkillCard component | T3a | Sequential |
| T3c | frontend | Dashboard integration + algorithm | T3b | Sequential |
| T4 | reviewer | Code gate review | T2, T3c | Sequential |

---

## T1a — Failing Go Tests for Handler ACs (tester)

**ACs covered:** AC-L1, AC-L2, AC-L3, AC-L4, AC-L5
**Files:** `apps/api/internal/handlers/account_primary_skill_test.go` (new)

Write failing tests for:
- **AC-L1:** `PATCH /api/v1/account/primary-skill` with valid owned skill_id → 200, `{ "primary_skill_id": "<id>" }`
- **AC-L2:** PATCH with currently-pinned skill_id → 200, `{ "primary_skill_id": null }` (toggle unpin)
- **AC-L3:** PATCH with skill_id not owned by user → 404
- **AC-L4:** `GET /api/v1/account` response includes `primary_skill_id` field (string or null)
- **AC-L5:** After deleting a pinned skill, `primary_skill_id` is NULL (ON DELETE SET NULL — integration-level, may need DB test or verified by migration)

Test setup: use the existing test patterns from `handlers/skill_test.go` and `handlers/gate_test.go`. Mock or use test DB as per existing conventions.

**Validation:** `422` for invalid UUID format on skill_id.

---

## T1b — Failing TS Algorithm Tests (tester)

**ACs covered:** AC-L6
**Files:** `packages/ui/src/__tests__/focusAlgorithm.test.ts` (new)

Write failing unit tests for a pure `computeFocusSkill` function:

1. Pinned skill exists in list → returns it
2. Pinned skill NOT in list → falls through to algorithm
3. Highest `current_streak` wins (treat `undefined` as 0)
4. Tie-break: `is_favourite = true` preferred
5. Tie-break: most recently updated (`updated_at` DESC)
6. All zero streak → most recently updated skill
7. Empty skills array → returns `null`
8. Single skill → returns it regardless of streak/favourite

**Function signature:**
```ts
computeFocusSkill(
  skills: SkillDetail[],
  primarySkillId: string | null
): SkillDetail | null
```

---

## T2 — Backend: Migration + Struct + Handler + Route (backend)

**ACs covered:** AC-L1–L5 (make T1a tests pass)
**Files:**
- `apps/api/internal/db/migrations/000010_primary_skill.up.sql` (new)
- `apps/api/internal/db/migrations/000010_primary_skill.down.sql` (new)
- `apps/api/internal/users/service.go` (modify)
- `apps/api/internal/handlers/account.go` (modify)
- `apps/api/internal/server/server.go` (modify — add route)

### T2a — Migration
```sql
-- up
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS primary_skill_id UUID REFERENCES public.skills(id) ON DELETE SET NULL;

-- down
ALTER TABLE public.users
  DROP COLUMN IF EXISTS primary_skill_id;
```

### T2b — Extend users.User struct (arch-review required change)
In `apps/api/internal/users/service.go`:
1. Add `PrimarySkillID *uuid.UUID \`json:"primary_skill_id"\`` to `User` struct
2. Extend `GetOrCreateUser` SELECT to include `primary_skill_id`
3. Update `Scan` call to read `&u.PrimarySkillID`

### T2c — Add SetPrimarySkill service function
```go
func SetPrimarySkill(ctx context.Context, db *pgxpool.Pool, userID, skillID uuid.UUID) (*uuid.UUID, error)
```
- Check skill ownership: `SELECT id FROM public.skills WHERE id = $1 AND user_id = $2`
- If not found → return sentinel error (handler maps to 404)
- Read current `primary_skill_id` from users row
- If matches skillID → SET NULL (toggle off), return nil
- Else → SET skillID, return &skillID

### T2d — Add HandlePatchPrimarySkill handler
In `apps/api/internal/handlers/account.go`:
- Parse `skill_id` from form body
- Validate UUID format → 422 if invalid
- Call `users.SetPrimarySkill` → 404 if not owned, 200 with result

### T2e — Register route
In `apps/api/internal/server/server.go`:
- Add `r.Patch("/account/primary-skill", userHandler.HandlePatchPrimarySkill)` after line 84

---

## T3a — API Client: Types + Function (frontend)

**Files:**
- `packages/api-client/src/types.ts` (modify)
- `packages/api-client/src/client.ts` (modify)

### Types changes
1. Add `primary_skill_id: string | null` to `Account` interface
2. Change `current_streak?: number` to `current_streak: number` on `SkillDetail` (arch-review required change — breaking type change)

### Client function
Add `setPrimarySkill(skillId: string)`:
```ts
async setPrimarySkill(skillId: string): Promise<{ primary_skill_id: string | null }> {
  // PATCH /api/v1/account/primary-skill
  // Content-Type: application/x-www-form-urlencoded
  // Body: skill_id=<skillId>
}
```

### Consumer updates for current_streak
After making `current_streak` non-optional, grep for consumers that guard against `undefined` and update them. Known locations:
- Dashboard page (skills grid)
- Skills list page
- Any component accessing `skill.current_streak`

---

## T3b — PrimarySkillCard Component (frontend)

**ACs covered:** AC-V2, AC-V3, AC-V4, AC-V5, AC-V6, AC-V7, AC-V11, AC-V12
**Files:** `packages/ui/src/PrimarySkillCard.tsx` (new)

Component displays:
- Skill name (large, display font)
- Tier badge + level
- XP progress bar (compact)
- Category emoji + name (if set)
- Current streak (if > 0): "X day streak"
- **"Start Session" button** — `Link` to `/skills/[id]/session`, `min-h-[48px]`
- **Pin/unpin icon** — 44×44px tap area, `aria-label` reflecting state, disabled while mutation in-flight
- "Suggested" label when algorithmically selected (outlined pin icon)
- Filled pin icon when user-pinned

**Props:**
```ts
interface PrimarySkillCardProps {
  skill: SkillDetail
  isPinned: boolean
  onTogglePin: () => void
  isPinning: boolean  // mutation in-flight
}
```

Design tokens only (`--color-*`, `--font-*`). Responsive: full-width mobile, constrained desktop.

---

## T3c — Dashboard Integration + Algorithm (frontend)

**ACs covered:** AC-V1, AC-V8, AC-V9, AC-V10, AC-L6 (wiring)
**Files:**
- `packages/ui/src/computeFocusSkill.ts` (new — pure function)
- `apps/rpg-tracker/app/(app)/dashboard/page.tsx` (modify)

### Algorithm implementation
Extract `computeFocusSkill` as a pure function (tested by T1b):
1. Pinned → use it (if in list)
2. Highest `current_streak` (> 0)
3. Tie-break: `is_favourite`
4. Tie-break: `updated_at` DESC
5. Fallback: first by `updated_at` DESC

### Dashboard changes
1. Add `getAccount` TanStack Query (fetch `primary_skill_id`)
2. Compute focus skill via `computeFocusSkill(skills, account.primary_skill_id)`
3. Add `PrimarySkillCard` above stats row (AC-V1)
4. Add `setPrimarySkill` mutation with optimistic update
5. Hide focus card when 0 skills (AC-V8)
6. Add focus card skeleton placeholder `rounded-xl h-40` (AC-V9)
7. Retarget "Log XP" button to focus skill (AC-V10)

---

## T4 — Code Gate Review (reviewer)

**Gate:** Both TDD (logic ACs pass) and visual review (UI ACs met)

Reviewer checks:
- All Go tests pass (T1a assertions green)
- All TS tests pass (T1b assertions green)
- AC-V1–V12 verified in component output
- Design tokens used (no hardcoded colours)
- `current_streak` consumer updates complete
- Build passes (`pnpm turbo run build`)

---

## Execution Order (Parallelisation Map)

```
Phase 1 (parallel):
  T1a (Go handler tests)     ─┐
  T1b (TS algorithm tests)   ─┤── all can start immediately
  T3a (API client types)     ─┘

Phase 2 (after T1a):
  T2 (backend implementation) ── makes T1a tests pass

Phase 3 (after T3a):
  T3b (PrimarySkillCard)     ── needs types from T3a

Phase 4 (after T3b, T1b):
  T3c (dashboard + algorithm) ── needs card from T3b, implements algorithm tested by T1b

Phase 5 (after T2, T3c):
  T4 (reviewer)              ── all code complete
```
