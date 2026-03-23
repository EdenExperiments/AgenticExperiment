# Implementation Roadmap

> Built from `style-guide/`, `page-guides/`, and `Design_Discussion.md`.
> Each phase is independently shippable. Phases can overlap where noted.

Last updated: 2026-03-23 (Phases 0–5 + 7 complete; Phases 6, 8 remaining)

---

## Overview

| Phase | Name | Focus | Depends On | Status |
|-------|------|-------|------------|--------|
| 0 | Theme Foundation | CSS infrastructure, fonts, switcher | Nothing | ✓ Done |
| 1 | Restyle Existing Pages | Apply three themes to all current pages | Phase 0 | ✓ Done |
| 2 | Session Route | Extract timer to dedicated route, Pomodoro | Phase 1 (skill detail restyle) | ✓ Done |
| 3 | Skill Organisation | Categories, tags, favourites, search | Phase 1 | ✓ Done |
| 4 | Dashboard Evolution | Primary Skill Focus, Quick Session, Quick Log rework, hub placeholders | Phase 2 + 3 | ✓ Done |
| 5 | Identity & Profile | Avatar system, Player Card, account stats | Phase 1 ✓ | ✓ Done |
| 6 | Skill Create Overhaul | Preset/Custom split, Arbiter avatar, progression preview | Phase 1 + 3 ✓ | Remaining |
| 7 | Auth & Landing | Social auth, free trial, feature preview, landing rework | Phase 0 | ✓ Done |
| 8 | Immersion Features | Audio, browser notifications, narrative layer polish | Phase 2 ✓ | Remaining |

---

## Phase 0 — Theme Foundation ✓ COMPLETE

> **Goal:** The three-theme CSS infrastructure works. Switching themes changes the entire app's look. No page-specific restyling yet — just the system.

### Work Items

| ID | Item | Type | Area | Notes |
|----|------|------|------|-------|
| P0-1 | Create three theme CSS files | Backend of Frontend | `packages/ui/tokens/` | `minimal.css`, `retro.css`, `modern.css` replacing `rpg-game.css` / `rpg-clean.css`. Define all `--color-*`, `--font-*`, `--motion-scale`, `--radius-*`, `--shadow-*` tokens per `style-guide/shared.md`. |
| P0-2 | Load all four fonts via `next/font` | Frontend | `apps/rpg-tracker` | Inter (already loaded), Press Start 2P, Space Grotesk, Rajdhani. Map to `--font-display` and `--font-body` per theme. |
| P0-3 | Update ThemeProvider | Frontend | `packages/ui` | Support three themes instead of two. Cookie-based persistence. Default: `minimal` for new users. |
| P0-4 | Theme switcher component | Frontend | `packages/ui` | Reusable switcher (used on landing hero + account page). Visual preview of each theme. |
| P0-5 | Update `base.css` | Frontend | `packages/ui/tokens/` | Ensure spacing, breakpoints, and shared tokens are theme-independent. |
| P0-6 | Glassmorphism utilities | Frontend | Modern theme | `backdrop-filter` classes with solid fallbacks. Only used in Modern. |
| P0-7 | Background atmosphere system | Frontend | All themes | CSS-only backgrounds: scanlines for Retro (repeating-linear-gradient), gradient depth for Modern, clean white for Minimal. Applied at layout level. |

**Feature Tracker:** F-023 (Three-theme system) — change status from `deferred` to `in-progress`.

**Exit Criteria:** Switching between Minimal/Retro/Modern changes colours, fonts, backgrounds, and motion scale across the entire app. All existing pages look *different* but may not yet look *correct* per page guides.

---

## Phase 1 — Restyle Existing Pages ✓ COMPLETE

> **Goal:** Every existing page matches its page guide for all three themes. No new features — purely visual.

### Work Items

