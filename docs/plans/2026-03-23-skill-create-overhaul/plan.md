# Implementation Plan: Skill Create Overhaul (Phase 6)

**Spec:** `docs/specs/2026-03-23-skill-create-overhaul/spec.md`
**Gateway:** GO
**Type:** visual
**Date:** 2026-03-23

---

## Task Sequence

### T0: Tier Constants File (frontend)

Create `packages/ui/src/tierConstants.ts` as the single source of truth for D-014/D-016 tier data.

**What to build:**

- Export `TIERS` array: 11 tiers (Novice through Legend) with tier name, min level, max level, gate level, and D-020 colour token
- Export `GATE_LEVELS` array: [9, 19, 29, 39, 49, 59, 69, 79, 89, 99]
- Export helper `getTierForLevel(level: number): Tier`

**Files:**

- `packages/ui/src/tierConstants.ts` (new)

**Depends on:** nothing
**Blocks:** T3

---

### T1: PathSelector Component (frontend)

**What to build:**

- Two themed cards: "Choose a Preset" and "Create Custom Skill"
- Theme-aware headings and card styles (Minimal/Retro/Modern per spec)
- "Back to Skills" link via `backHref` prop
- Responsive: stacked <768px, side-by-side on desktop
- Keyboard-focusable cards, activatable via Enter/Space

**ACs covered:** ACV-1, ACV-2, ACV-3, ACV-18

**Files:**

- `packages/ui/src/PathSelector.tsx` (new)

**Depends on:** nothing
**Blocks:** T6

---

### T2: PresetGallery Component (frontend)

**What to build:**

- Searchable preset browser grouped by category
- Search input with zero-result state ("No presets match" + "Clear search")
- Empty state ("No presets available yet" + "Create Custom Skill instead" via `onSwitchToCustom`)
- Loading state: skeleton layout (3–6 placeholder cards)
- Selecting a preset expands `ProgressionPreview` inline below the card (`aria-expanded`)
- `onSelect` passes `{ id, name, description, category_id }`

**ACs covered:** ACV-4, ACV-5, ACV-17 (partial), ACV-20

**Files:**

- `packages/ui/src/PresetGallery.tsx` (new)

**Depends on:** T0 (PresetGallery renders ProgressionPreview which needs tier constants), T3
**Blocks:** T6

---

### T3: ProgressionPreview Component (frontend)

**What to build:**

- Visual timeline of 11 tiers (Novice→Legend) with 10 gate boundary levels
- Imports from `tierConstants.ts` — no inline constants
- Optional `highlightLevel` prop to emphasise the user's starting tier
- Theme-aware styling via CSS custom properties

**ACs covered:** ACV-5 (partial), ACV-15

**Files:**

- `packages/ui/src/ProgressionPreview.tsx` (new)

**Depends on:** T0
**Blocks:** T2, T6

---

### T4: ArbiterAvatar Component (frontend)

**What to build:**

- Themed avatar with 3 states: idle, thinking, speaking
- Minimal: circular icon with subtle pulse on "thinking"
- Retro: pixel-art sage silhouette, amber glow on "thinking", gold border
- Modern: holographic wireframe/geometric shape, cyan/magenta glow, scan line on "thinking"
- Animations use `calc(Nms * var(--motion-scale))` and respect `prefers-reduced-motion`
- `aria-hidden="true"` (decorative)

**ACs covered:** ACV-7, ACV-21

**Files:**

- `packages/ui/src/ArbiterAvatar.tsx` (new)

**Depends on:** nothing
**Blocks:** T6

---

### T5: ArbiterDialogue Component (frontend)

**What to build:**

- Themed text display with variant support (greeting/result/error)
- Animation: Minimal fade-in, Retro typewriter, Modern scan-line reveal
- **Accessibility:** Full text in DOM immediately; visual reveal via CSS clip-path/opacity only (not progressive DOM insertion)
- `aria-live="polite"` on container
- Animations gated by `--motion-scale` and `prefers-reduced-motion` (text appears immediately when reduced-motion active)

**ACs covered:** ACV-8, ACV-10, ACV-14, ACV-21, ACV-23

**Files:**

- `packages/ui/src/ArbiterDialogue.tsx` (new)

**Depends on:** nothing
**Blocks:** T6

---

### T6: Barrel Export Update (frontend)

**What to build:**

