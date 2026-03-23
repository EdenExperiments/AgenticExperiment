# Architecture Review — Restyle Existing Pages (F-023 Phase 1)

**Spec:** `docs/specs/2026-03-22-restyle-pages/spec.md`
**Reviewer:** architect
**Date:** 2026-03-22
**Verdict:** CHANGES-NEEDED

---

## Schema Impact

None. This is a `type: visual` feature. No database tables, columns, or migrations are required. The spec explicitly defers all NEW elements that require API/schema changes (categories, avatar, Quick Session, social auth) to later phases.

---

## Service Boundaries

The token migration touches two shared packages:

**`packages/ui/tokens/`** — Three existing theme files are extended (new CSS custom properties added). A new file `pages.css` is created. These are CSS files consumed by all apps at build time via `@import`. No TypeScript API surface changes.

**`packages/ui/src/`** — Nineteen existing components have their internal `var(--color-*)` references migrated. One new component (`SkillEditModal`) is added and must be exported from `index.ts`. This changes the public API of `@rpgtracker/ui` (additive only — no removals, no prop changes on existing components except as required for the modal trigger on `skills/[id]/page.tsx`).

**`apps/rpg-tracker/`** — Consumes `@rpgtracker/ui`. Must import `pages.css` via `tokens.css` update (AC-50). Removal of `skills/[id]/edit/page.tsx` and addition of a redirect stub.

**`apps/landing/`** — BLOCKER: currently has no dependency on `@rpgtracker/ui` (not listed in `apps/landing/package.json`). The spec requires adding `ThemeProvider` and importing theme CSS files (`minimal.css`, `retro.css`, `modern.css`, `components.css`) from `@rpgtracker/ui`. This requires adding `@rpgtracker/ui` as a workspace dependency to the landing app before any landing restyling can proceed.

**`apps/nutri-log/` and `apps/mental-health/`** — Not in scope for Phase 1. However, `packages/ui/tokens/nutri-saas.css` and `packages/ui/tokens/mental-calm.css` define the old token names (`--color-bg-surface`, `--color-text-primary`, `--color-text-muted`) as their canonical names (not as aliases). These files are NOT touched by this spec. This is acceptable for Phase 1 but creates a divergence risk — the same token-name collision that Phase 1 fixes for the three main themes will exist in the NutriLog and MindTrack theme files. Flagged as a NOTE; no action required now.

---

## Findings

### BLOCKER — Landing app has no `@rpgtracker/ui` dependency

`apps/landing/package.json` lists zero runtime or devDependencies on `@rpgtracker/ui`. The spec's AC-26 through AC-30 require importing `ThemeProvider` and all theme CSS files from that package. This dependency must be added to `apps/landing/package.json` and `pnpm install` re-run before any landing work can start. The file manifest does not include `apps/landing/package.json` as a file to modify.

**Fix required in spec.md:** Add `apps/landing/package.json` to the file manifest under "modify".

### BLOCKER — `landing/app/globals.css` uses a private token vocabulary incompatible with the shared system

The current `globals.css` defines its own bespoke custom properties: `--bg`, `--bg-surface`, `--bg-elevated`, `--text-primary`, `--text-secondary`, `--text-muted`, `--gold`, `--gold-light`, etc. These are not the canonical `--color-*` token names. The spec's AC-30 says "only colour (`--color-*`) and font (`--font-*`) properties are converted to use theme tokens." That migration will leave the body, html, and ::selection rules referencing undefined variables (`var(--bg)`, `var(--text-primary)`) unless either:

  (a) the bespoke `:root` block is removed and all references updated to canonical tokens, or
  (b) the bespoke `:root` block is kept and only the component-level property references are migrated.

Option (b) would leave the landing page partially on the new token system and partially on the old one, defeating the purpose of AC-27. The spec needs to explicitly state which of these approaches applies, and the file manifest should reflect any additional files that require reference updates inside `globals.css`.

**Fix required in spec.md:** Add a note to AC-30 (or a new AC) clarifying whether the bespoke `:root` block in `globals.css` is to be removed or retained as a compatibility shim, and what happens to the landing page `body` base styles.

### BLOCKER — Landing app font set diverges from three-theme system

`apps/landing/app/layout.tsx` loads `Cinzel` and `Inter` only, setting `--font-cinzel` and `--font-inter`. AC-28 requires adding `Press Start 2P`, `Space Grotesk`, and `Rajdhani` for Retro and Modern theme support. The landing app's current `globals.css` sets `.font-display { font-family: var(--font-cinzel) }` — a class-based override that conflicts with the token-based `--font-display` variable approach used by the RPG Tracker app. The spec must confirm that `layout.tsx` will load all four fonts and that the `.font-display` class override in `globals.css` is removed in favour of the token.

