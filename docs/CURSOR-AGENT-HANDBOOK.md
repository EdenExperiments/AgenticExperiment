# Cursor Agent Handbook

This handbook defines the Cursor-first operating model for this repository.

## Primary Entry Points

- Start with `AGENTS.md` for directory-level context.
- Use `Documentation/README.md` for canonical product and architecture docs.
- Use this handbook for workflow, coordination, and automation standards.
- Use `.cursor/skills/skills.index.json` for repo-managed skill discovery.

## Target Architecture: Agentic Pipeline (D-055)

`Documentation/agentic-pipeline/Agentic-Pipeline-Brief-v2.md` is the adopted target design for agentic operations:

- **Pillar A** — dependency hygiene: Renovate baseline + assessment agent (`deps:safe` automerge behind CI+Sonar, `deps:breaking` research comments).
- **Pillar B** — review loop: native Bugbot Autofix tuned via `BUGBOT.md`, propose mode first, severity status check as the merge gate (D-056). The custom SDK review/fix loop runs in parallel until retired.
- **Pillar C** — maintenance queue: Sonar issues + `tech-debt` GitHub Issues normalised into one prioritised queue, dispatched via Cursor Automations with a concurrent bot-PR cap.
- **Pillar D** — command-driven delivery: `/fix`, `/feature`, `/epic`, `/new-project` commands route to skill chains (`.cursor/skills/delivery/`), TDD with separated subagents (`.cursor/agents/`), draft PRs into the Pillar B convergence loop.
- **Layered agent config (§4c)**: base (root `AGENTS.md`, `security-baseline.mdc`, hooks) → stack (nested `AGENTS.md` per zone) → role (`.cursor/agents/*.md`). See `docs/guides/agent-composition-contract.md`.
- Operator-side setup (Bugbot, Automations, branch protection, usage caps) is tracked in `docs/guides/agentic-pipeline-operator-checklist.md`.

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
- Auto-fix attempt automation lives in `.github/workflows/cursor-fix-attempt.yml` (lightweight gate job + fix job; `/cursor-fix`, human quote-replies, or threaded replies qualify — **bot** comments are ignored for marker-only matches so review/Sonar bot comment updates on push do not re-trigger a fix run).
- Agent PR auto-labeling automation lives in `.github/workflows/cursor-agent-pr-labels.yml`.
- Security signal generation lives in `.github/workflows/codeql.yml` (plus GitHub Dependabot security alerts; Dependabot version updates are retired per D-057).
- Renovate is the single dependency-update path (`.github/workflows/mend-renovate.yml` + `renovate.json`): patch updates labeled `deps:safe` automerge behind green CI + Sonar; majors are labeled `deps:breaking` and require dashboard approval plus an assessment-agent research comment.
- SonarCloud analysis runs via `.github/workflows/sonarcloud.yml` and `sonar-project.properties` (includes a nightly **main-branch** scan schedule).
- Daily Cursor digest (`Sonar` branch snapshot + open Renovate/Mend/Dependabot-shaped PRs → prioritized markdown) runs via `.github/workflows/cursor-daily-quality-digest.yml`.
- Onboarding smoke checks run via `.github/workflows/quality-onboarding-smoke.yml`.

## CI/CD Runtime Contract

### Required Secret

- `CURSOR_API_KEY`: authentication key for `@cursor/sdk` runs in GitHub Actions.
- `RENOVATE_TOKEN`: token for workflow-driven Renovate runs.
- `SONAR_TOKEN`: token for SonarCloud analysis.

### Recommended Variables

