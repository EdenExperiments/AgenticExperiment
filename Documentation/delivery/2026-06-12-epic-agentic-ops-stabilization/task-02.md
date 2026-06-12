# Task 02 — Fixtures, lab mirror, registry gates (F-061 Phase B)

**Kind:** code  
**Feature:** F-061  
**Depends on:** task-01  
**Verification:** `cd apps/cursor-lab && python3 -m pytest tests/test_discovery.py tests/test_registry.py -q`

## Scope

1. **Registry:** `lab/registry.yaml` lists artifacts eligible for evaluation. CLI `evaluate` refuses to run when registry is empty or artifact not listed.
2. **Lab mirror:** Copy `core/safe-edit-and-verify` skill from repo `.cursor/skills/` into `lab/.cursor/skills/core/safe-edit-and-verify/SKILL.md`.
3. **Fixture:** Author `fixtures/skill:core/safe-edit-and-verify/` (or normalized id per discovery) with:
   - `manifest.yaml` (3 cases, `runs: 3`, thresholds per plan §4.2)
   - `inputs/case-*.md` prompts
   - `seed/case-*/` starter trees (minimal TS file for rename-symbol case)
4. **Discovery extension:** Load fixtures linked to discovered artifacts; validate manifest schema.

## Acceptance criteria

- `cursor-lab list` shows `skill:skills/core/safe-edit-and-verify` (or current discovery id).
- Registry gate blocks evaluate when artifact absent from `registry.yaml`.
- Three cases discoverable from manifest.

## Target paths

- `apps/cursor-lab/lab/registry.yaml`
- `apps/cursor-lab/lab/.cursor/skills/**`
- `apps/cursor-lab/fixtures/**`
- `apps/cursor-lab/cursor_lab/discovery.py`
- `apps/cursor-lab/tests/test_discovery.py`, `tests/test_registry.py`

## Out of scope

- Running the bridge (task 03).
- Judge rubric overrides beyond manifest defaults.
