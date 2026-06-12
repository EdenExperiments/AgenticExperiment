# Task 06 — Cache, variance, promotion gate, `promote` (F-061 Phase D)

**Kind:** code  
**Feature:** F-061  
**Depends on:** task-04, task-05  
**Verification:** `cd apps/cursor-lab && python3 -m pytest tests/test_gate.py tests/test_cache.py -q`

## Scope

Per plan §9–10:

1. **Fingerprint** (`diff/fingerprint.py`) — sha256 over artifact bytes, fixture files, rubric version const, executor/judge model ids.
2. **Cache** (`diff/cache.py`) — SQLite `cache/results.db` tables `artifact_runs`, `artifact_verdicts`.
3. **Variance** — `runs: N` from manifest; bounded asyncio worker pool (2–4 concurrent `run_once`).
4. **Gate** (`promotion/gate.py`) — PROMOTE iff score_mean ≥ min, score_std ≤ max_variance, success_rate == 1.0, process_mean ≥ 0.7.
5. **Promote** (`promotion/promote.py` + CLI) — copy passing artifacts `lab/.cursor/` → `prod/.cursor/`; `--apply-to-repo` copies to repo-root `.cursor/` with printed paths only.
6. `evaluate` skips cached fingerprints unless `--force`.

## Acceptance criteria

- Second `evaluate` run skips unchanged artifact (cache hit logged).
- Gate fails artifact with high variance in unit test.
- `promote` without passing verdicts is a no-op with clear message.

## Target paths

- `apps/cursor-lab/cursor_lab/diff/**`
- `apps/cursor-lab/cursor_lab/promotion/**`
- `apps/cursor-lab/cursor_lab/orchestrator.py`
- `apps/cursor-lab/cursor_lab/cli.py`
- `apps/cursor-lab/tests/test_gate.py`, `tests/test_cache.py`

## Out of scope

- Cloud runtime lane (Phase E).
- CI workflow wiring (Phase F).
