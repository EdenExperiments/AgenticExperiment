# Epic — Lane F: Agentic Operations Stabilization

**Status:** Draft — awaiting sign-off  
**Features:** F-061, F-068, F-069, F-071  
**Plan reference:** `docs/guides/cursor-lab-eval-flow-plan.md`  
**Operator checklist:** `docs/guides/agentic-pipeline-operator-checklist.md`

## Goal

Close the remaining gaps in the agentic pipeline's **evaluation harness**, **review gate**, **maintenance dispatch**, and **telemetry** so Lane F (ops stabilization) can move from in-progress to demonstrable: reproducible `.cursor/` evals, Bugbot as the sole merge gate, a scored maintenance queue that Automations can consume, and structured outcome metrics feeding future golden-PR work.

## Non-goals

- Two-repo / CI eval runner for cursor-lab (Phase F of eval plan — enterprise port only).
- Bugbot direct-push Autofix mode (propose mode only until golden-PR evidence — D-056).
- Custom SDK pipeline reviewer resurrection (D-060).
- Per-surface **merged-unmodified** rate in weekly metrics (depends on cursor-lab golden-PR set — deferred to post–Phase D).
- Hosted metrics dashboard UI (issue comment + JSON artifacts suffice for M6).
- Multi-tenant judge orchestration or DSPy prompt optimization (MIPRO/BootstrapFewShot).

## Current state (2026-06-12)

| Feature | Landed | Remaining |
|---------|--------|-----------|
| **F-061** | Phase A: `apps/cursor-lab/` scaffold, Node bridge, `doctor`/`list`, discovery skeleton, placeholder modules | Sandbox, fixtures, `evaluate`, DSPy judge, JSON reports, registry gates, cache/promote |
| **F-068** | `BUGBOT.md`, custom reviewer retired (D-060) | Dashboard Bugbot + Autofix enablement; severity status check on `main` |
| **F-069** | `maintenance-queue*` normaliser/scoring/cap; daily digest workflow emits `maintenance-queue.json` | Dispatch brief for Automations; operator Automation cron |
| **F-071** | `run-summary.ts` v1 schema; summaries on `maintenance-queue`, `dep-assessment`, `weekly-metrics`; `cursor-weekly-metrics.yml` | Summaries on `daily-quality-digest`, `security-triage`, `fix-attempt`; workflow artifact uploads; operator metrics issue |

---

## F-061 — Cursor Lab eval flow

### Confirmed requirements

1. **Sandbox isolation (Phase B):** Per run unit, create a fresh temp `cwd` with case seed files, a minimal `.cursor/` containing only the artifact under test (+ `skills.index.json` when needed), and `git init` for natural diffs. Snapshot before/after file contents; emit unified diff on the run record.
2. **Fixtures + registry (Phase B):** `lab/registry.yaml` is the source of truth for evaluated artifacts. Author at least one fixture for `skill:core/safe-edit-and-verify` with three cases under `fixtures/<artifact_id>/` per eval plan §4.2. Mirror the skill under `lab/.cursor/skills/`.
3. **`evaluate` CLI (Phase B):** `cursor-lab evaluate [--artifact ID]` runs discovery → sandbox → bridge → raw run records **without judge**; writes `reports/<timestamp>/runs.jsonl`.
4. **DSPy judge (Phase C):** Implement `CapabilityScore` + `ProcessAdherence` signatures; distinct executor vs judge models via `CURSOR_LAB_JUDGE_*` env vars; low judge temperature.
5. **Judge JSON + reports (Phase C):** Per-run judge verdict on the run record; `cursor-lab report` writes `reports/latest.json` + `reports/latest.md` with per-artifact score_mean, score_std, success_rate, promote/hold.
6. **Variance, cache, gate, promote (Phase D):** Fingerprint + SQLite cache; `runs: N` aggregation; promotion gate (min_score, max_variance, success_rate, process_mean); `cursor-lab promote` copies passing artifacts `lab/` → `prod/` (never auto-commits to repo-root `.cursor/` without `--apply-to-repo`).

### Acceptance criteria (F-061)

- [ ] `cd apps/cursor-lab && python3 -m cursor_lab doctor` passes (bridge smoke).
- [ ] `cursor-lab evaluate --artifact skill:core/safe-edit-and-verify` completes with `runs.jsonl` containing diff + tool summary fields.
- [ ] Judge produces structured JSON verdicts; `report` emits machine-readable `latest.json`.
- [ ] Gate blocks promotion when variance exceeds threshold; cache skips unchanged fingerprints.
- [ ] `lab/registry.yaml` lists evaluated artifacts; empty registry fails loudly on `evaluate`.

### Assumptions

- `CURSOR_API_KEY` and judge LM credentials available locally for eval runs (not stored in repo).
- Phase B ships before Phase C/D; judge can be feature-flagged via CLI until credentials exist.

### Open questions

- Default executor model: `composer-2` vs `composer-2-fast` for cost control during fixture development?
- First promotion target: `prod/.cursor/` only, or also `--apply-to-repo` for one pilot skill?

---

## F-068 — Bugbot Autofix adoption (Pillar B, M3)

### Confirmed requirements (repo-side — done)

- `BUGBOT.md` at repo root encodes severity calibration and Autofix policy (D-056).
- Custom SDK pipeline reviewer retired; `cursor-pr-review.yml` is an inert stub (D-060).

### Operator requirements (dashboard — not code)

