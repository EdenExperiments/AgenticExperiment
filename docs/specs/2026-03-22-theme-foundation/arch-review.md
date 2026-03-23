# Architecture Review — Theme Foundation (F-023 Phase 0)

**Spec:** `docs/specs/2026-03-22-theme-foundation/spec.md`
**Reviewer:** architect agent
**Date:** 2026-03-22

---

## Schema Impact

None. This feature is CSS infrastructure only. No database tables, columns, or migrations are required. The theme preference is stored as a browser cookie (`rpgt-theme`) — a pattern already established and unchanged by this work.

---

## Service Boundaries

### packages/ui — primary change zone

`packages/ui` is consumed by all three frontends (`apps/rpg-tracker`, `apps/nutri-log`, `apps/mental-health`). Two categories of change here have different risk profiles:

**Token files (low coordination risk).** New CSS files under `packages/ui/tokens/` are additive. The `exports` field in `package.json` already has `"./tokens/*": "./tokens/*"`, so new token files are automatically accessible without a package.json change. Removing `rpg-game.css` and `rpg-clean.css` is a breaking change for any consumer that imports them — see the regression concern below.

**ThemeProvider type change (high coordination risk).** Changing `Theme` from `'rpg-game' | 'rpg-clean' | 'nutri-saas' | 'mental-calm'` to `'minimal' | 'retro' | 'modern'` is a breaking type change. Every consumer that references the `Theme` type or passes a theme string must be updated atomically. Current callers identified:

| File | Old reference | Required update |
|------|--------------|-----------------|
| `apps/rpg-tracker/app/layout.tsx` | `?? 'rpg-game'` fallback | Change to `'minimal'` |
| `apps/rpg-tracker/proxy.ts` | `defaultTheme: 'rpg-game'` | Change to `'minimal'` |
| `packages/auth/src/middleware.ts` | `defaultTheme: Theme` parameter type | No code change — type will update automatically once `Theme` is updated in `packages/ui`; but the caller (`proxy.ts`) must pass a valid new value |
| `packages/ui/src/__tests__/ThemeProvider.test.tsx` | `'rpg-game'`, `'rpg-clean'` literal values | Must be rewritten for new theme names |
| `packages/ui/src/useMotionPreference.ts` | JSDoc comments reference old theme names | Comments only — no functional impact, but should be updated for accuracy |
| `packages/ui/src/useMotionPreference.test.ts` | `data-theme="rpg-game"` in test setup | Test must use a new theme name |
| `packages/ui/src/SkillCard.test.tsx` | `rpg-clean instant transitions` describe block | Tests reference old motion-scale=0 behaviour; new mapping is Minimal (0.3), Retro (0.7), Modern (1.0) — tests must be updated to use new theme names and valid motion-scale values |
| `packages/ui/src/StatCard.test.tsx` | Same pattern | Same update needed |
| `packages/ui/src/ActivityFeedItem.test.tsx` | Same pattern | Same update needed |

**Risk flag — `nutri-log` and `mental-health` apps.** These apps use `nutri-saas` and `mental-calm` theme values (confirmed in `apps/nutri-log/proxy.ts` and `apps/mental-health/proxy.ts`). The spec's `Theme` type change removes those values. If the new `Theme` type is `'minimal' | 'retro' | 'modern'` only, TypeScript compilation will fail for those two apps. The spec must clarify: either (a) the new type retains `nutri-saas` and `mental-calm` as valid values for now, or (b) those proxy files are also in scope for this phase. This is the most significant coordination risk in the spec.

**Recommendation:** Add `nutri-saas` and `mental-calm` to the file manifest, or explicitly extend the `Theme` type to `'minimal' | 'retro' | 'modern' | 'nutri-saas' | 'mental-calm'` as a transitional measure until those apps receive their own theme work.

### packages/auth — minimal change

The change is a one-line update to the `defaultTheme` parameter passed by `apps/rpg-tracker/proxy.ts`. The `middleware.ts` itself has no hardcoded theme value — it accepts `defaultTheme` as an option. The type constraint means `proxy.ts` must be updated after the `Theme` type changes. This is low risk but must be sequenced correctly (after P0-3 completes).

### No API surface changes

The Go API (`apps/api/`) is not touched. No endpoint changes, no request/response contract changes.

---

## ADR

None required. D-035 (three-theme system architecture) and D-036 (pipeline split) already cover the decisions being enacted here. No new architectural decisions are being made.

---

## Shared Package Changes

Specific files in `packages/*` that must change:

