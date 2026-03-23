# Implementation Roadmap

> Built from `style-guide/`, `page-guides/`, and `Design_Discussion.md`.
> Each phase is independently shippable.

Last updated: 2026-03-23 (audit pass — condensed completed phases, added Phase 9)

---

## Overview

| Phase | Name | Focus | Status |
|-------|------|-------|--------|
| 0 | Theme Foundation | CSS tokens, fonts, switcher, glassmorphism, backgrounds | ✓ Done |
| 1 | Restyle Existing Pages | All pages themed (dashboard, skills, detail, create, account, auth, landing, nav) | ✓ Done |
| 2 | Session Route | `/skills/[id]/session`, Pomodoro, browser notifications, post-session summary | ✓ Done |
| 3 | Skill Organisation | Categories, tags, favourites, search, filter toolbar | ✓ Done |
| 4 | Dashboard Evolution | Primary Skill Focus, Quick Session, Quick Log rework, hub placeholders, XP chart rolling avg | ✓ Done |
| 5 | Identity & Profile | Avatar system (Supabase Storage), Player Card, account stats, theme picker previews | ✓ Done |
| 6 | Skill Create Overhaul | Preset/Custom split, Arbiter AI dialogue, 2-step flow, gate auto-clear | ✓ Done |
| 7 | Auth & Landing | Social auth buttons, free trial messaging, feature preview on register | ✓ Done |
| 8 | Immersion Features | Audio, narrative copy, session visual effects | Remaining |
| 9 | Theme Fidelity & Polish | Per-theme visual treatments, landing page, density, dead code cleanup | Remaining |

---

## Completed Phases (0–7) — Summary

All functionality shipped. See git history and feature-tracker.md for details.

### Phase 0–1: Theme System & Page Restyling
Three-theme CSS infrastructure (Minimal/Retro/Modern) with L1 tokens, L2 theme-scoped CSS, L3 component variants. ThemeProvider with cookie persistence. All four fonts loaded (Inter, Press Start 2P, Space Grotesk, Rajdhani). Every existing page restyled. Skill edit converted to modal overlay.

### Phase 2: Session Route
Dedicated `/skills/[id]/session` with full-screen immersion. Three timer variants (Minimal breathing, Retro pixel battle, Modern HUD). Pomodoro state machine with work/break cycles. Browser Notification API. Post-session summary with reflections. Context-aware return navigation (skill detail vs dashboard). Schema extended with 4 Pomodoro columns.

### Phase 3: Skill Organisation
Backend: `category_id` FK on skills, `tags` + `skill_tags` tables (max 5 per skill), `is_favourite` boolean with PATCH toggle. Frontend: two-row toolbar (search + favourites; sort + tier/category/tag dropdowns), responsive filter bottom sheet for mobile/tablet (<1024px), optimistic favourite toggle with rollback + dimming (P3-D12), debounced search (200ms). D-038 resolved: kept existing 9 categories.

### Phase 4: Dashboard Evolution
`computeFocusSkill()` algorithm (pinned → streak → favourite → recency). `PrimarySkillCard` with pin toggle and "Start Session" CTA. `PATCH /api/v1/account/primary-skill` toggle endpoint (D-041: single pin). `QuickLogPanel` (controlled/uncontrolled) replaces bottom sheet. `HubPlaceholderCard` for NutriLog/MindTrack. XPBarChart 3-point rolling average as SVG polyline. Empty state with CSS shield illustration.

### Phase 5: Identity & Profile
Supabase Storage REST client (Go). Avatar upload/delete API. `AvatarCropModal` with 256x256 JPEG crop + touch support + error recovery. `DefaultAvatar` with 3 themed variants. `PlayerCard` with stats. `GET /api/v1/account/stats` endpoint (Total XP, best streak, skill count, category distribution). `ThemePickerPreview` with visual palette dots.

### Phase 6: Skill Create Overhaul
`PathSelector` (Preset/Custom). `PresetGallery` with search + already-added filtering. 2-step flow: Identity → Starting Level. `ArbiterAvatar` (3 SVG variants) + `ArbiterDialogue` with per-theme text and clip-path animations. `LevelPicker` with ±1/±10 stepper. Gate auto-clear for all gates ≤ starting level (D-033 revised). Experience input for calibration context.

### Phase 7: Auth & Landing
Social auth buttons (Google/GitHub/Apple) — UI shipped, Supabase provider config pending. `FreeTrial` callout on register. `FeaturePreview` column alongside registration form. Auth pages with themed copy. Landing page reworked.

### Key Decisions Resolved (Phases 0–7)
| ID | Decision |
|----|----------|
| D-038 | Kept existing 9 preset categories |
| D-039 | Free trial enforcement — TBD (UI messaging shipped, server-side pending) |
| D-040 | Session schema: start/end times, duration, type, intervals |
| D-041 | Single pin only (`primary_skill_id` FK on users) |
| D-042 | Avatar storage via Supabase Storage |
| D-043 | Clean/Stylish visual fidelity modes (designed, not yet implemented) |

---

## Phase 8 — Immersion Features

> **Goal:** Audio, advanced notifications, narrative polish. The "delight" layer.
> **Status:** Remaining. Deferred pending UI/UX review of Phases 1–7.

