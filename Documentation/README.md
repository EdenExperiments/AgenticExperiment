# Documentation Index

Canonical map for product, platform, and agent workflow docs. Entry points: `AGENTS.md` · this file · `docs/CURSOR-AGENT-HANDBOOK.md`.

## Active Canonical Documents

| Path | Purpose |
|------|---------|
| `product-requirements.md` | Product vision, scope, release framing |
| `architecture.md` | Domain model, schema, integration contracts, platform overview (§10) |
| `decision-log.md` | Binding decisions and open questions (digest + full detail) |
| `feature-tracker.md` | Feature status, active work, deferred backlog |
| `agentic-pipeline/Agentic-Pipeline-Brief-v2.md` | Target agentic-operations architecture (D-055–D-058) |
| `delivery/` | Signed delivery artifacts (`/fix`, `/feature`, `/epic`, `/new-project`) |
| `style-guide/` | Shared + per-theme design rules |
| `page-guides/` | Page-specific implementation briefs |
| `ux-spec.md` | Historical UX narrative — binding UX decisions are in `decision-log.md` (D-017–D-034) |
| `analytics-instrumentation.md` | Analytics event schema (AI goal funnel) |

## Operational Docs (`docs/`)

| Path | Purpose |
|------|---------|
| `docs/CURSOR-AGENT-HANDBOOK.md` | Workflow, CI/CD agent model, runtime variables |
| `docs/setup.md` | Local Supabase trigger setup |
| `docs/guides/` | Runbooks (composition contract, operator checklist, onboarding, cursor-lab) |

## Documentation Contract (D-059)

**Always:** update `feature-tracker.md` when status changes; `decision-log.md` when a binding decision is made.

**Delivery:** requirements in `Documentation/delivery/` artifacts — update `product-requirements.md` only when product scope/vision changes.

## Archive Policy

Historical planning and design docs live in `docs/archive/` with deprecation headers. Use git history for deep trace. Do not treat archived files as current sequencing.
