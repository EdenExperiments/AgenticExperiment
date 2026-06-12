# Task 01 — Clean/Stylish Mode Infrastructure (F-045)

**Feature:** F-045  
**Gate:** TDD (D-036) — logic and persistence require tests; no CSS visual assertions.  
**Depends on:** —  
**Blocks:** 02, 03, 04, 05

---

## Scope

Implement the `data-mode` dimension parallel to `data-theme`: types, cookie persistence, SSR hydration, account switcher, middleware bootstrap, and base CSS selector scaffolding. Extend motion preference hook to observe mode changes.

### In scope

- `VisualMode` type: `'clean' | 'stylish'`
- `VALID_MODES`, `setMode()`, mode sync in provider (extend `ThemeProvider` or add `ModeProvider` — keep one hydration path)
- Cookie `rpgt-mode` (1-year, `SameSite=Lax`, path `/`, JS-readable)
- `data-mode` on `<html>` in `apps/rpg-tracker` and `apps/landing` layouts (SSR from cookie, default `clean`)
- Default cookie in `packages/auth/src/middleware.ts` when absent
- `ModeSwitcher` (or equivalent) exported from `@rpgtracker/ui`; wired on account page below/near `ThemePickerPreview`
- Brief helper text on account page explaining Stylish (more motion/decoration) per Q-1 default
- `useMotionPreference`: observe `data-mode` attribute mutations
- Base token hook in `packages/ui/tokens/base.css`: document `--density-scale` or mode-aware vars gated by `[data-mode="stylish"]` (values only; atmosphere in tasks 02–04)
- Export new symbols from `packages/ui/src/index.ts`

### Out of scope

- Per-theme atmosphere CSS (tasks 02–04)
- Landing cinematic sections (task 05)
- NutriLog / MindTrack layouts
- Server-side DB persistence

---

## Target paths

```
packages/ui/src/ThemeProvider.tsx          # extend or sibling ModeProvider
packages/ui/src/index.ts
packages/ui/src/useMotionPreference.ts
packages/ui/src/useMotionPreference.test.ts
packages/ui/src/__tests__/ThemeProvider.test.tsx   # or ModeProvider.test.tsx
packages/ui/src/ModeSwitcher.tsx                   # new
packages/ui/tokens/base.css
packages/auth/src/middleware.ts
apps/rpg-tracker/app/layout.tsx
apps/rpg-tracker/app/(app)/account/page.tsx
apps/rpg-tracker/app/__tests__/account.test.tsx
apps/landing/app/layout.tsx
```

---

## Acceptance criteria (from requirements)

| ID | Criterion |
|----|-----------|
| AC-045-1 | Default `data-mode="clean"` when cookie absent |
| AC-045-2 | `setMode('stylish')` sets attribute + cookie |
| AC-045-3 | Invalid mode values ignored |
| AC-045-4 | SSR layout reads cookie into `<html data-mode>` |
| AC-045-5 | Account page shows mode switcher (Clean / Stylish) |
| AC-045-6 | `useMotionPreference` reacts to `data-mode` change |
| AC-045-8 | Stylish CSS selectors use `[data-theme][data-mode="stylish"]` pattern |

---

## Implementation notes

**Existing patterns to mirror:**

```49:57:apps/rpg-tracker/app/layout.tsx
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const theme = (cookieStore.get('rpgt-theme')?.value ?? 'minimal') as Theme
  // → add: const mode = (cookieStore.get('rpgt-mode')?.value ?? 'clean') as VisualMode
```

```50:57:packages/ui/src/ThemeProvider.tsx
export function setTheme(theme: Theme): void {
  if (!VALID_THEMES.includes(theme)) return
  document.documentElement.setAttribute('data-theme', theme)
  // → parallel setMode()
```

Middleware theme bootstrap at `packages/auth/src/middleware.ts` lines 60–68 — add mode bootstrap the same way.

---

## Verification command

```bash
pnpm --filter @rpgtracker/ui test && pnpm --filter rpg-tracker test
```

Pre-merge sanity:

```bash
pnpm build
```

---

## Visual review checklist (D-036)

Infrastructure task — **no visual review gate** except spot-check:

- [ ] Account page: switcher visible, labelled, does not break theme picker layout
- [ ] No flash of wrong mode on hard refresh (SSR cookie applied)
- [ ] Focus states visible on mode switcher controls

---

## Subagent routing

| Phase | Agent |
|-------|-------|
| Red | `test-writer-ts` |
| Green | `implementer-ts` |
| Verify | `verifier` |
