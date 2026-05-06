# Agent And Repo Directory

This file is the top-level index for agents and contributors. It tells you where context lives and which document is authoritative for each concern.

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

## Canonical Context Directory

- Product scope and release framing: `Documentation/product-requirements.md`
- Platform and architecture constraints: `Documentation/architecture.md`
- Binding decisions and open questions: `Documentation/decision-log.md`
- Feature status and readiness: `Documentation/feature-tracker.md`
- Delivery sequencing and planning history: `Documentation/planning-handoff.md`
- Theme and page implementation standards: `Documentation/style-guide/`, `Documentation/page-guides/`
- Agent workflow protocol and CI automation model: `docs/CURSOR-AGENT-HANDBOOK.md`

## Working Rules

- Treat `Documentation/` as source of truth for product, architecture, decisions, and tracking.
- Keep updates small and explicit so another agent can resume without rereading the entire repository.
- Preserve the distinction between confirmed requirements, assumptions, and open questions.
- If requirements, dependencies, or feature scope change, update `Documentation/feature-tracker.md` in the same turn.
- If a decision is made (or a major unresolved question appears), update `Documentation/decision-log.md`.

## Required Outputs For Product/Planning Changes

For substantive requirement or planning updates, review and update the relevant set:

1. `Documentation/product-requirements.md`
2. `Documentation/planning-handoff.md`
3. `Documentation/feature-tracker.md`
4. `Documentation/decision-log.md`

If only a subset changes, explain why the others were not updated.
