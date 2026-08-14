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
| Cursor Lab | `apps/cursor-lab/` | Local eval harness for `.cursor/` rules and hooks |

## Canonical Context Directory

| Concern | Path |
|---------|------|
| Product scope | `Documentation/product-requirements.md` |
| Platform / schema | `Documentation/architecture.md` |
| Binding decisions | `Documentation/decision-log.md` |
| Feature status | `Documentation/feature-tracker.md` |
| Delivery artifacts | `Documentation/delivery/` — active: `2026-08-14-program-suite-completion/`; historical Pillar D packs remain |
| Agentic pipeline target | `Documentation/agentic-pipeline/Agentic-Pipeline-Brief-v2.md` |
| Visual implementation | `Documentation/style-guide/`, `Documentation/page-guides/` |
| Workflow / CI | `docs/CURSOR-AGENT-HANDBOOK.md` |
| Suite completion (next product wave) | `Documentation/delivery/2026-08-14-program-suite-completion/` |

## Agent Config Layering (Brief §4c, D-063)

See `docs/guides/agent-composition-contract.md`:

1. **Base** — this file + `.cursor/rules/` (including `pstack-models.mdc`) + `.cursor/hooks.json`
2. **Stack** — nested `AGENTS.md` per zone (`apps/api/`, `apps/rpg-tracker/`, `packages/`, `apps/cursor-lab/`)
3. **Role** — pstack plugin agents (`poteto-agent`, Comment Sicko) plus Cursor built-ins (`explore`, `bash`, `browser`)

Development uses `/poteto-mode` and cursor-team-kit. Repo-managed skills, commands, agents, and flows were removed, except the LifeQuest verification skill at `.cursor/skills/verify-lifequest/`.

## Documentation Contract (D-059)

- **Always:** tracker row when status changes; decision-log entry when a binding decision is made.
- **Delivery:** signed requirements in `Documentation/delivery/` — PRD updates only for scope/vision changes. New work does not start `/fix`/`/feature` pack commands (retired D-063).
- Historical planning docs: `docs/archive/` (not canonical).