| ID | Item | Type | Page | Notes |
|----|------|------|------|-------|
| P1-1 | Dashboard restyle | Frontend | `/dashboard` | Stat cards, skill grid, activity feed per theme. Reposition activity feed as sidebar on desktop. |
| P1-2 | Skills list restyle | Frontend | `/skills` | Card grid per theme. Toolbar restyle. |
| P1-3 | Skill detail restyle | Frontend | `/skills/[id]` | Hero section, XP bar as page hero, gate section per gate-mood spec, activity history per theme. |
| P1-4 | Skill create restyle | Frontend | `/skills/new` | Step indicator with narrative labels ("Identity", "Appraisal", "The Arbiter"). Restyle inputs, preset search. |
| P1-5 | Account restyle | Frontend | `/account` | Settings grid per theme. |
| P1-6 | Auth pages restyle | Frontend | `/login`, `/register` | Visual continuity from landing. Background atmosphere. Theme-specific copy tone. |
| P1-7 | Landing page restyle | Frontend | `/` | Hero, feature sections, CTA per theme. Theme-specific section animations. |
| P1-8 | NutriLog placeholder restyle | Frontend | `/nutri` | Themed teaser (not just emoji). |
| P1-9 | Navigation restyle | Frontend | Sidebar + bottom tabs | Per-theme treatment (glass for Modern, warm borders for Retro, clean for Minimal). |
| P1-10 | Skill edit — convert to modal | Frontend | `/skills/[id]` | Replace dedicated edit page with modal overlay on skill detail. |

**Pipeline:** UI/Visual path (style guide → page brief → implement → visual review). No TDD gate.

**Exit Criteria:** Every page matches its page guide for all three themes. Reviewer confirms token usage, theme compatibility, and accessibility.

---

## Phase 2 — Session Route ✓ COMPLETE

> **Goal:** Dedicated `/skills/[id]/session` route with full-screen immersion. Pomodoro support. Browser notifications.

### Work Items

| ID | Item | Type | Area | Notes |
|----|------|------|------|-------|
| P2-1 | Session route and layout | Frontend | `/skills/[id]/session` | Full-screen, no nav. Extract existing grind overlay logic. |
| P2-2 | Timer component per theme | Frontend | Session page | Minimal: breathing countdown. Retro: pixel battle screen. Modern: holographic HUD. |
| P2-3 | Pomodoro interval support | Frontend + API | Session page | Work/break cycles, round counter. May need API changes for session history schema. |
| P2-4 | Post-session summary overlay | Frontend | Session page | XP earned, streak status, session duration. Context-aware return button. |
| P2-5 | Context-aware return navigation | Frontend | Session page | Track entry point (skill detail vs Dashboard). Return to correct page. |
| P2-6 | Browser notifications | Frontend | Session page | Notification API — permission request, fire on session complete. |
| P2-7 | Session history schema | Backend | API | If not already tracked: session start/end times, duration, type (focus/pomodoro), intervals completed. |

**Feature Tracker:** F-024 (Focus timer / pomodoro) — change status from `deferred` to `in-progress`.

**Dependencies:** Phase 1 (skill detail must be restyled so session entry button navigates to the new route).

**Exit Criteria:** User can start a session from skill detail, run a timer (simple or Pomodoro), see a post-session summary, and return to the correct page. Browser notification fires on completion. All three themes render correctly.

---

## Phase 3 — Skill Organisation ✓ COMPLETE (2026-03-23)

> **Goal:** Categories, tags, favourites, and search. Skills list scales to 100+.

### Work Items

| ID | Item | Type | Area | Status |
|----|------|------|------|--------|
| P3-1 | Category schema and API | Backend | API | **Done** — Skills have `category_id` FK to existing `skill_categories`. Backfill migration from presets. |
| P3-2 | User-defined tags schema and API | Backend | API | **Done** — `tags` + `skill_tags` tables. PUT replace-all endpoint. Max 5 per skill. Transactional upsert. |
| P3-3 | Favourite/pin field on skills | Backend | API | **Done** — `is_favourite` boolean. PATCH toggle endpoint. |
| P3-4 | Category filter UI | Frontend | `/skills` | **Done** — Select dropdown in toolbar row 2. |
| P3-5 | Tag filter UI | Frontend | `/skills` | **Done** — Select dropdown in toolbar row 2. |
| P3-6 | Favourites quick-filter | Frontend | `/skills` | **Done** — Star toggle in toolbar row 1. |
| P3-7 | Search | Frontend | `/skills` | **Done** — Client-side debounced search (200ms) in toolbar row 1. |
| P3-8 | Category/tags display on skill detail hero | Frontend | `/skills/[id]` | **Done** — Category emoji + name, tag pills with edit/save gesture. |
| P3-9 | Inline mini-form on skill cards | Frontend | `/skills` | **Deferred** — existing Quick Log bottom sheet works well enough. |
| P3-10 | Category selection in skill create | Frontend + Backend | `/skills/new` | **Done** — Category pill picker in Step 1. Preset category auto-assigned. |

