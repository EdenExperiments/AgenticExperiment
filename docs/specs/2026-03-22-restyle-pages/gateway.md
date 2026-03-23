# Spec Gateway Review — Restyle Existing Pages (F-023 Phase 1)

**Reviewer:** reviewer agent
**Date:** 2026-03-22
**Documents reviewed:**
- `docs/specs/2026-03-22-restyle-pages/spec.md` (DRAFT, updated post-CHANGES-NEEDED)
- `docs/specs/2026-03-22-restyle-pages/arch-review.md` (CHANGES-NEEDED, 3 blockers + 2 recommended)
- `docs/specs/2026-03-22-restyle-pages/ux-review.md` (CHANGES-NEEDED, 4 required + 4 recommended)

---

## Gate 1 — Arch-review BLOCKER items resolved

**BLOCKER-1 (landing `package.json` missing from file manifest)**
Resolved. Spec file manifest line 105 lists `apps/landing/package.json` as a file to modify with the note that `@rpgtracker/ui` workspace dependency is currently absent and required.

**BLOCKER-2 (globals.css bespoke `:root` token block migration strategy)**
Partially resolved — but introduces a new BLOCKER (see Gate 4 below). AC-30 now states the bespoke `:root` block is "removed entirely" and "all CSS rules that reference these bespoke tokens are updated to use canonical `--color-*` tokens." However, the actual `globals.css` file (verified by reading it) contains approximately 15 distinct bespoke tokens beyond the five-token mapping provided in AC-30: `--gold-faint`, `--gold-border`, `--gold-border-hover`, `--gold-glow`, `--gold-dark`, `--gold-light`, `--emerald`, `--emerald-faint`, `--emerald-border`, `--sage`, `--sage-faint`, `--sage-border`, and `--bg-elevated`. These tokens are used in roughly 60+ CSS rules (`.skip-link`, `.section-rule`, `.btn-primary`, `.btn-ghost`, `.btn-disabled`, `.navbar.scrolled`, `.hero-eyebrow`, `.hero-grid`, `.hero-heading-gold`, `.app-card-*`, `.feature-card`, `.section-label`, `.how-step::after`, `.cta-section`, `.footer`, etc.). The canonical `--color-*` system has no equivalents for these tokens. AC-30 provides no mapping for them. The implementer cannot complete AC-30 as written. **Status: BLOCKER-LEVEL GAP — not fully resolved.**

**BLOCKER-3 (.font-display CSS class override removed)**
Resolved. AC-30b explicitly states the `.font-display` class in `globals.css` is removed and components use `--font-display` CSS variable directly. The Cinzel font is no longer loaded.

**Arch RECOMMENDED-1 (tokens.css `@layer base` input override)**
Resolved. AC-50b explicitly addresses this, stating the override is replaced with `color: var(--color-text)` and `background-color: var(--color-surface)`.

**Arch RECOMMENDED-2 (nutri-log/mental-health regression risk)**
Not addressed in the spec as a resolved assumption. Verified by reading the actual source: `apps/nutri-log` and `apps/mental-health` currently only import `ThemeProvider` and the `Theme` type from `@rpgtracker/ui` — their page components render nothing but a redirect. Neither app renders any of the 19 components being token-migrated. The risk is confirmed negligible and the spec's silence is acceptable. No action required.

---

## Gate 2 — UX-review REQUIRED items resolved

**Required-1 (Edit trigger hidden for preset skills)**
Resolved. AC-40b states: "The Edit trigger on the skill detail page is hidden when `!skill.is_custom`." This adds the UI-level guard the UX review required.

**Required-2 (SkillEditModal client-side validation)**
Resolved. AC-40 now includes: name field is `required`, submit button disabled while empty, inline error message using `--color-error` on mutation failure, and query invalidation on success.

**Required-3 (SkillEditModal mobile bottom sheet layout)**
Resolved. AC-38b specifies full-width bottom sheet with `rounded-t-3xl` on mobile, `min-height: var(--tap-target-min)` on buttons, and `align-items: flex-start` with top padding to handle virtual keyboard.

**Required-4 (Auth page Layer 2 CSS coverage)**
Resolved. AC-25 final sentence states: "Token inheritance provides the colour values; `pages.css` adds any atmospheric pseudo-elements for dark themes." The intent is clear — auth pages get Layer 2 `pages.css` entries for atmospheric pseudo-elements on Retro/Modern.

**UX RECOMMENDED-1 (Dashboard stat card grid breakpoints)**
Resolved. AC-7 now specifies: "Stat cards grid is responsive: 2-col at ≥640px, 4-col at ≥1024px."

