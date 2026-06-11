---
name: task-decomposition
description: Decompose a signed requirements artifact into independently-verifiable tasks routed to stack-specific subagents.
---

# Task Decomposition

## When to use

In `/epic` and `/new-project` flows, after the requirements artifact (and architecture artifact,
for projects) is signed off.

Do not use for single-task `/feature` or `/fix` work.

## Inputs

- The signed `requirements.md` (and `architecture.md` when present)
- The composition contract (`docs/guides/agent-composition-contract.md`) for routing targets

## Outputs

- `task-list.md`: ordered task table (ID, summary, target paths, depends-on, verification command)
- One `task-NN.md` per task containing everything the executing agent needs (self-contained:
  SDK runs and cloud agents share no state): scope, acceptance criteria copied from requirements,
  target paths, named verification command, and explicit out-of-scope notes.

## Procedure

Apply the task breakdown rules (brief §4a):

1. One task = one verifiable outcome with explicit acceptance criteria and a named verification
   command.
2. Self-contained context — the task file must stand alone.
3. Independence test before parallelising: tasks touching overlapping files/modules are serialised
   or merged.
4. Size cap: if a task cannot be verified in one PR, it is a plan, not a task — break it down
   again.
5. Tag each task with its target paths so routing to `implementer-go` / `implementer-ts` (and the
   matching test-writer) is mechanical, never improvised.

## Examples

### Positive

- An epic touching the Go API and the dashboard becomes: task-01 (API endpoint, `apps/api/**`,
  `go test ./...`), task-02 (typed client, `packages/api-client/**`, package tests), task-03
  (dashboard UI, `apps/rpg-tracker/**`, targeted Vitest) — 02 depends on 01, 03 depends on 02.

### Negative

- "Task: build the feature" spanning three zones with no named verification command.
