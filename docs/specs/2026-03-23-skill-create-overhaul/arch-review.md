# Architecture Review — Skill Create Overhaul (Phase 6)

**Reviewer:** architect agent
**Date:** 2026-03-23
**Spec:** `docs/specs/2026-03-23-skill-create-overhaul/spec.md`
**Verdict:** APPROVED

---

## Schema Impact

None. Verified against `Documentation/architecture.md` and `Documentation/decision-log.md`.

The spec's claim is correct. All data required by the new flow already exists:
- Presets: `GET /api/v1/presets` returns `id`, `name`, `description`, `category_id`, `category_name`, `category_slug` — exactly what `PresetGalleryProps` declares.
- Categories: `GET /api/v1/categories` is already wired in the current page.
- Calibration: `POST /api/v1/calibrate` is already called; returns `suggested_level`, `rationale`, `gate_descriptions`.
- Skill creation: `POST /api/v1/skills` payload is unchanged.
- API key status: `GET /api/v1/account/api-key` returns `{ has_key: boolean, key_hint?: string }` — already consumed in the current page via `getAPIKeyStatus`.

No migrations required.

---

## Service Boundaries

The decision to place all five new components in `packages/ui` (P6-D5) is architecturally sound with one qualification.

**What is clearly correct:**
- `PathSelector`, `PresetGallery`, and `ProgressionPreview` are self-contained UI primitives with no coupling to rpg-tracker routing or TanStack Query. Placing them in the shared library is correct.
- `ArbiterAvatar` and `ArbiterDialogue` have generic enough props (`state`, `text`, `animate`, `variant`) to justify shared placement.

**Qualification — data ownership for `PresetGallery`:**
The component receives a `presets` prop (caller provides data). This is the correct pattern — the component does not call the API itself. The page remains the data owner. No service contract concern.

**Qualification — `ProgressionPreview` embeds D-014 constants:**
The component derives its timeline from the D-016 tier structure (11 tiers, gate levels 9–99). These constants must be inlined in the component, not fetched. This is correct per P6-D6 and matches the spec's "derived from D-014/D-016 constants — no API call needed." The risk is that if D-014 is ever revised, `ProgressionPreview` is a silent divergence point. This is acceptable given that D-014 is a confirmed, stable decision — but the constants should be imported from a shared `xpcurve` constants module rather than duplicated inline. See Findings.

**API surface changes:** None. No new endpoints. No changes to existing request/response shapes.

---

## ADR

None required. P6-D5 (Arbiter in shared UI) is documented in the spec's Decisions table and is a straightforward extension of the existing shared component pattern. No significant new architectural direction is being established.

---

## Shared Package Risk

**5 new exports to `packages/ui/src/index.ts`.**

Current barrel file has 55 exports across 35+ components. Adding 5 more is a low mechanical risk but carries the standard shared-package coordination requirement.

**Risk assessment:**

| Risk | Severity | Mitigation |
|------|----------|------------|
| `apps/nutri-log` or `apps/mental-health` break on barrel re-export | Low — both apps are scaffolded, not importing skill-create components | Run `pnpm turbo run build` after adding exports (already mandated in spec) |
| `ProgressionPreview` hardcodes tier constants inconsistent with D-014 | Medium — silent divergence if constants are copy-pasted | Import constants from shared source; see Findings MINOR-1 |
| `ArbiterAvatar` and `ArbiterDialogue` add animation code that ignores `--motion-scale` | Medium — ACV-21 is an AC but easy to miss during implementation | Reviewer must verify `calc(Nms * var(--motion-scale))` pattern on all animated elements |
| Name collision risk in barrel | None — all 5 names are unique and descriptive |  |

**Build verification gate:** The spec correctly mandates `pnpm turbo run build` after barrel modification. This is sufficient given current app states.

---

## Findings

### MINOR-1 — ProgressionPreview tier constants must reference a single source of truth