| ID | Item | Type | Area | Notes |
|----|------|------|------|-------|
| P8-1 | Ambient audio system | Frontend | Session page | Audio playback with play/pause/volume/skip. Theme-appropriate tracks. |
| P8-2 | Audio asset curation | Content | — | Lo-fi (Minimal), chiptune (Retro), synthwave (Modern). Licensing required. |
| P8-3 | Narrative copy variants | Content | All pages | Retro RPG language, Modern command-centre language, Minimal professional. Per page guide copy tone sections. |
| P8-4 | Advanced notification system | Frontend | Platform | Streak reminders, gate unlock celebrations — not just session-complete. |
| P8-5 | Session "grinding" visual effects | Frontend | Session (Retro) | Pixel particle effects, XP tick-up animation. |
| P8-6 | Session holographic effects | Frontend | Session (Modern) | Progress ring animation, ambient glow pulsing. |

**Dependencies:** Phase 2 ✓ (session route exists).

**Exit Criteria:** Sessions have optional audio. All three themes have their full immersion treatment. Narrative copy is consistent per theme across all pages.

---

## Phase 9 — Theme Fidelity & Polish

> **Goal:** Close the gap between "structurally correct" and "visually matches the Design Discussion." Per-theme treatments, density, landing page, and dead code cleanup.
> **Status:** Remaining. No blocking dependencies — all prerequisites met.

### 9A: Per-Theme Visual Treatments

Apply the style guides (`Documentation/style-guide/`) and page guides (`Documentation/page-guides/`) to each page. Currently all pages share the same layout/spacing/visual treatment regardless of theme.

| ID | Item | Type | Page | Notes |
|----|------|------|------|-------|
| P9-1 | Gate section per-theme mood | Frontend | `/skills/[id]` | Retro: "A barrier blocks your path..." dramatic borders. Modern: "clearance required" security-scan aesthetic. Minimal: clean motivating card. |
| P9-2 | Activity history per-theme treatment | Frontend | `/skills/[id]` | Retro: pixel icons + narrative ("You trained for 45 min"). Modern: vertical timeline with nodes + timestamps. Minimal: simple chronological list. |
| P9-3 | Skill cards per-theme variants | Frontend | `/skills` | Retro: pixel-art borders, chunky tactile. Modern: animated cards, glow indicators, hover reveals. Minimal: list-heavy, compact rows, high density. |
| P9-4 | Dashboard per-theme treatment | Frontend | `/dashboard` | Retro: quest log / save-state feel, narrative language. Modern: command centre HUD, stats as readouts. Minimal: data-forward, whitespace, compact. |
| P9-5 | Background atmosphere | Frontend | Layout | Retro: scanlines + grids (repeating-linear-gradient). Modern: gradients + glow zones + depth layers. Minimal: stark whitespace. Currently only token-based colours, no texture. |
| P9-6 | Empty state per-theme copy | Frontend | All pages | Theme-specific empty state messages and illustrations. Currently generic copy everywhere. |
| P9-7 | Per-theme density tokens | Frontend | `packages/ui/tokens/` | Minimal: tight spacing, data-dense. Retro: generous padding, chunky. Modern: balanced/immersive. Currently all themes share identical spacing. |

### 9B: Landing Page — Full Experience

The Design Discussion calls for a cinematic "Call to Adventure" landing page:
> Hero (with theme switcher) → Key Features → Suite Apps → Social Proof → CTA

| ID | Item | Type | Area | Notes |
|----|------|------|------|-------|
| P9-8 | Landing page audit | Research | `apps/landing/` | Confirm current state of the separate landing app. Currently `/` in rpg-tracker redirects to `/login` or `/dashboard`. |
| P9-9 | Full landing section flow | Frontend | Landing | Hero with theme switcher, key features with per-theme animations, suite app previews, social proof / mission statement, CTA. |
| P9-10 | Theme-specific landing animations | Frontend | Landing | Pixel-art reveals (Retro), holographic fades (Modern), clean fades (Minimal). |

### 9C: Cleanup

| ID | Item | Type | Area | Notes |
|----|------|------|------|-------|
| P9-11 | Remove deprecated components | Frontend | `packages/ui` | GrindOverlay, GrindAnimation, PostSessionScreen — replaced by SessionPage. Still exported from index.ts. |
| P9-12 | Audit `/skills/[id]/edit` route | Frontend | `/skills/[id]/edit` | Design Discussion says edit should be modal only. Route file exists — confirm it's dead code or still used. |
| P9-13 | XP chart day differentiation | Frontend | `/skills/[id]` | Design says "empty days fade; active days glow." Currently no visual distinction between zero and non-zero days. |

**Pipeline:** UI/Visual path (style guide → page brief → implement → visual review). No TDD gate.

**Exit Criteria:** Each page looks distinctly different across all three themes per the style guides and page guides. Landing page has full section flow. No dead code in UI exports.

---

## Phase Dependency Graph

```
Phase 0–7 ✓ (all complete)
    ├──→ Phase 8: Immersion (audio, narrative, session effects)
    └──→ Phase 9: Theme Fidelity (visual treatments, landing, cleanup)

Phase 8 and 9 are independent — can run in parallel.
```

**Recommended order:** Phase 9 first (visual polish makes the app feel finished), then Phase 8 (immersion is the delight layer on top).