**Decision Resolved:** D-038 — Kept existing 9 categories from `skill_categories` table (Physical, Mental, Creative, Professional, Social, Lifestyle, Spiritual, Financial, Academic).

**Key Design Decisions:**
- P3-D8: AND filter combination (all filters compose)
- P3-D9: Two-row toolbar (row 1: search + favourites; row 2: sort, tier, category, tag pills)
- P3-D10: Tags NOT on SkillCard — only category emoji on list cards
- P3-D11: Tag save gesture — Enter/comma commits to buffer, Save button writes to server
- P3-D12: Optimistic favourite toggle with rollback + dimming on un-favourite in filtered view
- P3-D13: Tag/category text uses `--font-body` not `--font-display`

---

## Phase 4 — Dashboard Evolution ✓ COMPLETE (2026-03-23)

> **Goal:** The Dashboard becomes the true home base with Primary Skill Focus, Quick Session, improved Quick Log, and hub placeholders.

### Work Items

| ID | Item | Type | Area | Status |
|----|------|------|------|--------|
| P4-1 | Primary Skill algorithm | Frontend | `packages/ui` | **Done** — `computeFocusSkill()` client-side: pinned → streak → favourite → recency. 9 tests. |
| P4-2 | Skill pinning API | Backend | API | **Done** — `PATCH /api/v1/account/primary-skill` toggle. `primary_skill_id` FK on users table (migration 000010). 6 tests. |
| P4-3 | Primary Skill Focus component | Frontend | `/dashboard` | **Done** — `PrimarySkillCard` with tier badge, streak, pin toggle, "Start Session" CTA. |
| P4-4 | Quick Session button | Frontend | `/dashboard` | **Done** — Link in PrimarySkillCard navigates to `/skills/[id]/session`. |
| P4-5 | Quick Log rework | Frontend | `/dashboard` | **Done** — `QuickLogPanel` (controlled/uncontrolled) replaces `QuickLogSheet` bottom sheet. Inline between stats and skill grid. SkillCard "Log XP" opens panel for that skill. |
| P4-6 | Hub stat placeholders | Frontend | `/dashboard` | **Done** — `HubPlaceholderCard` component. NutriLog + MindTrack teaser cards with "Coming Soon" badge and mock metrics. |
| P4-7 | Empty state overhaul | Frontend | `/dashboard` | **Done** — CSS shield illustration, "Begin Your Quest" heading, themed CTA. |
| P4-8 | XP chart rolling average | Frontend | `/skills/[id]` | **Done** — 3-point rolling average rendered as SVG polyline overlay on `XPBarChart`. Uses `vectorEffect="non-scaling-stroke"`. |

**Decision Resolved:** D-041 — Single pin only. `primary_skill_id` FK on users table. Favourites (F-033) serve the multi-pin role.

**Key Design Decisions:**
- P4-D1: Focus algorithm is client-side (no dedicated API endpoint) — uses existing skill list + account data
- P4-D2: Pin endpoint is a toggle (same skill ID = unpin)
- P4-D3: Algorithm priority: pinned > highest streak > favourite tie-break > most recent
- P4-D4: QuickLogPanel supports controlled mode (dashboard) and uncontrolled mode (standalone)
- P4-D5: Rolling average uses 3-point window with SVG viewBox for resolution independence

---

## Phase 5 — Identity & Profile ✓ COMPLETE (2026-03-23)

> **Goal:** Avatar system, Player Card, account stats. Users feel a sense of identity.

### Work Items