The spec says `ProgressionPreview` displays tier names and gate boundary levels from D-014/D-016 "derived from constants." The current page (`skills/new/page.tsx`) already has a local inline object `tierBoundaries` (line 393) that only covers levels 10–40 and is missing tiers 5–11 entirely. `ProgressionPreview` must not repeat this pattern.

**Fix:** The frontend agent must either (a) import the tier/gate constants from `@rpgtracker/api-client` if they are exported there, or (b) define a `TIERS` constant file within `packages/ui/src/` (e.g., `tierConstants.ts`) that is the single source for all 11 tier names, gate levels [9,19,29,39,49,59,69,79,89,99], and D-020 colours. `ProgressionPreview` and `TierBadge` (already in the barrel) should both import from it.

This is a MINOR finding — it does not block approval, but implementation must not copy-paste the constants.

### MINOR-2 — Step indicator label mismatch on path-selector pre-step

The current `page.tsx` renders the step indicator (Identity / Appraisal / The Arbiter) immediately, including when the user is on Step 1. The spec introduces a full-screen path selector *before* Step 1. When the user is on the path selector, the step indicator must not be visible (it is meaningless before a path is chosen). The implementation must conditionally suppress the step indicator on the path-selector screen.

This is already implied by the spec's flow description but is not explicitly called out in the ACs. The frontend agent should treat this as a required behaviour.

### MINOR-3 — State machine: Back-to-selector draft reset must also clear `calibrateMutation` state

P6-D11 says navigating back to the path selector resets all draft state. The current `calibrateMutation` is a TanStack Query mutation that holds its own `data`/`error` state. If the user navigates back after a failed or successful calibration, `calibrateMutation.reset()` must be called alongside the draft reset, otherwise the prior mutation result leaks into the next attempt.

This is a wiring detail, not a spec defect. Flagged so the implementer does not miss it.

---

## Parallelisation Map

Tasks that CAN run in parallel:

- **T1** — Implement `PathSelector` component in `packages/ui/src/PathSelector.tsx`
- **T2** — Implement `PresetGallery` component in `packages/ui/src/PresetGallery.tsx`
- **T3** — Implement `ProgressionPreview` component in `packages/ui/src/ProgressionPreview.tsx` (depends on MINOR-1 constants file — see T0 below)
- **T4** — Implement `ArbiterAvatar` component in `packages/ui/src/ArbiterAvatar.tsx`
- **T5** — Implement `ArbiterDialogue` component in `packages/ui/src/ArbiterDialogue.tsx`

T1–T5 have no inter-dependencies and can be developed concurrently within the same zone (`packages/ui`). However, since all five touch the same package, a single agent session should handle them sequentially to avoid barrel-export conflicts. If a parallel worktree is used, the barrel export additions must be consolidated before the page rework begins.

Tasks that MUST be sequenced (and why):

- **T0 → T3:** Define the tier constants file (`tierConstants.ts` or equivalent) before implementing `ProgressionPreview`. `ProgressionPreview` depends on these constants. (MINOR-1 fix.)
- **(T1–T5 all exported to barrel) → T6:** The page rework (`apps/rpg-tracker/app/(app)/skills/new/page.tsx`) must begin only after all five components are exported from `packages/ui/src/index.ts`. The page imports all five — partial exports will cause TypeScript build errors.
- **T6 → build verification:** After page rework is complete, run `pnpm turbo run build` from the repo root to verify `apps/nutri-log` and `apps/mental-health` are not broken by the barrel changes.
- **T6 → visual review:** Reviewer AC gate runs after T6 is complete and the build is green.

Recommended execution order for a single-agent session:
```
T0 (constants) → T3 (ProgressionPreview) in parallel with T1, T2, T4, T5
→ barrel exports added to index.ts
→ T6 (page rework)
→ pnpm turbo run build
→ visual review
```

---

## Approval

APPROVED

The spec is technically sound. Schema impact is correctly assessed as none. All five API contracts supply the fields the new components require. Shared package placement is appropriate. The three findings are MINOR implementation-discipline notes that do not require spec changes — they are guidance for the frontend agent.
