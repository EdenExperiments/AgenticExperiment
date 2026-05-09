---
name: dependency-quality-triage
description: Triage dependency and quality findings into actionable fixes.
---

# Dependency Quality Triage

## When to use

Use when processing Renovate PRs, SonarCloud findings, or related dependency/security alerts.

Do not use for feature development unrelated to dependency or static-analysis findings.

## Inputs

- Finding source (Renovate, SonarCloud, CodeQL, Dependabot)
- Severity and scope
- Affected packages or files

## Outputs

- Prioritized remediation queue
- Suggested validation steps per finding
- Clear recommendation (fix now, schedule, or defer with rationale)

## Procedure

1. Group findings by severity and exploitability.
2. Identify low-risk automated updates vs high-risk manual review changes.
3. Propose smallest safe update batch first.
4. Define validation checks for each batch.
5. Document deferrals with explicit reason and revisit date.

## Examples

### Positive

- "Group patch/minor updates for one PR, hold majors for manual approval, and define smoke tests."

### Negative

- "Treat all alerts as equal urgency and merge dependency updates without targeted validation."
