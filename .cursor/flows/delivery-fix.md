---
name: delivery-fix
description: Orchestrate /fix for a known defect — minimal artifact, straight to TDD, draft PR.
triggers:
  - command:/fix
pillars: [D]
lanes: [ide, cloud]
---

# Flow — Delivery Fix (`/fix`)

## Purpose

Fix a known defect with minimal ceremony: skip elicitation, write one task artifact, run the TDD
chain, open a draft PR.

## Entry conditions

- Defect is reproducible; root area is identifiable.
- User invoked `/fix`.

## Skill chain

1. **task-intake-and-scope** — confirm defect scope and stack zone.
2. Write `Documentation/delivery/<date>-fix-<slug>/task-01.md` (reproduction, acceptance criteria, target paths, named verification command).
3. **tdd-dispatch** — full chain with TDD lock discipline.
4. **finish-branch-and-pr** — draft PR with regression evidence.

## Subagent roster

Same as [delivery-feature.md](./delivery-feature.md) TDD roster. Use **delivery-orchestrator**
only when the fix spans multiple stacks (rare — prefer splitting into separate tasks).

## Artifacts

- `Documentation/delivery/<date>-fix-<slug>/task-01.md`
- Draft PR with test output attached

## Exit criteria

- Defect no longer reproduces; regression test exists.
- Verifier pass; draft PR opened.
