---
name: task-intake-and-scope
description: Normalize incoming requests into scoped, verifiable work.
---

# Task Intake And Scope

## When to use

Use at the start of implementation work, especially when a request includes multiple outcomes.

Do not use for single-command one-offs (for example, "run date").

## Inputs

- User request
- Relevant repo context (files, rules, active workflows)

## Outputs

- Clear scope statement
- Ordered implementation steps
- Explicit verification plan

## Procedure

1. Restate the requested outcomes in plain action terms.
2. Split outcomes into independent units (config, code, docs, verification).
3. Identify dependencies and required ordering.
4. Define minimum verification commands before editing.
5. Start with the highest-risk or foundation item first.

## Examples

### Positive

- "Add pre-commit quality checks, create starter skills, and add Renovate + SonarCloud onboarding docs."

### Negative

- "Write code immediately without deciding what gets verified or where docs are updated."
