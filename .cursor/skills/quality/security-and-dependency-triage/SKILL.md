---
name: security-and-dependency-triage
description: Use for GitHub security findings, dependency-bot updates, and remediation workflow.
---

# Security And Dependency Triage

## When to use

Use for code-scanning findings, dependency-bot alerts/PRs (Renovate, Dependabot security alerts),
and remediation planning. Pairs with `dependency-quality-triage` (which classifies findings into
actionable fixes); this skill governs the security-specific investigation and remediation
discipline.

## Inputs

- GitHub code scanning findings and Dependabot alerts
- Renovate PRs and CI security workflow output
- Directly impacted dependency manifests (`package.json`, `apps/api/go.mod`, lockfiles)

## Outputs

- Findings classified by severity and exploitability
- Minimal safe remediation with verification evidence
- Documented risk, fix rationale, and deferred follow-ups (audit trail in PR/summary)

## Procedure

1. Classify findings by severity and exploitability.
2. Investigate only alert-scoped files/packages first; expand only for shared-dependency exposure
   across workspaces or an explicit full-surface audit request.
3. Reproduce or validate impacted code paths before applying fixes.
4. Apply minimal safe remediation, preferring narrow scope updates; run verification for impacted
   areas.
5. Never auto-merge security fixes without verification evidence; escalate high-severity findings
   when remediation is uncertain.

## Examples

### Positive

- A CodeQL alert in one package → validate the code path, patch narrowly, run that package's
  tests, document rationale.

### Negative

- Running repository-wide security scanning or bulk-upgrading unrelated dependencies in response
  to a single alert.
