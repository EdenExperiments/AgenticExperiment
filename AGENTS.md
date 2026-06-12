# Agent And Repo Directory

Top-level index for agents and contributors. Entry-point routing also lives in `.cursor/rules/repo-routing.mdc`.

## Start Here

- Repository setup and run commands: `README.md`
- Canonical documentation map: `Documentation/README.md`
- Cursor-first operating model and delivery workflow: `docs/CURSOR-AGENT-HANDBOOK.md`

## Repository Zones

| Zone | Paths | Primary focus |
|------|-------|---------------|
| Go API | `apps/api/` | API handlers, auth middleware, repositories, migrations |
| LifeQuest frontend | `apps/rpg-tracker/` | Next.js App Router UX and data flows |
| NutriLog frontend | `apps/nutri-log/` | NutriLog product surface |
| Mental Health frontend | `apps/mental-health/` | MindTrack product surface |
| Shared UI | `packages/ui/` | Design tokens, components, theme behavior |
| Shared auth | `packages/auth/` | Supabase SSR/browser auth helpers |
| Shared API client | `packages/api-client/` | Typed API integration layer |
| Agent automation | `.github/workflows/`, `packages/cursor-agents/` | CI/CD agent workflows and SDK automation |
| Cursor Lab | `apps/cursor-lab/` | Local eval harness for `.cursor/` rules/skills |

## Canonical Context Directory

| Concern | Path |
|---------|------|
| Product scope | `Documentation/product-requirements.md` |
| Platform / schema | `Documentation/architecture.md` |
| Binding decisions | `Documentation/decision-log.md` |
| Feature status | `Documentation/feature-tracker.md` |
| Delivery artifacts | `Documentation/delivery/` |
| Agentic pipeline target | `Documentation/agentic-pipeline/Agentic-Pipeline-Brief-v2.md` |
| Visual implementation | `Documentation/style-guide/`, `Documentation/page-guides/` |
| Workflow / CI | `docs/CURSOR-AGENT-HANDBOOK.md` |

## Agent Config Layering (Brief §4c)

See `docs/guides/agent-composition-contract.md`:

1. **Base** — this file + `.cursor/rules/` + `.cursor/hooks.json`
2. **Stack** — nested `AGENTS.md` per zone (`apps/api/`, `apps/rpg-tracker/`, `packages/`, `apps/cursor-lab/`)
3. **Role** — `.cursor/agents/` (test-writer/implementer per stack, shared verifier)

## Documentation Contract (D-059)

- **Always:** tracker row when status changes; decision-log entry when a binding decision is made.
- **Delivery:** signed requirements in `Documentation/delivery/` — PRD updates only for scope/vision changes.
- Historical planning docs: `docs/archive/` (not canonical).
