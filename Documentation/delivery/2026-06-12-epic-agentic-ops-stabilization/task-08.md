# Task 08 — Branch protection + Bugbot severity status check (F-068)

**Kind:** operator-only (no code, skip TDD)  
**Feature:** F-068  
**Depends on:** task-07  
**Verification:** Manual — PR to `main` shows Bugbot severity check as required and blocking when MEDIUM+ open

## Scope

GitHub branch protection on `main` per operator checklist §M0 + §M3:

1. Require PR review (1 human approval).
2. Required status checks: `CI`, `SonarCloud Code Analysis` (quality gate), and **Bugbot "no open medium+ findings"** (exact name from dashboard).
3. Disallow force pushes.
4. Confirm `AGENTS_ENABLED` repo variable exists (`true`).

## Acceptance criteria

- [ ] Branch protection rule active on `main`.
- [ ] Bugbot severity check listed as required (copy exact check name into runbook).
- [ ] PR with intentional MEDIUM finding cannot merge until resolved or waived per policy.
- [ ] Custom SDK reviewer confirmed retired (`cursor-pr-review.yml` stub only).

## Target paths

- None (GitHub settings)

## Out of scope

- CODEOWNERS file edits (already configured).
- Workflow YAML changes.

## Open question for sign-off

Record the **verbatim status check name** as reported by Cursor/Bugbot in the operator checklist when wiring branch protection.
