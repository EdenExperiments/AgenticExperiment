# Cursor Lab: LLM-as-Judge Evaluation Flow — Detailed Plan

Status: draft (planning only — no implementation in this change)
Branch: `cursor/cursor-lab-eval-flow-plan-45ac`
Owner: personal (single-author lab simulation of a future enterprise two-repo flow)

This document describes a self-contained, repeatable evaluation harness for Cursor plugin content
(rules, skills, hooks) before they are promoted into the live `.cursor/` folder. It is sized for a
solo project but mirrors the shape of an enterprise “testing repo → CI build → prod plugin repo”
pipeline so the core logic transfers later.

## 1. Goals and Non-Goals

### Goals

- Treat `.cursor/` content (rules, skills, hooks) as **evaluatable artifacts** with fixtures,
  rubrics, and pass/fail thresholds rather than tribal-knowledge documents.
- Run each candidate artifact through the Cursor SDK against representative inputs in a clean,
  isolated workspace so behavior is reproducible and not contaminated by the host workspace.
- Score outputs with a **DSPy-based LLM-as-judge** along a rubric matrix (refactor, command,
  doc-update, code-gen, debug, etc.), and measure **inter-run variance** for stability.
- Only promote artifacts whose **scores clear thresholds and variance bound** to the live
  `.cursor/`. Skip unchanged artifacts since the last successful run to control cost and time.
- Keep the entire flow runnable locally on a personal machine, with a clear seam where the
  enterprise two-repo / CI version can later attach.

### Non-Goals (this iteration)

- No two-repo split yet: lab and prod live as sibling folders inside one Python project.
- No GitHub Actions / CI runner yet. Manual invocation via CLI.
- No hosted dashboard. Reports are markdown + JSON on disk.
- No multi-tenant judge orchestration. Single judge model per run.
- No production rollout signals (canary, A/B). Promotion is a deterministic copy step.

## 2. The Bigger Picture (and where this fits)

Enterprise target shape (for context, not for this plan):

```text
testing-repo (PRs)        prod-plugin-repo
   |                              ^
   v                              |
 CI: eval harness  ---approved---->
```

Solo simulation in this plan:

```text
cursor-lab/
  lab/                # candidate .cursor content under evaluation
  prod/               # last-known-good .cursor content (the "shipped" plugin)
  harness/            # python project: orchestrator + judge + bridge
  fixtures/           # per-artifact inputs and rubrics
  reports/            # run outputs (json + markdown)
  cache/              # diff + result cache (SQLite or JSON)
```

Promotion in solo mode = copying approved files from `lab/` to `prod/` and optionally to the
repo-root `.cursor/`. Later, the same code path becomes "open PR to prod-plugin-repo."

## 3. Repository Placement

Add the lab as `apps/cursor-lab/` so it sits beside the other workspace apps and is ignored by
the existing TypeScript build:

```text
apps/cursor-lab/
  README.md
  pyproject.toml             # uv- or poetry-managed python project
  cursor_lab/
    __init__.py
    cli.py                   # entry points: `evaluate`, `promote`, `report`, `list`
    discovery.py             # walks lab/.cursor and fixtures/, builds work units
    orchestrator.py          # owns the run loop, retries, variance, caching
    bridge/
      __init__.py
      cursor_agent_bridge.py # python wrapper -> subprocess to node bridge
      node_bridge/
        package.json
        tsconfig.json
        run-agent.ts         # uses @cursor/sdk Agent.prompt
    judge/
      __init__.py
      signatures.py          # DSPy signatures (typed)
      rubric.py              # rubric loading, capability taxonomy
      judge.py               # DSPy modules: per-capability + aggregator
    diff/
      __init__.py
      fingerprint.py         # content hashes
      cache.py               # SQLite-backed result cache
    promotion/
      __init__.py
      gate.py                # threshold + variance evaluation
      promote.py             # copy lab -> prod (and optionally repo .cursor/)
    reporting/
      __init__.py
      markdown.py
      json_report.py
  lab/
    .cursor/                 # mirror of repo .cursor layout (rules, skills)
  prod/
    .cursor/                 # last-approved state (seeded from current repo .cursor)
  fixtures/
    <artifact-id>/
      manifest.yaml
      inputs/
        case-01.md
        case-02.md
      seed/                  # optional starter files copied into the sandbox cwd
      rubric.yaml            # capability mix + thresholds (overrides defaults)
  reports/
  cache/
```

