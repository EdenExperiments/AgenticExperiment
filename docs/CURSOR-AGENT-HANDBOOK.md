# Cursor Agent Handbook

Workflow and CI reference for this repository. Product docs: `docs/README.md`. Zone map: `AGENTS.md`.

## Target Architecture: Agentic Pipeline (D-055)

CI automation (deps, Bugbot, maintenance queue) is described below. Product notes live in `docs/`; long agent plans in `docs/briefs/` then promote or delete. Pillars in short:

- **Pillar A** — dependency hygiene: Renovate baseline + assessment agent (`deps:safe` automerge behind CI+Sonar, `deps:breaking` research comments via SDK highlight-only).
- **Pillar B** — review loop: native Bugbot Autofix tuned via `BUGBOT.md`, propose mode first, severity status check as the merge gate (D-056, D-060). No custom SDK pipeline reviewer.
- **Pillar C** — maintenance queue: Sonar issues + `tech-debt` GitHub Issues normalised into one prioritised queue; dispatch via GitHub Actions artifact and/or Cursor Automations with a concurrent bot-PR cap.
- **Pillar D** — retired for IDE delivery. Development uses pstack (`/poteto-mode`) and cursor-team-kit. Product plans are ephemeral (`docs/briefs/`).
- **Skills (D-063):** pstack and cursor-team-kit plugins. Per-role models: `.cursor/rules/pstack-models.mdc`. Do not recreate a repo-managed `.cursor/skills/` / `.cursor/flows/` / `.cursor/agents/` pack.
- **Layered agent config (§4c):** base (root `AGENTS.md`, alwaysApply rules including `pstack-models.mdc`, hooks) → stack (nested `AGENTS.md` per zone) → role (pstack `poteto-agent` / Comment Sicko + Cursor built-ins). See `docs/guides/agent-composition-contract.md`.
- Operator-side setup (Bugbot, Automations, branch protection, usage caps) is tracked in `docs/guides/agentic-pipeline-operator-checklist.md`.

### Three automation lanes (D-060)

| Lane | Owns | SDK / Automations role |
|------|------|------------------------|
| **Bugbot** | PR review + Autofix loop | None — do not duplicate with SDK reviewer |
| **SDK (GH Actions)** | Highlight comments, scanner triage, optional gated remediation | `dep-assess`, `security-triage`, `fix-attempt`, `maintenance-queue` scripts |
| **Cursor Automations** | Optional cloud dispatch | Weekly maintenance cron, Renovate events when preferred over GH Actions |

SDK PR comments are **advisory warnings** unless running an explicitly gated remediation workflow. Merge gates remain CI + Sonar + Bugbot severity check.

## Development Path (D-063)

Use `/poteto-mode` (pstack) for feature work, fixes, and refactors. cursor-team-kit covers deslop, review-and-ship, loop-on-ci, and related PR hygiene. Do not recreate repo-managed slash commands that compete with those plugins.

## Development Paths (D-036)


| Path      | Flow                                                         | Gate                              |
| --------- | ------------------------------------------------------------ | --------------------------------- |
| Logic/API | spec -> tests -> implementation -> review                    | Tests must pass                   |
| UI/Visual | tokens in `packages/ui` → implement → visual review | Token/theme/a11y review must pass |


Tests are required for business logic, API contracts, and component behavior.  
Pure visual composition work is validated by visual review and design-guide compliance.

## Session And Handoff Expectations

- Keep updates resumable: what changed, why, and what remains.
- Documentation: lasting rules in `docs/`; behaviour in tests; long plans in `docs/briefs/` then delete.

## Cursor Usage Model

- IDE agent and cloud agent chat are the default tools for feature inception and implementation.
- CI/CD agents run through TypeScript automation using `@cursor/sdk` and GitHub Actions.
- Keep automation additive at first: summarize and recommend before enabling automatic fixes.

## CI/CD Agent Workflows

