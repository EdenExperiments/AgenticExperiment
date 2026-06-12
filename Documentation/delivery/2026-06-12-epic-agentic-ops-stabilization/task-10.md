# Task 10 — Weekly tech-debt Automation cron (F-069)

**Kind:** operator-only (no code, skip TDD)  
**Feature:** F-069  
**Depends on:** task-09  
**Verification:** Manual — Automation run log shows one agent dispatch per selected queue item (≤ availableSlots)

## Scope

Create Cursor Automation per `docs/guides/agentic-pipeline-operator-checklist.md` §M4:

1. **Trigger:** weekly cron (suggested Monday 06:00 UTC, before digest at 07:35 if re-running queue locally).
2. **Steps:**
   - Run or fetch latest `maintenance-queue.json` (from daily digest artifact or `pnpm --filter @rpgtracker/cursor-agents run maintenance-queue`).
   - Run `maintenance-dispatch` (task 09) to produce `maintenance-dispatch.json`.
   - For each item in `items[]` where `lane !== 'defer'`, start one cloud agent with `promptBrief`, capped at `availableSlots`.
3. Each agent produces a small test-backed PR referencing originating `source` + `id`.
4. Document prompt template in `docs/guides/agentic-pipeline-operator-checklist.md` or linked runbook.

## Acceptance criteria

- [ ] Automation created under team service account.
- [ ] Respects concurrent bot-PR cap from queue output.
- [ ] At least one dry-run logged with zero dispatches when cap exhausted.
- [ ] Permission scope reviewed (brief §6).

## Target paths

- Documentation only: `docs/guides/agentic-pipeline-operator-checklist.md` (prompt template addition)

## Out of scope

- GitHub Actions changes (digest already builds queue).
- Renovate event Automation (separate checklist item).
