## Gateway Decision: GO

**Date:** 2026-03-23
**Reviewer:** reviewer agent (spec gate, Phase 4)
**Spec:** `docs/specs/2026-03-23-primary-skill-focus/spec.md`

---

## Spec Review Findings

### Contradictions between spec, arch-review, and ux-review

None. All three documents are internally consistent. The API contract, schema, and component behaviour agree across all documents.

### UX Review — CHANGES-NEEDED resolution

The UX review was submitted with status CHANGES-NEEDED and listed 8 required items. All 8 are present in the current spec:

1. "Log XP" re-targeting — covered by AC-V10.
2. Start Session tap target — covered by AC-V3 (`min-h-[48px]`).
3. Pin icon 44×44px tap area — covered by AC-V4.
4. Session route dependency — addressed inline: "The `/skills/[id]/session` route already exists (shipped in F-024)."
5. primary_skill_id set but skill not in list — covered in the algorithm description (step 2, lines 113–114).
6. Pin mutation loading/disabled state — covered by AC-V12.
7. Theme-neutral copy as explicit Phase 4 constraint — stated inline: "Theme-flavoured labels are deferred to the visual theming pass — Phase 4 uses a neutral 'Suggested' label."
8. Accessible label for pin toggle states — covered by AC-V11.

UX review changes are fully addressed. Effective status: APPROVED.

### Arch Review — APPROVED with two implementation notes

**D-041 reference:** The arch review noted D-041 was absent from the decision log. D-041 has since been added (decision-log.md line 59, 2026-03-23). Resolved.

**users.User struct gap:** The arch review identifies that the spec's backend description does not explicitly mention extending the `users.User` struct, the `GetOrCreateUser` SELECT query, and the Scan call to include `PrimarySkillID *uuid.UUID`. The arch review marks this as "must not be skipped" but "not a blocker to approval." AC-L4 ("GET /api/v1/account includes primary_skill_id field") provides a testable criterion that will catch any omission of this change. The arch-review document itself serves as the implementation reference for the backend agent. This is an implementation-time concern, not a spec gap.

### AC verifiability

All ACs are verifiable code assertions:

- AC-L1 through AC-L5: HTTP handler tests against concrete status codes and response bodies.
- AC-L6: Pure function unit test against a fixed input array.
- AC-V1 through AC-V12: DOM presence, attribute values, CSS class properties, and disabled state checks — all assertable in component tests.

No subjective language ("should feel fast", "looks good") appears in any AC.

### Hidden assumptions

None remaining. All decisions (P4-D1 through P4-D6) are stated explicitly with rationale. The algorithmic fallback is fully specified. The toggle stale-state limitation is named explicitly and accepted.

### Zones and files

All touched zones are named with explicit file paths:
- `packages/api-client/src/client.ts`, `types.ts`
- `packages/ui/src/PrimarySkillCard.tsx`
- `apps/rpg-tracker/app/(app)/dashboard/page.tsx`
- `apps/api/` (migration files, handler, service — arch review provides the struct/query specifics)

### Work type classification

Spec correctly classifies work as **mixed** per D-036:
- Logic/API path: migration, PATCH handler, GET /account extension → TDD gate (AC-L1–L6)
- Visual path: PrimarySkillCard component, dashboard layout change → visual reviewer gate (AC-V1–V12)

### Parallelisation Map

Present in arch-review.md. T-T1 (Go tests) and T-T2 (algorithm unit tests) can run in parallel with T-B1 (backend). T-C1 (API client types) must precede T-F1 (PrimarySkillCard). T-F1 must precede T-F2 (dashboard integration). Sequence is clear and correct.

---

## Implementation Notes for the Plan

The following items must appear in the plan — they are spec-correct but easy to miss:

1. **Backend:** Extend `users.User` struct in `apps/api/internal/users/service.go` to add `PrimarySkillID *uuid.UUID \`json:"primary_skill_id"\``, extend the `GetOrCreateUser` SELECT to read `primary_skill_id`, and update the Scan call. Without this, AC-L4 will silently fail regardless of migration correctness. (Source: arch-review.md, "users.User struct and GetOrCreateUser" section.)

2. **API client:** `SkillDetail.current_streak` must change from `current_streak?: number` (optional) to `current_streak: number` (required). Confirm all consumers that guard against `undefined` are updated — the spec identifies this as a breaking type change. (Source: spec line 120, arch-review.md "packages/api-client/src/types.ts" section.)

3. **Spec status:** Update spec frontmatter from `Status: DRAFT` to `Status: APPROVED` before plan creation.

---

## Verdict

GO
