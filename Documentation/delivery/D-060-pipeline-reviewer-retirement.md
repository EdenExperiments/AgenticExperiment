# D-060 — Pipeline Reviewer Retirement (Signed Delivery Artifact)

**Status:** Repo-side code/docs complete; workflow YAML requires CODEOWNER merge  
**Decision:** D-060 (see `Documentation/decision-log.md`)

## Acceptance

- [x] `pr-review.ts` removed; package scripts removed
- [x] `fix-attempt.ts` decoupled from custom reviewer schema; Sonar-first + optional Bugbot prose
- [x] Handbook and archive docs describe three-lane model (Bugbot / SDK / Automations)
- [x] `cursor-pr-review.yml` retired (inert `workflow_dispatch` stub)
- [x] `cursor-fix-attempt.yml` gate simplified (`/cursor-fix` + `workflow_dispatch` only)
