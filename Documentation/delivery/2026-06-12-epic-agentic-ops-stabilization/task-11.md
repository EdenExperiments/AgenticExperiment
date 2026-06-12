# Task 11 — Run summaries on remaining agent jobs (F-071)

**Kind:** code  
**Feature:** F-071  
**Depends on:** —  
**Verification:** `pnpm --filter @rpgtracker/cursor-agents test`

## Scope

Extend `writeRunSummary` coverage to all agent entry scripts:

| Script | Job id |
|--------|--------|
| `daily-quality-digest.ts` | `daily-quality-digest` |
| `security-triage.ts` | `security-triage` |
| `fix-attempt.ts` | `fix-attempt` |

Pattern (match `maintenance-queue-run.ts`):

- Capture `startedAt` at entry.
- On success: `outcome: "success"` + relevant `details` (counts, PR number, model used).
- On failure: `outcome: "failure"` + `{ error: String(error) }`.
- Include `runtime` from env when applicable (`CURSOR_RUNTIME`).
- Writes remain non-fatal.

Add/extend unit tests in `run-summary.test.ts` or per-job smoke tests as needed.

## Acceptance criteria

- All six jobs emit summaries: `maintenance-queue`, `dep-assessment`, `weekly-metrics`, `daily-quality-digest`, `security-triage`, `fix-attempt`.
- `pnpm --filter @rpgtracker/cursor-agents test` passes.

## Target paths

- `packages/cursor-agents/src/daily-quality-digest.ts`
- `packages/cursor-agents/src/security-triage.ts`
- `packages/cursor-agents/src/fix-attempt.ts`
- `packages/cursor-agents/src/__tests__/run-summary.test.ts` (extend)

## Out of scope

- Workflow YAML uploads (task 12).
- Aggregating summaries in weekly-metrics (future).