1. Enable **Bugbot** on this repository (reads `BUGBOT.md`).
2. Enable **Autofix in propose mode** with iteration cap **3** (escalate to human after).
3. Add **"no open medium+ Bugbot findings"** as a **required status check** on `main` branch protection (alongside `CI`, Sonar quality gate).
4. Confirm usage caps / budget cover expected Bugbot runs (~$1–1.50/run; autofix multiplies per PR).

### Acceptance criteria (F-068)

- [ ] Bugbot comments appear on a test PR within one review cycle.
- [ ] Branch protection on `main` lists the Bugbot severity check as required.
- [ ] Autofix propose-mode comment visible on a PR with a mechanical MEDIUM finding (manual spot-check).
- [ ] Operator checklist M3 section checked off in `docs/guides/agentic-pipeline-operator-checklist.md`.

### Open questions

- Exact status check name as reported by Cursor dashboard (operator must copy verbatim into branch protection).

---

## F-069 — Unified maintenance queue (Pillar C, M4)

### Confirmed requirements (repo-side — largely done)

- Sonar + `tech-debt` GitHub Issues normalised to `QueueItem`; scored by confidence × impact; security-first ordering; concurrent bot-PR cap (`DEFAULT_CONCURRENT_BOT_PR_CAP = 4`).
- `cursor-daily-quality-digest.yml` runs `maintenance-queue` and uploads `maintenance-queue.json` + run summaries.

### Remaining code requirements

1. **Dispatch brief:** A deterministic script reads `maintenance-queue.json` and emits `maintenance-dispatch.json` (schema `cursor-maintenance-dispatch:v1`) with one payload per **selected** item: file paths, description, suggested verification command, lane hint (`tdd` | `sdk-fix` | `defer`), and originating source/id for PR title linkage.

### Operator requirements

1. Create **Cursor Automation: weekly tech-debt cron** (suggested Monday 06:00 UTC) that consumes `maintenance-queue.json` (from digest artifact or re-run) and dispatches one cloud agent per selected item, respecting the reported `availableSlots`.
2. Confirm Automation runs under team service account with documented permission scope.

### Acceptance criteria (F-069)

- [ ] `pnpm --filter @rpgtracker/cursor-agents test` passes (existing + new dispatch-brief tests).
- [ ] `maintenance-dispatch.json` generated from a fixture queue file with correct lane hints.
- [ ] Operator Automation documented with prompt template referencing dispatch payload fields.
- [ ] Concurrent bot-PR cap observable in digest step summary (spot-check when ≥4 bot PRs open).

### Open questions

- Default dispatch lane for single-file MAJOR Sonar issues: TDD cloud agent vs gated `fix-attempt`?

---

## F-071 — Telemetry + outcome metrics (M6)

### Confirmed requirements (partial)

- `cursor-agent-run-summary:v1` JSON schema in `packages/cursor-agents/src/run-summary.ts`.
- `weekly-metrics.ts` aggregates PR throughput by surface; posts to metrics issue when `CURSOR_METRICS_ISSUE_NUMBER` set.
- `cursor-weekly-metrics.yml` uploads run-summary artifacts.

### Remaining code requirements

1. **Run summary coverage:** Emit `writeRunSummary` from `daily-quality-digest.ts`, `security-triage.ts`, and `fix-attempt.ts` on success and failure (non-fatal write semantics unchanged).
2. **Workflow artifact uploads:** Add `cursor-agent-run-summaries/` upload steps to `cursor-security-triage.yml` and `cursor-fix-attempt.yml` (mirror daily digest / weekly metrics pattern).
3. **Weekly metrics JSON export:** Extend weekly metrics to write a machine-readable `weekly-metrics.json` alongside the issue comment (same data as markdown table) for cursor-lab ingestion later.

### Operator requirements

1. Create or designate a **metrics dashboard issue**; set repo variable `CURSOR_METRICS_ISSUE_NUMBER`.
2. Verify Monday `cursor-weekly-metrics.yml` run posts to the issue (or step summary if 403 scope).

### Acceptance criteria (F-071)

- [ ] All six agent entry scripts emit run summaries: `maintenance-queue`, `dep-assessment`, `weekly-metrics`, `daily-quality-digest`, `security-triage`, `fix-attempt`.
- [ ] `pnpm --filter @rpgtracker/cursor-agents test` passes.
- [ ] Weekly workflow produces `weekly-metrics.json` in artifacts.
- [ ] Operator checklist M6 section checked off.

### Assumptions

- Weekly aggregation continues to use GitHub API as primary source; run-summary artifacts are an audit trail, not yet the aggregation input.

---

## Affected zones

| Zone | Features |
|------|----------|
| `apps/cursor-lab/**` | F-061 |
| `packages/cursor-agents/**` | F-069, F-071 |
| `.github/workflows/cursor-*.yml` | F-071 (artifact uploads) |
| GitHub/Cursor dashboard | F-068, F-069 (Automation), F-071 (metrics issue) |

## Binding constraints

- D-056: Bugbot Autofix propose mode; iteration cap 3.
- D-060: Bugbot sole PR reviewer; no SDK reviewer duplication.
- D-061: During pipeline iteration, agents may edit `.github/workflows/**` for automation — re-tighten when stable.
- Security baseline: never commit secrets; telemetry writes are non-fatal.

## Sign-off

Signed off by: Macaulay on 12/06/2026