- `CURSOR_RUNTIME`: `local` (default) or `cloud` for SDK workflow lane routing.
- `CURSOR_REVIEW_MODELS`: optional comma-ordered list for PR review model fallback attempts (defaults prefer **`composer-2.5`** first for cost control; stale slugs are skipped via the shared model-fallback helper).
- `CURSOR_REVIEW_MAX_FINDINGS`: hard cap on structured PR-review findings (default `10`, max `25`) to reduce noisy threads.
- `CURSOR_CLOUD_OMIT_PR_URL`: set to `true` to stop sending `repos[].prUrl` to Cursor Cloud (keeps `url` + `startingRef` only). Try if cloud validation still fails with a SHA-style branch error; you lose automatic PR ↔ clone linkage on Cursor’s side until their API improves (`false` default).
- `CURSOR_CLOUD_REPO_URL`: explicit repository URL for cloud runtime execution.
- `CURSOR_CLOUD_WORK_ON_CURRENT_BRANCH`: when `true`, cloud agents target the PR’s existing branch instead of only detached work (`false` default).
- `CURSOR_CLOUD_AUTO_CREATE_PR`: when `false`, cloud agents do not open a separate fix PR—combine with `CURSOR_CLOUD_WORK_ON_CURRENT_BRANCH=true` to push commits onto the source PR branch (`true` default).
- `CURSOR_CLOUD_STARTING_REF`: optional branch short name for cloud `startingRef`. **Usually leave unset:** auto-fix passes the resolved PR head branch from the workflow and also resolves it in `fix-attempt.ts` when needed. Override only with an explicit branch short name (never a commit SHA).
- `CURSOR_AUTO_FIX_ENABLED`: global on/off switch for auto-fix attempts.
- `CURSOR_FIX_COMMENT_TRIGGERS`: comma-separated slash tokens that qualify an issue comment (default `/cursor-fix,/cursor-auto-fix`). Thread replies and quote replies are handled by the gate job without requiring this list to match every trigger style.
- `CURSOR_AUTO_FIX_LABEL`: per-PR allow label for auto-fix attempts (`cursor:auto-fix` default).
- `CURSOR_FIX_PLANNER_MODEL`: model ID for orchestration/planning pass.
- `CURSOR_FIX_EXECUTION_MODEL`: model ID for implementation pass (prefer cheaper default).
- `CURSOR_FIX_MODEL`: legacy fallback model variable for implementation pass.
- `CURSOR_REQUIRE_TEST_CHANGES`: fail auto-fix attempts if code changes do not include unit-test file changes.
- `CURSOR_REQUIRE_REVIEW_SCHEMA`: require machine-readable PR review payload before auto-fix planning.
- `CURSOR_AUTO_FIX_EXCLUDED_AUTHORS`: PR authors excluded from auto-fix source selection.
- `CURSOR_AGENT_PR_LABELS`: labels applied to trusted agent-created PRs (must match this spelling in GitHub repo variables; `cursor-fix-attempt.yml` reads `CURSOR_AGENT_PR_LABELS` only).
- `CURSOR_AGENT_TRUSTED_LOGINS`: trusted PR author logins for auto-labeling.
- `CURSOR_AGENT_BRANCH_PREFIXES`: trusted PR branch prefixes for auto-labeling.
- `CURSOR_AGENT_PR_LABELING_ENABLED`: set to `false` to disable PR-open auto-labeling.
- `SONAR_ORGANIZATION`: SonarCloud organization key.
- `SONAR_PROJECT_KEY`: SonarCloud project key.
- `SONAR_MIN_NEW_COVERAGE`: minimum PR new-code coverage enforced after Sonar scan (`80` default).
- `CURSOR_AUTO_FIX_WAIT_SCANNERS`: when `true` (default), the fix attempt waits until required GitHub check runs reach `status=completed`, optional patterns satisfy the grace rule, and the SonarCloud PR quality-gate API returns a readable status before planning (completion-based, not “all green”; failure conclusions and non-OK Sonar status are echoed into the scanner-wait log). This does **not** wait for issue-comment bots (for example an updated Cursor PR Review markdown comment); it waits on **checks** and **Sonar’s API** only. If you need the latest review comment after Sonar finishes, trigger auto-fix after both have settled or increase poll/timeout so the review job completes first.
- `CURSOR_AUTO_FIX_WAIT_TIMEOUT_MS`: max wait for scanners before continuing best-effort (`900000` default).
- `CURSOR_AUTO_FIX_POLL_INTERVAL_MS`: polling cadence while waiting (`20000` default).
- `CURSOR_AUTO_FIX_OPTIONAL_SCAN_GRACE_MS`: grace window where optional scanners (for example CodeQL) may still appear (`180000` default).
- `CURSOR_AUTO_FIX_REQUIRED_CHECK_SUBSTRINGS`: comma-separated substrings matched against GitHub check run names that **must** complete (`SonarCloud` default).
- `CURSOR_AUTO_FIX_OPTIONAL_CHECK_SUBSTRINGS`: optional scanners; if no matching run appears after the grace window, the wait stops blocking on that pattern (`CodeQL,code scanning` default).
- `CURSOR_AUTO_FIX_FAIL_ON_SCANNER_TIMEOUT`: set to `true` to fail the workflow when the scanner wait hits the timeout instead of continuing with partial context (`false` default).
- `CURSOR_AUTO_FIX_SONAR_SEVERITIES`: comma-separated Sonar severities for PR issue sampling in fix attempts (`BLOCKER,CRITICAL,MAJOR` default; widen cautiously to reduce noise).
- `CURSOR_AUTO_FIX_MERGED_SIGNAL_LIMIT`: max rows pulled from **both** agent-review findings and Sonar samples into the deterministic merged brief (`5` default).

### Daily digest (scheduled)

- `SONAR_BRANCH`: SonarCloud branch key for non-PR digest queries (`main` default).
- `CURSOR_DAILY_DIGEST_ISSUE_NUMBER`: optional GitHub issue number; when set, the digest upserts a marker comment there instead of only writing the Actions step summary.
- `CURSOR_DAILY_DIGEST_MODEL`: preferred model id for digest narration (default `composer-2.5`; falls back through `composer-2`, `gpt-5.4-mini` when a slug is unavailable).
- `CURSOR_DAILY_DIGEST_TOP_ISSUES`: Sonar issues fetched per run (`12` default).

### Permissions Model

- `cursor-pr-review.yml`: `contents:read`, `pull-requests:read`, `issues:write`
- `cursor-security-triage.yml`: `contents:read`, `security-events:read`, `pull-requests:read`, `issues:write`
- `cursor-fix-attempt.yml`: lightweight gate job (`issues:read`, `pull-requests:read`) validates triggers; fix job uses `contents:read`, `pull-requests:read`, `issues:write`
- `cursor-agent-pr-labels.yml`: `contents:read`, `pull-requests:write`
- `cursor-daily-quality-digest.yml`: `contents:read`, `pull-requests:read`, `issues:write`
- `codeql.yml`: `security-events:write` for publishing scan findings

### Automation Guardrails

- Default behavior is review and recommendation (comment/summary) rather than auto-remediation commits.
- Treat automated PR review output as **advisory** implementation guidance. **Merge gates** remain driven by CI and deterministic scanners (SonarCloud, CodeQL / code scanning, tests), not by review prose alone.
- Promote to auto-fix only after repeated stable runs and explicit policy approval.
- For auto-fix flows, require both a global flag and an explicit PR allow label.
- For cloud-created PRs, apply labels automatically on open so policy checks can evaluate immediately.
- Use planner and executor model split for remediation loops to control cost while retaining planning quality (see `.cursor/skills/orchestration/review-driven-fix-routing/SKILL.md`).
- Keep reviewer output machine-readable (schema payload) so prioritization and fix routing can consume deterministic severity and confidence fields.
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