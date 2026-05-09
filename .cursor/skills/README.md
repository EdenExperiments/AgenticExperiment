# Repo Skills

This directory contains repository-managed Cursor skills used for personal testing and experimentation.

## Layout

- `core/`: baseline workflow skills used in most tasks.
- `orchestration/`: runtime and lane-selection skills (local vs cloud).
- `quality/`: dependency, security, and quality-gate handling skills.

Each skill lives in its own directory and must include `SKILL.md`.

## Maintenance Rules

1. Keep each skill focused on one repeatable workflow.
2. Include clear `when_to_use`, inputs, outputs, and examples.
3. Update `.cursor/skills/skills.index.json` whenever adding, renaming, or removing a skill.
4. Retire low-signal skills quickly to prevent bloat.
