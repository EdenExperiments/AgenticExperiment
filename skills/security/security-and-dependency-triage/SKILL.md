---
name: security-and-dependency-triage
description: Use for GitHub security findings, Dependabot updates, and remediation workflow.
---

# Security And Dependency Triage Skill

## Inputs

- GitHub code scanning findings
- Dependabot PRs and alerts
- CI security workflow output

## File Focus (read first)

1. `.github/workflows/cursor-security-triage.yml`
2. `.github/workflows/codeql.yml`
3. `.github/dependabot.yml`
4. `packages/cursor-agents/src/security-triage.ts`
5. Directly impacted dependency manifests (`package.json`, `apps/api/go.mod`, lockfiles)

## Search Boundaries

- Primary: `.github/` and `packages/cursor-agents/`
- Secondary: only packages flagged by the alert (do not scan unrelated apps/packages)
- Expand scope only when root-cause analysis shows shared dependency exposure.

## Hard Boundary Rule

- Do **not** run repository-wide security scanning from this skill.
- Investigate only alert-scoped files/packages first.
- Expand only when:
  1. the same vulnerable dependency is shared across workspaces,
  2. lockfile resolution indicates cross-workspace exposure,
  3. user explicitly requests full-surface audit.

## Workflow

1. Classify findings by severity and exploitability.
2. Reproduce or validate impacted code paths before applying fixes.
3. Apply minimal safe remediation, preferring narrow scope updates.
4. Run verification (tests/build) for impacted areas.
5. Document risk, fix rationale, and any deferred follow-up.

## Guardrails

- Do not auto-merge security fixes without verification evidence.
- Escalate high-severity findings immediately when remediation is uncertain.
- Preserve an audit trail in PR descriptions or workflow summaries.
