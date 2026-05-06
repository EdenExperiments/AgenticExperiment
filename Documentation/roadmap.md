# Implementation Roadmap

> Built from `style-guide/`, `page-guides/`, and `Design_Discussion.md`.
> Each phase is independently shippable.

Last updated: 2026-05-06 (wording cleanup for current shipped vs remaining phases)

---

## Overview


| Phase | Name                   | Focus                                                                                        | Status    |
| ----- | ---------------------- | -------------------------------------------------------------------------------------------- | --------- |
| 0     | Theme Foundation       | CSS tokens, fonts, switcher, glassmorphism, backgrounds                                      | ✓ Done    |
| 1     | Restyle Existing Pages | All pages themed (dashboard, skills, detail, create, account, auth, landing, nav)            | ✓ Done    |
| 2     | Session Route          | `/skills/[id]/session`, Pomodoro, browser notifications, post-session summary                | ✓ Done    |
| 3     | Skill Organisation     | Categories, tags, favourites, search, filter toolbar                                         | ✓ Done    |
| 4     | Dashboard Evolution    | Primary Skill Focus, Quick Session, Quick Log rework, hub placeholders, XP chart rolling avg | ✓ Done    |
| 5     | Identity & Profile     | Avatar system (Supabase Storage), Player Card, account stats, theme picker previews          | ✓ Done    |
| 6     | Skill Create Overhaul  | Preset/Custom split, Arbiter AI dialogue, 2-step flow, gate auto-clear                       | ✓ Done    |
| 7     | Auth & Landing         | Social auth buttons, free trial messaging, feature preview on register                       | ✓ Done    |
| 8     | Immersion Features     | Audio, narrative copy, session visual effects                                                | Remaining |
| 9A    | Clean UI Polish        | Dead code cleanup, XP chart, basic landing page                                              | ✓ Done    |
| 9B    | Stylish Mode           | D-043 mode infrastructure + full atmospheric vision per theme                                | Remaining |


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


| ID    | Decision                                                                                       |
| ----- | ---------------------------------------------------------------------------------------------- |
| D-038 | Kept existing 9 preset categories                                                              |
| D-039 | Free trial enforcement — TBD (UI messaging shipped, server-side pending)                       |
| D-040 | Session schema: start/end times, duration, type, intervals                                     |
| D-041 | Single pin only (`primary_skill_id` FK on users)                                               |
| D-042 | Avatar storage via Supabase Storage                                                            |
| D-043 | Clean/Stylish visual fidelity modes confirmed as direction; implementation tracked in Phase 9B |


---

## Phase 8 — Immersion Features

> **Goal:** Audio, advanced notifications, narrative polish. The "delight" layer.
> **Status:** Remaining. Deferred pending UI/UX review of Phases 1–7.


| ID   | Item                              | Type     | Area             | Notes                                                                                                        |
| ---- | --------------------------------- | -------- | ---------------- | ------------------------------------------------------------------------------------------------------------ |
| P8-1 | Ambient audio system              | Frontend | Session page     | Audio playback with play/pause/volume/skip. Theme-appropriate tracks.                                        |
| P8-2 | Audio asset curation              | Content  | —                | Lo-fi (Minimal), chiptune (Retro), synthwave (Modern). Licensing required.                                   |
| P8-3 | Narrative copy variants           | Content  | All pages        | Retro RPG language, Modern command-centre language, Minimal professional. Per page guide copy tone sections. |
| P8-4 | Advanced notification system      | Frontend | Platform         | Streak reminders, gate unlock celebrations — not just session-complete.                                      |
| P8-5 | Session "grinding" visual effects | Frontend | Session (Retro)  | Pixel particle effects, XP tick-up animation.                                                                |
| P8-6 | Session holographic effects       | Frontend | Session (Modern) | Progress ring animation, ambient glow pulsing.                                                               |


**Dependencies:** Phase 2 ✓ (session route exists).

**Exit Criteria:** Sessions have optional audio. All three themes have their full immersion treatment. Narrative copy is consistent per theme across all pages.

---

## Phase 9A — Clean UI Polish

> **Goal:** Finish the Clean UI to a shippable standard. Dead code cleanup, minor visual improvements, basic landing page. Clean is the default mode — functional, accessible, theme-aware but not atmospheric.
> **Status:** ✓ Done.


| ID    | Item                                 | Type     | Area                | Status | Notes                                                                                                                           |
| ----- | ------------------------------------ | -------- | ------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------- |
| P9A-1 | Remove deprecated session components | Frontend | `packages/ui`       | ✓ Done | GrindOverlay, GrindAnimation, PostSessionScreen removed. Dead state/handlers stripped from skill detail (~80 lines).            |
| P9A-2 | Audit edit route                     | Frontend | `/skills/[id]/edit` | ✓ Done | Confirmed: redirect to skill detail. Fine to keep.                                                                              |
| P9A-3 | XP chart day differentiation         | Frontend | `/skills/[id]`      | ✓ Done | Empty days show faded 2px baseline (15% opacity). Active days get stronger glow. Labels repositioned with absolute positioning. |
| P9A-4 | Landing page audit                   | Research | `apps/landing/`     | ✓ Done | Full landing page already existed. Copy updated for accuracy (9 categories, Focus Sessions card, softened preset numbers).      |
| P9A-5 | Basic functional landing page        | Frontend | Landing             | ✓ Done | Theme switcher styled with label ("Preview the in-app experience"). Copy reflects shipped features.                             |