- Add 6 exports to `packages/ui/src/index.ts`: `tierConstants`, `PathSelector`, `PresetGallery`, `ProgressionPreview`, `ArbiterAvatar`, `ArbiterDialogue`

**Files:**

- `packages/ui/src/index.ts` (modify)

**Depends on:** T0–T5
**Blocks:** T7

---

### T7: Page Rework — `/skills/new` (frontend)

**What to build:**

- Complete rework of `apps/rpg-tracker/app/(app)/skills/new/page.tsx`
- State machine: path selector → Step 1 (Identity) → Step 2 (Appraisal) → Step 3 (The Arbiter)
- Step indicator with narrative labels, hidden on path selector screen (ACV-22)
- Path selector → resets all draft state + `calibrateMutation.reset()` on back navigation (P6-D11, arch MINOR-3)
- **Step 1 (Preset):** PresetGallery with loading/empty/search states; selecting preset fills name/description/category
- **Step 1 (Custom):** Name, description, category picker with pill buttons
- **Step 2:** Level picker (scroll-wheel/stepper, 1–50); gate info banner; ProgressionPreview on preset path with `highlightLevel`
- **Step 3 (with key):** ArbiterAvatar + greeting → "Consult" button → loading → ArbiterDialogue result → accept/keep → summary → "Create Skill"
- **Step 3 (no key):** Summary + upsell + "Create Skill"
- **Step 3 (error):** Themed error in Arbiter's voice + "Create Skill" with current level
- **Step 3 (create error):** Inline error without losing draft
- Redirect to `/skills/{id}` on success
- Arbiter suggestion pre-selected by default after calibration (ACV-24)

**ACs covered:** ACV-6, ACV-9, ACV-11, ACV-12, ACV-13, ACV-14, ACV-15, ACV-16, ACV-17, ACV-19, ACV-22, ACV-24, ACV-25

**Files:**

- `apps/rpg-tracker/app/(app)/skills/new/page.tsx` (rewrite)

**Depends on:** T6 (all components exported)
**Blocks:** T8

---

### T8: Build Verification (frontend)

Run `pnpm turbo run build` from repo root to verify no cascading build failures in `apps/nutri-log` and `apps/mental-health`.

**Depends on:** T7
**Blocks:** T9

---

### T9: Visual Review (reviewer)

Reviewer runs Visual Review mode:

- Reads plan.md, T7 page file, all component files
- Checks all 25 ACs (ACV-1 through ACV-25)
- Verifies CSS custom properties, theme awareness, responsive behaviour, ARIA attributes
- Produces `review.md` with GO/NO-GO verdict

**Depends on:** T8

---

## Parallelisation Map

```
T0 (tierConstants) ─────────────────────────────────────────┐
                                                             │
T1 (PathSelector)    ─── can start immediately ──────────────┤
T4 (ArbiterAvatar)   ─── can start immediately ──────────────┤
T5 (ArbiterDialogue) ─── can start immediately ──────────────┤
                                                             │
T0 done → T3 (ProgressionPreview)                           │
T3 done → T2 (PresetGallery) ── needs ProgressionPreview ───┤
                                                             │
All T0–T5 done → T6 (barrel exports) ───────────────────────┤
T6 done → T7 (page rework) ─────────────────────────────────┤
T7 done → T8 (build verification) ──────────────────────────┤
T8 done → T9 (visual review) ───────────────────────────────┘
```

**Recommended single-agent execution order:**
T0 → T3 → T1 → T4 → T5 → T2 → T6 → T7 → T8 → T9

**Notes:**

- T1, T4, T5 are independent and could run in parallel if using multi-agent, but since all touch `packages/ui`, a single frontend agent session avoids barrel conflicts
- T2 depends on T3 because it renders `ProgressionPreview` inline
- No backend tasks (type: visual)
- No T1 tester dispatch (type: visual — visual review gate applies, not TDD gate)

---

## Implementation Notes (from reviews)

1. **Arch MINOR-1:** `ProgressionPreview` must import from `tierConstants.ts`, not copy-paste tier data
2. **Arch MINOR-3:** Back-to-selector must call `calibrateMutation.reset()` alongside draft state reset
3. **UX accessibility:** ArbiterDialogue text is always in DOM; animation is CSS-only (clip-path/opacity)
4. **Style guide:** All components use `var(--color-*)` tokens, `var(--font-*)`, `var(--motion-scale)`. No hardcoded values.
5. **Breakpoints:** Mobile <768px per shared style guide

