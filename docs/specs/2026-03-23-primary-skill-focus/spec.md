# Spec: Primary Skill Focus + Quick Session (Phase 4)

**Status:** APPROVED
**Features:** F-034 (Primary Skill Focus / Next Quest), F-035 (Quick Session from Dashboard)
**Work type:** mixed (logic: pin API + algorithm; visual: focus card + session button)
**Date:** 2026-03-23

---

## Summary

Add a "Primary Skill Focus" card to the top of the dashboard — centre stage, above stats. The user can pin a single skill as their focus; if no skill is pinned, the system algorithmically selects one. The focus card includes a "Start Session" button that navigates directly to `/skills/[id]/session`, giving the user a one-tap path from dashboard to focused practice.

**Resolves D-041:** Single pin only. Multi-pin is covered by the existing favourites system (F-033).

---

## Motivation

The dashboard currently shows skills as an equal grid. There's no visual hierarchy that answers "what should I work on next?" Adding a primary focus card creates a clear call-to-action, reinforces intentional practice, and reduces friction to start a session.

---

## Decisions

| ID | Decision | Rationale |
|----|----------|-----------|
| P4-D1 | Single pin per user — one primary skill at a time | Centre-stage card demands a single answer. Multi-pin is already covered by favourites (F-033). |
| P4-D2 | Pin stored as `primary_skill_id` on the `users` table (nullable FK to `skills`) | User-level setting, not skill-level flag. Avoids needing to enforce single-pin constraint across skills rows. Nullable = no pin = use algorithm. |
| P4-D3 | Algorithmic fallback: (1) skill with longest current daily streak, (2) tie-break by most recent favourite, (3) tie-break by most recently active skill | Uses existing data (streaks, favourites, activity). No new infra needed. Algorithm is a pure function computed client-side from existing data. |
| P4-D4 | Quick Session button only on focus card — no floating button elsewhere | Keeps the dashboard clean. Session access is tied to the focus skill, reinforcing intentional practice. |
| P4-D5 | Pin/unpin via PATCH toggle with skill_id in form body | Toggle semantics like favourite, but skill_id is in the body (not URL path) because this is a user-level setting at `/api/v1/account/primary-skill`, not a per-skill action. |
| P4-D6 | `primary_skill_id` returned via `GET /api/v1/account` (existing Account endpoint) — NOT via a `listSkills` envelope | Avoids breaking the existing `listSkills` flat array contract and its 4+ consumers. The Account type already exists; adding one nullable field is minimal blast radius. |

---

## Schema Changes

### Migration 000010_primary_skill.up.sql

```sql
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS primary_skill_id UUID REFERENCES public.skills(id) ON DELETE SET NULL;
```

### Migration 000010_primary_skill.down.sql

```sql
ALTER TABLE public.users
  DROP COLUMN IF EXISTS primary_skill_id;
```

**Notes:**
- `ON DELETE SET NULL` ensures deleting a skill doesn't break the user row — it falls back to algorithm.
- No index needed — this is always queried by user_id (PK lookup).
- Migration number 000010: confirmed 000010 is not reserved by any in-flight feature.

---

## API Changes

### New: PATCH /api/v1/account/primary-skill

**Content-Type:** `application/x-www-form-urlencoded` (matches existing PATCH patterns e.g. favourite toggle)

**Request body (form):**
- `skill_id` (string, required) — UUID of the skill to pin

**Behaviour:**
- If `skill_id` matches the current `primary_skill_id`, **unpin** (set to NULL) — toggle pattern
- If `skill_id` is a valid skill owned by the user, **pin** it (set `primary_skill_id = skill_id`)
- If `skill_id` is not owned by the user or doesn't exist, return 404

**Response (200):**
```json
{
  "primary_skill_id": "uuid-or-null"
}
```

**Error responses:**
- 401: unauthorized
- 404: skill not found or not owned
- 422: invalid skill_id format

**Stale-state note:** The toggle relies on the client having the current `primary_skill_id`. A stale read (e.g. across browser tabs) could cause an unintended pin instead of unpin. This is an accepted known limitation for Phase 4 — the same pattern exists for favourite toggle.

### Modified: GET /api/v1/account

Add `primary_skill_id` to the existing `Account` response:

```json
{
  "id": "...",
  "email": "...",
  "display_name": "...",
  "timezone": "...",
  "primary_skill_id": "uuid-or-null"
}
```

**No changes to `GET /api/v1/skills`** — the flat `SkillDetail[]` array is preserved. The dashboard fetches `primary_skill_id` from the Account endpoint instead.

### Explicit unpin: out of scope

Sending `PATCH` with an empty/missing `skill_id` is a 422. The only way to unpin is by toggling (sending the currently-pinned ID again). A future "clear pin" action could be added but is not needed for Phase 4 — the toggle pattern matches favourites.

### Algorithmic focus (client-side)

The focus skill computation happens client-side in the dashboard (we already have all the data: skills list with `current_streak`, `is_favourite`, `updated_at`).

Algorithm:
1. If `primary_skill_id` is set and that skill exists in the loaded skills list → use it
2. If `primary_skill_id` is set but the skill is NOT in the list (e.g. soft-deleted, future pagination) → treat as no pin, fall through to step 3
3. Skill with the highest `current_streak` value (> 0). Treat `undefined`/absent as 0.
4. Tie-break: prefer favourited skills (`is_favourite = true`)
5. Tie-break: most recently updated (`updated_at DESC`)
6. Final fallback: first skill by `updated_at DESC` (covers zero-streak-for-all case)

