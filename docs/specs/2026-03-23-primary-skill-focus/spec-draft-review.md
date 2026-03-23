# Spec-Draft Review: Primary Skill Focus + Quick Session (Phase 4)

**Reviewer:** reviewer agent
**Date:** 2026-03-23
**Spec:** `docs/specs/2026-03-23-primary-skill-focus/spec.md`

---

## Spec-Draft Review Findings

### Issue 1 — BLOCKER: `listSkills` envelope change breaks existing callers without a sequencing plan

The spec acknowledges that `GET /api/v1/skills` currently returns a flat `SkillDetail[]` and proposes changing it to `{ skills: [...], primary_skill_id: "..." }`. However the spec does not list or account for all callers that will break.

Known callers found in the codebase:

- `apps/rpg-tracker/app/(app)/dashboard/page.tsx` — `useQuery({ queryFn: listSkills })`, result typed as `SkillDetail[]`, destructured directly as `skills = []`
- `packages/api-client/src/client.ts` — `listSkills(): Promise<SkillDetail[]>` — return type must change

There are likely additional callers (skills list page, any component that calls `listSkills` directly). The spec does not enumerate them. For a shared-package change, the spec must list every call site that will break and state whether they are updated in the same task or a separate sequenced task.

**Required fix:** Add a "Consumers of `listSkills`" table to the Frontend Changes section, listing every file that calls `listSkills` or depends on its return type. State that all updates land atomically in the same implementation task (T2/T3).

---

### Issue 2 — MAJOR: `current_streak` field is optional in `SkillDetail` but algorithm treats it as a numeric comparator

In `packages/api-client/src/types.ts`, `SkillDetail.current_streak` is typed as `current_streak?: number` (optional). The algorithm in AC-L6 and the spec section "Algorithmic fallback" sorts by "highest `current_streak`". If `current_streak` is undefined on some skill objects, the tie-break behaviour is undefined.

The spec must either:
(a) assert that `listSkills` always populates `current_streak` (and the type should be `number`, not `number | undefined`), or
(b) define the fallback value when `current_streak` is absent (treat as 0).

This matters for the test assertion in AC-L6 — a test must be deterministic about how undefined streaks rank.

**Required fix:** Clarify whether `current_streak` is always present in the list response. If yes, update the type note in the spec. If no, define the "absent = 0" convention explicitly in the algorithm section.

---

### Issue 3 — MAJOR: Pin endpoint accepts form data but no CSRF protection is mentioned; `skill_id` as optional is ambiguous

The spec says the PATCH request body uses `skill_id (string, required)`. However, there is no specification of whether this is `application/x-www-form-urlencoded` (matching the existing form-based API pattern) or `application/json`. All existing mutation endpoints in `client.ts` use `FormData` (form encoding). The spec should make this explicit.

Additionally: if the toggle is "send the currently-pinned ID to unpin", the client must first know the current `primary_skill_id` before sending the request. This creates a read-before-write race condition that is not addressed. If two tabs are open or the data is stale, the toggle direction can be wrong.

**Required fix:** Specify the content type (form or JSON) explicitly. Add a note that the client reads `primary_skill_id` from the `listSkills` response envelope to determine toggle state, and that stale-state race is an accepted limitation (or define a mitigation).

---

### Issue 4 — MINOR: `skill_id` unpin path is not explicitly in the PATCH spec — only toggle by matching ID

The API spec states: "If `skill_id` matches the current `primary_skill_id`, unpin". This means there is no explicit "unpin without knowing the current ID" path. If a user wants to explicitly unpin (e.g. from a settings page in a future phase), they'd need a separate DELETE endpoint or the same PATCH with a sentinel value.

This is an acceptable design decision for now, but it should be documented as such rather than left implicit. The spec says "toggle pattern — same pattern as favourite toggle" — confirm this is intentional for Phase 4.

