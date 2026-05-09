# Cursor Agent Handbook

This handbook defines the Cursor-first operating model for this repository.

## Primary Entry Points

- Start with `AGENTS.md` for directory-level context.
- Use `Documentation/README.md` for canonical product and architecture docs.
- Use this handbook for workflow, coordination, and automation standards.
- Use `.cursor/skills/skills.index.json` for repo-managed skill discovery.

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
- Capture post-merge learnings as concise entries in `Documentation/decision-log.md` and `Documentation/feature-tracker.md`.
- Surface blockers and decision gaps in `Documentation/decision-log.md` and `Documentation/feature-tracker.md`.

## Cursor Usage Model

- IDE agent and cloud agent chat are the default tools for feature inception and implementation.
- CI/CD agents run through TypeScript automation using `@cursor/sdk` and GitHub Actions.
- Keep automation additive at first: summarize and recommend before enabling automatic fixes.

## CI/CD Agent Workflows

- Baseline build/test remains in `.github/workflows/ci.yml`.
- PR review automation lives in `.github/workflows/cursor-pr-review.yml`.
- Security and dependency triage automation lives in `.github/workflows/cursor-security-triage.yml`.
- Auto-fix attempt automation lives in `.github/workflows/cursor-fix-attempt.yml`.
- Agent PR auto-labeling automation lives in `.github/workflows/cursor-agent-pr-labels.yml`.
- Security signal generation lives in `.github/workflows/codeql.yml` and `.github/dependabot.yml`.
- Renovate dependency updates can run via `.github/workflows/mend-renovate.yml` and `renovate.json`.
- SonarCloud analysis runs via `.github/workflows/sonarcloud.yml` and `sonar-project.properties`.
- Onboarding smoke checks run via `.github/workflows/quality-onboarding-smoke.yml`.

## CI/CD Runtime Contract

### Required Secret

- `CURSOR_API_KEY`: authentication key for `@cursor/sdk` runs in GitHub Actions.
- `RENOVATE_TOKEN`: token for workflow-driven Renovate runs.
- `SONAR_TOKEN`: token for SonarCloud analysis.

### Recommended Variables

- `CURSOR_RUNTIME`: `local` (default) or `cloud` for SDK workflow lane routing.
- `CURSOR_CLOUD_REPO_URL`: explicit repository URL for cloud runtime execution.
- `CURSOR_AUTO_FIX_ENABLED`: global on/off switch for auto-fix attempts.
- `CURSOR_AUTO_FIX_LABEL`: per-PR allow label for auto-fix attempts (`cursor:auto-fix` default).
- `CURSOR_FIX_MODEL`: model ID used by auto-fix attempts.
- `CURSOR_AUTO_FIX_EXCLUDED_AUTHORS`: PR authors excluded from auto-fix source selection.
- `CURSOR_AGENT_PR_LABELS`: labels applied to trusted agent-created PRs.
- `CURSOR_AGENT_TRUSTED_LOGINS`: trusted PR author logins for auto-labeling.
- `CURSOR_AGENT_BRANCH_PREFIXES`: trusted PR branch prefixes for auto-labeling.
- `CURSOR_AGENT_PR_LABELING_ENABLED`: set to `false` to disable PR-open auto-labeling.
- `SONAR_ORGANIZATION`: SonarCloud organization key.
- `SONAR_PROJECT_KEY`: SonarCloud project key.

### Permissions Model

- `cursor-pr-review.yml`: `contents:read`, `pull-requests:read`, `issues:write`
- `cursor-security-triage.yml`: `contents:read`, `security-events:read`, `pull-requests:read`, `issues:write`
- `cursor-fix-attempt.yml`: `contents:read`, `pull-requests:read`, `issues:write`
- `cursor-agent-pr-labels.yml`: `contents:read`, `pull-requests:write`
- `codeql.yml`: `security-events:write` for publishing scan findings

### Automation Guardrails

- Default behavior is review and recommendation (comment/summary) rather than auto-remediation commits.
- Promote to auto-fix only after repeated stable runs and explicit policy approval.
- For auto-fix flows, require both a global flag and an explicit PR allow label.
- For cloud-created PRs, apply labels automatically on open so policy checks can evaluate immediately.
- Keep generated comments concise and actionable; avoid noisy duplicate comments by updating marker comments.

## Operating Split

- Use Cursor IDE or cloud agent chat for feature inception, architecture choices, and implementation.
- Use CI/CD agents for event-driven review and triage (PR creation, dependency updates, open security findings).
- Treat Linear integration as optional extension work after the GitHub-first automation loop is stable.

## Skill Directory Conventions

- Place repo-managed skills under `.cursor/skills/<domain>/<skill-name>/SKILL.md`.
- Keep the index synchronized in `.cursor/skills/skills.index.json`.
- Run `pnpm validate:skills` before commit or PR to enforce index/file consistency.
- Keep implementation runbooks in `docs/guides/`.

## Deprecation Note

Claude Code-specific setup has been removed from active operation in favor of Cursor-first workflows.