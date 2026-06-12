---
name: pillar-c-maintenance
description: Score and dispatch maintenance-queue items from Sonar + tech-debt issues.
triggers:
  - workflow:cursor-daily-quality-digest.yml
  - automation:weekly-maintenance-cron
pillars: [C]
lanes: [sdk, automation]
---

# Flow — Pillar C Maintenance Queue

## Purpose

Normalize Sonar findings and `tech-debt` GitHub Issues into a prioritised queue; dispatch only
items under confidence/blast-radius thresholds with a concurrent bot-PR cap.

## Entry conditions

- `maintenance-queue.json` artifact exists (daily digest workflow).
- `AGENTS_ENABLED` is not `false`.
- Open bot PR count below `CURSOR_QUEUE_BOT_PR_CAP`.

## Skill chain

1. **maintenance-dispatch** — read queue artifact, apply scoring thresholds, select top-K.
2. **task-intake-and-scope** — per selected item, write a minimal fix artifact if dispatching.
3. **tdd-dispatch** or **sdk-remediation-routing** — depending on whether item has test coverage.
4. **debug-failure-loop** — when dispatched fix fails CI.

## Subagent roster

| Role | Subagent | Mode |
|---|---|---|
| Queue triage | `maintenance-scout` | Read-only scoring + dispatch recommendation |
| Fix execution | `implementer-go` / `implementer-ts` | When TDD path chosen |
| Verify | `verifier` | Post-fix evidence |

## Artifacts

- Input: `maintenance-queue.json` (workflow artifact).
- Per item: optional `Documentation/delivery/<date>-maint-<slug>/task-01.md`.
- Output: draft bot PR or Automation dispatch record.

## Exit criteria

- Selected items dispatched or explicitly deferred with rationale.
- Bot PR cap respected.
- Weekly metrics fed via `cursor-agent-run-summary:v1` (M6).
