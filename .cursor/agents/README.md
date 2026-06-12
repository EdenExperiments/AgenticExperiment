# Subagents (`.cursor/agents/`)

Cursor discovers subagents from markdown files with YAML frontmatter. The **`description`**
field is the routing signal — always include "Use when…" so the parent agent delegates correctly.

## Roster

| Agent | Mode | Use when |
|---|---|---|
| `test-writer-go` | write tests | `apps/api/**` TDD red phase |
| `implementer-go` | implement | `apps/api/**` with TDD lock |
| `test-writer-ts` | write tests | TS frontends + `packages/**` red phase |
| `implementer-ts` | implement | TS paths with TDD lock |
| `verifier` | readonly | Independent acceptance verification |
| `delivery-orchestrator` | orchestrate | Multi-task Pillar D flows |
| `deps-highlight` | readonly | Renovate `deps:breaking` research comments |
| `maintenance-scout` | readonly | Pillar C queue scoring |

Built-in Cursor subagents (`explore`, `bash`, `browser`) remain available for exploration and
shell isolation — see `docs/guides/cursor-skills-and-orchestration.md`.

Composition rules: `docs/guides/agent-composition-contract.md`.
