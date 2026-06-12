---
name: pipeline-orchestration
description: Route work across the three automation lanes (Bugbot, SDK, Automations) and Pillar D delivery without duplicating retired pipeline review. Use when choosing review lanes, starting feature work, or wiring agent automation.
metadata:
  domain: orchestration
  pillar: all
---

# Pipeline Orchestration

## When to use

Use when starting delivery work, responding to dependency/maintenance events, or deciding which
automation lane should handle a task. Applies to IDE agents, cloud agents, and SDK workflow
authors.

Do not use to re-implement PR review — Bugbot owns Pillar B (D-060).

## Inputs

- Request type (feature, fix, dependency PR, maintenance item, remediation trigger)
- Current lane signals (Bugbot comments, Sonar status, queue artifacts, labels)
- `Documentation/agentic-pipeline/Agentic-Pipeline-Brief-v2.md` three-lane model

## Outputs

- Selected flow from `.cursor/flows/` (or explicit "IDE-only, no automation")
- Skill chain to load next
- Subagent roster for delegation
- Artifact path(s) the next stage must write or consume

## Decision rules

| Situation | Lane | Flow / skill |
|---|---|---|
| User `/fix`, `/feature`, `/epic` | IDE / Cloud | `.cursor/flows/delivery-*.md` → delivery skills |
| Renovate PR opened | SDK or Automation | `pillar-a-deps-highlight` → `dependency-quality-triage` |
| Sonar/tech-debt backlog | SDK or Automation | `pillar-c-maintenance` → `maintenance-dispatch` |
| `/cursor-fix` with gates | SDK | `sdk-remediation` → `sdk-remediation-routing` |
| PR review / Autofix | Bugbot only | `BUGBOT.md` — no SDK reviewer |

1. **Rules instruct, hooks enforce** — see `docs/guides/agent-composition-contract.md`.
2. Parent orchestrator stays thin: exploration and shell work → subagents or built-in explore/bash.
3. Every stage writes an artifact; the next stage reads the artifact, not chat history.
4. Prefer `local-cloud-route` when SDK runtime is ambiguous.

## Examples

### Positive

- "/feature for typed API client" → `delivery-feature` flow → `requirements-elicitation` → `tdd-dispatch` with `test-writer-ts` / `implementer-ts`.

### Negative

- "Run cursor-pr-review on every PR" — retired; use Bugbot.
