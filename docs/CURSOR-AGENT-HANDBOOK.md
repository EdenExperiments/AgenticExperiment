# Cursor Agent Handbook

This handbook defines the Cursor-first operating model for this repository.

## Primary Entry Points

- Start with `AGENTS.md` for directory-level context.
- Use `Documentation/README.md` for canonical product and architecture docs.
- Use this handbook for workflow, coordination, and automation standards.

## Development Paths (D-036)


| Path      | Flow                                                         | Gate                              |
| --------- | ------------------------------------------------------------ | --------------------------------- |
| Logic/API | spec -> tests -> implementation -> review                    | Tests must pass                   |
| UI/Visual | style guide -> page guide -> implementation -> visual review | Token/theme/a11y review must pass |


Tests are required for business logic, API contracts, and component behavior.  
Pure visual composition work is validated by visual review and design-guide compliance.

## Zone Coordination

- Treat `packages/*` as shared zones requiring explicit coordination.
- Keep work scoped to one zone when possible.
- For cross-zone work, record sequencing and dependencies in the active spec/plan before implementation.

## Session And Handoff Expectations

- Keep updates resumable: what changed, why, and what remains.
- Use `docs/sessions/retros/` for post-merge retros.
- Surface blockers and decision gaps in `Documentation/decision-log.md` and `Documentation/feature-tracker.md`.

## Cursor Usage Model

- IDE agent and cloud agent chat are the default tools for feature inception and implementation.
- CI/CD agents run through TypeScript automation using `@cursor/sdk` and GitHub Actions.
- Keep automation additive at first: summarize and recommend before enabling automatic fixes.

## CI/CD Agent Workflows

- Baseline build/test remains in `.github/workflows/ci.yml`.
- PR review automation lives in `.github/workflows/cursor-pr-review.yml`.
- Security and dependency triage automation lives in `.github/workflows/cursor-security-triage.yml`.
- Security signal generation lives in `.github/workflows/codeql.yml` and `.github/dependabot.yml`.

## CI/CD Runtime Contract

### Required Secret

- `CURSOR_API_KEY`: authentication key for `@cursor/sdk` runs in GitHub Actions.

### Permissions Model

- `cursor-pr-review.yml`: `contents:read`, `pull-requests:read`, `issues:write`
- `cursor-security-triage.yml`: `contents:read`, `security-events:read`, `pull-requests:read`, `issues:write`
- `codeql.yml`: `security-events:write` for publishing scan findings

### Automation Guardrails

- Default behavior is review and recommendation (comment/summary) rather than auto-remediation commits.
- Promote to auto-fix only after repeated stable runs and explicit policy approval.
- Keep generated comments concise and actionable; avoid noisy duplicate comments by updating marker comments.

## Operating Split

- Use Cursor IDE or cloud agent chat for feature inception, architecture choices, and implementation.
- Use CI/CD agents for event-driven review and triage (PR creation, dependency updates, open security findings).
- Treat Linear integration as optional extension work after the GitHub-first automation loop is stable.

## Deprecation Note

Claude Code-specific setup has been removed from active operation in favor of Cursor-first workflows.