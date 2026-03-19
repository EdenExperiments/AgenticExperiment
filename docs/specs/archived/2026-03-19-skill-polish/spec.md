# Skill Interaction Polish + Animations -- Spec

**Status:** DRAFT
**Date:** 2026-03-19
**Feature:** Make core skill interactions feel alive and rewarding with animations, sorting, richer detail, better empty states, and micro-interactions.

## Summary

Five sub-features to polish the skill tracking experience:
1. XP gain animation (floating +XP indicator)
2. Skill list sorting/filtering
3. Richer skill detail page (date-grouped history, hero stats)
4. Better empty states with CSS-based illustrations
5. SkillCard micro-interactions (rpg-game hover/press)

All animation is gated by `--motion-scale` CSS custom property (1 = rpg-game full animation, 0 = rpg-clean no animation).

## Zones Touched

| Zone | Paths | Changes |
|------|-------|---------|
| Shared UI | `packages/ui/src/` | New `useMotionPreference` hook, updated SkillCard |
| Next.js UI | `apps/rpg-tracker/app/(app)/skills/` | Updated skills list page (sorting/filtering), updated skill detail page |
| Next.js UI | `apps/rpg-tracker/app/(app)/dashboard/` | XP gain animation after QuickLogSheet submit |
| Next.js UI | `apps/rpg-tracker/components/` | New `XPGainAnimation` component |
| Go API | -- | No changes needed |

## Shared Package Changes

- `packages/ui/src/useMotionPreference.ts`: New React hook that reads `--motion-scale` from computed CSS and returns `{ prefersMotion: boolean, motionScale: number }`
- `packages/ui/src/useMotionPreference.test.ts`: Tests for the hook
- `packages/ui/src/SkillCard.tsx`: Add optional Framer Motion hover/press animations gated by data attribute
- `packages/ui/src/index.ts`: Export `useMotionPreference`

## Sub-Feature 1: XP Gain Animation

**What:** When a user submits the QuickLogSheet and XP is logged successfully, show a floating `+{amount} XP` text that rises and fades above the XP bar or Log XP button.

**Implementation:**
- New `XPGainAnimation` component in `apps/rpg-tracker/components/XPGainAnimation.tsx`
- Uses Framer Motion `AnimatePresence` + `motion.div`
- rpg-game (`--motion-scale: 1`): spring animation, rises ~60px, fades over 1.2s, gold color (`--color-accent`)
- rpg-clean (`--motion-scale: 0`): no animation, component renders nothing or instant flash
- Triggered by passing `lastXPGain` state from the mutation `onSuccess` callback
- Used in dashboard page and skill detail page

## Sub-Feature 2: Skill List Sorting/Filtering

**What:** Add sort controls to the `/skills` page.

**Sort options:** By name (A-Z), by level (highest first), by tier (highest first), by recent activity (most recently updated, current default).

**Filter option:** Optional tier filter dropdown (All, Novice, Apprentice, etc.).

**Implementation:**
- Sort/filter state managed locally via `useState` in the skills list page
- Compact filter bar at top of skill list (below heading, above cards)
- Mobile: horizontal scrollable pill buttons for sort, dropdown for tier filter
- No API changes -- sorting/filtering happens client-side on the already-loaded `SkillDetail[]`

## Sub-Feature 3: Richer Skill Detail Page

**What:** Improve the `/skills/[id]` page visual hierarchy and XP history display.

**Changes:**
- Hero stat section at top: skill name in `--font-display` (Cinzel for rpg-game), tier badge + level as large prominent text
- XP history section: group `recent_logs` by date ("Today", "Yesterday", "This Week", then date headers)
- Note: the existing `recent_logs` on `SkillDetail` don't include `created_at`. For date grouping, we use the activity feed endpoint (`getActivity`) filtered by skill_id, or extend the existing data. Since `recent_logs` currently lacks timestamps, we will use a separate query to `getActivity` with the skill_id for the detail page history.

**API note:** We need a way to get activity for a specific skill. Option A: add `skill_id` query param to existing `GET /api/v1/activity?skill_id=X&limit=20`. This is a small addition to the existing endpoint.

## Sub-Feature 4: Better Empty States

**What:** More engaging empty states throughout the app.

**Where:**
- Skills list empty state (already exists, but plain)
- Skill detail "no recent logs" state

**Implementation:**
- CSS-based illustrations using borders, transforms, gradients (no external images)
- rpg-game: sword/shield motif with gold accent
- rpg-clean: clean geometric shapes with indigo accent
- Both share the same component structure, differentiated by CSS custom properties

## Sub-Feature 5: SkillCard Micro-Interactions

**What:** Subtle hover/press animation on SkillCard. rpg-game only.

**Implementation:**
- Add `data-motion-scale` attribute to SkillCard wrapper (read from `useMotionPreference` or passed as prop)
- CSS-only approach: use `:hover` and `:active` pseudo-classes with `transform: scale()` and `box-shadow` transitions
- rpg-game: scale(1.02) on hover, scale(0.98) on press, enhanced gold border glow on hover
- rpg-clean: no animation (motion-scale: 0 gates the CSS transitions via a data attribute)

## Acceptance Criteria

- **AC-1:** `useMotionPreference` hook exists in `packages/ui/src/`, exports `prefersMotion` boolean and `motionScale` number, reads from CSS `--motion-scale` custom property
- **AC-2:** `useMotionPreference` returns `{ prefersMotion: false, motionScale: 0 }` when `--motion-scale` is 0 (rpg-clean) and `{ prefersMotion: true, motionScale: 1 }` when `--motion-scale` is 1 (rpg-game)
- **AC-3:** `XPGainAnimation` component renders a floating "+N XP" text that animates upward when `xpAmount` prop is > 0, using Framer Motion
- **AC-4:** `XPGainAnimation` renders nothing when `prefersMotion` is false (rpg-clean theme)
- **AC-5:** After XP is logged on the dashboard page, the `XPGainAnimation` fires with the correct XP amount
- **AC-6:** Skills list page has sort controls with at least 4 options: name, level, tier, recent
- **AC-7:** Selecting a sort option re-orders the displayed skill cards without a network request
- **AC-8:** Skills list page has a tier filter that, when a tier is selected, shows only skills matching that tier
- **AC-9:** Skill detail page shows skill name styled with `font-family: var(--font-display)` and level/tier as prominent hero stats
- **AC-10:** Skill detail page shows XP history grouped by date sections ("Today", "Yesterday", "This Week", or date)
- **AC-11:** Skills list empty state includes a CSS-based illustration and theme-appropriate call to action
- **AC-12:** SkillCard has hover scale effect (transform: scale(1.02)) that only applies when `--motion-scale` is 1
- **AC-13:** All new and modified components have corresponding test coverage
- **AC-14:** `GET /api/v1/activity?skill_id=X` filters results to a specific skill (new query param on existing endpoint)

## Out of Scope

- XP charts/graphs
- Sound effects
- Particle effects
- PWA animations
- AI coaching