- Baseline build/test remains in `.github/workflows/ci.yml`.
- Bugbot reviews PRs against the repo-level `BUGBOT.md` rules file; Autofix runs in propose mode with a 3-iteration cap (D-056). Enablement is dashboard-side — see `docs/guides/agentic-pipeline-operator-checklist.md`.
- **Retired:** custom SDK pipeline reviewer (`cursor-pr-review.yml` inert stub; `pr-review.ts` removed) per D-060.
- Security and dependency triage automation lives in `.github/workflows/cursor-security-triage.yml` (includes Renovate `dep-assess` highlight comments).
- SDK remediation automation lives in `.github/workflows/cursor-fix-attempt.yml` (`/cursor-fix` or `workflow_dispatch`; Sonar-first context; optional Bugbot prose advisory; dual gate per D-047).
- Agent PR auto-labeling automation lives in `.github/workflows/cursor-agent-pr-labels.yml`.
- Security signal generation lives in `.github/workflows/codeql.yml` (plus GitHub Dependabot security alerts; Dependabot version updates are retired per D-057).
- Renovate is the single dependency-update path (`.github/workflows/mend-renovate.yml` + `renovate.json`): patch updates labeled `deps:safe` automerge behind green CI + Sonar; majors are labeled `deps:breaking` and require dashboard approval plus an assessment-agent research comment.
- SonarCloud analysis runs via `.github/workflows/sonarcloud.yml` and `sonar-project.properties` (includes a nightly **main-branch** scan schedule).
- Daily Cursor digest (`Sonar` branch snapshot + open Renovate/Mend/Dependabot-shaped PRs → prioritized markdown) runs via `.github/workflows/cursor-daily-quality-digest.yml`.
- Onboarding smoke checks run via `.github/workflows/quality-onboarding-smoke.yml`.
- Weekly outcome metrics (PR throughput by surface, merge rate, cycle time, Sonar burn-down) run via `.github/workflows/cursor-weekly-metrics.yml`; agent jobs emit `cursor-agent-run-summary:v1` JSON artifacts (M6).
- The unified maintenance queue (Pillar C) is built in the daily digest workflow (`maintenance-queue.json` artifact); dispatch of selected items is a Cursor Automation or manual/SDK follow-up (see `docs/guides/agentic-pipeline-operator-checklist.md`).

## CI/CD Runtime Contract

### Required Secret

- `CURSOR_API_KEY`: authentication key for `@cursor/sdk` runs in GitHub Actions.
- `RENOVATE_TOKEN`: token for workflow-driven Renovate runs.
- `SONAR_TOKEN`: token for SonarCloud analysis.

### Recommended Variables

- `CURSOR_RUNTIME`: `local` (default) or `cloud` for SDK workflow lane routing.
- `CURSOR_CLOUD_OMIT_PR_URL`: set to `true` to stop sending `repos[].prUrl` to Cursor Cloud (keeps `url` + `startingRef` only). Try if cloud validation still fails with a SHA-style branch error; you lose automatic PR ↔ clone linkage on Cursor’s side until their API improves (`false` default).
- `CURSOR_CLOUD_REPO_URL`: explicit repository URL for cloud runtime execution.
- `CURSOR_CLOUD_WORK_ON_CURRENT_BRANCH`: when `true`, cloud agents target the PR’s existing branch instead of only detached work (`false` default).
- `CURSOR_CLOUD_AUTO_CREATE_PR`: when `false`, cloud agents do not open a separate fix PR—combine with `CURSOR_CLOUD_WORK_ON_CURRENT_BRANCH=true` to push commits onto the source PR branch (`true` default).
- `CURSOR_CLOUD_STARTING_REF`: optional branch short name for cloud `startingRef`. **Usually leave unset:** fix-attempt passes the resolved PR head branch from the workflow. Override only with an explicit branch short name (never a commit SHA).
- `CURSOR_AUTO_FIX_ENABLED`: global on/off switch for SDK remediation attempts.
- `CURSOR_FIX_COMMENT_TRIGGERS`: comma-separated slash tokens that qualify an issue comment (default `/cursor-fix,/cursor-auto-fix`).
- `CURSOR_AUTO_FIX_LABEL`: per-PR allow label for remediation attempts (`cursor:auto-fix` default).
- `CURSOR_FIX_PLANNER_MODEL`: model ID for orchestration/planning pass.
- `CURSOR_FIX_EXECUTION_MODEL`: model ID for implementation pass (prefer cheaper default).
- `CURSOR_FIX_MODEL`: legacy fallback model variable for implementation pass.
- `CURSOR_REQUIRE_TEST_CHANGES`: fail remediation attempts if code changes do not include unit-test file changes.
- `CURSOR_AUTO_FIX_EXCLUDED_AUTHORS`: PR authors excluded from remediation source selection.
- `CURSOR_AGENT_PR_LABELS`: labels applied to trusted agent-created PRs (must match this spelling in GitHub repo variables; `cursor-fix-attempt.yml` reads `CURSOR_AGENT_PR_LABELS` only).
- `CURSOR_AGENT_TRUSTED_LOGINS`: trusted PR author logins for auto-labeling.
- `CURSOR_AGENT_BRANCH_PREFIXES`: trusted PR branch prefixes for auto-labeling.
- `CURSOR_AGENT_PR_LABELING_ENABLED`: set to `false` to disable PR-open auto-labeling.
- `SONAR_ORGANIZATION`: SonarCloud organization key.
- `SONAR_PROJECT_KEY`: SonarCloud project key.
- `SONAR_MIN_NEW_COVERAGE`: minimum PR new-code coverage enforced after Sonar scan (`80` default).
- `CURSOR_AUTO_FIX_WAIT_SCANNERS`: when `true` (default), remediation waits for required GitHub checks + Sonar PR quality-gate API before planning.
- `CURSOR_AUTO_FIX_WAIT_TIMEOUT_MS`: max wait for scanners before continuing best-effort (`900000` default).
- `CURSOR_AUTO_FIX_POLL_INTERVAL_MS`: polling cadence while waiting (`20000` default).
- `CURSOR_AUTO_FIX_OPTIONAL_SCAN_GRACE_MS`: grace window where optional scanners (for example CodeQL) may still appear (`180000` default).
- `CURSOR_AUTO_FIX_REQUIRED_CHECK_SUBSTRINGS`: comma-separated substrings matched against GitHub check run names that **must** complete (`SonarCloud` default).
- `CURSOR_AUTO_FIX_OPTIONAL_CHECK_SUBSTRINGS`: optional scanners; if no matching run appears after the grace window, the wait stops blocking on that pattern (`CodeQL,code scanning` default).
- `CURSOR_AUTO_FIX_FAIL_ON_SCANNER_TIMEOUT`: set to `true` to fail the workflow when the scanner wait hits the timeout instead of continuing with partial context (`false` default).
- `CURSOR_AUTO_FIX_SONAR_SEVERITIES`: comma-separated Sonar severities for PR issue sampling in remediation (`BLOCKER,CRITICAL,MAJOR` default).
- `CURSOR_AUTO_FIX_MERGED_SIGNAL_LIMIT`: max Sonar rows in the deterministic merged brief (`5` default).