**Required fix:** Add a one-line note: "Explicit unpin (without providing the current skill_id) is out of scope for Phase 4. A DELETE endpoint can be added in a future phase."

---

### Issue 5 — MINOR: Migration number conflict risk

The spec proposes `000011_primary_skill.up.sql`. The latest confirmed migration in the codebase is `000009_skill_organisation`. There is no `000010` visible in the migrations directory. The spec should confirm whether `000010` exists (or is planned for another in-flight feature) before claiming `000011`. If `000010` is reserved or in progress, a collision is possible.

**Required fix:** Confirm the migration sequence. If `000010` is not yet taken, use `000010` instead of `000011`. Add a note in the spec stating the confirmed next migration number.

---

### Issue 6 — MINOR: AC-V3 is not a verifiable code assertion as stated

AC-V3 reads: `"Start Session" button on focus card navigates to /skills/[id]/session`

This is close to verifiable but slightly ambiguous — "navigates to" could mean `href`, `router.push`, or `window.location`. For the visual review gate, the reviewer needs to know exactly what to check. A more precise assertion would be: the button renders as an `<a href="/skills/[id]/session">` or calls `router.push('/skills/[id]/session')` with the focus skill's id.

**Required fix:** Tighten AC-V3 to specify the navigation mechanism (Link component or router.push) so the reviewer can verify the exact implementation.

---

### Issue 7 — MINOR: Dashboard loading skeleton does not account for the new focus card

The current `dashboard/page.tsx` loading skeleton renders: header placeholder, 4 stat card placeholders, one large block, one tall block. With the focus card added above stats, the loading skeleton needs a new placeholder at the top. This is not mentioned in the spec's frontend changes.

**Required fix:** Add a note in the Frontend Changes section: "The loading skeleton in `dashboard/page.tsx` must be updated to include a focus card placeholder above the stats skeleton."

---

### Issue 8 — MINOR: Algorithm step 5 (final fallback) is not referenced in AC-L6

AC-L6 reads: "The algorithmic fallback selects the skill with the highest current_streak, tie-breaking by is_favourite then updated_at DESC". The algorithm spec has a 5th step: "Final fallback: first skill by `updated_at DESC`" (for when no skill has any streak). This step is not tested in AC-L6.

If there are no skills with `current_streak > 0`, the algorithm should still return a skill. This case should either be tested or the spec should explicitly state it is covered by the `updated_at DESC` sort (step 4).

**Required fix:** Extend AC-L6 to cover the zero-streak case: "When no skills have a streak > 0, the algorithmic fallback returns the most recently updated skill."

---

### Issue 9 — OBSERVATION (no fix required): `Skill` base type vs `SkillDetail` in focus card

The `PrimarySkillCard` component will receive a `SkillDetail` from the `listSkills` response (since the dashboard already uses `SkillDetail[]`). The spec lists `tier_name`, `tier_number`, `xp_to_next_level` as displayed fields — these are on `SkillDetail`, not the base `Skill`. This is consistent with current practice. No change needed, but the component prop type should be `SkillDetail`, not `Skill`, in the implementation.

---

## Summary

| # | Severity | Status |
|---|----------|--------|
| 1 | BLOCKER | listSkills envelope change — enumerate all callers |
| 2 | MAJOR | current_streak optionality in algorithm |
| 3 | MAJOR | PATCH content-type and toggle race condition unaddressed |
| 4 | MINOR | Explicit unpin path not documented as out of scope |
| 5 | MINOR | Migration number — confirm 000010 is not taken |
| 6 | MINOR | AC-V3 — tighten navigation mechanism |
| 7 | MINOR | Loading skeleton not updated |
| 8 | MINOR | AC-L6 missing zero-streak fallback test case |
| 9 | OBS | Component prop type note — no fix required |

Two items require resolution before Phase 2 can proceed cleanly (Issues 1 and 2). Issues 3–8 should be addressed in the same spec revision.
