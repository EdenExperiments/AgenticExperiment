# Mend Renovate + SonarCloud Onboarding Guide (Starter)

This guide captures the first-pass setup in this repo for dependency and code-quality automation.

## 1) Mend Renovate onboarding

### Files added

- `renovate.json` (repository config)
- `.github/workflows/mend-renovate.yml` (scheduled/manual pipeline option)

### Required secrets (if using workflow mode)

- `RENOVATE_TOKEN` (PAT or GitHub App token with repo write scope for update PRs)

### Notes

- `dependencyDashboard` is enabled for triage visibility.
- `automerge` remains disabled by default.
- NPM, Go modules, and GitHub Actions updates are included.
- If you run Renovate via Mend-hosted app only, keep `renovate.json` and disable/remove the workflow.

## 2) SonarCloud onboarding

### Files added

- `sonar-project.properties`
- `.github/workflows/sonarcloud.yml`

### Required secrets/variables

- Secret: `SONAR_TOKEN`
- Repo variable (preferred) or secret: `SONAR_ORGANIZATION`
- Repo variable (preferred) or secret: `SONAR_PROJECT_KEY`

### Notes

- Workflow runs on push and PR events.
- Checkout uses `fetch-depth: 0` for better analysis context.
- Initial scope uses root monorepo paths; tune exclusions and report paths as coverage matures.
- Workflow resolves `SONAR_ORGANIZATION` and `SONAR_PROJECT_KEY` from repo variables first, then falls back to same-named secrets.

## 3) Suggested rollout order

1. Merge config and workflows with `workflow_dispatch` validation.
2. Run Renovate and SonarCloud manually once.
3. Confirm secret wiring and expected output.
4. Enable scheduled/default operation.
5. Review noise level and tune rules/exclusions.