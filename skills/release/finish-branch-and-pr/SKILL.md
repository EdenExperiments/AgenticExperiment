---
name: finish-branch-and-pr
description: Use when implementation is complete and you need to prepare branch, verification, and PR quality gates.
---

# Finish Branch And PR Skill

## File Focus (read first)

1. Changed files from `git status` / `git diff`
2. Relevant workflow files in `.github/workflows/` if CI behavior changed
3. `README.md`, `AGENTS.md`, or `Documentation/feature-tracker.md` if behavior/scope changed

## Search Boundaries

- Restrict review and verification to changed paths plus directly related tests/config.
- Avoid broad repository scans during release prep unless a failing check indicates wider impact.

## Hard Boundary Rule

- Do **not** widen review scope beyond changed paths without evidence.
- Expand only when:
  1. required checks fail in untouched paths,
  2. dependency graph indicates transitive impact,
  3. user requests broader release audit.

## Workflow

1. Verify touched areas with relevant test/build commands.
2. Confirm docs/tracker updates are complete for behavior or scope changes.
3. Review diff for secrets and accidental unrelated changes.
4. Summarize change intent and test evidence clearly for reviewers.

## PR Hygiene

- Keep PR scope focused and reviewable.
- Include a concise summary and a practical test plan.
- Flag risks, assumptions, and follow-ups explicitly.
