# Repo Skills

Repository-managed Cursor agent skills. Discovery index: `skills.index.json`.

## Layout

| Domain | Path | Focus |
|---|---|---|
| `core/` | baseline workflow | intake, safe edits, debug loops |
| `delivery/` | feature delivery | elicitation, decomposition, TDD dispatch |
| `docs/` | documentation | requirements/tracker/decision sync |
| `ops/` | operations | local dev, CI |
| `orchestration/` | lane routing | pipeline, SDK remediation, maintenance, local/cloud |
| `quality/` | quality gates | dependency/security triage, Bugbot advisory |
| `release/` | shipping | branch finish, PR prep |
| `verify-*/` (skill root) | verification | drive real apps for UX proof |

Each skill lives in `<domain>/<skill-name>/SKILL.md`.

## Maintenance rules

1. One skill = one repeatable workflow.
2. Frontmatter `description` is the routing signal — be specific, include "Use when" phrasing.
3. Required sections: **When to use**, **Inputs**, **Outputs**, **Examples**.
4. Folder name must match frontmatter `name`.
5. Update `skills.index.json` on every add/rename/remove.
6. Wire new skills into `.cursor/flows/` when they participate in orchestration.
7. Run `pnpm validate:skills` before commit.

Guide: `docs/guides/cursor-skills-and-orchestration.md`.
