---
name: safe-edit-and-verify
description: Apply edits with lightweight safeguards and mandatory checks.
---

# Safe Edit And Verify

## When to use

Use whenever changing source, config, workflows, or docs that affect execution behavior.

Do not use for read-only analysis tasks.

## Inputs

- Target files and intended change
- Known verification commands (lint, tests, type checks)

## Outputs

- Minimal diff with focused changes
- Verification evidence (pass/fail with follow-up fixes)

## Procedure

1. Edit the smallest set of files needed to satisfy the request.
2. Keep additive rollout where possible before enabling aggressive automation.
3. Run relevant lint/tests for touched areas.
4. Fix issues introduced by the change.
5. Report what was changed and what was verified.

## Examples

### Positive

- "Add a pre-commit hook, run lint/test, then adjust scripts until checks pass."

### Negative

- "Make broad refactors and skip validation because CI will catch it later."
