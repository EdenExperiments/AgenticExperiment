---
name: debug-failure-loop
description: Diagnose failing checks with evidence-first iteration.
---

# Debug Failure Loop

## When to use

Use when lint, tests, builds, or workflow checks fail.

Do not use when no reproducible failure exists.

## Inputs

- Failing command output
- Candidate files and recent edits

## Outputs

- Root cause summary
- Minimal fix
- Re-run verification evidence

## Procedure

1. Reproduce the failure exactly and capture the first actionable error.
2. Isolate whether failure is config, code, environment, or test data.
3. Apply the smallest fix that addresses root cause.
4. Re-run the original failing command.
5. Repeat until command passes or blocker is explicit.

## Examples

### Positive

- "Fix a TypeScript import error, re-run tests, then confirm no follow-up regressions."

### Negative

- "Change multiple unrelated files after a failing test without isolating the root cause."
