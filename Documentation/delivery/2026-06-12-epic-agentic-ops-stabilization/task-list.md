# Task list — Lane F: Agentic Operations Stabilization

Epic artifact: `requirements.md`  
Routing: Python → `test-writer`/`implementer` (no dedicated Python role — use implementer with pytest); TypeScript → `test-writer-ts` / `implementer-ts`; operator tasks skip TDD.

## Summary table

| ID | Feature | Kind | Summary | Target paths | Depends | Verification |
|----|---------|------|---------|--------------|---------|--------------|
| 01 | F-061 | **code** | Sandbox builder + file diff capture | `apps/cursor-lab/cursor_lab/sandbox.py` | — | `cd apps/cursor-lab && python3 -m pytest tests/test_sandbox.py -q` |
| 02 | F-061 | **code** | Fixtures, lab mirror, registry gates | `apps/cursor-lab/fixtures/**`, `lab/**` | 01 | `cd apps/cursor-lab && python3 -m pytest tests/test_discovery.py tests/test_registry.py -q` |
| 03 | F-061 | **code** | `evaluate` CLI + orchestrator (raw runs) | `apps/cursor-lab/cursor_lab/orchestrator.py`, `cli.py` | 01, 02 | `cd apps/cursor-lab && python3 -m pytest tests/test_orchestrator.py -q` |
| 04 | F-061 | **code** | DSPy judge module | `apps/cursor-lab/cursor_lab/judge/**` | 03 | `cd apps/cursor-lab && python3 -m pytest tests/test_judge.py -q` |
| 05 | F-061 | **code** | Judge JSON + markdown reports | `apps/cursor-lab/cursor_lab/reporting/**` | 04 | `cd apps/cursor-lab && python3 -m pytest tests/test_reporting.py -q` |
| 06 | F-061 | **code** | Cache, variance, promotion gate, `promote` | `apps/cursor-lab/cursor_lab/diff/**`, `promotion/**`, `cli.py` | 04, 05 | `cd apps/cursor-lab && python3 -m pytest tests/test_gate.py tests/test_cache.py -q` |
| 07 | F-068 | **operator** | Enable Bugbot + Autofix propose mode | Cursor dashboard | — | Manual: Bugbot comment on test PR |
| 08 | F-068 | **operator** | Branch protection + severity status check | GitHub branch protection | 07 | Manual: required check visible on PR |
| 09 | F-069 | **code** | Maintenance dispatch brief generator | `packages/cursor-agents/src/maintenance-dispatch*` | — | `pnpm --filter @rpgtracker/cursor-agents test` |
| 10 | F-069 | **operator** | Weekly tech-debt Automation cron | Cursor Automations | 09 | Manual: Automation run log shows dispatch |
| 11 | F-071 | **code** | Run summaries on remaining agent jobs | `packages/cursor-agents/src/{daily-quality-digest,security-triage,fix-attempt}.ts` | — | `pnpm --filter @rpgtracker/cursor-agents test` |
| 12 | F-071 | **code** | Workflow uploads + weekly JSON export | `.github/workflows/cursor-*.yml`, `weekly-metrics.ts` | 11 | `pnpm --filter @rpgtracker/cursor-agents test` |
| 13 | F-071 | **operator** | Metrics dashboard issue + repo variable | GitHub repo vars | — | Manual: weekly comment on metrics issue |

## Parallelization map

```text
Lane A (F-061 cursor-lab)     Lane B (F-069 queue)       Lane C (F-071 telemetry)    Lane D (F-068 ops)
─────────────────────────     ────────────────────       ────────────────────────    ─────────────────
01 sandbox ─┐                 09 dispatch brief          11 run summaries            07 Bugbot enable ─┐
02 fixtures ├─ serial         (parallel w/ A)            (parallel w/ A,B)           08 branch protect  ┘
03 evaluate ┘                 10 Automation (ops)        12 workflow JSON            (parallel w/ all)
04 judge ─┐                                                13 metrics issue (ops)
05 report ├─ serial
06 gate  ─┘
```

**Safe parallel pairs**

- F-061 tasks 01–03 (Python, `apps/cursor-lab/`) ∥ F-069 task 09 (`packages/cursor-agents/`) ∥ F-071 task 11 — no file overlap.
- F-068 operator tasks 07–08 ∥ all code lanes — dashboard-only.
- F-061 tasks 04–06 should not start until task 03 lands (run record shape frozen).

**Serial constraints**

- 02 → 03 (fixtures required for evaluate).
- 03 → 04 → 05 → 06 (judge consumes run records; gate consumes verdicts).
- 09 → 10 (Automation prompt references dispatch schema).
- 11 → 12 (workflows upload summaries produced by 11).

## TDD routing

| Task | Test writer | Implementer | Verifier |
|------|-------------|-------------|----------|
| 01–06 | pytest in `apps/cursor-lab/tests/` | Python implementer | shared verifier |
| 09, 11–12 | `test-writer-ts` | `implementer-ts` | shared verifier |
| 07–08, 10, 13 | — (operator-only) | — | human sign-off |