**packages/ui/tokens/**
- `packages/ui/tokens/base.css` — add shadow tokens (modify)
- `packages/ui/tokens/minimal.css` — create
- `packages/ui/tokens/retro.css` — create
- `packages/ui/tokens/modern.css` — create
- `packages/ui/tokens/components.css` — glassmorphism utilities (create/replace)
- `packages/ui/tokens/rpg-game.css` — delete
- `packages/ui/tokens/rpg-clean.css` — delete

**packages/ui/src/**
- `packages/ui/src/ThemeProvider.tsx` — `Theme` type + `setTheme()` export
- `packages/ui/src/ThemeSwitcher.tsx` — new component
- `packages/ui/src/index.ts` — export ThemeSwitcher
- `packages/ui/src/useMotionPreference.ts` — JSDoc update (minor)
- `packages/ui/src/__tests__/ThemeProvider.test.tsx` — rewrite for new theme names
- `packages/ui/src/useMotionPreference.test.ts` — update theme name in test setup
- `packages/ui/src/SkillCard.test.tsx` — update motion-scale test describe names and theme literals
- `packages/ui/src/StatCard.test.tsx` — same
- `packages/ui/src/ActivityFeedItem.test.tsx` — same

**packages/auth/src/**
- No changes to `middleware.ts` itself. Change is in `apps/rpg-tracker/proxy.ts` (caller).

---

## Parallelisation Map

Tasks that CAN run in parallel:

- **[P0-1] Three theme CSS files** — pure file creation, no dependencies on other tasks. Can be written immediately.
- **[P0-5] Update base.css** — modifies an existing file but is independent of theme content. Can proceed alongside P0-1.
- **[P0-7] Background atmosphere CSS** (the per-theme atmosphere rules in `components.css`) — CSS-only, can be drafted alongside P0-1 and P0-5.

Tasks that MUST be sequenced (and why):

1. **[P0-3] ThemeProvider update must precede P0-4 (ThemeSwitcher).** ThemeSwitcher depends on the `setTheme()` function exported by ThemeProvider. ThemeSwitcher cannot be built until that contract is stable.

2. **[P0-3] ThemeProvider update (Theme type change) must precede all test updates.** Tests in `ThemeProvider.test.tsx`, `SkillCard.test.tsx`, `StatCard.test.tsx`, `ActivityFeedItem.test.tsx`, and `useMotionPreference.test.ts` reference old theme literal strings. Updating the type first lets the compiler surface all breakages.

3. **[P0-2] Font loading must precede P0-1 token file completion.** Theme CSS files reference font variables (`var(--font-press-start)` etc.) that are only set by `next/font` in `layout.tsx`. P0-1 can be drafted in parallel but cannot be verified/tested until P0-2 is in place.

4. **[auth change] proxy.ts default theme update must follow P0-3 completion.** Passing `'minimal'` to `createAuthMiddleware` will be a TypeScript error until the `Theme` type accepts it. Must not be merged before P0-3 lands.

5. **[P0-6] Glassmorphism utilities should follow P0-1 (modern.css).** The glass utilities reference `--color-surface` and `--color-accent` tokens defined in `modern.css`. Writing `components.css` glass rules before `modern.css` is finalised risks token name drift.

6. **[apps/rpg-tracker layout updates] must follow P0-1 and P0-2.** `tokens.css` import replacement (removing `rpg-game.css`, `rpg-clean.css`, adding the three new files) and `layout.tsx` font wiring should happen after the source files they reference exist.

Recommended execution order:

```
Group A (parallel): P0-1 draft, P0-5, P0-2 font loading
       ↓
Group B (parallel): P0-3 ThemeProvider, finalize P0-1 token files (now fonts exist)
       ↓
Group C (parallel): P0-4 ThemeSwitcher, P0-6 glassmorphism utilities, P0-7 atmosphere
       ↓
Group D (sequential): apps/rpg-tracker layout + tokens.css wiring, proxy.ts auth change
       ↓
Group E: Test updates across packages/ui (all old-theme-name references)
```

---

## Approval

CHANGES-NEEDED

1. **[Blocking] Spec does not address `apps/nutri-log/proxy.ts` and `apps/mental-health/proxy.ts`.** Both currently pass `defaultTheme: 'nutri-saas'` and `defaultTheme: 'mental-calm'`. Changing `Theme` to `'minimal' | 'retro' | 'modern'` will break TypeScript compilation for those apps. The spec must either: (a) add those two files to the file manifest and update them to `'minimal'` as their temporary default, or (b) keep `nutri-saas` and `mental-calm` in the `Theme` union as deprecated values until those apps are themed. Option (a) is recommended — two one-line changes, no risk.

2. **[Blocking] Spec omits test file updates from the file manifest.** AC-10 mentions updating `ThemeProvider.tsx` and `middleware.ts` but does not list the test files that reference old theme names: `ThemeProvider.test.tsx`, `useMotionPreference.test.ts`, `SkillCard.test.tsx`, `StatCard.test.tsx`, `ActivityFeedItem.test.tsx`. These will cause test suite failures. They must be in the manifest.

3. **[Minor] `apps/rpg-tracker/proxy.ts` is missing from the file manifest.** AC-10 calls out `proxy.ts` by name but it is absent from the Files to modify list. Add it explicitly.

4. **[Minor] `apps/rpg-tracker/app/layout.tsx` has a hardcoded `'rpg-game'` fallback on line 15** (`?? 'rpg-game'`). This will apply a non-existent theme to new users until the cookie is set by middleware. The spec's AC-18 covers the middleware default but the layout fallback is a separate code site. Add it to AC-10's explicit list or the file manifest notes.
