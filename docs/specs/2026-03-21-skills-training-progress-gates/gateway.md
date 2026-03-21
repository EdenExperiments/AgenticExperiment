Second pass: GO — 2026-03-21

---

**Feature:** Skills — Training Sessions, Progress Visualisation & Gate Mastery
**Spec date:** 2026-03-21
**Gateway date (first pass):** 2026-03-21 — NO-GO
**Gateway date (second pass):** 2026-03-21 — GO
**Reviewer:** reviewer agent (Phase 4 gate)

---

## Second-Pass Check Results

### 1. xp_delta contradiction (was BLOCKER) — RESOLVED

AC-C4 now states definitively: "`xp_events.xp_delta` stores the **combined total** (`base_xp + bonus_xp`)." The clarifying sentence — "'Never hidden in the base delta' means the breakdown is always surfaced to the user (AC-C5) — it does not mean they are stored in separate ledger entries" — closes the ambiguity cleanly.

§9 D-014 binding constraint now reads: "`xp_events.xp_delta = base_xp + bonus_xp` (handler computes total before inserting). `LevelForXP()` is called with the combined total. `training_sessions.bonus_xp` stores the bonus portion for display." This is internally consistent with C4, C5, and C6.

The personal bests query in AC-F3 ("using the stored `xp_delta + bonus_xp` combined value") is now slightly redundant in phrasing — under Option A (confirmed), `xp_delta` already is the combined value, so the correct personal bests query is `MAX(xp_delta)` with no join needed. The phrase "combined value" is describing what xp_delta represents, not an arithmetic expression to evaluate. This is a non-blocking wording note; it does not introduce a contradiction given C4's explicit clarification. The plan should document the personal bests query as `SELECT MAX(xp_delta) FROM xp_events WHERE skill_id = ?` to prevent a developer misreading F3 as `xp_delta + bonus_xp` (which would double-count the bonus).

### 2. AC-B6 testability (was MINOR) — RESOLVED

AC-B6 now specifies:
- Work and break phases are rendered by **named animation variants** in `GrindAnimation.tsx` via a `phase="work" | phase="break"` prop — assertable by inspecting the prop interface and rendered output.
- Work phase progress ring accent: **skill's tier colour (D-020)** — assertable via CSS custom property value derived from the tier token.
- Break phase progress ring accent: **`--color-break: #60a5fa`** — assertable as a specific CSS custom property name and hex value.
- Break phase animation speed: **60% of work-phase speed** — assertable as a computed animation-duration ratio in the component.

All four criteria are code-assertable. No subjective language remains in B6.

### 3. BE-3 Parallelisation Map label (was MINOR) — deferred to plan (per first-pass ruling)

No change required in the spec. The plan must assign concrete task IDs mapping to the sequencing constraints in arch-review.md.

### New contradictions introduced — none

No new contradictions were introduced by the second-pass edits. The only residual wording ambiguity is the non-blocking F3 note above.

---

## Spec Review Findings (first pass, retained for history)

### BLOCKER — D-014 vs. C4 contradiction: what value is written to `xp_events.xp_delta`? — RESOLVED

### MINOR — AC-B6: "visually distinct" is not a testable assertion — RESOLVED

### MINOR — Parallelisation Map: BE-3 referenced but not defined — deferred to plan

### MINOR — F3 personal bests query: join path unstated — RESOLVED (Option A confirmed; join is not needed)

---

## Non-Blocking Notes for the Plan

1. **AC-F3 personal bests query wording** — The phrase "using the stored `xp_delta + bonus_xp` combined value" should be read as "xp_delta, which is the combined value." The plan must record the canonical query as `SELECT MAX(xp_delta) FROM xp_events WHERE skill_id = ?`. Do not join `training_sessions` for this query.

2. **BE-3 / BE-4 task labels** — The plan must define named tasks for (a) the sessions handler + LogXP signature change and (b) the gate handler, and wire them to the Parallelisation Map sequencing constraints in arch-review.md.

3. **OQ-4 implementation gate** — §9 records: the gate handler AI path cannot be merged until the user approves D-026 prompt template wording. The plan must schedule a user-approval checkpoint before implementing the AI branch of `POST /api/v1/blocker-gates/{id}/submit`. The self-report path and all other tasks are unblocked.

4. **OQ-1 still open** — Architect must verify that `skill_categories.slug` values in the live schema match the 9 slugs listed in D-023, and confirm the join path `skills → skill_presets → skill_categories`. This should be a T0 task in the plan before any animation-theme work begins.

---

## Items confirmed passing all 10 gateway criteria

1. Every US-01 through US-09 has at least one verifiable AC — confirmed.
2. All ACs are testable code assertions — confirmed (B6 now resolved).
3. No contradictions between spec, arch-review, and ux-review — confirmed.
4. Arch-review: APPROVED (second pass).
5. UX-review: APPROVED (second pass).
6. Schema changes complete: all columns referenced in ACs exist in §5. Migration ordering documented in §5.7. RLS handling explicit.
7. All 4 new API endpoints have defined request and response shapes. Existing endpoint changes enumerated. Pagination documented.
8. Out-of-scope items (§8) clearly listed. No OOS bleed into ACs.
9. Binding constraints stated in §9. All internally consistent.
10. Parallelisation Map present in arch-review.md. BE-3/BE-4 label gap deferred to plan as recorded.

---

## Verdict

GO
