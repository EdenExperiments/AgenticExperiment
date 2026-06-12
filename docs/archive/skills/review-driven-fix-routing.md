# Review Driven Fix Routing (Archived)

> **ARCHIVED** — superseded for **PR review routing** by Bugbot + `BUGBOT.md` (D-056, D-060).
> The planner/executor + Sonar scanner pattern still applies to **SDK remediation**
> (`fix-attempt.ts`) and maintenance fixes. See `docs/CURSOR-AGENT-HANDBOOK.md`.

---

name: review-driven-fix-routing
description: Route PR remediation through planner and executor models with mandatory test and coverage gates.

## When to use

Use when an SDK remediation run reacts to Sonar/scanner failures, optional Bugbot advisory
context, dependency/security triage, and Renovate highlight comments — not as a second PR reviewer.

## Procedure

1. Gather context from PR diffs, SonarCloud metrics, optional Bugbot bot comments, and triage markers.
2. Run a planner model first (`CURSOR_FIX_PLANNER_MODEL`).
3. Run a cheaper executor model (`CURSOR_FIX_EXECUTION_MODEL`).
4. Require test updates when code files change.
5. Require SonarCloud PR new-code coverage threshold (`SONAR_MIN_NEW_COVERAGE`, default 80).
