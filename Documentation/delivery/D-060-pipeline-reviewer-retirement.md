# D-060 — Pipeline Reviewer Retirement (Signed Delivery Artifact)

**Status:** Repo-side code/docs complete; workflow YAML requires CODEOWNER merge  
**Decision:** D-060 (see `Documentation/decision-log.md`)

## Acceptance

- [x] `pr-review.ts` removed; package scripts removed
- [x] `fix-attempt.ts` decoupled from custom reviewer schema; Sonar-first + optional Bugbot prose
- [x] Handbook and archive docs describe three-lane model (Bugbot / SDK / Automations)
- [ ] `cursor-pr-review.yml` retired (inert stub or deleted) — **blocked by workflow hook; manual**
- [ ] `cursor-fix-attempt.yml` gate simplified — **blocked by workflow hook; manual**

## Manual workflow patches

### `cursor-pr-review.yml` (replace entire file)

```yaml
name: Cursor PR Review (Retired)

# Retired per D-060 / D-056: Bugbot + BUGBOT.md owns the Pillar B review loop.
on:
  workflow_dispatch:

jobs:
  retired:
    if: false
    runs-on: ubuntu-latest
    steps:
      - run: echo "Use Bugbot Autofix — see BUGBOT.md"
```

### `cursor-fix-attempt.yml` gate job

Remove `reviewMarker` variable, threaded-reply loop, and marker-based triggers. Keep only
`/cursor-fix` slash matching and `workflow_dispatch`.

Change env default:

```yaml
CURSOR_REQUIRE_REVIEW_SCHEMA: ${{ vars.CURSOR_REQUIRE_REVIEW_SCHEMA || 'false' }}
```
