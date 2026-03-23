# Spec Gateway — Theme Foundation (F-023 Phase 0)

**Reviewer:** reviewer agent
**Date:** 2026-03-22
**Spec:** `docs/specs/2026-03-22-theme-foundation/spec.md`
**Arch review:** `docs/specs/2026-03-22-theme-foundation/arch-review.md`
**UX review:** `docs/specs/2026-03-22-theme-foundation/ux-review.md`

---

## Spec Review Findings

### Gate 1 — Arch-review BLOCKER items resolved

| Item | Status |
|------|--------|
| `nutri-log/proxy.ts` and `mental-health/proxy.ts` absent from manifest | RESOLVED — both added to Files to modify (spec lines 50–51); AC-10 covers all old theme name references across all files |
| Test files absent from manifest | RESOLVED — all five test files listed explicitly in Files to update (spec lines 55–59) |
| `apps/rpg-tracker/proxy.ts` absent from manifest | RESOLVED — added to Files to modify (spec line 49) |
| `apps/rpg-tracker/app/layout.tsx` hardcoded `'rpg-game'` fallback not in scope | RESOLVED — file is in the manifest (spec line 46) and AC-10 explicitly covers all `'rpg-game'` reference sites |

### Gate 2 — UX-review REQUIRED items resolved

| Item | Status |
|------|--------|
| Cookie migration guard not specified | RESOLVED — AC-18b added: invalid cookie value falls back to `'minimal'` and overwrites cookie |
| Server-side theme application not explicit | RESOLVED — AC-18c added: middleware reads `rpgt-theme` cookie and sets `data-theme` on server-rendered `<html>` before response |
| ThemeSwitcher touch target not specified | RESOLVED — AC-20 now requires minimum 44x44px interactive area per option (WCAG 2.5.5) |
| Active state reflecting raw vs. resolved theme | RESOLVED — AC-21 now states the active state reflects the resolved (validated) theme, not the raw cookie value |
| Font swap reflow not acknowledged | RESOLVED — AC-14 note added: visible heading reflow on first load for Press Start 2P is expected `font-display: swap` behaviour |

### Gate 3 — ACs are verifiable code assertions

All 37 ACs checked. Every criterion is verifiable by one of: grep/code inspection, TypeScript compilation, CSS selector presence check, or browser integration smoke test. Specific checks:

- AC-7 (`[data-theme="<name>"]` scoping): `grep 'data-theme'` in each CSS file.
- AC-8 (token naming): grep for each `--color-*` variable in each theme file.
- AC-10 (no old theme names remaining): `grep -r 'rpg-game\|rpg-clean'` in the repo returns zero results.
- AC-15 (`Theme` type): grep for the union type string in `ThemeProvider.tsx`.
- AC-18b (migration guard): code inspection of ThemeProvider mount logic.
- AC-20 (44px touch target): grep for `min-width.*44` or equivalent in ThemeSwitcher CSS/styles.
- AC-29–AC-32 (glassmorphism): CSS selector inspection in `components.css`.
- AC-33/AC-36 (no errors, no regressions): integration smoke test — standard for visual gate. Acceptable for `type: visual`.

No subjective or untestable ACs found.

### Gate 4 — No hidden assumptions

No hidden assumptions. Two "already exists" claims are explicitly cited:
- AC-18c cites that the middleware cookie-read behaviour currently exists and must be preserved (arch-review confirms middleware accepts `defaultTheme` as a parameter, not hardcoded).
- AC-9 cites D-020 tier colours as Phase 1 scope, bounding what the XP bar tokens must deliver in Phase 0.

### Gate 5 — Work type classification correct

`type: visual` — correct per D-036 (pipeline split). No TDD gate applies. Existing test files are updated (not created) to remove broken old-theme-name references. This is maintenance-of-existing-tests, not TDD for new logic.

### Gate 6 — Zones correctly identified and complete

| Zone | Path | In manifest |
|------|------|-------------|
| Shared UI (packages/ui) | `packages/ui/tokens/`, `packages/ui/src/` | Yes |
| Auth package | `packages/auth/src/middleware.ts` | Yes (scoped to type propagation; no direct code change in middleware.ts itself) |
| RPG Tracker app | `apps/rpg-tracker/` | Yes |
| NutriLog app | `apps/nutri-log/proxy.ts` | Yes |
| MindTrack app | `apps/mental-health/proxy.ts` | Yes |

All zones have explicit directory paths. No open-ended scope.

### Gate 7 — No contradictions between spec, arch-review, and ux-review

No contradictions found. The arch-review and UX-review were both CHANGES-NEEDED against the previous spec draft. The revised spec incorporates every required change from both. The parallelisation map in the arch-review is internally consistent with the sequencing dependencies implied by the spec ACs (font loading before theme file verification, ThemeProvider before ThemeSwitcher, proxy.ts update after Theme type lands).

One alignment note (not a contradiction): the arch-review states middleware.ts requires no direct code change — the type constraint update comes through via the proxy.ts caller change. The spec's file manifest correctly reflects this: middleware.ts is listed as "(if hardcoded; otherwise handled by proxy.ts callers)" and the arch-review confirms no hardcoding exists.

---

## Verdict

GO

The spec is complete. All arch-review BLOCKER items and all UX-review REQUIRED items have been addressed in the revised spec. ACs are verifiable. File manifest is exhaustive. Zones are named. Sequencing plan exists in the Parallelisation Map. No contradictions between documents.

This spec is approved for implementation planning (Phase 5 — plan-feature).