Rationale for `apps/cursor-lab/`:

- Repo conventions already treat `apps/*` as independent surfaces.
- `pnpm-workspace.yaml` only globs `apps/*` and `packages/*` for JS; a python app there is inert
  to the JS toolchain.
- Keeps lab `.cursor` clearly separated from the repo-root `.cursor`.

## 4. Core Concepts

### 4.1 Artifact

A unit under evaluation. Discovered from `lab/.cursor/`:

- **Rule**: `lab/.cursor/rules/*.mdc`
- **Skill**: `lab/.cursor/skills/<domain>/<name>/SKILL.md`
- **Hook**: `lab/.cursor/hooks/*` (future)

Each artifact gets a stable `artifact_id` derived from path (e.g. `skill:core/safe-edit-and-verify`).

### 4.2 Fixture

A test case for an artifact, stored under `fixtures/<artifact_id>/`:

```yaml
# fixtures/skill:core.safe-edit-and-verify/manifest.yaml
artifact_id: skill:core/safe-edit-and-verify
description: Validate that the skill produces a planned, verified edit on a small TS file.
cases:
  - id: case-01-rename-symbol
    input_file: inputs/case-01.md
    seed_dir: seed/case-01
    capability_mix:    # weights summing to 1.0
      refactor: 0.7
      command_running: 0.2
      doc_update: 0.1
    thresholds:
      min_score: 0.75
      max_variance: 0.10
    runs: 3
```

`inputs/case-01.md` is the user-style prompt fed to the agent. `seed/case-01/` is the starter file
tree copied into the sandbox `cwd`.

### 4.3 Rubric Matrix

Capability taxonomy (initial set; extendable and highly customizable):

| Capability        | What it measures                                                       |
| ----------------- | ---------------------------------------------------------------------- |
| `refactor`        | Code change preserves behavior, improves clarity, scoped to request    |
| `command_running` | Correct CLI/tool invocations, captures output, handles failure         |
| `code_gen`        | New code compiles/runs, matches spec, idiomatic                        |
| `doc_update`      | Updates correct doc surface, factual, non-redundant                    |
| `debug`           | Identifies root cause with evidence, minimal change to fix             |
| `process`         | Follows skill/rule steps (intake, plan, verify) rather than freelancing |
| `safety`          | Avoids destructive ops without confirmation; respects scope             |

**Crucially, the rubric is not limited to generic buckets.** It is designed to be context-specific to enforce organizational standards. For example:
- A `doc_update` fixture might override the default criterion to specifically measure: *"Documentation uses tight, caveman-style wording without fluff."*
- A `code_gen` fixture for a backend skill might measure: *"Implementation strictly adheres to the company's .NET API standards and dependency injection patterns."*

A rubric entry is a triple `(capability, criterion, weight)`. Defaults live in
`judge/rubric.py`; per-fixture overrides (which provide the specific standards) go in the fixture `manifest.yaml`.

### 4.4 Run Unit

`(artifact, case, seed_index)` is the unit the orchestrator submits to the executor. With
`runs: 3`, three independent run units are produced per case. Each run unit produces:

```jsonc
{
  "run_id": "...",                  // SDK run id
  "agent_id": "...",                // SDK agent id
  "artifact_id": "skill:core/safe-edit-and-verify",
  "case_id": "case-01-rename-symbol",
  "seed_index": 0,
  "status": "finished" | "error" | "startup_error",
  "result_text": "...",
  "tool_events": [...],             // captured assistant tool-use blocks
  "file_diffs": [{ path, before, after }],
  "stdout": "...",
  "stderr": "...",
  "duration_ms": 12345
}
```

## 5. Execution: Cursor SDK Bridge

The Cursor SDK is currently TypeScript-only. The harness is Python (DSPy). We need a minimal
Python → Node bridge.

### 5.1 Design choice: pattern selection

Per the SDK skill, three invocation shapes exist:

- `Agent.prompt(...)` — one-shot, disposes for you.
- `Agent.create(...).send(...)` — durable, streaming, multi-turn.
- `Agent.resume(...)` — pick up across processes.

