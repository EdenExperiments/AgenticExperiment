# Reviewer Spec-Draft and Plan Review Modes — Design

**Date:** 2026-03-19

---

## Goal

Add two new review modes to the `reviewer` agent so the custom pipeline no longer depends on superpowers for spec and plan review loops. Catch spec quality issues before the architect wastes time on a flawed spec, and catch plan quality issues before implementation begins.

---

## Context

The `reviewer` agent currently has two modes:
- **Spec Gate (Phase 4)** — reviews spec.md + arch-review.md + ux-review.md together, issues GO/NO-GO gateway.md
- **Code Gate (execute-plan step 7)** — reviews all changed source files, issues GO/NO-GO review.md

The reviewer is explicitly exempt from the ≤4-file read constraint (code gate already reads all changed files). This exemption extends to all reviewer modes.

The superpowers `brainstorming` and `writing-plans` skills use generic subagents as spec and plan reviewers. This design replaces that dependency with native reviewer modes.

---

## Components

### 1. Spec-Draft Review Mode

**When:** After Phase 1 (spec.md written by orchestrator), before Phase 2 (architect dispatch).

**Why Phase 1.5, not later:** If spec.md has unverifiable ACs or undefined zones, the architect will produce an arch-review based on flawed input — wasted work. Catching it at the source is cheaper.

**Input:** `spec.md` only

**Checks:**
- Every acceptance criterion is a verifiable code assertion (no "should feel fast", no "users will enjoy", no subjective language). Note: Phase 4 (spec gate) is still the authoritative AC gate — it checks ACs again after architect and UX review may have changed the spec. Phase 1.5 is a pre-flight on the draft only; it does not replace Phase 4.
- All zones (directory paths) that will be touched are explicitly named
- No hidden assumptions stated as facts (e.g. "the auth middleware already handles X" without citing source)
- Scope is bounded — no open-ended "and any related changes"

**Output:** Inline findings returned to orchestrator — no file written. This is a lightweight pre-flight, not a gate artifact. The orchestrator fixes spec.md and re-dispatches until findings are empty, then proceeds to Phase 2.

**Re-dispatch limit:** Max 2 iterations. If issues remain after 2 fixes, surface to the user — the spec may need a deeper requirements conversation.

---

### 2. Plan Review Mode

**When:** After Phase 5 (plan.md written by orchestrator), before `parallel-session` + `execute-plan`.

**Why Phase 5.5, not at code gate:** The code gate reviews implementation correctness. Plan review is a different concern — it checks that the plan is complete and executable before any work starts. A missing task or vague file path is far cheaper to fix in plan.md than to discover mid-implementation.

**Input:** `plan.md` + `spec.md`

**Checks:**
- Every spec AC maps to at least one task in the plan
- Every task references exact file paths (no "update the handler", no relative paths without base)
- Every implementation step has a corresponding verification step (grep, test command, or compile check)
- Every task has an explicit Done condition (a verification step — grep, test command, or compile check that confirms completion)

**Output:** Inline findings returned to orchestrator — no file written. Orchestrator fixes plan.md and re-dispatches until findings are empty, then runs `parallel-session` + `execute-plan`.

**Re-dispatch limit:** Max 2 iterations. If plan still has issues after 2 fixes, surface to user.

---

## Pipeline Changes

`plan-feature.md` gains two new steps:

```
Phase 1   — Spec Draft          (orchestrator writes spec.md)
Phase 1.5 — Spec-draft review   (reviewer: inline findings → fix loop → clean)
Phase 2   — Architecture Review (architect produces arch-review.md)
Phase 3   — UX Review           (ux agent produces ux-review.md)
Phase 4   — Spec Gateway        (reviewer: GO or NO-GO gateway.md)
Phase 5   — Implementation Plan (orchestrator writes plan.md)
Phase 5.5 — Plan review         (reviewer: inline findings → fix loop → clean)
            → parallel-session → execute-plan
```

---

## Files to Edit

| File | Change |
|------|--------|
| `~/claude-config/agents/reviewer.md` | Add spec-draft review mode section and plan review mode section; update the file-read exemption note to cover all modes (not just code gate) |
| `~/claude-config/skills/plan-feature.md` | Add Phase 1.5 dispatch after Phase 1; add Phase 5.5 dispatch before parallel-session |

---

## Out of Scope

- Changing the Phase 4 spec gate — it remains the formal GO/NO-GO gate with gateway.md output
- Changing the code gate — unchanged
- Writing output files for spec-draft or plan review — inline findings only (YAGNI)
- Quick Path — Phase 1.5 and Phase 5.5 are full-pipeline only. The Quick Path mini-spec has no review step and this design does not add one. Quick Path's simplicity constraint (≤3 files, no new API/schema) is its own quality gate.
