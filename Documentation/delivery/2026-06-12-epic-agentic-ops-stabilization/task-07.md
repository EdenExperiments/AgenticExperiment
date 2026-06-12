# Task 07 — Enable Bugbot + Autofix propose mode (F-068)

**Kind:** operator-only (no code, skip TDD)  
**Feature:** F-068  
**Depends on:** —  
**Verification:** Manual — Bugbot review comment appears on a test PR within one cycle

## Scope

Dashboard-side setup per `docs/guides/agentic-pipeline-operator-checklist.md` §M3:

1. Enable **Bugbot** on this repository (reads repo-root `BUGBOT.md`).
2. Enable **Autofix in propose mode** (fix-as-comment; merge via `@cursor` command).
3. Set **iteration cap to 3** review→fix cycles before human escalation.
4. Confirm team **usage cap / budget** accounts for Bugbot runs (~$1–1.50/run; loops multiply).

## Acceptance criteria

- [ ] Bugbot enabled for repo in Cursor dashboard.
- [ ] Autofix propose mode active (not direct-push).
- [ ] Test PR receives Bugbot review comment.
- [ ] Checklist items in operator guide marked complete (or tracked in issue).

## Target paths

- None (dashboard configuration only)

## Out of scope

- Editing `BUGBOT.md` content (already shipped).
- Golden-PR regression suite (F-061 post–Phase D).
- Direct-push Autofix graduation (D-056 — future).

## Reference

- `BUGBOT.md`
- `Documentation/agentic-pipeline/Agentic-Pipeline-Brief-v2.md` § Pillar B, M3
