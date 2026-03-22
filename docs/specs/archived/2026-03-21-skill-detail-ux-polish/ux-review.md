# UX Review — Skill Detail UX/UI Polish Pass

**Spec:** `docs/specs/2026-03-21-skill-detail-ux-polish/spec.md`
**Reviewed by:** UX agent
**Date:** 2026-03-21
**Verdict:** APPROVED (pass 2 — all five CHANGES-NEEDED items resolved)

---

## Flow Correctness

The end-to-end flow is coherent. This is a styling and copy pass on an existing page — no new routes, no new data, no new user actions. The structural rule from D-021 (gate section replaces the XP progress bar, never stacks below it) is preserved in Section 4. The stale "coming in a future update" copy is removed by AC-04. The gate section now communicates a clear action path: lock icon → requirements callout → Submit for Assessment CTA → attempt count.

The two flow gaps flagged in pass 1 are resolved:

- AC-03 now specifies that when `description` is null or empty the Requirements area is hidden entirely, preventing a broken empty prominent callout. Full-length display with no truncation is also explicitly accepted.
- AC-06 now specifies that when `attempt_number` is 0, null, or undefined the "Attempt N of ∞" line is hidden, preventing a nonsensical "Attempt 0 of ∞" render.

---

## Mobile Viability

**Verdict: VIABLE.**

### Touch targets

Section 7 cites the 44px minimum tap target constraint. Section 8 now includes an explicit test assertion that `data-testid="submit-gate-btn"` has `min-height` ≥ 44px. The highest-stakes CTA on the page is covered by a test, not just an inherited style assumption.

### XP chart x-axis labels on mobile (AC-09)

The stride formula is now `Math.max(1, Math.floor(data.length / 7))`. The clamp eliminates the stride = 0 path that would have been reached on any new skill with fewer than 7 days of logged XP. At stride = 1 with ≤ 7 data points every bar shows a label; at stride = 4 for 30 data points at most 7 labels render. Seven `Mar 19`-format labels at `text-xs` across a 343px mobile content width is tight but viable.

`title` attribute tooltips are desktop-only; the spec acknowledges this and does not claim per-day value readability on mobile. Per-bar height is sufficient for the chart's decorative-summary role on mobile.

### Chart height

192px (`h-48`) is usable on mobile for a summary bar chart with no required touch interaction.

### Layout

No layout changes affect the bottom tab bar or page structure. The gate section and chart section remain full-width block elements. No horizontal overflow risk.

---

## Navigation Changes

None. This spec is a styling pass on an existing page. No new routes. No bottom tab bar changes. No back-navigation changes.

---

## Edge Cases

All five edge cases flagged in pass 1 are now addressed in the spec:

1. **Empty/null gate description (AC-03):** Requirements area hidden entirely when description is empty. Resolved.
2. **Long gate description (AC-03):** Full-length display with no truncation explicitly accepted; 400-character vertical expansion on mobile is called out as acceptable. Resolved.
3. **data.length < 7 on XP chart (AC-09):** `Math.max(1, …)` clamp with explicit rationale prevents stride = 0. Resolved.
4. **Zero XP logged — chart empty state (AC-12):** Was already covered in pass 1. Remains covered.
5. **Active submission with missing attempt_number (AC-06):** Hide the line when attempt_number is 0, null, or undefined. Resolved.
6. **Future gate states (Section 3):** Explicitly out of scope, with the current states enumerated. Resolved.

---

## Approval

APPROVED

All five items from the pass-1 CHANGES-NEEDED verdict are addressed cleanly in the revised spec; no new UX gaps were introduced.
