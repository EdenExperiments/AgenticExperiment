# Task 04 — DSPy judge module (F-061 Phase C)

**Kind:** code  
**Feature:** F-061  
**Depends on:** task-03  
**Verification:** `cd apps/cursor-lab && python3 -m pytest tests/test_judge.py -q`

## Scope

Implement judge per plan §7:

1. `judge/signatures.py` — `CapabilityScore`, `ProcessAdherence` DSPy signatures.
2. `judge/rubric.py` — capability taxonomy defaults + per-fixture override loading from manifest.
3. `judge/judge.py` — `ArtifactJudge` module aggregating weighted capability scores + process adherence.
4. Configure judge LM via `CURSOR_LAB_JUDGE_MODEL` + `CURSOR_LAB_JUDGE_API_KEY`; temperature ≤ 0.1.
5. Orchestrator calls judge after each successful run; attach `JudgeVerdict` to run record.
6. `doctor` optional probe: replay identical input twice, assert scores within ε (skip when `--deps-only`).

## Acceptance criteria

- Judge returns `weighted_score`, `process_adherence`, `per_capability` dict on mocked LM.
- Executor and judge model IDs are distinct in config.
- Unit tests do not call live judge API (mock DSPy).

## Target paths

- `apps/cursor-lab/cursor_lab/judge/**`
- `apps/cursor-lab/cursor_lab/orchestrator.py` (judge hook)
- `apps/cursor-lab/cursor_lab/cli.py` (`doctor` probe)
- `apps/cursor-lab/pyproject.toml` (dspy dependency if missing)
- `apps/cursor-lab/tests/test_judge.py`

## Out of scope

- Report writers (task 05).
- Promotion gate thresholds (task 06).
