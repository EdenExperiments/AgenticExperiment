---
name: sdk-remediation
description: Gated SDK fix-attempt — Sonar-first context, optional Bugbot advisory, dual gate.
triggers:
  - comment:/cursor-fix
  - workflow:cursor-fix-attempt.yml
pillars: [B-adjunct]
lanes: [sdk]
---

# Flow — SDK Remediation (Gated)

## Purpose

Optional remediation when CI/Sonar signal exists and operator explicitly enables auto-fix. Does
**not** replace Bugbot review (D-060).

## Entry conditions

- `CURSOR_AUTO_FIX_ENABLED=true` **and** PR has `cursor:auto-fix` label (D-047), **or**
  `workflow_dispatch` with explicit inputs.
- Required scanners complete (or timeout policy allows best-effort).

## Skill chain

1. **sdk-remediation-routing** — confirm gates, choose planner/executor models, assemble context.
2. **bugbot-advisory** — optionally ingest Bugbot bot-comment prose (not schema).
3. **debug-failure-loop** — on remediation failure or scanner timeout.
4. **safe-edit-and-verify** — before pushing fix commits.

## Subagent roster

Planner/executor split is implemented in `packages/cursor-agents/src/fix-attempt.ts` (not a
`.cursor/agents/` file). For IDE-side remediation experiments, delegate implementation to
`implementer-go` / `implementer-ts` and verification to `verifier`.

## Context sources (priority)

1. Sonar PR issues + quality gate (primary).
2. GitHub required check results.
3. Optional Bugbot advisory prose (`findAdvisoryReviewContext`).
4. `dep-assess` marker comments when dependency-related.

## Exit criteria

- Fix PR or branch push with test changes when `CURSOR_REQUIRE_TEST_CHANGES=true`.
- Run summary artifact emitted.
- No bypass of Bugbot severity status check for merge.

## Anti-patterns

- Treating SDK comments as merge gates.
- Reintroducing `cursor-pr-review-schema:v1` dependency (retired D-060).