**This harness uses `Agent.prompt(...) per run unit`.** Each evaluation is fire-and-forget,
no follow-ups, no streaming required. This is the safest shape: the SDK disposes the agent on
exit, eliminating leaked executors across hundreds of fixture runs.

If a future fixture needs multi-turn (e.g. "ask, observe, follow-up"), upgrade only that case
to `Agent.create + send + wait` with explicit `[Symbol.asyncDispose]` in `finally`.

### 5.2 Runtime: local with isolated cwd

Per the SDK skill we always pass `local: { cwd, settingSources }` (or `cloud: { repos }`)
**explicitly**. For this harness:

- **Default = local**. We need full control over which `.cursor/` is visible to the agent. The
  whole point of evaluation is that *only the lab artifact under test* informs behavior.
- `settingSources: []` (the default, but set it explicitly anyway) so the agent does not pull
  in the host user's project/team/MDM settings.
- The sandbox `cwd` is a freshly-created temp dir that contains:
  - `case seed/` files copied in
  - a single `.cursor/` folder containing **only** the artifact under test plus mandatory
    `.cursor/skills/skills.index.json` if a skill is being evaluated

Optional **cloud lane** (later iteration): for slow / heavy fixtures, switch to
`cloud: { repos: [{ url, startingRef }] }` pointing at a throwaway eval repo with the lab
content materialized. Same harness, swap the bridge invocation.

### 5.3 Bridge contract

Node side (`bridge/node_bridge/run-agent.ts`) reads a JSON request on stdin and writes a JSON
response on stdout. Stderr stays human-readable for debugging.

Request:

```jsonc
{
  "apiKey": "cursor_...",              // explicit; do not rely on env in the child
  "model": { "id": "composer-2" },     // required for local
  "cwd": "/tmp/.../sandbox-abc",
  "prompt": "...",                     // user-style input
  "settingSources": [],                // explicit empty
  "mcpServers": null,                  // optional; pass-through
  "timeoutMs": 600000
}
```

Response (always JSON, even on failure):

```jsonc
{
  "ok": true,
  "agentId": "...",
  "runId": "...",
  "status": "finished",
  "result": "...",                     // result.result text
  "model": "composer-2",
  "durationMs": 12345
}
```

Or:

```jsonc
{
  "ok": false,
  "kind": "startup_error",             // CursorAgentError caught
  "isRetryable": true,
  "message": "...",
  "agentId": null,
  "runId": null
}
```

Or:

```jsonc
{
  "ok": false,
  "kind": "run_error",                 // result.status === "error"
  "agentId": "...",
  "runId": "...",
  "result": "..."
}
```

This mirrors the SDK skill's mandatory distinction between **startup failures** (`CursorAgentError`,
the run never executed) and **run failures** (`result.status === "error"`, the agent did work and
the work failed). The orchestrator treats them differently:

- `startup_error` with `isRetryable=true` → exponential backoff retry, max 3 attempts.
- `startup_error` with `isRetryable=false` → fail the whole batch; this is auth/config.
- `run_error` → recorded as a real (low) score in the rubric, not a retry. The judge still gets
  to evaluate the partial output. Variance now also reflects "sometimes the run errors."

Bridge node script skeleton (Agent.prompt path):

```typescript
import { Agent, CursorAgentError } from "@cursor/sdk";

async function main() {
  const req = await readJsonStdin();
  const started = Date.now();
  try {
    const result = await Agent.prompt(req.prompt, {
      apiKey: req.apiKey,
      model: req.model,
      local: { cwd: req.cwd, settingSources: req.settingSources ?? [] },
      mcpServers: req.mcpServers ?? undefined,
    });
    writeJsonStdout({
      ok: result.status !== "error",
      kind: result.status === "error" ? "run_error" : undefined,
      agentId: result.agentId,
      runId: result.id,
      status: result.status,
      result: result.result,
      durationMs: Date.now() - started,
    });
  } catch (err) {
    if (err instanceof CursorAgentError) {
      writeJsonStdout({
        ok: false,
        kind: "startup_error",
        isRetryable: err.isRetryable,
        message: err.message,
        durationMs: Date.now() - started,
      });
      return;
    }
    throw err;
  }
}
```

