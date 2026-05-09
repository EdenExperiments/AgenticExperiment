---
name: local-cloud-route
description: Choose the right Cursor SDK runtime lane for each task.
---

# Local Cloud Route

## When to use

Use when implementing or running SDK-based automation that can run either locally or in cloud runtime.

Do not use for tasks that are explicitly local-only or cloud-only with no decision required.

## Inputs

- Task size and expected duration
- Need for local filesystem state and credentials
- Need for unattended execution

## Outputs

- Runtime decision (`local` or `cloud`)
- Required environment variables for the chosen lane

## Decision rules

1. Use `local` for fast iterative loops, small diffs, and workflows requiring current workstation state.
2. Use `cloud` for long-running unattended tasks or remote execution lanes.
3. Require explicit cloud repo URL before cloud execution.
4. Keep cloud runs opt-in and reversible until stable.

## Examples

### Positive

- "Run PR triage locally in CI by default, switch to cloud lane only when `CURSOR_RUNTIME=cloud` and repo URL is configured."

### Negative

- "Default everything to cloud with no repo URL or runtime guard."
