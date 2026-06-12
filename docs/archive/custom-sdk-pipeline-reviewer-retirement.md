# Custom SDK Pipeline Reviewer — Retirement Note

**Status:** Retired in repo (D-060, executes D-056)  
**Date:** 2026-06-12

## Removed

- `packages/cursor-agents/src/pr-review.ts` and `pr-review*` package scripts
- Custom **pipeline reviewer** that duplicated Bugbot on every PR

## Replaced by

- **Pillar B:** Bugbot + Autofix + [`BUGBOT.md`](../../BUGBOT.md) + required severity status check (dashboard)

## SDK lanes that remain

| Script / workflow | Role |
|-------------------|------|
| `dep-assess` / `cursor-security-triage.yml` | Renovate **highlight-only** research comments (Pillar A) |
| `fix-attempt` / `cursor-fix-attempt.yml` | Optional **gated SDK remediation** (`/cursor-fix` + Sonar-first; Bugbot prose advisory) |
| `maintenance-queue` | Queue artifact for Pillar C dispatch |
| `daily-quality-digest`, `security-triage`, `weekly-metrics` | Signal aggregation and triage |

## Cursor Automations

Optional dispatch layer for maintenance cron and Renovate events when GH Actions + SDK is not
preferred. See `docs/guides/agentic-pipeline-operator-checklist.md` M4.

## Workflow files (CODEOWNER apply)

Repo hooks block agent edits to `.github/workflows/**`. Apply manually:

1. **`cursor-pr-review.yml`** — retire to `workflow_dispatch` + `if: false` stub (or delete).
2. **`cursor-fix-attempt.yml`** — remove `cursor-pr-review` marker / threaded-reply triggers;
   default `CURSOR_REQUIRE_REVIEW_SCHEMA` to `false`.

Patch spec: [`Documentation/delivery/D-060-pipeline-reviewer-retirement.md`](../Documentation/delivery/D-060-pipeline-reviewer-retirement.md).
