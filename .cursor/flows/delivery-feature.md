---
name: delivery-feature
description: Orchestrate /feature from scoped intent through signed requirements, TDD, and draft PR.
triggers:
  - command:/feature
pillars: [D]
lanes: [ide, cloud]
---

# Flow — Delivery Feature (`/feature`)

## Purpose

Build one scoped feature through Pillar D: moderate ceremony (lighter than `/epic`), artifact at
every stage, TDD for logic paths (D-036), draft PR into the Bugbot convergence loop.

## Entry conditions

- User invoked `/feature` or equivalent scoped feature request.
- Scope is bounded (one feature, not a multi-surface epic).

## Skill chain

1. **task-intake-and-scope** — normalize request, name verification command, identify target paths.
2. **requirements-elicitation** — produce signed `Documentation/delivery/<date>-feature-<slug>/requirements.md`.
3. **task-decomposition** — if more than one independently verifiable slice, write `task-NN.md` artifacts; otherwise a single `task-01.md` suffices.
4. **tdd-dispatch** — per task: test-writer → red confirm → TDD lock → implementer → verifier.
5. **finish-branch-and-pr** — draft PR with evidence; sync tracker if status changed.
6. **requirements-docs-maintainer** — when scope/status/decisions shifted during delivery.

## Subagent roster

| Step | Subagent | Routing |
|---|---|---|
| TDD test phase | `test-writer-go` / `test-writer-ts` | `apps/api/**` → Go; TS frontends + `packages/**` → TS |
| TDD implement | `implementer-go` / `implementer-ts` | Same path routing |
| TDD verify | `verifier` | Any stack (read-only) |
| Orchestration | `delivery-orchestrator` | When the parent agent should stay thin across multiple tasks |

## Artifacts

| Stage | Output path |
|---|---|
| Requirements | `Documentation/delivery/<date>-feature-<slug>/requirements.md` |
| Tasks | `Documentation/delivery/<date>-feature-<slug>/task-NN.md` |
| PR | Draft PR referencing artifact paths + verifier evidence |

## Exit criteria

- Verifier overall pass on every task artifact.
- Draft PR opened; Bugbot + CI + Sonar gates apply from there.
- Tracker/decision docs updated per D-059 if status or binding decisions changed.

## Anti-patterns

- Parent agent reads large diffs or runs noisy commands instead of delegating.
- Skipping red confirmation before TDD lock.
- Duplicating Bugbot review with a custom SDK reviewer (retired D-060).
