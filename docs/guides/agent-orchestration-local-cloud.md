# Agent Orchestration: Local and Cloud (Starter)

This repo now supports a basic runtime split for SDK automation in `packages/cursor-agents/`.

## Runtime selector

- Environment variable: `CURSOR_RUNTIME`
- Supported values:
  - `local` (default)
  - `cloud`

If `CURSOR_RUNTIME=cloud`, provide:

- `CURSOR_CLOUD_REPO_URL` (recommended explicit value), or
- `GITHUB_REPOSITORY` (workflow fallback used to derive `https://github.com/<owner>/<repo>.git`)

## Local lane

Use local lane for fast iteration and direct workspace feedback.

```bash
pnpm --filter @rpgtracker/cursor-agents run pr-review:local
pnpm --filter @rpgtracker/cursor-agents run security-triage:local
```

## Cloud lane

Use cloud lane for longer-running unattended runs or remote execution experiments.

```bash
CURSOR_CLOUD_REPO_URL="https://github.com/<owner>/<repo>.git" \
pnpm --filter @rpgtracker/cursor-agents run pr-review:cloud
```

```bash
CURSOR_CLOUD_REPO_URL="https://github.com/<owner>/<repo>.git" \
pnpm --filter @rpgtracker/cursor-agents run security-triage:cloud
```

```bash
CURSOR_CLOUD_REPO_URL="https://github.com/<owner>/<repo>.git" \
pnpm --filter @rpgtracker/cursor-agents run fix-attempt:cloud
```

## Optional environment knobs

- `CURSOR_REVIEW_MODELS`: comma-separated model fallback list for PR review.
- `CURSOR_TRIAGE_MODEL`: model ID for security triage.
- `CURSOR_FIX_PLANNER_MODEL`: planning model for auto-fix orchestration.
- `CURSOR_FIX_EXECUTION_MODEL`: lower-cost execution model for auto-fix implementation.
- `CURSOR_FIX_MODEL`: legacy execution-model fallback.
- `CURSOR_REQUIRE_TEST_CHANGES`: fail auto-fix runs when code changes lack unit-test file changes.
- `CURSOR_CLOUD_SKIP_REVIEWER_REQUEST`: defaults to `true` unless explicitly set to `false`.

## Auto-fix gate policy (recommended)

Use a dual-gate policy so automation only writes when both policy and per-PR intent are explicit:

1. Repo variable `CURSOR_AUTO_FIX_ENABLED=true`
2. PR label `cursor:auto-fix` (override with `CURSOR_AUTO_FIX_LABEL`)

The `.github/workflows/cursor-fix-attempt.yml` workflow reacts to the Cursor PR review comment marker and then enforces the label gate before launching a cloud run with `autoCreatePR: true`.

## Agent-opened PR labeling

To ensure labels are present as soon as cloud-created PRs open, use `.github/workflows/cursor-agent-pr-labels.yml`.

- Trigger: `pull_request_target` on `opened`/`reopened`
- Scope: trusted agent PRs only (by login and/or branch prefix policy)
- Behavior: applies `CURSOR_AGENT_PR_LABELS` immediately

Recommended variables:

- `CURSOR_AGENT_PR_LABELS` (default: `cursor:agent-generated`)
- `CURSOR_AGENT_TRUSTED_LOGINS` (default: `cursor[bot]`)
- `CURSOR_AGENT_BRANCH_PREFIXES` (default: `cursor/`)
- `CURSOR_AGENT_PR_LABELING_ENABLED` (default enabled; set `false` to disable)
- `CURSOR_AUTO_FIX_EXCLUDED_AUTHORS` (default: `cursor[bot]`)

## Test and coverage policy

- Auto-fix flow enforces unit-test file changes when code files are edited.
- Sonar workflow enforces PR new-code coverage threshold via `SONAR_MIN_NEW_COVERAGE` (default 80).
- Keep SonarCloud quality gate configured with "Coverage on New Code >= 80%" for aligned UI and pipeline behavior.

## Safety notes

- Keep cloud runs opt-in until behavior is stable.
- Keep automated workflows recommendation-first (comment/summarize) before any write/remediation.
