# Task 03 — `evaluate` CLI + orchestrator raw runs (F-061 Phase B)

**Kind:** code  
**Feature:** F-061  
**Depends on:** task-01, task-02  
**Verification:** `cd apps/cursor-lab && python3 -m pytest tests/test_orchestrator.py -q`

## Scope

Replace `orchestrator.py` placeholder with a run loop that:

1. Discovers work units `(artifact, case, seed_index)` from fixtures.
2. For each unit: build sandbox (task 01), call `CursorAgentBridge.run_once`, capture diff + stderr.
3. Tag startup vs run errors per bridge `kind` field; retry startup errors when `isRetryable` (max 3, exponential backoff).
4. Write `reports/<timestamp>/runs.jsonl` — one JSON object per run unit matching plan §4.4 shape (without judge fields yet).
5. Add CLI: `cursor-lab evaluate [--artifact ID] [--force]` (force ignores cache placeholder for task 06).

Wire `cmd_evaluate` in `cli.py`.

## Acceptance criteria

- `evaluate --artifact <id>` produces `runs.jsonl` with `status`, `result_text`, `file_diffs`, `duration_ms`.
- Startup retry logic unit-tested with mocked bridge.
- No judge calls in this task.

## Target paths

- `apps/cursor-lab/cursor_lab/orchestrator.py`
- `apps/cursor-lab/cursor_lab/cli.py`
- `apps/cursor-lab/tests/test_orchestrator.py`

## Out of scope

- DSPy judge (task 04).
- SQLite cache (task 06) — `--force` may be no-op until then.

## Environment

- Integration test may mock `CursorAgentBridge`; live run requires `CURSOR_API_KEY`.
