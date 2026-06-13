---
name: tdd-dispatch
description: Orchestrate the TDD chain for one task artifact — test-writer (red), implementer (tests locked), verifier — ending in a draft PR.
---

# TDD Dispatch

## When to use

For every delivery task with a signed artifact (`/fix`, `/feature`, and each task of `/epic` /
`/new-project`). The orchestrator running this stays thin: it never reads large files or runs
noisy commands directly — exploration and shell work route through subagents that return
summaries.

Do not use for pure visual composition work (D-036): route that through style/page guides and
visual review instead of faux-TDD.

## Inputs

- The task artifact (`task-NN.md`): acceptance criteria, target paths, named verification command
- The subagent roster in `.cursor/agents/` (routing by the task's target paths)

## Ceremony levels

- `fix`: one task artifact, no elicitation; require reproduction and regression-test acceptance.
- `feature`: signed requirements first, then one task artifact unless decomposition is needed.
- `epic`: signed requirements plus `task-list.md`; dispatch each `task-NN.md`, parallelizing only
  dependency-free tasks with non-overlapping target paths.

## Outputs

- Failing-then-passing tests + implementation on a fresh branch
- Verifier verdict with evidence
- A draft PR into the Pillar B convergence loop with verification evidence attached

## Procedure

1. Select the stack pair from the task's target paths: `apps/api/**` → `test-writer-go` +
   `implementer-go`; TS paths → `test-writer-ts` + `implementer-ts`. The verifier is shared.
2. Dispatch the test-writer with the artifact path. It writes tests only.
3. **Red confirmed**: run the named verification command yourself; the new tests must fail for the
   right reason (missing behavior). This also catches vacuous tests. If they pass already, stop —
   the task or the tests are wrong.
4. Create the TDD lock (`touch .cursor/tdd-lock`), then dispatch the implementer with the artifact
   + test report. The hook denies test-file edits while the lock exists. Remove the lock
   (`rm .cursor/tdd-lock`) when the implementer finishes.
5. Dispatch the verifier: independent verdict per acceptance criterion, evidence required.
6. On overall pass, open a **draft PR** referencing the artifact, with test output (and any
   browser/E2E evidence) attached. Bugbot review, the severity gate, CI + Sonar, and human
   approval take it from there. On fail, iterate (implementer again) or escalate after 3 cycles.

## Examples

### Positive

- task-02 (typed client): test-writer-ts writes failing contract tests; red confirmed; lock on;
  implementer-ts makes them green; verifier passes all criteria; draft PR opened with output.

### Negative

- Implementer edits a failing test "to match the implementation"; or tests pass on first run and
  the chain proceeds anyway.