### Agentic pipeline variables (M0/M4/M6)

- `AGENTS_ENABLED`: repo-side kill-switch; `false` skips every `cursor-*` agent workflow. Mirror with Cursor-dashboard disables for Automations/Bugbot (brief §6).
- `CURSOR_QUEUE_BOT_PR_CAP`: concurrent open bot-PR cap for maintenance dispatch (`4` default).
- `CURSOR_QUEUE_TOP_K`: max items selected per queue run (`3` default).
- `CURSOR_QUEUE_ISSUE_LABEL`: backlog intake label (`tech-debt` default).
- `CURSOR_QUEUE_SONAR_SEVERITIES`: Sonar severities pulled into the queue (`BLOCKER,CRITICAL,MAJOR` default).
- `CURSOR_METRICS_ISSUE_NUMBER`: issue that receives the weekly metrics comment.

### Daily digest (scheduled)

- `SONAR_BRANCH`: SonarCloud branch key for non-PR digest queries (`main` default).
- `CURSOR_DAILY_DIGEST_ISSUE_NUMBER`: optional GitHub issue number; when set, the digest upserts a marker comment there instead of only writing the Actions step summary.
- `CURSOR_DAILY_DIGEST_MODEL`: preferred model id for digest narration (default `composer-2.5`; falls back through `composer-2`, `gpt-5.4-mini` when a slug is unavailable).
- `CURSOR_DAILY_DIGEST_TOP_ISSUES`: Sonar issues fetched per run (`12` default).

### Permissions Model

- `cursor-security-triage.yml`: `contents:read`, `security-events:read`, `pull-requests:read`, `issues:write`
- `cursor-fix-attempt.yml`: lightweight gate job (`issues:read`, `pull-requests:read`) validates triggers; fix job uses `contents:read`, `pull-requests:read`, `issues:write`
- `cursor-agent-pr-labels.yml`: `contents:read`, `pull-requests:write`
- `cursor-daily-quality-digest.yml`: `contents:read`, `pull-requests:read`, `issues:write`
- `codeql.yml`: `security-events:write` for publishing scan findings

### Automation Guardrails

- Default behavior is highlight/comment (Renovate assess, triage) before gated remediation commits.
- Bugbot and SDK bot comments are **advisory**. **Merge gates** remain CI, Sonar, and Bugbot severity check.
- SDK remediation requires both a global flag and an explicit PR allow label.
- For cloud-created PRs, apply labels automatically on open so policy checks can evaluate immediately.
- Use planner and executor model split for remediation to control cost.
- Keep generated comments concise; use marker comments for idempotent upserts.

## Operating Split

- Use Cursor IDE or cloud agent chat for feature inception, architecture choices, and implementation.
- Use CI/CD SDK agents for event-driven triage, highlight comments, and optional remediation.
- Use Cursor Automations when cloud dispatch is preferable to GH Actions for maintenance or dependency events.

## Plugin Skills

- Development procedure lives in the **pstack** and **cursor-team-kit** plugins, not in `.cursor/skills/`.
- Per-role model mapping is `.cursor/rules/pstack-models.mdc`.
- Keep implementation runbooks in `docs/guides/`.

## Deprecation Note

Claude Code-specific setup has been removed from active operation in favor of Cursor-first workflows. The custom SDK pipeline reviewer (F-050, F-058) is retired per D-060; Bugbot owns PR review.
