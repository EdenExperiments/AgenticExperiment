# Task 13 — Metrics dashboard issue + repo variable (F-071)

**Kind:** operator-only (no code, skip TDD)  
**Feature:** F-071  
**Depends on:** — (benefits from task-12 for JSON artifact, but issue comment works with current weekly-metrics)  
**Verification:** Manual — Monday `cursor-weekly-metrics.yml` upserts comment on dashboard issue

## Scope

Per `docs/guides/agentic-pipeline-operator-checklist.md` §M6:

1. Create or designate a GitHub issue as the **metrics dashboard** (e.g. title "Agentic pipeline metrics").
2. Set repository variable `CURSOR_METRICS_ISSUE_NUMBER` to the issue number.
3. Confirm `CURSOR_PR_REVIEW_TOKEN` or default `GITHUB_TOKEN` has `issues: write` for upsert.
4. Trigger `workflow_dispatch` on `cursor-weekly-metrics.yml` once to validate.

## Acceptance criteria

- [ ] `CURSOR_METRICS_ISSUE_NUMBER` set on repo.
- [ ] Issue contains `<!-- cursor-weekly-metrics -->` marker comment after test run.
- [ ] Step summary shows table even if issue upsert fails (403 handled gracefully).
- [ ] Operator checklist M6 marked complete.

## Target paths

- None (GitHub repo settings + issue)

## Out of scope

- Building a separate dashboard UI.
- Slack/email notifications.
