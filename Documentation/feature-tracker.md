# Feature Tracker

Last updated: 2026-03-25 (Phase 9A complete — F-044 done, F-045/F-046/F-047 ready for Phase 9B)

Status values: `done` · `in-progress` · `ready-for-build` · `ready-for-planning` · `needs-clarification` · `deferred`

---

## Shipped Features

All Release 1 + Release 2 features through Phase 7.

### Release 1 (all done)

| ID | Feature | Key Details |
|----|---------|-------------|
| F-001 | App shell & navigation | Sidebar (desktop) + bottom tabs (mobile). Fixed sidebar positioning. 4 sections: Dashboard, LifeQuest, NutriLog placeholder, Account. |
| F-002 | Supabase auth & profile | Email/password (D-012). ES256 JWT support. Password change flow. Auth trigger is manual setup. |
| F-003 | Claude API key storage | AES-256-GCM envelope encryption (D-015). Per-user DEK. Key never in client/cookies/logs. |
| F-004 | Skill CRUD | Create, read, update, soft-delete. Preserves XP history. |
| F-005 | AI skill calibration | Optional AI path with manual fallback. Starting level max 99 (D-018). Degrades on 401/429/other with specific messages. |
| F-006 | Quick XP logging | 3-tap primary path (D-019). QuickLogSheet bottom sheet + QuickLogPanel inline. Server-side 1s dedup. |
| F-008 | XP & level progression | Quadratic curve with tier multipliers (D-014). 11 tiers (Novice→Transcendent). Tier colour system (D-020). Transition modal on every boundary (D-022). |
| F-009 | Blocker gates | Gate visibility + locked state (D-010). Gate replaces XP bar (D-021). XP accrues behind gate (D-007). First-hit notification. |

### Release 2 (shipped)

| ID | Feature | Phase | Key Details |
|----|---------|-------|-------------|
| F-023 | Three-theme system | 0+1 | Minimal/Retro/Modern. L1 tokens, L2 theme CSS, L3 component variants. Cookie persistence. 4 fonts. |
| F-024 | Focus timer / Pomodoro | 2 | `/skills/[id]/session`. 3 timer variants. Pomodoro state machine. Browser notifications. Post-session summary. Context-aware return. |
| F-032 | Categories & tags | 3 | 9 preset categories (D-038). User tags (max 5/skill). AND filters. Toolbar with sort dropdown, tier/category/tag dropdowns, responsive bottom sheet (<1024px). |
| F-033 | Favourites / pinning | 3 | `is_favourite` with PATCH toggle. Optimistic UI + rollback. Dimming on un-favourite in filtered view (P3-D12). |
| F-034 | Primary Skill Focus | 4 | `computeFocusSkill()`: pinned → streak → favourite → recency. PrimarySkillCard. Single pin (D-041). |
| F-035 | Quick Session + Dashboard | 4 | "Start Session" from dashboard. QuickLogPanel inline. HubPlaceholderCards. XPBarChart rolling average. Empty state. |
| F-036 | Avatar system | 5 | Supabase Storage upload/delete. 256x256 JPEG crop. 3 themed default avatars (CSS/SVG). D-042. |
| F-037 | Account stats | 5 | `GET /api/v1/account/stats`. PlayerCard. ThemePickerPreview. Total XP, streak, categories. |
| F-038 | Skill create overhaul | 6 | 2-step flow (Identity → Starting Level). PathSelector, PresetGallery, ArbiterAvatar + ArbiterDialogue (3 variants). LevelPicker. Gate auto-clear (D-033). |
| F-041 | Landing page overhaul | 7 | Auth pages restyled. Registration with FeaturePreview + FreeTrial callout. |

### Partially Shipped

| ID | Feature | Status | Notes |
|----|---------|--------|-------|
| F-039 | Social auth (Google/GitHub/Apple) | in-progress | UI buttons shipped. Supabase provider config not yet enabled. |

---

## Phase 9A: Clean UI Polish (done)

| ID | Feature | Area | Status | Notes |
|----|---------|------|--------|-------|
| F-044 | Clean UI cleanup | Frontend | done | Removed GrindOverlay/GrindAnimation/PostSessionScreen. XP chart day differentiation (empty days fade, active glow). Landing page copy updated. Theme switcher styled. Pomodoro bugs fixed (config apply, Keep Going reset, Simple mode, Abandon flow). Chart/history layout breakpoint raised to xl. |

## New — Phase 9B: Stylish Mode (D-043)

| ID | Feature | Area | Status | Notes |
|----|---------|------|--------|-------|
| F-045 | Clean/Stylish mode infrastructure | Frontend | ready-for-build | `data-mode="clean\|stylish"` on `<html>`. Cookie persistence. Mode switcher on account page. CSS selector pattern `[data-theme][data-mode="stylish"]`. Default: clean. Both modes WCAG AA. |
| F-046 | Per-theme Stylish treatments | Frontend | ready-for-build | Background atmosphere, dashboard/skill card/gate/history variants, density tokens, nav atmosphere. Additive CSS layers — same HTML, different visual treatment. See `style-guide/` and `page-guides/`. |
| F-047 | Cinematic landing page (Stylish) | Frontend | ready-for-build | Full section flow: Hero (theme switcher) → Key Features (per-theme animations) → Suite Apps → Social Proof → CTA. Only in Stylish mode — Clean gets basic landing from F-044. |

