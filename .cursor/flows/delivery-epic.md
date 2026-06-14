---
name: delivery-epic
description: Orchestrate /epic from signed requirements through decomposition, parallel-safe TDD dispatch, and per-task draft PRs.
triggers:
  - command:/epic
pillars: [D]
lanes: [ide, cloud]
---

# Flow — Delivery Epic (`/epic`)

## Purpose

Deliver a multi-task initiative through Pillar D: signed requirements, explicit task
decomposition, parallel-safe TDD dispatch, and one draft PR per independently verifiable task.

## Entry conditions

- User invoked `/epic` or a feature request is too broad for one verifiable PR.
- Work can be decomposed into task artifacts with target paths and named verification commands.

## Skill chain

1. **task-intake-and-scope** — normalize the request, identify zones, and define verification
   expectations.
2. **requirements-elicitation** — produce signed
   `Documentation/delivery/<date>-epic-<slug>/requirements.md`; stop for explicit sign-off.
3. **task-decomposition** — write `task-list.md` plus one `task-NN.md` per independently
   verifiable task.
4. **tdd-dispatch** — per task: test-writer -> red confirm -> TDD lock -> implementer -> verifier.
5. **finish-branch-and-pr** — open one draft PR per task with artifact and verification evidence.
6. **requirements-docs-maintainer** — when scope/status/decisions shifted during delivery.

## Subagent roster

| Step | Subagent | Routing |
|---|---|---|
| Orchestration | `delivery-orchestrator` | Required for multi-task dependency ordering and fan-out |
| TDD test phase | `test-writer-go` / `test-writer-ts` | `apps/api/**` -> Go; TS frontends + `packages/**` -> TS |
| TDD implement | `implementer-go` / `implementer-ts` | Same path routing |
| TDD verify | `verifier` | Any stack (read-only) |
| Exploration | built-in `explore` | Summarize broad codebase context before task dispatch |

## Parallelization rules

- Build dispatch waves from `task-list.md` dependencies.
- Tasks in the same wave may run in parallel only when target paths/modules do not overlap.
- Tasks with overlapping files, shared migrations, shared package contracts, or dependency ordering
  are serialized.
- Prefer many short agents over one long agent; each task artifact carries all required context.

## Artifacts

| Stage | Output path |
|---|---|
| Requirements | `Documentation/delivery/<date>-epic-<slug>/requirements.md` |
| Task list | `Documentation/delivery/<date>-epic-<slug>/task-list.md` |
| Tasks | `Documentation/delivery/<date>-epic-<slug>/task-NN.md` |
| PRs | One draft PR per task, each referencing artifact paths + verifier evidence |

## Exit criteria

- Every task artifact has an overall verifier pass.
- All task PRs are opened as drafts into the Bugbot convergence loop.
- Tracker/decision docs are updated per D-059 if status or binding decisions changed.

## Anti-patterns

- Parallelizing tasks that touch the same files/modules.
- Letting one agent implement multiple unrelated task artifacts.
- Skipping the signed requirements checkpoint before decomposition.
