---
name: maintenance-dispatch
description: Select and dispatch maintenance-queue items under confidence and bot-PR cap thresholds. Use when processing maintenance-queue.json from the daily digest or weekly Automation cron.
metadata:
  domain: orchestration
  pillar: C
paths:
  - "packages/cursor-agents/src/maintenance-queue*"
  - ".github/workflows/cursor-daily-quality-digest.yml"
---

# Maintenance Dispatch

## When to use

When `maintenance-queue.json` exists, a weekly maintenance Automation fires, or you are tuning
Pillar C queue scoring in `packages/cursor-agents/src/maintenance-queue*`.

Do not use for greenfield feature delivery (Pillar D flows).

## Inputs

- `maintenance-queue.json` artifact (Sonar + `tech-debt` issues normalised)
- `CURSOR_QUEUE_BOT_PR_CAP`, `CURSOR_QUEUE_TOP_K`, `CURSOR_QUEUE_SONAR_SEVERITIES`
- Open bot PR count

## Outputs

- Ranked dispatch list (≤ top-K)
- Per-item: dispatch lane (IDE TDD vs SDK remediation vs defer)
- Deferral reasons for items below threshold

## Procedure

1. Load queue artifact; abort if `AGENTS_ENABLED=false`.
2. Score items: confidence-to-fix vs blast radius (brief §3 Pillar C).
   - Favor: single-file, existing test coverage, Sonar effort ≤ 30 min.
   - Defer: cross-cutting refactors, missing tests, BLOCKER without reproduction.
3. Respect `CURSOR_QUEUE_BOT_PR_CAP` — do not dispatch if cap reached.
4. For each selected item:
   - Write minimal `task-01.md` when using TDD path, **or**
   - Hand to SDK `fix-attempt` only when gates satisfied, **or**
   - Trigger Cursor Automation with queue item payload.
5. Delegate triage scoring to **maintenance-scout** subagent when parent context is crowded.

## Examples

### Positive

- Queue has three MAJOR Sonar issues in tested TS files → scout recommends top 2 → `tdd-dispatch` on separate branches → draft PRs.

### Negative

- Dispatch ten items ignoring bot-PR cap.