---

## Remaining — Phase 8: Immersion

| ID | Feature | Area | Status | Notes |
|----|---------|------|--------|-------|
| F-042 | Ambient audio for sessions | LifeQuest | deferred | Lo-fi/chiptune/synthwave per theme. Licensing required. |
| F-043 | Narrative copy system | LifeQuest | deferred | Per-theme copy variants across all pages. RPG language (Retro), command-centre (Modern), professional (Minimal). |
| F-031 | Narrative layer | LifeQuest | deferred | RPG story framing, wizard dialogue, boss battle framing. Strongest in Retro. |

---

## Deferred Features

### LifeQuest

| ID | Feature | Dependencies | Notes |
|----|---------|-------------|-------|
| F-007 | Detailed natural-language logs | Claude integration | `log_note` column exists — no schema change needed. |
| F-009b | Blocker completion UI flow | F-009 | Schema hooks exist (`is_cleared`, `cleared_at`). No code in release 1. |
| F-010 | Reward moments and titles | F-009b | Post-release polish. |
| F-011 | Meta-skills and dependencies | — | Post-MVP. Revisit after core loop is in production. |
| F-012 | AI coaching feedback | Log history + Claude | Requires meaningful log history. |
| F-025 | Skill trees | F-011 | Visual progression paths. Tree vs graph vs linear TBD. |
| F-028 | Character avatar / visual identity | Tier + theme system | Pixel art (Retro), sleek (Modern). Separate from account avatar (F-036). |
| F-029 | Mastery system (sub-skills) | F-011 | Deep-dive skill breakdown. |

### NutriLog (all deferred — schema namespace reserved with `nl_` prefix)

| ID | Feature | Notes |
|----|---------|-------|
| F-013 | Weight logging and trend chart | — |
| F-014 | Calorie and macro logging | Food data source TBD. |
| F-015 | Barcode scanning | Mobile camera flow. |
| F-016 | Saved meals and templates | QoL feature. |
| F-017 | AI recipe suggestions | Claude integration. |
| F-018 | Goal setting and weekly rate | — |

### Cross-App & Platform

| ID | Feature | Notes |
|----|---------|-------|
| F-019 | Weekly AI review | After both LifeQuest and NutriLog stable. |
| F-020 | Cross-app XP integration | Which health events award XP TBD. |
| F-021 | PWA install and push notifications | Mobile usability shipped; PWA deferred. |
| F-022 | Data export | After schema stabilises. |
| F-026 | Social features | Activity stream, party, leaderboard. D-008 defers from release 1. |
| F-027 | Intel / knowledge base | Curated resources, expert guidance, book recs. |
| F-030 | Location-aware guidance | Nearest classes/centres. Long-term vision. |
| F-040 | Free trial system | 14-day messaging shipped. Server-side enforcement TBD (D-039). Analytics schema reserves `paywall_viewed` and `upgrade_clicked`; UI hooks pending a paywall/upgrade surface. |
| F-048 | AI goal product funnel analytics | Event schema + frontend scaffold shipped for goal creation, AI plan generation/acceptance, weekly check-ins, and recovery hooks. Provider integration and paywall/upgrade UI hooks deferred until those surfaces exist. |

---

## Key Constraints (enforced in all implementations)

| Constraint | Source |
|------------|--------|
| Quick-log: 3 taps or fewer | D-019 |
| starting_level ≤ 99 server-side | D-018 |
| Tier colour system on bar, badge, accent | D-020 |
| Tier transition modal on every boundary | D-022 |
| Gate replaces XP bar, above fold | D-021 |
| XP write = xp_events + skills update in one transaction | R-003 |
| Double-submission guard: disabled button + 1s dedup | R-003 |
| EffectiveLevel computed in Go handler | R-004 |
| Claude key never in HTML/cookies/logs/DB | D-015 |
| MaxLevel = 200 | R-005 |

---

## Tech Stack

| Dependency | Purpose |
|------------|---------|
| Go + chi + pgx/v5 | API server, routing, PostgreSQL |
| golang-migrate | Schema migrations (plain SQL) |
| Supabase Auth + JWKS | JWT validation, social auth |
| Go stdlib crypto | AES-256-GCM key encryption |
| Next.js 15 + React 19 | Frontend with App Router, BFF proxy |
| TanStack Query v5 | Server state, cache invalidation |
| Tailwind CSS v4 | Design tokens via CSS custom properties |
| Vitest + RTL | Frontend testing |
| @supabase/ssr | Auth cookie handling |
