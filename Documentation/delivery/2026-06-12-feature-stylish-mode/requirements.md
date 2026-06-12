# Requirements: Phase 9B — Stylish Mode (F-045, F-046, F-047)

**Delivery folder:** `Documentation/delivery/2026-06-12-feature-stylish-mode/`  
**Features:** F-045 (infrastructure), F-046 (per-theme treatments), F-047 (cinematic landing)  
**Binding decisions:** D-043 (Clean/Stylish fidelity model), D-036 (TDD for logic, visual review for UI), D-035 (three-layer theme architecture)

---

## Goal

Ship a **visual fidelity dimension** alongside the existing three themes (Minimal, Retro, Modern): **Clean** (default, current behaviour) and **Stylish** (opt-in immersive treatments). Users persist their choice via cookie, switch mode from the account page, and see additive CSS atmosphere in Stylish mode. The landing app gains a cinematic section flow in Stylish mode only; Clean keeps the basic landing baseline from F-044.

## Non-goals

- NutriLog (`apps/nutri-log/`) and MindTrack (`apps/mental-health/`) mode switchers or Stylish treatments in this phase.
- API or database persistence of mode preference (cookie-only, mirroring theme).
- Rewriting existing Clean-mode visuals — Clean is the current implementation; Stylish is additive.
- Faux-TDD assertions on CSS class names or pixel values (D-036).
- Changing theme identity definitions in `Documentation/style-guide/` — Stylish layers extend them.

---

## Confirmed requirements

### F-045 — Clean/Stylish infrastructure

| ID | Requirement |
|----|-------------|
| R-045-1 | `<html>` carries `data-mode="clean"` or `data-mode="stylish"` alongside existing `data-theme`. |
| R-045-2 | Default mode for new visitors and missing cookie: **`clean`**. |
| R-045-3 | Mode persisted in a client-readable cookie (`rpgt-mode`, 1-year, `SameSite=Lax`, path `/`) — parallel to `rpgt-theme`. |
| R-045-4 | SSR applies mode from cookie in `apps/rpg-tracker/app/layout.tsx` and `apps/landing/app/layout.tsx` before hydration (no flash of wrong mode). |
| R-045-5 | Client-side `setMode()` / provider syncs `data-mode` on `<html>` and cookie (mirror `setTheme()` pattern in `packages/ui/src/ThemeProvider.tsx`). |
| R-045-6 | Auth middleware sets default `rpgt-mode=clean` when absent (mirror theme cookie bootstrap in `packages/auth/src/middleware.ts`). |
| R-045-7 | Account page (`/account`) exposes a **mode switcher** (Clean vs Stylish) with clear labels; placed near the existing theme picker. |
| R-045-8 | CSS selector pattern for Stylish layers: `[data-theme="<theme>"][data-mode="stylish"]` — additive only; no HTML duplication per mode. |
| R-045-9 | `useMotionPreference` re-reads when `data-mode` changes (in addition to `data-theme`). |
| R-045-10 | Both modes meet **WCAG AA** (4.5:1 body text, 3:1 large text, visible focus states, `prefers-reduced-motion` respected). |

### F-046 — Per-theme Stylish treatments

| ID | Requirement |
|----|-------------|
| R-046-1 | Stylish treatments are **additive CSS layers** in `packages/ui/tokens/` — same HTML/components, different visual treatment when `data-mode="stylish"`. |
| R-046-2 | Per theme, Stylish adds: background atmosphere, dashboard variants, skill card variants, gate section variants, activity history variants, density tokens, nav/sidebar atmosphere. |
| R-046-3 | Implementations follow `Documentation/style-guide/{minimal,retro,modern}.md` and relevant `Documentation/page-guides/` (dashboard, skill-detail, account). |
| R-046-4 | Mobile layouts largely converge with Clean; desktop is where Stylish distinction is most visible (D-043). |
| R-046-5 | Layer 1 tokens first (`--motion-scale`, density vars); Layer 2 theme-scoped CSS for atmosphere; Layer 3 only if a page guide requires structural change (unlikely for F-046). |
| R-046-6 | Clean mode appearance unchanged from pre-F-046 baseline. |

### F-047 — Cinematic landing (Stylish only)

| ID | Requirement |
|----|-------------|
| R-047-1 | In **`apps/landing/`**, when `data-mode="stylish"`, render the full cinematic section flow per `Documentation/page-guides/landing.md`: Hero (with theme switcher) → Key Features (per-theme animations) → Suite Apps → Social Proof → CTA. |
| R-047-2 | When `data-mode="clean"`, landing shows the **basic** landing baseline (F-044 polish level) — functional sections without cinematic atmosphere enhancements. |
| R-047-3 | Theme switcher remains in Hero; mode does not remove theme choice. |
| R-047-4 | Section animations are theme-specific in Stylish mode (Minimal fades, Retro pixel reveals, Modern holographic). |
| R-047-5 | Landing mode cookie is shared with the main app (`rpgt-mode`) so preference carries across `apps/landing` and `apps/rpg-tracker`. |

