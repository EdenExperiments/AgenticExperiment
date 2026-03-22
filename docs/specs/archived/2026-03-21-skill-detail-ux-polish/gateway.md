# Gateway — skill-detail-ux-polish
Date: 2026-03-21
Verdict: GO

## Findings

- Both arch-review and ux-review are APPROVED. Arch: first-pass APPROVED. UX: pass-2 APPROVED after all five CHANGES-NEEDED items were resolved in the revised spec.

- AC verifiability: all mechanically testable ACs have a corresponding assertion strategy. AC-20 and AC-21 are explicitly marked "not a code assertion / manual QA only" in the spec — this is acceptable because AC-01's class-scan and AC-11/AC-13–15's string-absence tests enforce the underlying implementation constraint. No AC in the test-enforced list uses subjective language.

- Minor test-scope gaps (Section 8 does not enumerate tests for AC-03, AC-05, AC-16, AC-17, AC-18, AC-19) are acceptable. Section 8 opens with "the tester agent should write" and lists representative tests; it is not exhaustive. The tester agent is expected to derive tests for all ACs, not only those enumerated. These gaps are MINOR and do not block.

- No contradictions found between spec, arch-review, and ux-review. The arch-review's `hasApiKey` observation (arch-review.md line 108–110) is correctly noted as "no action required now" and does not conflict with any spec AC.

- Parallelisation map is consistent with Section 6 zones. T2a/b/c cover `packages/ui/src/` (shared — coordinate); T3 covers `apps/rpg-tracker/app/(app)/skills/[id]/page.tsx`. No zone is touched by a task without being declared in Section 6.

- No hidden assumptions. AC-19 cites specific file and line numbers (`packages/api-client/src/types.ts` line 102, `BlockerGateSection.tsx` line 18) that the arch-review independently verifies. The "no new props" constraint is confirmed structurally, not assumed.

- No showstoppers.

## Parallelisation Map (from arch-review)

### Pre-condition (must complete before any task below)

**T1 — Write failing tests** (tester agent)

The spec's test scope (Section 8) defines tests that assert against DOM output, class strings, inline styles, and aria attributes. All tests will fail against the current implementations. T1 must complete before T2 and T3 begin so the TDD gate is meaningful.

Why T1 must precede T2/T3: the tester agent's tests define the exact assertions the implementation must satisfy (class-scan for `bg-amber-50`, height assertions, label-count assertions, `aria-label` format). Writing tests after implementation defeats the TDD contract.

---

### Tasks that CAN run in parallel (after T1 is merged)

- **T2a — `BlockerGateSection.tsx` polish** (frontend): CSS variable migration, requirements callout, remove "future update" copy, Submit button styling.
- **T2b — `XPBarChart.tsx` polish** (frontend): height increase, x-axis labels, `title`/`aria-label` format, CSS variable colours.
- **T2c — `GateVerdictCard.tsx` polish** (frontend): CSS variable migration, SVG/aria icon replacements.

These three files are independent of each other. No component imports another. No shared type is being modified. All three can be worked simultaneously in a single worktree (single frontend agent) or across parallel sessions without merge conflict risk, because their file paths do not overlap.

- **T3 — `page.tsx` copy & layout fixes** (frontend): streak copy fix (AC-17), "Last 30 Days" label font (AC-18), `activeGateSubmission` prop pass-through (AC-19).

T3 can run in parallel with T2a/T2b/T2c if and only if no prop interface changes are made in T2a–T2c. The spec's Section 7 Non-Goals explicitly prohibits prop interface changes. This constraint is confirmed by inspecting the existing props: `activeGateSubmission` already exists on `BlockerGateSection`'s props interface (line 18 of the current file), so T3 does not depend on any T2a implementation change.

---

### Tasks that MUST be sequenced (and why)

1. **T1 before T2a, T2b, T2c, T3.** Reason: TDD gate. Failing tests must exist before implementation so passing them is the completion signal.

2. **T2a, T2b, T2c before final QA pass.** Reason: the visual quality bar (AC-20, AC-21) requires manual review of all three components together in a running rpg-game theme. Individual component changes can be merged as they complete, but the QA sign-off pass requires all three to be present in the same build.

3. **All T2/T3 tasks before closing the spec.** Self-evident sequencing — no architectural risk, just process completion.
