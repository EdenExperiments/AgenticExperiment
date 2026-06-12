# Task 01 — Sandbox builder + file diff capture (F-061 Phase B)

**Kind:** code  
**Feature:** F-061  
**Depends on:** —  
**Verification:** `cd apps/cursor-lab && python3 -m pytest tests/test_sandbox.py -q`

## Scope

Implement per-run-unit sandbox isolation per `docs/guides/cursor-lab-eval-flow-plan.md` §6:

1. `tempfile.mkdtemp(prefix="cursor-lab-")` workspace.
2. Copy case `seed/` tree when present.
3. Materialize minimal `.cursor/` for the artifact under test (rule `.mdc` or skill dir + one-entry `skills.index.json`).
4. Optional `AGENTS.md` stub when fixture requests repo context.
5. `git init` in sandbox.
6. Snapshot all files (excluding `.git`) before agent run; re-walk after; compute unified diff.

Deliver `cursor_lab/sandbox.py` with a context-manager API, e.g.:

```python
with build_sandbox(home, artifact, fixture_case) as sandbox:
    yield sandbox.path, sandbox.snapshot_before()
# after run: sandbox.compute_diff() -> str
```

## Acceptance criteria (from requirements)

- Fresh temp dir per run; host `.cursor` never copied wholesale.
- Unified diff emitted for edited seed files.
- Skill evaluation includes minimal `skills.index.json`.

## Target paths

- `apps/cursor-lab/cursor_lab/sandbox.py` (new)
- `apps/cursor-lab/tests/test_sandbox.py` (new)

## Out of scope

- Bridge invocation (task 03).
- Fixture manifest parsing (task 02 — stub minimal case dataclass if needed).
- Judge or scoring logic.

## Notes

- Match existing package style (`from __future__ import annotations`, pathlib).
- Plan §5.2: `settingSources: []` is bridge responsibility, not sandbox.