---

## Assumptions

| ID | Assumption |
|----|------------|
| A-1 | Cookie name `rpgt-mode` with values `clean` \| `stylish` (mirrors `rpgt-theme`). |
| A-2 | F-044 Clean UI cleanup is sufficiently shipped to serve as the Clean landing baseline. |
| A-3 | Mode switcher UI is a compact two-option control (not a third dimension on theme previews). |
| A-4 | Stylish `--motion-scale` may increase relative to Clean within each theme but must still honour `prefers-reduced-motion: reduce`. |
| A-5 | Scope is `packages/ui/`, `apps/rpg-tracker/`, `apps/landing/`, `packages/auth/` (middleware only) — not sibling frontends. |

---

## Open questions (sign-off)

| ID | Question | Default if unanswered |
|----|----------|----------------------|
| Q-1 | Should Stylish mode copy describe accessibility trade-offs on the account switcher (e.g. "more motion and decoration")? | Yes — brief helper text under switcher. |
| Q-2 | For landing Clean mode, hide atmosphere DOM (orbs, grid) entirely or keep DOM with CSS disabled? | Keep DOM; gate atmosphere via `[data-mode="stylish"]` selectors only. |
| Q-3 | Export `ModeProvider` / `setMode` from `@rpgtracker/ui` public API? | Yes — same surface as theme helpers. |

---

## Acceptance criteria

### Infrastructure (F-045) — TDD gate (D-036)

| AC | Criterion | Verification |
|----|-----------|--------------|
| AC-045-1 | `document.documentElement` has `data-mode="clean"` when cookie absent | Unit test: `ModeProvider` / `setMode` |
| AC-045-2 | `setMode('stylish')` sets attribute and `rpgt-mode=stylish` cookie | Unit test |
| AC-045-3 | Invalid mode values ignored (no attribute corruption) | Unit test |
| AC-045-4 | SSR layout renders `data-mode` from cookie | Integration: layout snapshot or targeted test |
| AC-045-5 | Account page renders mode switcher with Clean and Stylish options | RTL test (presence/labels only) |
| AC-045-6 | `useMotionPreference` updates when `data-mode` mutates | Unit test |

### Per-theme Stylish (F-046) — Visual review gate (D-036)

| AC | Criterion | Verification |
|----|-----------|--------------|
| AC-046-M | Minimal Stylish: dashboard, skill cards, gate, history, nav match `style-guide/minimal.md` + `page-guides/dashboard.md` atmosphere intent | **Visual review** (desktop + mobile) |
| AC-046-R | Retro Stylish: same surfaces match `style-guide/retro.md` RPG atmosphere | **Visual review** |
| AC-046-O | Modern Stylish: same surfaces match `style-guide/modern.md` command-centre atmosphere | **Visual review** |
| AC-046-X | Clean mode pixel-identical to pre-change baseline for all three themes | **Visual review** (regression) |
| AC-046-A | WCAG AA contrast in Stylish mode for all themes | **Visual review** + axe spot-check |

### Landing (F-047) — Visual review gate (D-036)

| AC | Criterion | Verification |
|----|-----------|--------------|
| AC-047-1 | Stylish: full section flow with per-theme hero animations and feature treatments | **Visual review** per `page-guides/landing.md` |
| AC-047-2 | Clean: basic landing without cinematic atmosphere (no orbs/glow active) | **Visual review** |
| AC-047-3 | Theme switcher works in both modes | Manual / visual review |
| AC-047-4 | Mode preference persists across landing ↔ app navigation | Manual cookie check |

---

## Affected zones

| Zone | Paths |
|------|-------|
| Shared UI | `packages/ui/src/ThemeProvider.tsx` (extend or sibling), new mode helpers, `packages/ui/tokens/*.css`, `packages/ui/src/useMotionPreference.ts` |
| LifeQuest app | `apps/rpg-tracker/app/layout.tsx`, `apps/rpg-tracker/app/(app)/account/page.tsx` |
| Landing app | `apps/landing/app/layout.tsx`, `apps/landing/app/globals.css`, `apps/landing/app/components/**` |
| Auth middleware | `packages/auth/src/middleware.ts` |

---

## Sign-off

```
Signed off by: ____________________ on __________
```
