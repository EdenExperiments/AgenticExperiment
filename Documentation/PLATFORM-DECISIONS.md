# Platform Architecture Decisions

> Condensed from `2026-03-17-monorepo-foundation.md` and `2026-03-17-platform-suite-redesign.md`.
> Original plans archived in `docs/superpowers/archived/`.

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

Theme files override colour, font, and motion:

| Theme | App | Identity | `--motion-scale` |
|-------|-----|----------|-----------------|
| `rpg-game` | rpg-tracker | Dark/dramatic, gold accent (`#d4a853`), Cinzel serif | `1` (full animation) |
| `rpg-clean` | rpg-tracker | Dark/clean, indigo accent (`#6366f1`), Inter | `0` (no animation) |
| `nutri-saas` | nutri-log | — | — |
| `mental-calm` | mental-health | — | — |

Theme applied via `data-theme` attribute on `<html>`. Set server-side from cookie before hydration — no flash of wrong theme. `ThemeProvider` in `packages/ui` handles the wiring.

`--motion-scale` is the animation budget hook. Framer Motion variants and `useMotionPreference` hook in `packages/ui/src` read this CSS variable to gate animations per theme.

---

## App Identities

- **LifeQuest** (`apps/rpg-tracker`): RPG-style skill/habit tracker. XP, levels, tiers, blocker gates, AI skill calibration. Fully implemented (Phase 1 + Phase 2 + polish).
- **NutriLog** (`apps/nutri-log`): Nutrition and weight tracking. Scaffolded only (auth redirect + proxy). Theme `nutri-saas`.
- **MindTrack** (`apps/mental-health`): Mental wellness tracking. Scaffolded only (auth redirect + proxy). Theme `mental-calm`.

---

## Cross-App Future (deferred)

Post-MVP: cross-app XP integration (F-020), weekly AI review across both loops (F-019), PWA install (F-021). Do not plan until LifeQuest is in production.