**Note on `current_streak`:** The DB column is `INT NOT NULL DEFAULT 0` (migration 000007). The `SkillDetail` TypeScript type marks it as `current_streak?: number` (optional). The algorithm must treat `undefined` as `0`. The type inaccuracy should be fixed as part of this work (make it non-optional with default 0).

---

## Frontend Changes

### Zones touched

| Zone | Files | Changes |
|------|-------|---------|
| `packages/api-client/src/` | `client.ts`, `types.ts` | New `setPrimarySkill()` function; add `primary_skill_id` to `Account` type |
| `packages/ui/src/` | New `PrimarySkillCard.tsx` | Focus card component |
| `apps/rpg-tracker/app/(app)/dashboard/` | `page.tsx` | Add focus card above stats, wire pin/unpin, add `getAccount` query, compute algorithmic fallback, update loading skeleton |

### Consumers of `listSkills` — NO CHANGES NEEDED

Since `primary_skill_id` comes from the Account endpoint, these files are unaffected:

| File | Uses `listSkills` | Impact |
|------|-------------------|--------|
| `apps/rpg-tracker/app/(app)/skills/page.tsx` | Yes | None — no envelope change |
| `apps/rpg-tracker/app/(app)/dashboard/page.tsx` | Yes | None — primary_skill_id comes from `getAccount()` instead |
| `apps/rpg-tracker/app/__tests__/skills-list.test.tsx` | Yes (mocked) | None |
| `apps/rpg-tracker/app/__tests__/dashboard.test.tsx` | Yes (mocked) | Must add `getAccount` mock for new query |
| `packages/api-client/src/client.ts` | Definition | None — return type unchanged |

### PrimarySkillCard component

A prominent card displayed at the top of the dashboard (above stats row). Contains:

- Skill name (large, display font)
- Tier badge + level
- XP progress bar (compact)
- Category emoji + name (if set)
- Current streak (if > 0): "X day streak"
- **"Start Session" button** — a `Link` component (`next/link`) pointing to `/skills/[id]/session`. Minimum height `min-h-[48px]` matching existing CTA buttons. **Dependency:** The `/skills/[id]/session` route already exists (shipped in F-024).
- **Pin/unpin action** — icon button with minimum tap area 44×44px (`min-h-[44px] min-w-[44px]`). Must include `aria-label` that reflects current state: "Pin [skill name] as focus" when unpinned, "Unpin [skill name]" when pinned. Button is disabled while the pin mutation is in-flight to prevent competing PATCH requests.
- Visual indicator of whether the skill is pinned (pin icon filled) or algorithmically suggested (pin icon outlined + "Suggested" label). Theme-flavoured labels (e.g. "Main Quest" / "Active Mission") are deferred to the visual theming pass — Phase 4 uses a neutral "Suggested" label.

### Dashboard layout change

Current order: Header → Stats → Skills Grid → Activity Feed

New order: Header → **Focus Card** → Stats → Skills Grid → Activity Feed

The "Log XP" button currently targets `featuredSkill` (first skill). After this change, it should target the focus skill instead.

Loading skeleton: add a focus card placeholder (rounded-xl, h-40) as the first skeleton element.

---

## Acceptance Criteria

### Logic ACs (TDD gate)

- **AC-L1:** `PATCH /api/v1/account/primary-skill` with a valid owned skill_id sets `primary_skill_id` on the user row and returns `{ "primary_skill_id": "<id>" }` with status 200
- **AC-L2:** `PATCH /api/v1/account/primary-skill` with the currently-pinned skill_id unsets it (toggle) and returns `{ "primary_skill_id": null }` with status 200
- **AC-L3:** `PATCH /api/v1/account/primary-skill` with a skill_id not owned by the user returns 404
- **AC-L4:** `GET /api/v1/account` includes `primary_skill_id` field (string or null)
- **AC-L5:** Deleting a pinned skill sets `primary_skill_id` to NULL (ON DELETE SET NULL)
- **AC-L6:** The algorithmic fallback selects the skill with the highest current_streak (treating undefined/0 as zero), tie-breaking by is_favourite then updated_at DESC. When all skills have zero streak, falls back to the most recently updated skill.

### Visual ACs (reviewer gate)

- **AC-V1:** Focus card is the first content element below the dashboard header, above stats
- **AC-V2:** Focus card displays: skill name, tier badge, level, XP bar, category, streak count
- **AC-V3:** "Start Session" button on focus card is a `Link` to `/skills/[id]/session` with `min-h-[48px]`
- **AC-V4:** Pin/unpin icon toggles between filled (pinned) and outlined (suggested) states with minimum 44×44px tap area
- **AC-V5:** When no skill is pinned, focus card shows "Suggested" label and outlined pin icon
- **AC-V6:** Focus card uses design tokens (`--color-*`, `--font-*`) — no hardcoded values
- **AC-V7:** Focus card is responsive — full-width on mobile, constrained width on desktop
- **AC-V8:** Empty state (0 skills) does not show the focus card
- **AC-V9:** Loading skeleton includes a focus card placeholder above the stats skeleton
- **AC-V10:** "Log XP" button targets the focus skill (not `skills[0]`)
- **AC-V11:** Pin button has `aria-label` reflecting current state ("Pin [name] as focus" / "Unpin [name]")
- **AC-V12:** Pin button is disabled while pin mutation is in-flight

---

## Out of Scope

- Multi-pin / priority ordering (covered by favourites)
- Algorithmic suggestions based on goals (no goals system yet)
- Focus card in other views (skills list, skill detail)
- Time-based suggestions ("you haven't practised X in 3 days")
- Hub stat placeholder cards (future phase)
- Explicit unpin endpoint (toggle-off covers this)
- Theme-flavoured labels ("Main Quest" / "Active Mission") — deferred to visual theming pass