| ID | Item | Type | Area | Status |
|----|------|------|------|--------|
| P5-1 | Avatar storage | Backend | API + Infra | **Done** — Supabase Storage REST client (Go `net/http`). `POST/DELETE /api/v1/account/avatar`. Migration 000011 (`avatar_url` TEXT on users). D-042 resolved. |
| P5-2 | Theme-dependent default avatars | Frontend | `packages/ui` | **Done** — `DefaultAvatar` component. CSS/SVG: Minimal (initial circle), Retro (pixel silhouette + gold border), Modern (holographic conic-gradient ring). |
| P5-3 | Avatar upload UI | Frontend | `/account` | **Done** — `AvatarCropModal` with client-side 256x256 JPEG crop. Touch support. Error recovery with blob retention and retry. |
| P5-4 | Account stats aggregation API | Backend | API | **Done** — `GET /api/v1/account/stats`. Total XP, best streak, skill count, category distribution. COALESCE for NULL-safe aggregation. |
| P5-5 | Player Card / Operator Card component | Frontend | `/account` | **Done** — `PlayerCard` with theme-specific styling, skeleton loading, "Set up your profile" CTA, remove avatar button, name truncation. |
| P5-6 | Theme picker with visual previews | Frontend | `/account` | **Done** — `ThemePickerPreview` with accessible radiogroup, colour palette dots, responsive grid/stack layout. |

**Feature Tracker:** F-036 (Avatar system) done, F-037 (Account stats aggregation) done.

**Dependencies:** Phase 1 ✓ (account page restyled).

**Exit Criteria:** ✓ Users can upload an avatar, see their Player Card with stats, and switch themes via visual previews. Default avatars are themed.

---

## Phase 6 — Skill Create Overhaul ✓ COMPLETE

> **Goal:** Character creation experience with Preset/Custom split, Arbiter avatar, and progression previews.

### Work Items

| ID | Item | Type | Area | Status |
|----|------|------|------|--------|
| P6-1 | Path selector (Preset vs Custom) | Frontend | `/skills/new` | ✓ Done — `PathSelector` component with themed cards |
| P6-2 | Preset gallery with search & filtering | Frontend | `/skills/new` | ✓ Done — `PresetGallery` with single-click selection, already-added presets filtered out |
| P6-3 | Arbiter avatar component | Frontend | `/skills/new` | ✓ Done — `ArbiterAvatar` with three SVG variants (compass/pixel sage/hex wireframe) |
| P6-4 | Arbiter dialogue treatment | Frontend | `/skills/new` | ✓ Done — `ArbiterDialogue` with clip-path/opacity reveal animations per theme |
| P6-5 | Category picker in Identity step | Frontend | `/skills/new` | ✓ Done — category chip selector on custom path |

**Post-merge fixes (2026-03-23):**
- D-033 revised: auto-clear all gates ≤ starting level (was: strictly below highest hit boundary)
- Calibrate endpoint: strip markdown code fences from Claude response, add experience field
- Flow simplified from 3 steps to 2 steps (Identity → Starting Level)
- Preset gallery simplified from expand-then-select to single-click
- `skill_repository.go`: fixed missing `path` and `submitted_at` columns in gate auto-clear INSERT

---

## Phase 7 — Auth & Landing ✓ COMPLETE

> **Goal:** Social auth, free trial messaging, feature preview on registration, landing page suite sections.

### Work Items

| ID | Item | Type | Area | Notes |
|----|------|------|------|-------|
| P7-1 | Social auth (Supabase) | Backend + Infra | Auth | Google, GitHub, Apple providers in Supabase. |
| P7-2 | Social auth buttons UI | Frontend | `/login`, `/register` | Provider buttons per theme. |
| P7-3 | Free trial messaging | Frontend | `/register` | "14-day free trial" callout. Subscription info visible but non-aggressive. |
| P7-4 | Feature preview on registration | Frontend | `/register` | "What you'll get" section alongside form. |
| P7-5 | Landing: Suite Apps section | Frontend | `/` | LifeQuest, NutriLog, MindTrack preview cards. |
| P7-6 | Landing: Social proof section | Frontend | `/` | Mission statement expansion + beta feature highlights (temporary). |
| P7-7 | Landing: Theme switcher on hero | Frontend | `/` | Uses theme switcher component from P0-4. |
| P7-8 | Landing: Theme-specific animations | Frontend | `/` | Pixel reveals (Retro), holographic fades (Modern), clean fades (Minimal). |

**New Decision Needed:** D-039 — Free trial implementation. Is the 14-day period enforced server-side (Supabase row-level security / subscription table) or just UI messaging for now?

**Dependencies:** Phase 0 (theme switcher component). Can run in parallel with Phases 2–6 for landing work.

**Exit Criteria:** Users can register with Google/GitHub/Apple. Registration shows trial info and feature preview. Landing page has all 5 sections with theme-specific animations and working theme switcher.

---

## Phase 8 — Immersion Features