**UX RECOMMENDED-2 (Activity history empty state per theme)**
Resolved. AC-15 now includes per-theme empty state strings for all three themes.

**UX RECOMMENDED-3 (SkillEditModal z-index and session guard)**
Resolved. AC-37 specifies `z-50` and AC-37 + AC-38 note the edit trigger is hidden/disabled while a GrindOverlay session is active.

**UX RECOMMENDED-4 (Virtual keyboard handling)**
Resolved in AC-38b.

---

## Gate 3 — ACs are verifiable code assertions

Most ACs are specific and assertable. The following issues are flagged:

**MINOR — AC-3, AC-4, AC-5 are approximations, not assertions**
AC-3: "near-white (e.g., `#ffffff`)", "medium grey", "~10% opacity." AC-4: "a shade darker or lighter than `--color-surface`." AC-5: "a shade of dark navy with slight transparency." These describe intent rather than providing verifiable values. A code reviewer cannot assert "is this grey medium enough?" or "is this shade darker or lighter?" The exact hex values should be specified, or these ACs should be removed in favour of AC-6 (which verifies the tokens exist) combined with the style guides providing the authoritative palette. As written, these are guidance notes that cannot be converted to pass/fail assertions.

**MINOR — AC-44 is a smoke test, not a code assertion**
"The app loads and renders without errors on all three themes across all pages" is testable only by manual inspection or a Playwright/Puppeteer smoke test. This is acceptable for a visual spec (D-036: no TDD gate) but should be noted as a manual verification step, not a grep or compile assertion.

**MINOR — AC-49 is conditionally imperative**
"If the current value (`#6b7280` on `#ffffff` = ~4.6:1) is borderline, adjust `--color-muted` to a darker shade." The condition is not pre-resolved in the spec. Either resolve it now (state the exact value to use) or rewrite as a definitive assertion: "Minimal `--color-muted` is `#6b7280` or darker." The implementer should not need to run contrast calculations during implementation.

**MINOR — AC-117 catch-all test list**
"Any other test files affected by component API changes" is acknowledged as vague but acceptable per D-036 (no TDD gate). The frontend agent must interpret this liberally.

---

## Gate 4 — No hidden assumptions

**BLOCKER — AC-30 assumes a complete canonical token mapping for landing globals.css that does not exist**

AC-30 states the bespoke `:root` block is "removed entirely" and "all CSS rules that reference these bespoke tokens are updated to use canonical `--color-*` tokens." Reading the actual `apps/landing/app/globals.css` reveals the following bespoke tokens in use beyond the five-token partial mapping provided:

- `--gold-faint` (rgba(212, 168, 83, 0.08)) — used in `.badge-live`, `.btn-disabled`, `.feature-icon`
- `--gold-border` (rgba(212, 168, 83, 0.2)) — used in ~12 rules including navbar, hero-eyebrow, section-rule, footer
- `--gold-border-hover` (rgba(212, 168, 83, 0.6)) — used in `.btn-ghost:hover`
- `--gold-glow` (rgba(212, 168, 83, 0.15)) — defined but may be used in page.tsx
- `--gold-dark` (#b8860b) — used in `.btn-primary`, `.badge-live`, gradient definitions
- `--gold-light` (#f0c060) — used in `::selection`, `.btn-primary` gradient
- `--emerald` (#059669) — used in `.app-feature-dot-emerald`
- `--emerald-faint` / `--emerald-border` — used in `.app-card-nutrilog`
- `--sage` / `--sage-faint` / `--sage-border` — used in `.app-card-mindtrack`
- `--bg-elevated` (#1a1a2e) — used in `.skip-link`, `.how-number`

Additionally, many rules use hardcoded `rgba()` values directly (e.g., `rgba(212, 168, 83, 0.10)` in `.orb-1`, `rgba(212, 168, 83, 0.5)` in `.btn-primary:hover`) that are not mentioned in AC-30 at all.

The canonical `--color-*` token system provides: `--color-accent` (maps to `--gold`), `--color-bg` (maps to `--bg`), `--color-surface` (maps to `--bg-surface`), `--color-text` (maps to `--text-primary`), `--color-muted` (maps to `--text-muted`). It provides no equivalents for the opacity variants, the app-specific colours (emerald, sage), or the gradient stops.

This means AC-30 as written cannot be fully implemented — either the landing page will have broken CSS (unresolved `var()` references) or the implementer will need to make undirected design decisions about whether to hardcode rgba values, retain some bespoke tokens as landing-specific (contradicting "removed entirely"), or add new canonical tokens beyond those specified in the extend table.

**Fix required:** AC-30 must either:
(a) Acknowledge that landing-specific tokens (`--gold-faint`, `--gold-border`, etc.) are retained as a landing-local custom property block (not removed from the file, just moved or renamed to avoid collision), with only the five overlapping tokens (`--bg`, `--bg-surface`, `--bg-elevated`, `--text-primary`, `--text-secondary`, `--text-muted`) replaced with canonical tokens; or
(b) Provide a complete mapping table for all bespoke tokens, including what replaces the opacity variants, emerald/sage values, and hardcoded rgba colour references.

Option (a) is the safer choice for Phase 1 and does not contradict the spirit of the arch review's BLOCKER-2 (which was about avoiding a half-migrated state, not mandating removal of all landing-local tokens).

**Verified assumption — auth layout non-existence**
AC-25 claims "confirmed no auth-specific layout exists." Verified: `apps/rpg-tracker/app/(auth)/layout.tsx` does not exist. Assumption is accurate.

**Verified assumption — tokens.css @layer base at lines 12–18**
AC-50b references "lines 12–18." Verified: the `@layer base` rule is exactly at lines 12–18. Assumption is accurate.

**MINOR — Arch RECOMMENDED-2 left open in spec**
The spec does not document the verified finding that nutri-log and mental-health do not render migrated components. This is a low-risk gap (reviewer verified it above) but the plan execution agent should confirm this via grep before starting implementation rather than relying on the assumption.

---

## Gate 5 — Work type classification correct

`type: visual` is appropriate. No new API endpoints, schema changes, or new features. The SkillEditModal is a new component but it wraps existing mutation logic (the current edit page's mutation). Token migration, CSS restyling, and the modal conversion are all visual-layer work. D-036 pipeline split is correctly applied. No TDD gate is required.

---

## Gate 6 — Zones correctly identified and complete

All four zones have explicit directory paths:

| Zone | Path | Verdict |
|------|------|---------|
| Shared UI tokens | `packages/ui/tokens/` | Correct |
| Shared UI components | `packages/ui/src/` | Correct |
| RPG Tracker app | `apps/rpg-tracker/app/` | Correct |
| Landing app | `apps/landing/app/` | Correct — `apps/landing/package.json` also listed |

No zones are missing. The nutri-log and mental-health apps are correctly excluded. The `packages/ui/src/index.ts` export file is listed in the manifest.

One gap: `apps/rpg-tracker/tokens.css` is at the app root (`apps/rpg-tracker/tokens.css`), not inside `app/`. It is listed in the manifest correctly. The zones table entry for RPG Tracker reads `apps/rpg-tracker/app/` which technically excludes this file. This is a cosmetic imprecision only — the file is in the manifest.

---

## Gate 7 — Contradictions between spec, arch-review, and ux-review

No contradictions found between documents on resolved items. All three reviews are consistent on:

- Token reconciliation strategy (migrate 5 + extend 9)
- Parallelisation sequence (A → B → pages.css → C; D independent)
- SkillEditModal as a new shared component, not a page-level component
- Session route extraction explicitly deferred to Phase 2
- No TDD gate per D-036

One near-contradiction worth noting: the arch review flags `nutri-saas.css` and `mental-calm.css` as using old token names as canonical names, implying shared components would break in those apps after token migration. The spec does not document a resolution. Reviewer verified above that this risk is in fact negligible (neither app renders the 19 migrated components). However, the spec and arch-review leave this ambiguous — the plan document should include a pre-implementation grep verification step to confirm.

---

## Spec Review Findings

1. **BLOCKER — AC-30 underspecified for landing globals.css migration.** The spec states the bespoke `:root` block is removed entirely and all references replaced with canonical tokens. However `apps/landing/app/globals.css` contains ~15 bespoke tokens (`--gold-faint`, `--gold-border`, `--gold-border-hover`, `--gold-dark`, `--gold-light`, `--emerald`, `--emerald-faint`, `--emerald-border`, `--sage`, `--sage-faint`, `--sage-border`, `--bg-elevated` in its bespoke form) plus numerous hardcoded `rgba()` values that have no canonical `--color-*` equivalents. The partial mapping in AC-30 covers only 5 of ~20 token references in use. Without a complete mapping table or a scoped-replacement strategy, the implementer cannot complete AC-30 without making undirected design decisions. Required fix: either expand AC-30 to provide a complete replacement mapping for all bespoke tokens, or restate the strategy as "replace only the five overlapping tokens with canonical equivalents; retain landing-local tokens (`--gold-faint`, `--gold-border`, etc.) as a landing-local block."

2. **MINOR — AC-3, AC-4, AC-5 use approximate/subjective language** ("near-white", "medium grey", "a shade darker or lighter", "slight transparency"). These cannot be asserted as pass/fail by code inspection. Recommended: remove or replace with references to the style guide palette values, which are the authoritative source for exact hex values.

3. **MINOR — AC-49 conditional not pre-resolved.** "If the current value is borderline, adjust." Pre-resolve: specify the exact `--color-muted` value for Minimal, or remove the conditional entirely.

---

## Verdict

NO-GO

- **AC-30:** Expand or restate the `apps/landing/app/globals.css` migration strategy. The current text ("remove the bespoke `:root` block and replace all references with canonical `--color-*` tokens") cannot be executed as written because approximately 15 bespoke landing tokens (`--gold-faint`, `--gold-border`, `--gold-dark`, `--gold-light`, `--emerald-*`, `--sage-*`, `--bg-elevated` as a bespoke token, and hardcoded `rgba()` colour values) have no canonical counterparts. Choose one of: (a) state that landing-local tokens are retained as a scoped `:root` block and only the five overlapping tokens (`--bg`, `--bg-surface`, `--bg-elevated`, `--text-primary`, `--text-secondary`, `--text-muted`) are replaced with canonical tokens; or (b) provide a complete mapping table for every bespoke token in use. Without this fix the implementer will either break the landing page CSS or make arbitrary design decisions.

---

## Re-Review (iteration 2)

**Date:** 2026-03-22
**Scope:** Previous BLOCKER (AC-30) + minor issues from iteration 1 (AC-3/4/5, AC-49, landing file manifest consistency).

### Previous BLOCKER — AC-30

**Status: RESOLVED.**

The updated spec chose option (a) from the first review's required fix. AC-30 now states a "scoped replacement" strategy: the six overlapping tokens (`--bg`, `--bg-surface`, `--bg-elevated`, `--text-primary`, `--text-secondary`, `--text-muted`) are replaced with canonical `--color-*` equivalents, and all landing-local tokens (`--gold-*`, `--emerald-*`, `--sage-*`) are explicitly retained in a landing-local `:root` block. The full landing restyle is deferred to Phase 7 in Non-Goals (line 238).

The file manifest entry (line 108) is consistent with AC-30: it describes the same six-token replacement and the same retention strategy. No mismatch between the AC and the manifest.

One cosmetic inconsistency noted: AC-30's section header reads "5 overlapping names" but the bullet list enumerates 6 items. The file manifest entry correctly says "6 overlapping tokens." The list of 6 is the operative statement and is unambiguous — the "5" in the header is a typo. This does not affect implementability.

### Minor issues from iteration 1

**AC-3, AC-4, AC-5 (approximate language)**
Still present. These ACs retain language such as "must be lighter than", "must differ visibly", and "must differ from" without providing exact hex values. However, each AC now explicitly directs the implementer to the corresponding style guide for authoritative values (AC-3 cites `Documentation/style-guide/minimal.md`, AC-4 cites `retro.md`, AC-5 cites `modern.md`), and AC-6 provides the assertable gate (all tokens must exist and resolve in all three theme files). The style guides are the canonical palette source per the three-layer architecture. For a visual spec with no TDD gate (D-036), this delegation to the style guide is an acceptable resolution. These ACs serve as implementer orientation notes; AC-6 is the code assertion. No further change required.

**AC-49 (conditional not pre-resolved)**
Partially resolved. The updated text (spec line 214) now provides the implementer with a definitive starting value (`#6b7280`) and confirms it passes AA (4.6:1). The remaining conditional — "unless visual review identifies readability issues, in which case it may be darkened" — is now framed as a post-implementation visual review adjustment, not an implementation-time decision. The implementer has a clear, unambiguous value to write. This is acceptable for a visual spec. No further change required.

**Landing file manifest consistency with AC-30**
Consistent. Both AC-30 and the file manifest entry (line 108) describe the same six-token scoped replacement and the same retention of landing-local tokens. No contradiction.

### New issues

None identified.

### Updated Verdict

GO

The single BLOCKER from iteration 1 is resolved. All minor issues are either resolved or acceptable for a visual spec. The spec is ready to proceed to Phase 5 (Plan Review).
