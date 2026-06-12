---
name: sdk-remediation-routing
description: Route gated SDK fix-attempt workflows with Sonar-first context and optional Bugbot advisory prose. Use when /cursor-fix is triggered or cursor-fix-attempt.yml runs.
metadata:
  domain: orchestration
  pillar: B-adjunct
paths:
  - "packages/cursor-agents/**"
  - ".github/workflows/cursor-fix-attempt.yml"
---

# SDK Remediation Routing

## When to use

When `cursor-fix-attempt.yml` runs, an operator posts `/cursor-fix`, or you are editing
`packages/cursor-agents/src/fix-attempt.ts` remediation behavior.

Do not use for highlight-only dependency comments (use `dependency-quality-triage` + `dep-assess`).

## Inputs

- PR number, labels, and `CURSOR_AUTO_FIX_*` variables
- Sonar PR issues and quality-gate status
- Optional Bugbot bot-comment prose (advisory only)
- `packages/cursor-agents/src/remediation-brief.ts` output shape

## Outputs

- Go/no-go decision against dual gate (D-047)
- Planner model pass → execution model pass routing
- Merged remediation brief (Sonar-primary)
- Fix branch/PR or explicit skip with reason

## Procedure

1. **Gate check:** `CURSOR_AUTO_FIX_ENABLED=true` AND `cursor:auto-fix` label on PR (unless `workflow_dispatch` with explicit override).
2. **Scanner wait:** honor `CURSOR_AUTO_FIX_WAIT_SCANNERS` and required check substrings.
3. **Context assembly:** Sonar issues first; merge GitHub check failures; optionally `findAdvisoryReviewContext()` for Bugbot prose.
4. **Planner pass:** `CURSOR_FIX_PLANNER_MODEL` — produce plan only, no writes.
5. **Executor pass:** `CURSOR_FIX_EXECUTION_MODEL` — implement with `CURSOR_REQUIRE_TEST_CHANGES` policy.
6. **Emit** `cursor-agent-run-summary:v1` JSON for metrics (M6).

## Examples

### Positive

- PR has Sonar MAJOR issues + `cursor:auto-fix` label + global flag on → planner outlines fix → executor adds unit test + implementation → summary artifact uploaded.

### Negative

- Missing label but global flag on → skip with "dual gate not satisfied".
