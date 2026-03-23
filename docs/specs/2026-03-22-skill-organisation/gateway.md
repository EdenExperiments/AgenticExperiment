# Spec Gateway: Skill Organisation (Phase 3)

**Spec:** `docs/specs/2026-03-22-skill-organisation/spec.md`
**Reviewer:** reviewer agent
**Date:** 2026-03-23

---

## Spec Review Findings

### Review checklist

**1. Arch review approval**
APPROVED. arch-review.md verdict at end of document is unambiguous. Review covers schema safety, service boundaries, SkillStore interface extension, ADR for replace-all tag strategy, and a complete Parallelisation Map.

**2. UX review approval**
APPROVED. ux-review.md verdict is a re-review after an initial CHANGES-NEEDED pass. All originally flagged items are confirmed closed: multi-filter AND logic (P3-D8), tag save gesture (P3-D11), favourite async contract with dimming (P3-D12), mobile two-row toolbar (P3-D9), and all empty states.

**3. Logic ACs — verifiability**
AC-L1 through AC-L8 are all verifiable as code assertions:
- Every case names the HTTP method, path, input, and expected output (status code or field value).
- Edge cases are enumerated: malformed UUID vs. valid-UUID-not-in-table (AC-L1), empty string vs. absent field (AC-L2), toggling twice (AC-L3), empty tag_names (AC-L4), cross-user scoping (AC-L4, AC-L5), JSON `[]` vs. `null` requirement noted in arch-review.
- No vague or subjective language found in any logic AC.

**4. Visual ACs — implementation detail**
AC-V1 through AC-V9 carry sufficient specificity:
- Tap targets: 44px minimum cited explicitly in AC-V3 for both toolbar button and per-card icon.
- Token names: `--color-accent`, `--font-body`, `--font-display` cited by name.
- Empty state strings: exact copy specified for favourites filter (AC-V3), combined empty state (AC-V4).
- Toolbar layout: two-row structure with flex-1 and scrollable pills precisely described (AC-V3, AC-V4, referencing P3-D9).
- Debounce: 200ms cited in AC-V4.
- All three themes addressed in AC-V9 with no hardcoded values permitted.
- No subjective language ("should feel fast", "looks good") found in any visual AC.

**5. Work type classification**
`mixed` is correct per D-036. Backend schema/API work follows the TDD gate (logic ACs are the T1 test target). Frontend filter/display work follows the visual review path. The spec correctly identifies the split.

**6. Zone and agent assignment**
All four zones are named with explicit directory paths in the "Zones Touched" table. Shared packages (`packages/api-client/src/`) are flagged, and the arch-review Parallelisation Map documents the sequencing constraint (api-client types must be available before Next.js pages compile). Zone assignments match CLAUDE.md zone-to-agent mapping exactly.

**7. Decisions — no hidden assumptions**
All 14 P3-D decisions are stated as explicit, closed decisions with rationale. D-038 is marked resolved. The out-of-scope list explicitly names already-implemented items (QuickLogSheet, SkillEditModal) with source file paths to prevent re-implementation. No assumptions are stated as facts without a cited source. The `user_category_interests` table is explicitly called out as inert scaffolding — not silently ignored.

**8. Schema changes — migration safety**
- `ADD COLUMN category_id UUID … DEFAULT NULL` — non-blocking in PostgreSQL (nullable column, no table rewrite).
- `ADD COLUMN is_favourite BOOLEAN NOT NULL DEFAULT false` — non-blocking (constant default, no table rewrite).
- Backfill UPDATE has `WHERE category_id IS NULL` guard — idempotent on re-run.
- RLS on `skill_tags` uses EXISTS subquery referencing `skills.user_id` — consistent with existing `skills_self_rw` pattern per arch-review.
- All five indexes are appropriate and their rationale is documented in arch-review.

**9. Contradictions between documents**
None found. Cross-references (P3-D8, P3-D9, P3-D10, P3-D11, P3-D12, P3-D13, P3-D14) are used consistently across all three documents. The UX review explicitly confirms each decision it references matches the spec text.

**10. One minor implementation note (non-blocking)**
The arch-review recommends adding `idx_skill_tags_tag_id` for the `GET /api/v1/tags` skill_count query, noting it will be called on every skills list page load. This index is absent from the migration SQL in the spec. The arch-review flags it as non-blocking at current scale, but at production load it will matter. The backend agent should add it to migration 000009 during implementation — this does not require a spec revision.

**11. Navigation-away-without-save (non-blocking)**
No AC covers the discard path when a user navigates away from skill detail with an unsaved tag buffer. The UX review confirms "Navigation-away without saving will not create orphan tags" — this is mechanically correct given the local buffer pattern (P3-D11), but no explicit empty-buffer teardown or "unsaved changes" warning AC is specified. At current scope this is acceptable; the tag buffer is client-local state and naturally discarded on unmount. Document this as known behaviour if it surfaces in QA.

---

## Verdict

GO

The spec is complete, internally consistent, and technically sound. Both upstream reviews are APPROVED. All logic ACs are testable assertions. All visual ACs have sufficient detail for the frontend agent. The work type split is correctly classified. Schema migration is non-breaking. The Parallelisation Map in the arch-review provides clear sequencing for shared package changes.

**Pre-implementation reminders for agents (from arch-review — not blockers):**

- Backend: initialise `Tags` to `[]Tag{}` (not nil) in repository scan so JSON serialises as `[]` not `null`
- Backend: add `idx_skill_tags_tag_id` to migration 000009
- Backend: `UpdateSkill` signature change (adds `categoryID *uuid.UUID`) must be treated as an atomic refactor — function, interface, wrapper, handler, and all test mocks updated in one commit
- Backend: tag normalisation (lowercase + trim) in Go layer before DB UNIQUE constraint is tested
- Backend: `PUT /api/v1/skills/{id}/tags` replace-all must run in a single transaction (DELETE + INSERT)
- Frontend: read the skills-list and skill-detail page guides in `Documentation/page-guides/` before building components — page guides predate this spec on some elements but are authoritative for visual composition