> **Goal:** Audio, advanced notifications, narrative polish. The "delight" layer.

### Work Items

| ID | Item | Type | Area | Notes |
|----|------|------|------|-------|
| P8-1 | Ambient audio system | Frontend | Session page | Audio playback with play/pause/volume/skip. Theme-appropriate tracks. |
| P8-2 | Audio asset curation | Content | — | Lo-fi (Minimal), chiptune (Retro), synthwave (Modern). Licensing required. |
| P8-3 | Narrative copy variants | Content | All pages | Retro RPG language, Modern command-centre language, Minimal professional. Per page guide copy tone sections. |
| P8-4 | Advanced notification system | Frontend | Platform | Not just session-complete — potential for streak reminders, gate unlock celebrations. |
| P8-5 | Session "grinding" visual effects | Frontend | Session page (Retro) | Pixel particle effects, XP tick-up animation. |
| P8-6 | Session holographic effects | Frontend | Session page (Modern) | Progress ring animation, ambient glow pulsing. |

**Feature Tracker:** F-031 (Narrative layer) — change status from `deferred` to `in-progress` when starting P8-3.

**Dependencies:** Phase 2 (session route exists).

**Exit Criteria:** Sessions have optional audio. All three themes have their full immersion treatment. Narrative copy is consistent per theme across all pages.

---

## Parallel Tracks

Some phases can run simultaneously:

```
Phase 0 ✓ ──→ Phase 1 ✓ ──→ Phase 2 ✓ ──→ Phase 4 ✓
                         ├──→ Phase 3 ✓ ──→ Phase 4 ✓
                         ├──→ Phase 5
                         ├──→ Phase 6 ✓ (after Phase 3 ✓)
              Phase 7 ✓ (landing/auth can start after Phase 0)
                                           Phase 8 (after Phase 2 ✓)
```

**Critical path:** Phase 0 ✓ → Phase 1 ✓ → Phase 2 ✓ + Phase 3 ✓ → Phase 4 ✓ → Phase 5 ✓ → Phase 6 ✓ — **complete.**

**Remaining:** Phase 8 (Immersion Features). All prerequisites met.

---

## New Features Summary (Feature Tracker Updates)

These new feature IDs should be added to `feature-tracker.md`:

| Proposed ID | Feature | Phase | Dependencies |
|-------------|---------|-------|-------------|
| F-023 | Three-theme system | 0 + 1 | Style guides (done) |
| F-024 | Focus timer / Pomodoro | 2 | Skill detail restyle |
| F-032 | Skill categories and tags | 3 | Schema addition |
| F-033 | Skill favourites / pinning | 3 | Schema addition |
| F-034 | Primary Skill Focus / Next Quest | 4 | F-033 + algorithm |
| F-035 | Quick Session from Dashboard | 4 | F-024 + F-034 |
| F-036 | Avatar system | 5 | Storage infra |
| F-037 | Account stats aggregation | 5 | API endpoint |
| F-038 | Skill create overhaul (Preset/Custom/Arbiter) | 6 | F-032 |
| F-039 | Social auth (Google/GitHub/Apple) | 7 | Supabase config |
| F-040 | Free trial system | 7 | Subscription model |
| F-041 | Landing page overhaul | 7 | F-023 |
| F-042 | Ambient audio for sessions | 8 | F-024, audio assets |
| F-043 | Narrative copy system | 8 | F-023 |

> Note: F-024 already exists in the tracker. F-028 (avatar) maps to F-036 above. Reconcile IDs when updating tracker.

---

## Decisions Needed (resolved per-phase, not upfront)

Decisions are made when the relevant phase begins — not before. This keeps them grounded in implementation context.

| ID | Question | Resolve At |
|----|----------|------------|
| D-038 | ~~Preset category list~~ **Resolved:** kept existing 9 categories | Phase 3 ✓ |
| D-039 | Free trial enforcement — server-side (subscription table + RLS) or UI-only for now? | Phase 7 start |
| D-040 | Session history schema — what fields? (start_time, end_time, duration, type, intervals_completed?) | Phase 2 start |
| D-041 | ~~Skill pinning~~ **Resolved:** single pin only, `primary_skill_id` FK on users table | Phase 4 ✓ |
| D-042 | Avatar storage — **Resolved: Supabase Storage** (see decision-log.md) | ✓ Resolved |