### 5.4 Python wrapper

`bridge/cursor_agent_bridge.py` shells out to `node run-agent.js` (compiled once at install
time, or run via `tsx`). It serializes the request, reads stdout, validates the JSON envelope,
captures stderr into the run record, and returns a typed dataclass.

API:

```python
class CursorAgentBridge:
    def __init__(self, api_key: str, model_id: str = "composer-2", node_cmd: list[str] | None = None): ...
    def run_once(self, *, cwd: Path, prompt: str, timeout_s: int = 600,
                 mcp_servers: list[dict] | None = None) -> RunResult: ...
```

`RunResult` mirrors the bridge response with `status`, `kind`, `result`, `agent_id`, `run_id`,
`duration_ms`, `stderr_tail`.

## 6. Sandbox Builder

Per-run-unit isolation is the load-bearing piece. The orchestrator builds a fresh sandbox before
each `run_once`:

1. Create `tempfile.mkdtemp(prefix="cursor-lab-")`.
2. Copy the case `seed/` tree into the sandbox (if present).
3. Materialize a minimal `.cursor/` inside the sandbox:
   - For a **rule** artifact: copy only that `.mdc` into `sandbox/.cursor/rules/`.
   - For a **skill** artifact: copy the skill directory into `sandbox/.cursor/skills/<domain>/<name>/`,
     plus a one-entry `sandbox/.cursor/skills/skills.index.json` so discovery works.
   - Do **not** copy any other rules, skills, or `AGENTS.md` from the host or lab. This is
     deliberate — we want to attribute behavior to the artifact under test.
4. Optionally write an `AGENTS.md` stub if the case requires repo-level context.
5. Initialize as an empty git repo (`git init`) so the agent can stage/diff edits naturally.
6. Yield the sandbox path; clean up after run.

Snapshotting: before the agent runs we record `before` file contents for every file under the
sandbox (excluding `.git`). After the run we re-walk and compute `after` and a unified diff.
That diff feeds the judge.

## 7. The DSPy Judge

### 7.1 Why DSPy

DSPy gives us typed signatures, modular judges, and the ability to optimize prompts later
(MIPRO, BootstrapFewShot) once we have a labeled trace dataset. Even before optimization, the
typed-Predict pattern produces structured scores that the orchestrator can aggregate
deterministically.

### 7.2 Signatures

```python
# judge/signatures.py
import dspy

class CapabilityScore(dspy.Signature):
    """Score the agent's output for ONE capability dimension."""
    capability: str = dspy.InputField(desc="e.g. refactor, command_running, code_gen")
    artifact_summary: str = dspy.InputField(desc="What the rule/skill under test claims to do")
    user_input: str = dspy.InputField(desc="The prompt given to the agent")
    agent_result_text: str = dspy.InputField(desc="The agent's final result.result text")
    file_diff: str = dspy.InputField(desc="Unified diff of files in sandbox after the run")
    tool_event_summary: str = dspy.InputField(desc="Summarized tool-call sequence")

    score: float = dspy.OutputField(desc="0.0 to 1.0, calibrated against the rubric")
    confidence: float = dspy.OutputField(desc="0.0 to 1.0 judge self-confidence")
    rationale: str = dspy.OutputField(desc="2-4 sentence justification with concrete refs")

class ProcessAdherence(dspy.Signature):
    """Score how well the agent followed the artifact's prescribed process."""
    artifact_full_text: str = dspy.InputField()
    user_input: str = dspy.InputField()
    agent_result_text: str = dspy.InputField()
    tool_event_summary: str = dspy.InputField()

    adherence: float = dspy.OutputField(desc="0.0 to 1.0")
    deviations: list[str] = dspy.OutputField(desc="Concrete steps skipped or violated")
```

### 7.3 Judge module

