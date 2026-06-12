---
name: pillar-a-deps-highlight
description: Highlight-only dependency assessment on Renovate PRs — never auto-merge breaking bumps.
triggers:
  - workflow:cursor-security-triage.yml
  - renovate:pr-opened
pillars: [A]
lanes: [sdk, automation]
---

# Flow — Pillar A Dependency Highlight

## Purpose

Classify Renovate PRs and post **advisory** research comments on breaking bumps. Safe patches
automerge behind CI + Sonar (D-057); agents never auto-fix majors.

## Entry conditions

- Renovate opened or updated a dependency PR.
- Labels include `deps:safe` or `deps:breaking`.

## Skill chain

1. **dependency-quality-triage** — severity, blast radius, validation plan.
2. **security-and-dependency-triage** — when security/CVE context applies.
3. For breaking bumps: route through **deps-highlight** subagent or SDK `dep-assess` script.

## Subagent roster

| Role | Subagent | Mode |
|---|---|---|
| Impact research | `deps-highlight` | Read-only; posts structured comment markers |
| Optional deep scan | built-in `explore` | Summarize affected call sites |

## SDK lane

- Script: `packages/cursor-agents/src/dep-assess.ts` (via `cursor-security-triage.yml`).
- Output: `[ADVISORY]` markdown comment — highlight, never auto-fix.

## Exit criteria

- `deps:safe` PRs: CI + Sonar green → automerge policy applies (no agent write).
- `deps:breaking` PRs: assessment comment posted; human approval required.

## Anti-patterns

- Agent opens a fix PR for a major bump without explicit operator intent.
- Duplicating Renovate's own release notes without call-site scan.
