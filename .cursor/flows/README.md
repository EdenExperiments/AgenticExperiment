# Orchestration Flows

Repo-managed flow manifests describe **when** to run **which** skills and subagents for each
automation lane. They complement:

| Artifact | Role |
|---|---|
| `.cursor/commands/` | Thin user-facing routers (`/fix`, `/feature`, …) |
| `.cursor/skills/` | Repeatable procedures loaded on demand (`skills.index.json` is the discovery index) |
| `.cursor/agents/` | Subagents with isolated context (test-writer, implementer, verifier, …) |
| `.cursor/flows/` | End-to-end maps: entry point → skill chain → subagent roster → artifacts → exit |

Flows are **documentation for agents and operators**, not executable code. Cursor discovers
skills via `SKILL.md` frontmatter (`description`, optional `paths`) and subagents via
`.cursor/agents/*.md` frontmatter (`description` is the routing signal — include "Use when…").

## Flow index

| Flow | Entry | Pillar |
|---|---|---|
| [delivery-feature.md](./delivery-feature.md) | `/feature` | D |
| [delivery-fix.md](./delivery-fix.md) | `/fix` | D |
| [pillar-a-deps-highlight.md](./pillar-a-deps-highlight.md) | Renovate PR open | A |
| [pillar-c-maintenance.md](./pillar-c-maintenance.md) | Daily digest / Automation cron | C |
| [sdk-remediation.md](./sdk-remediation.md) | `/cursor-fix`, `workflow_dispatch` | B adjunct |

Canonical architecture: `Documentation/agentic-pipeline/Agentic-Pipeline-Brief-v2.md` · operator
setup: `docs/guides/agentic-pipeline-operator-checklist.md` · skills guide:
`docs/guides/cursor-skills-and-orchestration.md`.
