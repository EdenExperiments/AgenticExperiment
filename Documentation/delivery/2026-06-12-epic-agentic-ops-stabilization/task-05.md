# Task 05 — Judge JSON + markdown reports (F-061 Phase C)

**Kind:** code  
**Feature:** F-061  
**Depends on:** task-04  
**Verification:** `cd apps/cursor-lab && python3 -m pytest tests/test_reporting.py -q`

## Scope

Implement reporting per plan §12:

1. `reporting/json_report.py` — aggregate per `(artifact, case)`: `score_mean`, `score_std`, `success_rate`, `process_mean`, per-capability stats; schema versioned JSON (`cursor-lab-verdict:v1`).
2. `reporting/markdown.py` — human table: promote/hold, top deviations.
3. CLI `cursor-lab report` — writes `reports/latest.json` + `reports/latest.md` (and optional `reports/<ts>/` copy).
4. Include judge verdict JSON inline in `runs.jsonl` records.

## Acceptance criteria

- `report` reads most recent evaluate output and produces valid JSON + markdown.
- Summary includes promote/hold column driven by gate placeholders (full gate logic in task 06 may stub `hold`).

## Target paths

- `apps/cursor-lab/cursor_lab/reporting/**`
- `apps/cursor-lab/cursor_lab/cli.py`
- `apps/cursor-lab/tests/test_reporting.py`

## Out of scope

- SQLite cache (task 06).
- `promote` command (task 06).