```python
# judge/judge.py
class ArtifactJudge(dspy.Module):
    def __init__(self):
        self.cap = dspy.Predict(CapabilityScore)
        self.process = dspy.Predict(ProcessAdherence)

    def forward(self, *, run_record, fixture, artifact) -> JudgeVerdict:
        cap_scores = {}
        for capability, weight in fixture.capability_mix.items():
            out = self.cap(
                capability=capability,
                artifact_summary=artifact.summary,
                user_input=fixture.input_text,
                agent_result_text=run_record.result or "",
                file_diff=run_record.diff_text or "",
                tool_event_summary=run_record.tool_summary or "",
            )
            cap_scores[capability] = (out.score, out.confidence, out.rationale, weight)

        proc = self.process(
            artifact_full_text=artifact.full_text,
            user_input=fixture.input_text,
            agent_result_text=run_record.result or "",
            tool_event_summary=run_record.tool_summary or "",
        )
        weighted = sum(s * w for (s, _c, _r, w) in cap_scores.values())
        return JudgeVerdict(
            weighted_score=weighted,
            process_adherence=proc.adherence,
            deviations=proc.deviations,
            per_capability=cap_scores,
        )
```

### 7.4 Judge model

- Default judge LM: a specific, strong model (e.g., `gpt-4o` or `claude-3-5-sonnet-latest` via DSPy LM config). We specify exact models, not just families, to ensure deterministic behavior.
- Configured via `CURSOR_LAB_JUDGE_MODEL` and `CURSOR_LAB_JUDGE_API_KEY` env vars.
- Keep executor and judge models **distinct**: the executor is what we're evaluating (e.g., `composer-2` via the Cursor SDK), the judge is the rater. Sharing a model risks self-grading bias.

### 7.5 Aggregation

For each `(artifact, case)` with `runs = N`:

- `score_mean = mean(weighted_score across runs)`
- `score_std = stdev(weighted_score across runs)`
- `success_rate = fraction of runs with status == "finished"`
- `process_mean = mean(process_adherence)`
- Per-capability mean + std

The orchestrator persists these alongside raw run records.

## 8. Variance, Seeding, and Run Count

- Default `runs: 3` per case (configurable per fixture). Captures the lowest useful variance
  signal without cost explosion.
