---
name: review-driven-fix-routing
description: Route PR auto-fix work through planner and executor models with mandatory test and coverage gates.
---

# Review Driven Fix Routing

## When to use

Use when an agent is reacting to PR review feedback, dependency/security triage, and SonarCloud findings to propose or apply fixes.

Use this for both human-authored PRs and trusted agent-authored PR remediation loops.

## Inputs

- PR metadata, changed-file diff snippets, and current labels
- Cursor PR review comment content
- Dependency/security triage context (Renovate/Mend/Dependabot and scanners)
- SonarCloud quality gate and coverage context
- Repo policy flags for auto-fix and labeling

## Outputs

- Two-stage model routing decision (planner model, executor model)
- Minimal scoped fix plan (max 1-2 high-signal fixes)
- Applied code changes plus updated unit tests
- Verification record including test and coverage gate outcomes

## Procedure

1. Gather context from PR diffs, review comments, security triage signals, and SonarCloud metrics (including deterministic merges of structured review findings with Sonar issue samples when both exist).
2. Run a planner model first (`CURSOR_FIX_PLANNER_MODEL`) to decide scope and validation order.
3. Run a cheaper executor model (`CURSOR_FIX_EXECUTION_MODEL`) to implement only the approved plan.
4. Require test updates when code files change; fail policy if code changed without test-file changes.
5. Require SonarCloud PR new-code coverage to meet threshold (`SONAR_MIN_NEW_COVERAGE`, default 80).
6. Keep fixes minimal, reversible, and limited to highest-signal findings.

## Examples

### Positive

- "Planner model selects two fixes from PR review + Sonar context; executor model patches code and updates unit tests; PR coverage gate passes at 82.4%."

### Negative

- "Single expensive model improvises broad refactors with no test updates and no coverage gate enforcement."
