# Spec-Draft Review 2: Primary Skill Focus + Quick Session (Phase 4)

**Reviewer:** reviewer agent
**Date:** 2026-03-23
**Spec:** `docs/specs/2026-03-23-primary-skill-focus/spec.md`
**Pass:** Iteration 2 (second-pass review)

---

## Verification of Original Findings

| # | Original Severity | Fix Required | Status |
|---|---|---|---|
| 1 | BLOCKER | listSkills envelope — enumerate all callers | RESOLVED — P4-D6 eliminates the envelope change entirely. Consumer inventory table added showing all 5 callers unaffected. |
| 2 | MAJOR | current_streak optionality | RESOLVED — Algorithm section now says "treat `undefined`/absent as 0". AC-L6 extended to cover zero-streak case. Type fix added to scope. |
| 3 | MAJOR | PATCH content-type and toggle race condition | RESOLVED — Content-type specified as `application/x-www-form-urlencoded`. Stale-state race documented as accepted known limitation. |
| 4 | MINOR | Explicit unpin path not documented as out of scope | RESOLVED — "Explicit unpin: out of scope" section added. |
| 5 | MINOR | Migration number | RESOLVED — Changed to 000010, confirmed as next available (last in codebase is 000009_skill_organisation). |
| 6 | MINOR | AC-V3 navigation mechanism | RESOLVED — AC-V3 now specifies `Link` component (`next/link`). |
| 7 | MINOR | Loading skeleton not mentioned | RESOLVED — AC-V9 added; Frontend Changes section references skeleton update. |
| 8 | MINOR | AC-L6 missing zero-streak case | RESOLVED — AC-L6 explicitly covers zero-streak fallback. |
| 9 | OBS | Component prop type note | No fix required — unchanged. |

---

## New Issues Found in Revised Spec

### Issue A — MINOR: Endpoint URL prefix `/api/v1/user/` is inconsistent with all existing routes

The new endpoint is spec'd as `PATCH /api/v1/user/primary-skill`. Every existing API route uses either `/api/v1/skills/...` or `/api/v1/account/...` as the prefix. There is no existing `/api/v1/user/` prefix anywhere in the codebase. The router will need a new route group, and the naming is inconsistent with how account-level settings are grouped elsewhere (they live under `/api/v1/account`).

A more consistent path would be `PATCH /api/v1/account/primary-skill` (user-level setting alongside `PATCH /api/v1/account` for timezone/display_name and `PUT/DELETE /api/v1/account/api-key`).

**Impact:** If the implementation follows the spec literally, it introduces a novel URL prefix that will require a new route group in the Go router. This is not a blocker, but the inconsistency should be resolved in the spec before implementation so the backend agent doesn't have to make this call unilaterally.

**Required fix:** Change the endpoint to `PATCH /api/v1/account/primary-skill` (or add a note in the Decisions table explicitly justifying the `/user/` prefix and confirming a new route group is intended).

---

### Issue B — MINOR: Spec claims pin endpoint follows "same pattern as favourite toggle" but toggle sends no body

The spec rationale for P4-D5 states: "Pin/unpin via PATCH toggle — same pattern as favourite toggle". Inspecting `client.ts` line 188: `toggleFavourite` sends a bare `PATCH` with no body at all — the skill ID is in the URL path (`/api/v1/skills/${skillId}/favourite`). The new pin endpoint is structurally different: `skill_id` is in the request body, and the skill ID is absent from the URL.

This is not a blocker — the spec does correctly specify the content-type and body format elsewhere. The misleading rationale in the Decisions table could confuse the backend agent into implementing the wrong pattern.

**Required fix:** Update P4-D5 rationale to: "Pin/unpin via PATCH with skill_id in form body — similar toggle semantics to favourite, but skill_id is in the body rather than the URL since this is a user-level setting, not a per-skill toggle."

---

## Summary

All 8 original findings (2 blockers + 6 minors) are resolved. Two new minor issues were introduced by the revision:

| # | Severity | Issue |
|---|---|---|
| A | MINOR | Endpoint URL prefix `/api/v1/user/` inconsistent with all existing routes — suggest `PATCH /api/v1/account/primary-skill` |
| B | MINOR | P4-D5 rationale incorrectly describes the new endpoint as matching the favourite toggle pattern |

Neither issue blocks the spec from being usable, but Issue A in particular will force the backend agent to make an undocumented routing decision. Both should be fixed before Phase 2 handoff to avoid implementation drift.

These are the only two remaining items. If the orchestrator accepts the `/api/v1/user/` prefix as intentional and adds a Decisions note to that effect, Issue A is resolved inline. Issue B is a one-line rationale fix.
