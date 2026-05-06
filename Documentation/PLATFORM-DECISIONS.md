# Platform Architecture Decisions

> Condensed from `2026-03-17-monorepo-foundation.md` and `2026-03-17-platform-suite-redesign.md`.
> Historical planning artifacts are archived under `docs/specs/archived/` and `docs/plans/archived/`.

---

## Why Monorepo (Turborepo + pnpm workspaces)

Three independent apps (LifeQuest, NutriLog, MindTrack) share auth, UI components, API client, and config. A monorepo lets shared packages be consumed via `workspace:*` references with a single `pnpm install`, and Turborepo caches builds across apps. Single source of truth for TypeScript config, Tailwind version, and test setup.

Apps: `apps/rpg-tracker`, `apps/nutri-log`, `apps/mental-health`
Shared packages: `packages/ui`, `packages/auth`, `packages/api-client`, `packages/tsconfig`
Go API: `apps/api` — single backend shared by all three apps.

---

## Why BFF (Next.js Route Handler Proxy)

Supabase session tokens live server-side (via `@supabase/ssr` cookie handling). Calling the Go API directly from the browser would require passing JWT tokens in client code. The BFF pattern (`app/api/[...path]/route.ts`) forwards requests from the browser to the Go API, attaching the Supabase JWT from the server-side session. No auth tokens ever touch client JS.

---

## Design Token System

`packages/ui/tokens/base.css` — spacing, radii, typography scale, animation durations. Never overridden per theme.

### Current Theme Files (Shipped)


| Theme         | App           | Identity                                       | `--motion-scale`             |
| ------------- | ------------- | ---------------------------------------------- | ---------------------------- |
| `minimal`     | rpg-tracker   | Clean, data-forward, productivity styling      | `0` (reduced/default motion) |
| `retro`       | rpg-tracker   | RPG-inspired, atmospheric dark fantasy styling | `1` (full motion budget)     |
| `modern`      | rpg-tracker   | Polished sci-fi command-center styling         | `1` (full motion budget)     |
| `nutri-saas`  | nutri-log     | Scaffold placeholder theme                     | —                            |
| `mental-calm` | mental-health | Scaffold placeholder theme                     | —                            |


Theme applied via `data-theme` attribute on `<html>`. Set server-side from cookie before hydration — no flash of wrong theme. `ThemeProvider` in `packages/ui` handles the wiring.

`--motion-scale` is the animation budget hook. `useMotionPreference` hook in `packages/ui/src` reads this CSS variable to gate animations per theme.

### Three-Theme System (shipped foundation — F-023)

The three user-selectable themes are implemented and represent fundamentally different visual identities:


| Theme       | Identity                               | Key Visual DNA                                                                                                |
| ----------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Minimal** | Clean, data-forward, productivity tool | Light backgrounds, blue accent, flat cards, bold typography, no atmospheric effects                           |
| **Retro**   | Full RPG immersion, cyberpunk/arcade   | Dark backgrounds, amber/gold + purple, pixel fonts, character portraits, scanline textures, narrative framing |
| **Modern**  | Sci-fi command centre                  | Dark navy, cyan + magenta, glass morphism, neon accents, atmospheric glows                                    |


All three themes surface the same features — differences are visual treatment and UX flavour only.

**Three-layer architecture:**

1. **CSS Custom Properties** (~60%) — colours, fonts, radii, shadows, motion budgets. `data-theme` swap, zero JS.
2. **Theme-scoped component CSS** (~25%) — `[data-theme="retro"] .card { ... }` for glass, scanlines, glows. Pure CSS.
3. **Component variants** (~15%) — structural differences only (pixel art, name formatting, timer display). Variant registry pattern with `dynamic()` code splitting.

Style guides (`Documentation/style-guide/`) and page guides (`Documentation/page-guides/`) govern visual implementation. These are now written and ready for use:

- `style-guide/shared.md` — system-wide rules (tokens, typography, motion, density, accessibility)
- `style-guide/minimal.md`, `retro.md`, `modern.md` — per-theme specifics
- `page-guides/` — one file per page with mood, hierarchy, theme variations, and element status (EXISTING/NEW/MODIFIED)

Source material: `Design_Discussion.md` (finalised design direction) and `design-inspiration/` (reference images). See product-requirements.md for full feature details.

---

## App Identities

- **LifeQuest** (`apps/rpg-tracker`): RPG-style skill/habit tracker. XP, levels, tiers, blocker gates, AI skill calibration. Logic and API are implemented (Release 1), and the three-theme foundation is shipped (F-023). Additional visual polish work remains tracked in `Documentation/feature-tracker.md` (F-045 to F-047).
- **NutriLog** (`apps/nutri-log`): Nutrition and weight tracking. Scaffolded only (auth redirect + proxy). Theme `nutri-saas`.
- **MindTrack** (`apps/mental-health`): Mental wellness tracking. Scaffolded only (auth redirect + proxy). Theme `mental-calm`.

---

## Hub Architecture

The RPG Tracker (LifeQuest) is the central hub for the suite. Other apps feed progress into the character/skill system:

- NutriLog → nutrition logging counts toward health-related skills and character progression
- MindTrack → mental health and wellbeing progress feeds into the system
- Future apps → any app added to the suite integrates the same way

This is not a "dashboard that aggregates data from other apps" — it's a unified progression system where every activity across the suite contributes to levelling up as a person.

---

## Development Pipeline Split

The agentic development pipeline is split into two paths based on work type:


| Path          | Flow                                                 | Gate                                                            |
| ------------- | ---------------------------------------------------- | --------------------------------------------------------------- |
| **Logic/API** | spec → TDD (tester agent) → implement → code review  | Tests must pass                                                 |
| **UI/Visual** | style guide → page brief → implement → visual review | Reviewer checks token usage, theme compatibility, accessibility |


**Why:** TDD verifies *behaviour* ("when I click submit, the XP updates") but cannot verify *aesthetics* ("does this page create atmosphere?"). Applying TDD universally to visual work produces meaningless assertions about CSS classes, which are brittle and constrain creative freedom.

**Tests still required for:** business logic, API contracts, data flow (query hooks, cache), component *behaviour* (form submission, modals, validation).

**Tests NOT required for:** visual composition, layout assertions, theme-dependent rendering, atmospheric effects.

The reviewer agent handles visual review: checks design token usage (no hardcoded values), three-layer architecture compliance, accessibility (focus states, contrast), and that all three themes render correctly.

---

## Cross-App Future (deferred)

Post-MVP: cross-app XP integration (F-020), weekly AI review across both loops (F-019), PWA install (F-021). Do not plan until LifeQuest is in production.