- We do **not** pin the SDK seed (the SDK doesn't expose one); variance therefore captures the
  full stochastic surface (model nondeterminism + tool path divergence). That is the signal we
  want for stability evaluation.
- For *judge* repeatability, set DSPy LM temperature low (e.g. 0.1) so judge ratings of identical
  outputs collapse to near-identical scores. Verified by a one-shot self-consistency probe at
  harness startup.

## 9. Change Detection and Caching

Cost control: do not re-evaluate artifacts that haven't changed.

### 9.1 Fingerprint

For each artifact:

```text
fingerprint = sha256(
  artifact_file_bytes
  || all fixture manifests
  || all fixture input files
  || all fixture seed files
  || rubric defaults version
  || executor_model_id
  || judge_model_id
)
```

Any input that could change behavior is in the hash. Bumping the rubric defaults version (a
const in code) invalidates everyone.

### 9.2 Cache

SQLite file at `cache/results.db` with two tables:

```sql
CREATE TABLE artifact_runs (
  artifact_id TEXT, case_id TEXT, seed_index INTEGER,
  fingerprint TEXT, run_id TEXT, agent_id TEXT,
  status TEXT, weighted_score REAL, process_adherence REAL,
  result_text TEXT, diff_text TEXT, raw_json TEXT,
  created_at TIMESTAMP,
  PRIMARY KEY (artifact_id, case_id, seed_index, fingerprint)
);

CREATE TABLE artifact_verdicts (
  artifact_id TEXT, fingerprint TEXT,
  score_mean REAL, score_std REAL, success_rate REAL,
  promoted INTEGER, created_at TIMESTAMP,
  PRIMARY KEY (artifact_id, fingerprint)
);
```

CLI flow:

- `evaluate` — for each artifact whose fingerprint is **not** in `artifact_verdicts`, run all
  cases; for each one already there, skip and reuse the verdict. `--force` ignores cache.
- `evaluate --since <git-ref>` — only consider artifacts whose files differ vs. that ref. Useful
  inside CI later.

## 10. Promotion Gate

After evaluation, the gate decides per-artifact:

```text
PROMOTE if and only if:
  score_mean    >= fixture.thresholds.min_score   (default 0.75)
  AND score_std <= fixture.thresholds.max_variance (default 0.10)
  AND success_rate == 1.0
  AND process_mean >= 0.7
```

Failing any clause: the artifact stays in `lab/` only. Failures are reported with the specific
clause and the worst offending case.

`promote` CLI:

- Reads `artifact_verdicts` for the current fingerprints.
- For each PROMOTE verdict that differs from `prod/.cursor/`, copies the file(s) from
  `lab/.cursor/` to `prod/.cursor/`.
- With `--apply-to-repo`, also copies into the repo-root `.cursor/` (this is the "real" plugin
  for the personal account) and prints the resulting paths so they can be reviewed before
  committing. Promotion is never auto-committed.

In the enterprise version, "copy to prod" becomes "open PR to prod-plugin-repo from a generated
branch with only the approved diff." The interface is the same.

## 11. CLI Surface

```text
cursor-lab list                       # show artifacts + fixtures + last verdict
cursor-lab evaluate                   # run; reuse cached verdicts where fingerprint matches
cursor-lab evaluate --force           # ignore cache
cursor-lab evaluate --artifact <id>   # narrow scope
cursor-lab evaluate --since HEAD~1    # only artifacts changed vs git ref
cursor-lab report                     # write reports/latest.md + reports/latest.json
cursor-lab promote                    # copy passing artifacts lab/ -> prod/
cursor-lab promote --apply-to-repo    # also copy into ../../.cursor/
cursor-lab doctor                     # check API keys, node bridge, judge LM reachable
```

`evaluate` outputs both a console summary and full per-run JSON under `reports/<timestamp>/`.

## 12. Reporting

Per run, write:

- `reports/<ts>/summary.md` — per-artifact table: score_mean, score_std, success_rate,
  promote/hold, top deviations.
- `reports/<ts>/runs.jsonl` — one line per run unit, full record (for offline analysis).
- `reports/<ts>/diffs/<artifact_id>/<case_id>/<seed_index>.patch` — unified diff written by the
  agent in the sandbox.

The summary file is the human-readable artifact; the JSONL is the machine input for any later
optimizer (DSPy `BootstrapFewShot` learning from accepted/rejected verdicts).

## 13. Secrets and Configuration

Required env vars:

- `CURSOR_API_KEY` — for the executor SDK runs (already used elsewhere in this repo).
- `CURSOR_LAB_JUDGE_API_KEY` — judge LM credential.
- `CURSOR_LAB_JUDGE_MODEL` — judge model id.

Optional:

- `CURSOR_LAB_EXECUTOR_MODEL` — defaults to `composer-2`.
- `CURSOR_LAB_RUNTIME` — `local` (default) or `cloud`.
- `CURSOR_LAB_CLOUD_REPO_URL` / `CURSOR_LAB_CLOUD_STARTING_REF` — if `cloud`.

All passed explicitly into the bridge so the child node process does not depend on ambient env.

## 14. Failure Modes and Mitigations

| Risk                                                      | Mitigation                                                                                       |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Host `.cursor` contaminates the sandbox                   | Sandbox is `mkdtemp`, brand new `cwd`; we never run from the repo root.                          |
| SDK pulls in user/team/MDM settings                       | `local.settingSources = []` explicit on every call.                                              |
| Startup vs run errors conflated                           | Bridge always tags `kind` and lets orchestrator branch.                                          |
| Judge self-grading bias                                   | Executor and judge models are explicitly different LMs.                                          |
| Cost explosion as fixtures grow                           | Fingerprint cache + `--since` scope + `runs` default 3 + cheap executor model (`composer-2-fast` allowed). |
| Resource leaks (long-running sessions, executors)         | Use `Agent.prompt` exclusively; node bridge exits per run.                                       |
| Variance noise hides real regressions                     | Track `score_std` as a first-class gate input, not just `score_mean`.                            |
| Fixture rot (artifact changed but fixture didn't)         | Fingerprint includes fixture content; require explicit fixture update for shape changes.        |
| Network flakes in cloud runtime                           | Respect `CursorAgentError.isRetryable`; backoff retry; cap retries at 3.                         |
| MCP server availability for tools the skill assumes       | MCP servers passed inline per run; cloud runs require HTTP-reachable servers (local stdio off).   |

## 15. Phased Build (technical, not calendar)

Each phase produces a usable artifact. No phase blocks on a later one for partial value.

**Phase A — Skeleton + bridge (smallest useful loop)**

- `apps/cursor-lab/` scaffolded (pyproject, package layout).
- Node bridge implemented with `Agent.prompt`, error-tagging, JSON I/O.
- Python wrapper with typed `RunResult`.
- `cursor-lab doctor` validates API keys and bridge round-trip on a trivial prompt.

Dependencies/risks: requires `@cursor/sdk` resolvable from the bridge's `package.json`. Node 20+.
Validates the foundational interop before any judging logic.

**Phase B — Sandbox + fixtures + one artifact**

- Sandbox builder with snapshot/diff.
- Discovery walks `lab/.cursor/` and produces work units.
- One real fixture authored for `core/safe-edit-and-verify` skill, three cases.
- `cursor-lab evaluate --artifact ...` runs end-to-end but **skips the judge** (raw runs only).

Dependencies/risks: shape of the per-run record and diff capture is finalized here; the judge
later just consumes it.

**Phase C — DSPy judge (single capability)**

- DSPy LM configured.
- `CapabilityScore` + `ProcessAdherence` predictors implemented.
- `judge.forward` aggregates one capability with one weight.
- Reports written.

Dependencies/risks: judge LM cost. Validate the judge collapses to stable scores on a "golden"
fixture run replayed three times before turning it loose on the full set.

**Phase D — Variance, multi-capability, gate, cache**

- `runs: N` parallelization (asyncio + a bounded worker pool around `run_once`).
- Capability mix from fixture manifest.
- Fingerprint + SQLite cache.
- Promotion gate with thresholds.
- `cursor-lab promote` implemented.

Dependencies/risks: variance numbers are only meaningful with `N >= 3`. Parallelism is bounded
so per-machine concurrency stays at 2–4 to avoid SDK rate limits.

**Phase E — Optional cloud lane**

- Bridge gains a `cloud` branch (`cloud: { repos }`).
- Add throwaway eval repo or use ephemeral worktree push.
- Same prompt, same fixtures, but cloud runtime — used when a fixture needs more time than local
  comfortably allows.

Dependencies/risks: requires a reachable eval repo; tradeoff is network latency vs longer agent
work sessions. Local stays the default.

**Phase F — Productionization seams (for the enterprise port later)**

- Replace `promote --apply-to-repo` body with "open PR to prod-plugin-repo from generated diff."
- Wire `evaluate` into a CI workflow that runs on PRs into the testing repo.
- All of this is **a swap of two functions**; the core orchestrator and judge stay unchanged.

## 16. Resolved Design Choices (from Open Questions)

- **Judge LM choice:** We will specify exact models (e.g., `gpt-4o` or `claude-3-5-sonnet-latest`) rather than families. The executor will default to `composer-2` (the Cursor default).
- **Hook artifact evaluation:** Hooks will be evaluated by verifying their side-effects (e.g., ensuring a linter actually ran, or specific checks completed) rather than just prompt output.
- **Calibration set:** We will **not** rely on "source of truth" / golden datasets (except for extremely specific cases) to reduce bias. Instead, we rely heavily on the nuanced, context-specific rubric measurements (e.g., checking for "caveman wording" or ".NET API standards") to evaluate the output dynamically.
- **Artifact visibility:** The judge will see the full artifact text + summary to accurately score process adherence.

## 17. Out of Scope

- Multi-repo orchestration with real PR automation.
- Hosted UI for browsing runs.
- Distributed evaluation across multiple machines.
- Optimization (MIPRO/BootstrapFewShot) of the judge — possible later once verdicts have human
  labels, but not required for the harness to be useful.

## 18. References

- Cursor SDK skill (manual): `Agent.prompt` one-shot pattern, `local.settingSources = []`
  isolation, mandatory `CursorAgentError` vs `result.status === "error"` distinction, mandatory
  disposal, explicit `apiKey`/`model`/runtime.
- Repo conventions: `AGENTS.md`, `docs/CURSOR-AGENT-HANDBOOK.md`,
  `.cursor/skills/skills.index.json`, `.cursor/rules/repo-routing.mdc`.
- Existing automation precedent: `packages/cursor-agents/` (TypeScript SDK use), runtime
  selector pattern in `runtime-options.ts`.