**Additional fixes shipped during Phase 9A:**

- Pomodoro timer: fixed config not applying (stale closure), timer reset on "Keep Going", added Simple timer mode (count-up), Abandon now exits directly
- Minimal breathing animation: bypassed motion-scale (was 0.3× = 1.2s instead of intended 4s)
- Skill detail: chart/history grid breakpoint raised to `xl` (1280px) — stacks below, side-by-side above

**Exit Criteria:** ✓ All met. No dead code in exports. XP chart distinguishes active vs inactive days. Functional landing page exists.

---

## Phase 9B — Stylish Mode (D-043)

> **Goal:** Implement the Clean/Stylish visual fidelity system and build the full atmospheric vision from the Design Discussion as the Stylish layer. Users opt in — Clean remains the default.
> **Status:** Remaining. This is the big visual pass.

### Infrastructure


| ID    | Item                    | Type     | Area                  | Notes                                                                                                                                                                   |
| ----- | ----------------------- | -------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P9B-1 | Mode infrastructure     | Frontend | `packages/ui`         | `data-mode="clean|stylish"` attribute on `<html>` alongside `data-theme`. Cookie persistence. Default: `clean`. Mode switcher on account page (alongside theme picker). |
| P9B-2 | CSS selector pattern    | Frontend | `packages/ui/tokens/` | `[data-theme="retro"][data-mode="stylish"]` selectors for additive layers. Stylish builds ON TOP of Clean — never replaces it. Both modes must maintain WCAG AA.        |
| P9B-3 | Mode-aware motion scale | Frontend | `packages/ui/tokens/` | Stylish mode can increase `--motion-scale` beyond Clean defaults. Respects `prefers-reduced-motion` regardless of mode.                                                 |


### Per-Theme Stylish Treatments

Apply the full Design Discussion vision. Each item only activates when `data-mode="stylish"`.


| ID     | Item                       | Type     | Page                  | Notes                                                                                                                                                               |
| ------ | -------------------------- | -------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P9B-4  | Background atmosphere      | Frontend | Layout                | Retro: scanlines + grids (repeating-linear-gradient). Modern: gradients + glow zones + depth layers. Minimal: subtle whitespace depth.                              |
| P9B-5  | Dashboard treatments       | Frontend | `/dashboard`          | Retro: quest log / save-state feel, narrative language. Modern: command centre HUD, stats as readouts. Minimal: data-forward, extra whitespace, compact stat cards. |
| P9B-6  | Skill cards variants       | Frontend | `/skills`             | Retro: pixel-art borders, chunky tactile. Modern: animated cards, glow indicators, hover reveals. Minimal: list-heavy compact rows, high density.                   |
| P9B-7  | Gate section mood          | Frontend | `/skills/[id]`        | Retro: "A barrier blocks your path..." dramatic borders, boss-fight energy. Modern: "clearance required" security-scan aesthetic. Minimal: clean motivating card.   |
| P9B-8  | Activity history variants  | Frontend | `/skills/[id]`        | Retro: pixel icons + narrative ("You trained for 45 min"). Modern: vertical timeline with nodes + timestamps. Minimal: simple clean list (may be same as Clean).    |
| P9B-9  | Empty state per-theme copy | Frontend | All pages             | Theme-specific dramatic empty state messages and illustrations.                                                                                                     |
| P9B-10 | Per-theme density tokens   | Frontend | `packages/ui/tokens/` | Minimal: tight spacing, data-dense. Retro: generous padding, chunky elements. Modern: balanced/immersive. Only in Stylish — Clean keeps uniform spacing.            |
| P9B-11 | Navigation atmosphere      | Frontend | Sidebar + tabs        | Retro: warm borders, textured panel. Modern: glassmorphic sidebar, glow edges. Minimal: ultra-clean, borderless.                                                    |


### Cinematic Landing Page

Only activates in Stylish mode. Clean mode gets the basic landing from P9A-5.


| ID     | Item                              | Type     | Area    | Notes                                                                                                       |
| ------ | --------------------------------- | -------- | ------- | ----------------------------------------------------------------------------------------------------------- |
| P9B-12 | Full landing section flow         | Frontend | Landing | Hero (theme switcher) → Key Features → Suite Apps → Social Proof → CTA. "Call to Adventure" cinematic feel. |
| P9B-13 | Theme-specific landing animations | Frontend | Landing | Pixel-art reveals (Retro), holographic fades (Modern), clean fades (Minimal).                               |


**Pipeline:** UI/Visual path (style guide → page brief → implement → visual review). No TDD gate.

**Key Principle:** Stylish is **additive** — it layers atmosphere on top of Clean via CSS selectors. No structural changes, no different components. Same HTML, different visual treatment. Mobile layouts largely converge between modes (atmospheric differences are most impactful on desktop).

**Exit Criteria:** Mode switcher works. Each theme has distinct Stylish treatments per the style guides. Landing page has cinematic version in Stylish. Both modes pass WCAG AA. Users default to Clean.

---

## Phase Dependency Graph

```
Phase 0–7 ✓ (all complete)
    ├──→ Phase 9A ✓ (Clean UI Polish — done)
    ├──→ Phase 8: Immersion (audio, narrative, session effects) — deferred
    └──→ Phase 9B: Stylish Mode (D-043 infrastructure + atmospheric treatments) — next

Phase 8 and 9B are independent — can run in either order.
```

**Recommended next:** 9B (Stylish Mode — the big visual pass) → 8 (immersion/audio on top).