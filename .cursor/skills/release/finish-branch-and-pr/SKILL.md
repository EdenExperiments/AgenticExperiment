---
name: finish-branch-and-pr
description: Use when implementation is complete and you need to prepare branch, verification, and PR quality gates.
---

# Finish Branch And PR

## When to use

Use when implementation is done and the branch needs verification, docs sync, and PR preparation.

Do not use mid-implementation or for exploratory work.

## Inputs

- Changed files from `git status` / `git diff`
- Relevant CI expectations (`.github/workflows/ci.yml`, Sonar gate)
- `Documentation/feature-tracker.md` / `decision-log.md` state for the change

## Outputs

- Verified branch (tests/build evidence for touched areas)
- Docs/tracker updates completed for behavior or scope changes
- Focused PR with concise summary, practical test plan, and explicit risks/assumptions

## Procedure

1. Verify touched areas with the relevant test/build commands (smallest meaningful set first).
2. Confirm docs/tracker updates are complete for behavior or scope changes.
3. Review the diff for secrets and accidental unrelated changes.
4. Keep review scope restricted to changed paths unless failing checks or dependency impact force
   wider review.
5. Summarize change intent and test evidence clearly for reviewers.

## Examples

### Positive

- Feature branch ready: run targeted tests, sync the tracker row, write a PR body with test
  evidence and known risks.

### Negative

- Opening a PR with failing checks, undocumented scope changes, or a diff containing unrelated
  drive-by edits.
