# Task 12 — Workflow artifact uploads + weekly JSON export (F-071)

**Kind:** code  
**Feature:** F-071  
**Depends on:** task-11  
**Verification:** `pnpm --filter @rpgtracker/cursor-agents test`

## Scope

1. **Workflow uploads** — Add `cursor-agent-run-summaries/` artifact upload steps (`if: always()`) to:
   - `.github/workflows/cursor-security-triage.yml` (both jobs if multiple)
   - `.github/workflows/cursor-fix-attempt.yml`
   - `.github/workflows/cursor-daily-quality-digest.yml` — verify digest job uploads summaries (maintenance-queue step already does; ensure digest script summaries included)

2. **Weekly JSON export** — Extend `weekly-metrics.ts` to write `weekly-metrics.json` at workspace root with:
   - `schema: "cursor-weekly-metrics:v1"`
   - `windowDays: 7`
   - `bySurface`: opened, merged, closedUnmerged, mergeRate, avgCycleTimeMs
   - `openDependencyPrs`, `sonarOpenIssues` (nullable)

3. Update `cursor-weekly-metrics.yml` upload path to include `weekly-metrics.json`.

4. Vitest test for JSON shape builder (extract pure function if needed).

## Acceptance criteria

- Weekly workflow artifact contains `weekly-metrics.json` + `cursor-agent-run-summaries/`.
- Security-triage and fix-attempt workflows upload run summaries on failure paths.
- Tests cover JSON builder without live GitHub API.

## Target paths

- `.github/workflows/cursor-security-triage.yml`
- `.github/workflows/cursor-fix-attempt.yml`
- `.github/workflows/cursor-daily-quality-digest.yml` (if gap)
- `.github/workflows/cursor-weekly-metrics.yml`
- `packages/cursor-agents/src/weekly-metrics.ts`
- `packages/cursor-agents/src/__tests__/weekly-metrics.test.ts` (new)

## Out of scope

- cursor-lab ingestion of weekly JSON (future golden-PR work).
- Per-surface merged-unmodified metric (deferred).

## Note

D-061 allows workflow edits during pipeline stabilization.