**Fix required in spec.md:** Add `apps/landing/app/layout.tsx` to the file manifest as a "modify" target (it is already listed — confirmed correct) and add a specific AC noting that the `.font-display` CSS class is removed from `globals.css` and replaced with the `--font-display` CSS variable assignment on `<html>` or `[data-theme]`.

### RECOMMENDED — `tokens.css` input form hack will conflict with theme tokens

`apps/rpg-tracker/tokens.css` lines 12–18 contain a Tailwind `@layer base` rule forcing input text to Tailwind's `text-gray-900 / dark:text-white`. This hardcoded override will fight the migrated `--color-text` token on form inputs. After token migration, form inputs in Retro/Modern themes (dark `--color-text`: near-white) will have the correct token value but the `@layer base` rule will override it with `text-gray-900` on light-mode OS preference. This rule should be replaced with a `var(--color-text)` assignment. The spec does not mention this. It does not need a new file in the manifest (the file is already listed), but the implementation task for the frontend agent should note this rule explicitly.

**Fix recommended in spec.md:** Add a note to the AC-50 section (or `tokens.css` manifest entry) that the existing `@layer base` input override must be migrated to `color: var(--color-text)`.

### NOTE — `nutri-saas.css` and `mental-calm.css` use old token names as canonical names

These files are not in scope for Phase 1 but define `--color-bg-surface`, `--color-text-primary`, and `--color-text-muted` as their primary identifiers. After Phase 1, the shared components will no longer reference these names. NutriLog and MindTrack apps currently use these theme files. Confirm that NutriLog and MindTrack components import from `packages/ui/src/` — if they do, the migrated components will reference tokens those theme files do not define, causing visual breakage in those apps even though they are not in Phase 1 scope.

Action: before starting Phase 1, verify (via grep) that `apps/nutri-log` and `apps/mental-health` do not render any of the 19 components being token-migrated. If they do, either (a) add the canonical token names as aliases to `nutri-saas.css` and `mental-calm.css` as part of Phase 1, or (b) explicitly document this as a known regression risk.

### NOTE — `XPProgressBar` tier colours correctly exempted

The spec notes tier colours remain fixed per D-020 and exempts `XPProgressBar` from per-theme colour changes. The `tokens.css` tier accent classes use Tailwind colour utilities (not hardcoded hex), which is consistent with that decision. No action needed.

### NOTE — Test file manifest is incomplete

The spec lists `SkillCard.test.tsx`, `StatCard.test.tsx`, and `ActivityFeedItem.test.tsx` then adds "any other test files affected by component API changes." There are 19 components being modified. The spec should either enumerate all affected test files or acknowledge that the tester agent is responsible for updating tests for all modified components in the package. The vague catch-all is sufficient for a visual spec (D-036: no TDD gate) but should be made explicit.

---

## ADR

None required. The three-theme system architecture is already established under D-035. The Layer 1/2/3 approach is documented in `Documentation/style-guide/shared.md`. The modal conversion of the edit page is a straightforward UI pattern change that does not constitute a significant new technical decision.

---

## Shared Package Changes

Files in `packages/*` that must change:

**`packages/ui/tokens/minimal.css`** — Add 9 extended tokens per spec table.

**`packages/ui/tokens/retro.css`** — Add 9 extended tokens (8 new + `--color-secondary` which Retro already defines; spec notes this — confirm no-op or alias).

**`packages/ui/tokens/modern.css`** — Add 9 extended tokens (same as Retro caveat for `--color-secondary`).

**`packages/ui/tokens/pages.css`** (new) — All Layer 2 theme-scoped CSS.

**`packages/ui/src/SkillEditModal.tsx`** (new) — Modal component.

**`packages/ui/src/index.ts`** — Add export for `SkillEditModal`.

**19 existing component files in `packages/ui/src/`** — Token migration and per-theme restyling as enumerated in the spec manifest.

**Not in spec but required (BLOCKER):** `apps/landing/package.json` — add `@rpgtracker/ui` workspace dependency.

---

## Parallelisation Map

Tasks that CAN run in parallel:

- **Group A — Token extension** (all three theme files): `minimal.css`, `retro.css`, `modern.css` can be written simultaneously by the same agent pass; they are independent files with no cross-dependencies.
- **Group B — Component token migration** (the 19 existing `packages/ui/src/` files): Once Group A is complete, all 19 component migrations are independent of each other and can be done in a single agent pass or split across agents without conflict.
- **Group C — RPG Tracker page restyling** (the 11 app page files): Once Group B is merged, all RPG Tracker page files are independent of each other (P1-1 through P1-9 sub-tasks).
- **Group D — Landing app setup**: Adding `@rpgtracker/ui` to `apps/landing/package.json` and updating `layout.tsx` with fonts can start as soon as the BLOCKER is acknowledged, independently of Groups A/B.

Tasks that MUST be sequenced (and why):

1. **Blockers resolved before implementation starts** — The three BLOCKERs listed above must be resolved in the spec before any implementation begins. Landing font resolution and `globals.css` migration strategy must be agreed.

2. **Group A before Group B** — Component token migration (`packages/ui/src/`) must come after the extended tokens are defined in the theme files (Group A). Migrating a component to reference `--color-bg-elevated` before that token exists in `minimal.css` will cause a visible breakage in CI visual checks.

3. **`pages.css` creation before Group C** — The `pages.css` Layer 2 file must be created and imported in `tokens.css` (AC-50) before RPG Tracker page restyling begins, because page components will reference CSS class selectors (`.gate-section`, `.activity-history`, `.stat-card`) whose per-theme rules live in `pages.css`. Pages can be styled before `pages.css` exists, but the theme-scoped treatments (AC-14, AC-15, AC-19, AC-33) will have no effect.

4. **Group B before Group C** — RPG Tracker pages import from `@rpgtracker/ui`. Pages that use `SkillEditModal` (skills detail page, AC-36) require that component to exist before the page can reference it. The 19 component migrations should be complete before page-level work starts to avoid chasing moving targets.

5. **`SkillEditModal` before edit route removal** — `packages/ui/src/SkillEditModal.tsx` must be created and exported before `apps/rpg-tracker/app/(app)/skills/[id]/edit/page.tsx` is removed. Removing the route first will cause a broken link with no fallback until the modal is wired in.

6. **Group D (landing `package.json` + install) before landing CSS/component work** — The landing page cannot import `ThemeProvider` or theme CSS until `@rpgtracker/ui` is in its dependency graph. This must be the very first landing task.

7. **`tokens.css` `pages.css` import line before all RPG Tracker page work** — This is a one-line change (AC-50) but gates every Layer 2 CSS class used in pages. It should be the first RPG Tracker file touched.

Summary sequencing diagram:

```
[Resolve BLOCKERs in spec]
        |
        v
[Group A: extend theme CSS files]  [Group D: landing package.json + install]
        |
        v
[Create pages.css]  [Group B: migrate 19 components + SkillEditModal]
                              |
                              v
                    [tokens.css: add pages.css import]
                              |
                              v
                    [Group C: RPG Tracker pages (all parallel)]
                              |
                    [Landing page restyle (parallel with Group C, after Group D)]
```

---

## Approval

CHANGES-NEEDED

- **BLOCKER-1:** Add `apps/landing/package.json` to the file manifest as a file to modify. This app has no `@rpgtracker/ui` dependency and the spec requires consuming `ThemeProvider` and all theme CSS from that package.

- **BLOCKER-2:** Clarify the migration strategy for the bespoke `:root` token block in `apps/landing/app/globals.css` (`--bg`, `--bg-surface`, `--text-primary`, etc.). Either remove and replace with canonical `--color-*` tokens (recommended), or document why the bespoke block is retained as a shim. Add a corresponding AC.

- **BLOCKER-3:** Add an AC stating that the `.font-display` CSS class override in `apps/landing/app/globals.css` (line 53) is removed and replaced with the canonical `--font-display` CSS variable used by the token system. The current class-based override will shadow the token for any component using `var(--font-display)`.

- **RECOMMENDED-1:** Add a note to the `apps/rpg-tracker/tokens.css` manifest entry that the existing `@layer base` input colour override (lines 12–18) is to be replaced with `color: var(--color-text)` and `background-color: var(--color-surface)` to avoid Tailwind overriding migrated token values on form inputs.

- **RECOMMENDED-2:** Before starting implementation, verify via grep that `apps/nutri-log` and `apps/mental-health` do not render the 19 components being token-migrated. If they do, add `--color-bg-elevated` et al. as aliases in `nutri-saas.css` and `mental-calm.css` to prevent silent visual regression in those apps.
