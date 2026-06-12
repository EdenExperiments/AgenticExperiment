# Task 09 — Maintenance dispatch brief generator (F-069)

**Kind:** code  
**Feature:** F-069  
**Depends on:** —  
**Verification:** `pnpm --filter @rpgtracker/cursor-agents test`

## Scope

Bridge `maintenance-queue.json` → Automation-ready dispatch payloads:

1. New module `maintenance-dispatch.ts` (+ `maintenance-dispatch-run.ts` CLI entry) reading `cursor-maintenance-queue:v1` JSON.
2. Emit `maintenance-dispatch.json` with schema `cursor-maintenance-dispatch:v1`:
   - `generatedAt`, `repository`, `availableSlots`
   - `items[]`: `source`, `id`, `files`, `description`, `score`, `lane` (`tdd` | `sdk-fix` | `defer`), `verificationCommand`, `promptBrief` (markdown for cloud agent)
3. Lane rules (deterministic):
   - Single-file, low risk, effort ≤ 30min → `tdd`
   - Security-relevant with file scope → `sdk-fix` if `CURSOR_AUTO_FIX_ENABLED` else `tdd`
   - Otherwise → `defer` with reason
4. Package script: `maintenance-dispatch` in `package.json`.
5. Vitest coverage with fixture queue JSON.

## Acceptance criteria

- CLI reads queue file path from `CURSOR_QUEUE_INPUT` (default `./maintenance-queue.json`).
- Selected items only in dispatch output; deferred/ineligible excluded.
- Tests assert lane hints for representative Sonar + tech-debt items.

## Target paths

- `packages/cursor-agents/src/maintenance-dispatch.ts`
- `packages/cursor-agents/src/maintenance-dispatch-run.ts`
- `packages/cursor-agents/src/__tests__/maintenance-dispatch.test.ts`
- `packages/cursor-agents/package.json`

## Out of scope

- Opening PRs or invoking Cursor SDK (dispatch is Automation's job).
- Changing scoring in `maintenance-queue.ts` (already landed).

## Notes

- Reuse `renderQueueMarkdown` patterns for human-readable brief sections.
- `writeRunSummary` optional here; covered in task 11 if added to dispatch-run.
