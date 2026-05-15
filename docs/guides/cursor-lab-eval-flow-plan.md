# Cursor Lab: LLM-as-Judge Evaluation Flow — Detailed Plan

Status: draft (planning only — no implementation in this change)
Owner: personal (solo use in this monorepo; day-job workspaces stay separate)

This document describes a self-contained, repeatable evaluation harness for Cursor plugin content
(rules, skills, hooks) before they are promoted into the live `.cursor/` folder. It is sized for a
solo project but mirrors the shape of an enterprise “testing repo → CI build → prod plugin repo”
pipeline so the core logic transfers later. **Repository choice:** the harness stays under
`apps/cursor-lab/` in this repo for cohesion; a future split to a dedicated testing repo is an
implementation swap, not a redesign.

## 1. Goals and Non-Goals

### Goals

- Treat `.cursor/` content (rules, skills, hooks) as **evaluatable artifacts** with fixtures,
  rubrics, and pass/fail thresholds rather than tribal-knowledge documents.
- Run each candidate artifact through the Cursor SDK against representative inputs in a clean,
  isolated workspace so behavior is reproducible and not contaminated by the host workspace.
- Score outputs with a **DSPy-based LLM-as-judge** along a rubric matrix (refactor, command,
  doc-update, code-gen, debug, etc.), and measure **inter-run variance** for stability.
- Only **approve** artifacts (see §10 registry) whose scores clear thresholds and variance
  bounds; the prod build materializes from approved rows only. Skip unchanged artifacts since the
  last successful run to control cost and time.
- Keep the entire flow runnable locally on a personal machine, with a clear seam where the
  enterprise two-repo / CI version can later attach.

### Non-Goals (this iteration)

- No separate harness repository yet: lab, prod, harness, and fixtures live under one tree
  rooted at `apps/cursor-lab/` inside this monorepo.
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
  lab/registry.yaml   # lifecycle + last eval metadata per artifact (source of truth for prod)
  prod/               # materialized output: only artifacts approved in registry
  harness/            # python project: orchestrator + judge + bridge
  fixtures/           # per-artifact inputs and rubrics (mirrors artifact_path; see §4.1)
  reports/            # run outputs (json + markdown)
  cache/              # diff + result cache (SQLite or JSON)
```

Promotion in solo mode = updating **`lab/registry.yaml`** (lifecycle and eval pointers), then
running a **prod build** that copies **approved** artifact files from `lab/.cursor/` into
`prod/.cursor/` (and optionally into the repo-root `.cursor/`). Later, the same registry + build
idea becomes “open PR to prod-plugin-repo.”

## 3. Repository Placement

Add the lab as `apps/cursor-lab/` so it sits beside the other workspace apps. **pnpm:** the root
`pnpm-workspace.yaml` globs `apps/*`; every workspace package expects a **`package.json`** at
`apps/cursor-lab/package.json` (minimal `private: true` + scripts that delegate to `uv run` or the
Node bridge) so `pnpm install` stays valid. **Turbo:** either omit `build`/`test` scripts for this
package or wire no-op scripts so `turbo build` does not assume a Next.js app.

```text
apps/cursor-lab/
  README.md
  package.json               # required pnpm workspace member (thin wrapper)
  pyproject.toml             # uv- or poetry-managed python project
  lab/
    registry.yaml            # artifact lifecycle + last eval (see §10)
    .cursor/                 # candidate plugin tree (mirror of repo .cursor layout)
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
        run-agent.ts         # @cursor/sdk: prompt or streaming executor (see §5)
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
      promote.py             # apply registry transitions; invoke prod materializer
    reporting/
      __init__.py
      markdown.py
      json_report.py
  prod/
    .cursor/                 # materialized from lab + registry (approved only)
  fixtures/
    <artifact_path>/         # directory mirrors artifact_path (see §4.1), e.g. skills/core/safe-edit-and-verify/
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
- Keeps lab `.cursor` clearly separated from the repo-root `.cursor`.
- Same monorepo as the real plugin content: one PR can change a skill, its fixture, and the
  registry entry together.

## 4. Core Concepts

### 4.1 Artifact identity

A unit under evaluation. Discovered from `lab/.cursor/`:

- **Rule**: `lab/.cursor/rules/*.mdc`
- **Skill**: `lab/.cursor/skills/<domain>/<name>/SKILL.md`
- **Hook**: `lab/.cursor/hooks/*` (future)

**Canonical fields (use everywhere: manifests, cache keys, reports, registry):**

- **`artifact_kind`**: `rule` | `skill` | `hook`
- **`artifact_path`**: path relative to `.cursor/`, POSIX, no leading `./`, e.g.
  `skills/core/safe-edit-and-verify` or `rules/skills-docs-routing.mdc`

**Stable string ID** (logs, DB, filenames that allow a delimiter):

- `artifact_id = "${artifact_kind}:${artifact_path}"`  
  Example: `skill:skills/core/safe-edit-and-verify`

**Fixture directory on disk:** mirror `artifact_path` under `fixtures/` (no colons, portable):

`fixtures/skills/core/safe-edit-and-verify/manifest.yaml`

### 4.2 Fixture

A test case for an artifact lives under `fixtures/<artifact_path>/` as above.

```yaml
# fixtures/skills/core/safe-edit-and-verify/manifest.yaml
artifact_kind: skill
artifact_path: skills/core/safe-edit-and-verify
description: Validate that the skill produces a planned, verified edit on a small TS file.
cases:
  - id: case-01-rename-symbol
    sandbox_profile: strict        # strict | bundled | workspace_slice (see §6)
    bundled_artifact_paths: []    # when sandbox_profile=bundled: more lab/.cursor paths to copy
    input_file: inputs/case-01.md
    seed_dir: seed/case-01
    capability_mix:    # weights summing to 1.0
      refactor: 0.7
      command_running: 0.2
      doc_update: 0.1
    thresholds:
      min_score: 0.75
      max_variance: 0.10
      min_success_rate: 0.67       # e.g. 2/3 runs must finish; default tunable (was hard 1.0)
      min_process_mean: 0.7
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
`runs: 3`, three independent run units are produced per case. Each run unit produces a **run
record** aligned with what the bridge actually captures (see §5):

```jsonc
{
  "run_id": "...",                  // SDK RunResult.id (verify against installed @cursor/sdk)
  "agent_id": "...",                // if exposed on RunResult for this SDK version; else null
  "artifact_id": "skill:skills/core/safe-edit-and-verify",
  "case_id": "case-01-rename-symbol",
  "seed_index": 0,
  "executor_mode": "prompt" | "stream",   // which bridge path was used
  "status": "finished" | "error" | "cancelled" | "startup_error",
  "result_text": "...",             // final assistant text (RunResult.result)
  "tool_events": [...],             // populated only in stream mode; see §5
  "file_diffs": [{ path, before, after }],
  "stderr_tail": "...",
  "duration_ms": 12345
}
```

**SDK fact check:** `Agent.prompt(...)` returns `Promise<RunResult>` with summary fields such as
`status`, `result`, and `durationMs` — suitable for diff+text judging. **`tool_call` / transcript
events** are documented on `run.stream()` after `Agent.create` + `agent.send` (see Cursor SDK
TypeScript docs). If a rubric needs tool traces, use **stream mode** for those cases; otherwise
default to **prompt mode** and leave `tool_events` empty with `tool_event_summary` derived only
from text+diff heuristics or omitted.

## 5. Execution: Cursor SDK Bridge

The Cursor SDK is TypeScript-first. The harness is Python (DSPy). Use a minimal Python → Node
bridge. Public SDK reference: [Cursor SDK — TypeScript](https://cursor.com/docs/sdk/typescript)
and [Evals](https://cursor.com/docs/evals).

### 5.1 Design choice: prompt vs stream (aligned with the SDK)

Documented shapes:

- **`Agent.prompt(message, options)`** — one-shot: create → send → wait → dispose. Returns
  **`Promise<RunResult>`** with at least `status` (`finished` | `error` | `cancelled`), `result`
  (final assistant text), and `durationMs`. Best for **cost, simplicity, and leak avoidance** on
  bulk runs.
- **`Agent.create` + `agent.send` + `run.stream()`** — yields **`SDKMessage`** union including
  **`tool_call`** events (`SDKToolUseMessage`: name, args, result, truncation flags). Use this
  **stream mode** when the rubric must see tool traces or multi-turn behavior. Always dispose the
  agent (`await using` / explicit async dispose per SDK docs).

**Harness policy:**

- **Default executor mode:** `prompt` — one run unit = one `Agent.prompt` call.
- **Opt-in per case:** `stream` in the bridge request when `manifest.yaml` marks the case (e.g.
  `executor_mode: stream`) or when `command_running` / process rubrics require tool evidence.
- **Cancelled runs:** treat `status === "cancelled"` like a non-success for gates unless the
  fixture explicitly allows interruption.

Multi-turn follow-ups beyond one `send` stay out of scope until a fixture declares them; then use
`Agent.create` + multiple `send` with the same disposal discipline.

### 5.2 Runtime: local with isolated cwd and SDK bootstrap

Always pass **`local: { cwd, settingSources }`** (or `cloud: { repos }`) **explicitly**.

- **Default = local** so only the lab-built `.cursor/` under `cwd` affects the agent.
- **`settingSources: []`** (explicit) so project/user/team/MDM/plugin settings from the host do
  not leak in.
- **Ripgrep:** mirror `packages/cursor-agents` (`bootstrapCursorSdkRuntime`, **`CURSOR_RIPGREP_PATH`**):
  sandboxes and CI must expose a working `rg` binary (PATH or explicit path). **`cursor-lab doctor`**
  should verify this alongside API keys — missing ripgrep shows up as noisy startup failures in
  thin environments.

Optional **cloud lane** (later): `cloud: { repos: [{ url, startingRef }] }` for long fixtures.

### 5.3 Child process and secrets

- **Preferred:** the Python orchestrator spawns Node with **`env` containing `CURSOR_API_KEY`** (and
  any bridge-only vars) scoped to that child; the JSON request body on stdin carries **no secrets**.
  Redact keys from logs and from persisted `raw_json` blobs.
- **Acceptable for local debugging only:** pass key in the request — never enable in CI artifacts.

### 5.4 Bridge contract

Node (`bridge/node_bridge/run-agent.ts`) reads a JSON request on **stdin** and writes JSON on
**stdout**. Stderr stays human-readable.

Request (secrets excluded; keys come from child env):

```jsonc
{
  "executorMode": "prompt",
  "model": { "id": "composer-2" },
  "cwd": "/tmp/.../sandbox-abc",
  "prompt": "...",
  "settingSources": [],
  "mcpServers": null,
  "timeoutMs": 600000
}
```

Response shapes (always JSON):

**Success-ish (prompt mode):** `ok` true when `status === "finished"`; when `status === "error"`
or `cancelled`, still return ids + `result` text but set `ok` false and `kind: "run_error"` (or
dedicated `cancelled` flag — pick one convention in code and keep it stable).

**Startup failure:** `kind: "startup_error"`, `isRetryable` from `CursorAgentError`.

**Stream mode:** same envelope plus `toolEvents: SDKToolUseMessage[]` (or a trimmed summary) collected
from `for await (const m of run.stream())` until `run.wait()` completes.

Orchestrator branching (unchanged intent):

- `startup_error` + `isRetryable` → exponential backoff, max 3.
- `startup_error` non-retryable → fail fast (auth/config).
- `run_error` / failed completion → score partial output; count toward **`min_success_rate`** (§4.2).

Prompt-mode skeleton (verify `RunResult` field names against the installed `@cursor/sdk` version):

```typescript
import { Agent, CursorAgentError } from "@cursor/sdk";

async function main() {
  const req = await readJsonStdin();
  const started = Date.now();
  try {
    const result = await Agent.prompt(req.prompt, {
      apiKey: process.env.CURSOR_API_KEY!,
      model: req.model,
      local: { cwd: req.cwd, settingSources: req.settingSources ?? [] },
      mcpServers: req.mcpServers ?? undefined,
    });
    const failed = result.status === "error" || result.status === "cancelled";
    writeJsonStdout({
      executorMode: "prompt",
      ok: !failed,
      kind: failed ? "run_error" : undefined,
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

Stream-mode implementation should follow the **“Stream events for transcripts”** pattern in the
Cursor evals doc: accumulate `tool_call` messages (and optional assistant text blocks), then merge
with `run.wait()` output for final `result` text.

### 5.5 Python wrapper

`bridge/cursor_agent_bridge.py` shells out to `node run-agent.js` (compiled at install or `tsx`).
It sets the child env (API key), passes the JSON request on stdin, reads stdout, validates the
envelope, captures stderr into the run record, and returns a typed dataclass.

API:

```python
class CursorAgentBridge:
    def __init__(self, api_key: str, model_id: str = "composer-2", node_cmd: list[str] | None = None): ...
    def run_once(self, *, cwd: Path, prompt: str, executor_mode: str = "prompt", timeout_s: int = 600,
                 mcp_servers: list[dict] | None = None) -> RunResult: ...
```

`RunResult` mirrors the bridge response (including optional `tool_events`, `stderr_tail`).

## 6. Sandbox Builder

Per-run-unit isolation is the load-bearing piece. The orchestrator builds a fresh sandbox before
each `run_once`:

1. Create `tempfile.mkdtemp(prefix="cursor-lab-")`.
2. Copy the case `seed/` tree into the sandbox (if present).
3. Materialize `.cursor/` inside the sandbox according to **`sandbox_profile`** on the case
   (from `manifest.yaml`; see §4.2):
   - **`strict` (default):** copy **only** the primary artifact (same rules as before: one `.mdc`,
     or one skill tree + minimal `skills.index.json`). Do **not** copy other lab rules/skills or
     host `AGENTS.md` — maximizes attribution to the artifact under test.
   - **`bundled`:** copy the primary artifact **plus** paths listed in `bundled_artifact_paths`
     (resolved under `lab/.cursor/`). Use when a skill legitimately depends on another lab skill
     or companion rule.
   - **`workspace_slice`:** copy `strict` (or `bundled`) content **and** an optional allowlisted
     slice (e.g. stub `AGENTS.md`, a few package files) declared in the fixture so repo-context
     prompts behave realistically without mounting the whole monorepo.
4. For skills in **`strict`**, still emit a one-entry `sandbox/.cursor/skills/skills.index.json`
   when required for discovery.
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

### 7.2 Versioned JSON verdict (primary machine output)

The **authoritative judge artifact** is **versioned JSON** validated in code (Zod, Pydantic, or
Ajv) — same discipline as `packages/cursor-agents` PR review (“return ONLY JSON matching …”). DSPy
can still orchestrate internal calls, but the **stored verdict** and promotion gates consume
parsed JSON only.

**Illustrative schema (extend as needed):**

```jsonc
{
  "schema_version": "1.0",
  "artifact_id": "skill:skills/core/safe-edit-and-verify",
  "overall": {
    "score": 0.0,
    "rationale": "2–4 sentences with concrete references to diff/result/tools"
  },
  "dimensions": [
    {
      "id": "refactor",
      "score": 0.0,
      "weight": 0.7,
      "rationale": "...",
      "evidence": [{ "kind": "diff_hunk|tool_call|result_quote", "ref": "..." }]
    }
  ],
  "process_adherence": {
    "score": 0.0,
    "deviations": ["skipped verification step", "..."]
  },
  "improvement_suggestions": ["...", "..."]
}
```

**Calibration rule (state clearly):** a tiny **golden replay set** may exist **only** to verify
the judge implementation (schema compliance, temperature, drift). **Golden outputs do not define
artifact promotion truth.** Rubric scores measure real fixture runs; goldens measure the **instrument**.

On parse failure: one **repair** prompt (“emit valid JSON only”) or fail the run with diagnostics.

### 7.3 Signatures

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
    deviations: list[str] = dspy.OutputField(desc="Concrete steps skipped or violated (best-effort; JSON verdict carries canonical deviations[])")
```

### 7.4 Judge module

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

Persist the **§7.2 JSON verdict** as the canonical scored artifact; the module above illustrates how
DSPy might produce inputs to that schema.

### 7.5 Judge model

- Default judge LM: a specific, strong model (e.g., `gpt-4o` or `claude-3-5-sonnet-latest` via DSPy LM config). We specify exact models, not just families, to ensure deterministic behavior.
- Configured via `CURSOR_LAB_JUDGE_MODEL` and `CURSOR_LAB_JUDGE_API_KEY` env vars.
- Keep executor and judge models **distinct**: the executor is what we're evaluating (e.g., `composer-2` via the Cursor SDK), the judge is the rater. Sharing a model risks self-grading bias.

### 7.6 Aggregation

For each `(artifact, case)` with `runs = N`:

- `score_mean = mean(weighted_score across runs)`
- `score_std = stdev(weighted_score across runs)`
- `success_rate = fraction of runs with status == "finished"` (after retries; define whether
  `cancelled` counts as failure — default yes)
- `process_mean = mean(process_adherence)`
- Per-dimension mean + std, plus **persist full per-run judge JSON** (scores, rationales,
  evidence, suggestions) for human review and harness improvement.

Gate comparison uses each case’s **`min_success_rate`** and **`min_process_mean`** from the
manifest (§4.2), not hard-coded literals.

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
  || executor_mode            # prompt | stream
  || judge_model_id
  || judge_schema_version     # bump when §7.2 JSON shape changes
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
  process_mean REAL,
  gate_pass INTEGER,              -- all cases pass thresholds for this fingerprint
  judge_verdict_json TEXT,        -- latest aggregated JSON (or path under reports/)
  created_at TIMESTAMP,
  PRIMARY KEY (artifact_id, fingerprint)
);
```

**Lifecycle is not duplicated here:** `lab/registry.yaml` owns `draft | edited | candidate |
approved | retired`. Cache rows only record **eval math** (`gate_pass`) so reruns skip work.
Promotion updates the registry and runs the prod materializer (§10).

CLI flow:

- `evaluate` — for each artifact whose fingerprint is **not** in `artifact_verdicts`, run all
  cases; for each one already there, skip and reuse the verdict. `--force` ignores cache.
- `evaluate --since <git-ref>` — only consider artifacts whose files differ vs. that ref. Useful
  inside CI later.

## 10. Promotion, registry, and prod materialization

### 10.1 Gate (per artifact, across cases)

After evaluation, aggregate per artifact (worst case or weighted aggregate — pick one policy in
code and document it). A **candidate** passes the gate when **every** case satisfies its own
thresholds:

```text
PASS_GATE if for every case:
  score_mean      >= thresholds.min_score
  AND score_std   <= thresholds.max_variance
  AND success_rate >= thresholds.min_success_rate
  AND process_mean >= thresholds.min_process_mean
```

Failures list the clause and worst case id.

### 10.2 Registry (source of truth)

`lab/registry.yaml` lists every artifact under management. Example row:

```yaml
artifacts:
  - artifact_id: skill:skills/core/safe-edit-and-verify
    lifecycle: draft            # draft | edited | candidate | approved | retired
    lab_path: skills/core/safe-edit-and-verify   # relative to lab/.cursor/
    last_fingerprint: "sha256:..."
    last_eval_at: "2026-05-15T12:00:00Z"
    last_report: reports/2026-05-15T1200/summary.md
    approval: null              # { at, by } when human or CLI approves
```

**`evaluate`** (or `gate`) updates **`last_*`** fields and may set **`lifecycle`** to:

- `edited` — artifact bytes changed since last approval.
- `candidate` — latest eval **`gate_pass`** is true for the current fingerprint.

**`approve`** (human or explicit CLI) sets **`lifecycle: approved`**, fills **`approval`**, and
records the fingerprint that was approved. **Nothing auto-approves** without an explicit command
unless you later add a `--auto-approve` flag for solo use.

**`promote` / `materialize-prod`** reads **only `lifecycle === approved`** rows and copies the
corresponding paths from `lab/.cursor/` into `prod/.cursor/`, pruning files in prod that are no
longer approved (policy: mirror exactly approved set, or additive-only — choose one; default
**mirror** for personal use). **`--apply-to-repo`** also copies into the repo-root `.cursor/` and
prints paths for review; never auto-commit.

In an enterprise port, registry + approved diff becomes “open PR to prod-plugin-repo.”

## 11. CLI Surface

```text
cursor-lab list                       # artifacts + registry lifecycle + last verdict
cursor-lab evaluate                   # run; reuse cached verdicts where fingerprint matches
cursor-lab evaluate --force           # ignore cache
cursor-lab evaluate --artifact <id>   # narrow scope
cursor-lab evaluate --since HEAD~1    # only artifacts changed vs git ref
cursor-lab gate                       # compute gate_pass from latest runs; set registry to candidate/edited
cursor-lab approve --artifact <id>    # mark approved (after reviewing reports)
cursor-lab report                     # write reports/latest.md + reports/latest.json
cursor-lab materialize-prod           # lab/registry → prod/.cursor/ (approved only)
cursor-lab materialize-prod --apply-to-repo
cursor-lab doctor                     # API keys, node bridge, judge LM, ripgrep path
```

`evaluate` outputs both a console summary and full per-run JSON under `reports/<timestamp>/`.

## 12. Reporting

Per run, write:

- `reports/<ts>/summary.md` — per-artifact table: score_mean, score_std, success_rate,
  gate_pass, registry lifecycle, top deviations and **judge rationales** (link or inline).
- `reports/<ts>/runs.jsonl` — one line per run unit, full record (for offline analysis).
- `reports/<ts>/diffs/<artifact_path...>/<case_id>/<seed_index>.patch` — unified diff (mirror
  `artifact_path` with safe directory segments, e.g. `diffs/skills/core/safe-edit-and-verify/...`).

The summary file is the human-readable artifact; the JSONL is the machine input for any later
optimizer (DSPy `BootstrapFewShot` learning from accepted/rejected verdicts).

## 13. Secrets and Configuration

Required env vars:

- `CURSOR_API_KEY` — executor SDK runs (already used elsewhere in this repo). Injected **only**
  into the Node child environment by the Python bridge; **not** logged and not embedded in saved
  request JSON for CI runs.
- `CURSOR_LAB_JUDGE_API_KEY` — judge LM credential (same hygiene).
- `CURSOR_LAB_JUDGE_MODEL` — judge model id.

Optional:

- `CURSOR_LAB_EXECUTOR_MODEL` — defaults to `composer-2`.
- `CURSOR_LAB_RUNTIME` — `local` (default) or `cloud`.
- `CURSOR_LAB_CLOUD_REPO_URL` / `CURSOR_LAB_CLOUD_STARTING_REF` — if `cloud`.
- `CURSOR_RIPGREP_PATH` — explicit `rg` binary for sandboxes/CI (see `packages/cursor-agents`).

**Data sent to the judge LM** may include diffs and tool traces. For sensitive codebases, support
**redaction** (strip env blocks, truncate diffs) or a **self-hosted / VPC** judge endpoint — out of
scope for the first skeleton but reserved as config flags.

## 14. Failure Modes and Mitigations

| Risk                                                      | Mitigation                                                                                       |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Host `.cursor` contaminates the sandbox                   | Sandbox is `mkdtemp`, brand new `cwd`; we never run from the repo root.                          |
| SDK pulls in user/team/MDM settings                       | `local.settingSources = []` explicit on every call.                                              |
| Startup vs run errors conflated                           | Bridge always tags `kind` and lets orchestrator branch.                                          |
| Judge self-grading bias                                   | Executor and judge models are explicitly different LMs.                                          |
| Cost explosion as fixtures grow                           | Fingerprint cache + `--since` scope + `runs` default 3 + cheap executor model (`composer-2-fast` allowed). |
| Resource leaks (long-running sessions, executors)         | Default `prompt` mode; `stream` mode uses `await using` / explicit dispose per SDK docs.          |
| No tool transcript on prompt path                          | Expected per SDK; use `stream` mode when rubrics require `tool_call` evidence.                    |
| Thin CI missing ripgrep                                    | Set `CURSOR_RIPGREP_PATH` or install `rg`; run `cursor-lab doctor`.                                 |
| pnpm / turbo break when adding `apps/cursor-lab`           | Add `package.json` + no-op or delegated scripts; keep turbo from assuming a web build.            |
| Variance noise hides real regressions                     | Track `score_std` as a first-class gate input, not just `score_mean`.                            |
| Fixture rot (artifact changed but fixture didn't)         | Fingerprint includes fixture content; require explicit fixture update for shape changes.        |
| Network flakes in cloud runtime                           | Respect `CursorAgentError.isRetryable`; backoff retry; cap retries at 3.                         |
| MCP server availability for tools the skill assumes       | MCP servers passed inline per run; cloud runs require HTTP-reachable servers (local stdio off).   |

## 15. Phased Build (technical, not calendar)

Each phase produces a usable artifact. No phase blocks on a later one for partial value.

**Phase A — Skeleton + bridge (smallest useful loop)**

- `apps/cursor-lab/` scaffolded (`pyproject.toml`, **`package.json`** for pnpm, package layout).
- Node bridge: **`prompt` mode** first (`Agent.prompt`), error-tagging, JSON stdout; child env
  carries `CURSOR_API_KEY`.
- Python wrapper with typed `RunResult`.
- `cursor-lab doctor`: API keys, bridge smoke test, **`CURSOR_RIPGREP_PATH` / `rg` on PATH**.

Dependencies/risks: requires `@cursor/sdk` resolvable from the bridge's `package.json`. Node 20+.
Validates the foundational interop before any judging logic.

**Phase B — Sandbox + fixtures + one artifact**

- Sandbox builder with snapshot/diff and **`sandbox_profile`** (§6).
- Discovery walks `lab/.cursor/` and `fixtures/<artifact_path>/`.
- One real fixture for `skills/core/safe-edit-and-verify`, three cases (mix of `strict` and one
  optional `stream` case if tool evidence is needed).
- `cursor-lab evaluate --artifact ...` runs end-to-end but **skips the judge** (raw runs only).

Dependencies/risks: shape of the per-run record and diff capture is finalized here; the judge
later just consumes it.

**Phase C — Judge JSON + DSPy (optional orchestration)**

- Implement **§7.2 versioned JSON verdict** + validation (primary persistence).
- DSPy may back individual dimensions if desired; aggregated output still passes through the JSON
  schema.
- Reports include **rationales, evidence[], improvement_suggestions[]**.

Dependencies/risks: judge LM cost. Use a **tiny golden replay** only to verify the **judge
instrument** (schema + stability per §7.2), not to score artifacts.

**Phase D — Variance, multi-capability, gate, cache, registry**

- `runs: N` parallelization (asyncio + bounded worker pool around `run_once`).
- Capability mix from fixture manifest.
- Fingerprint + SQLite cache (§9.2).
- **`lab/registry.yaml`**, `cursor-lab gate`, `cursor-lab approve`, **`cursor-lab materialize-prod`**.

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

- Replace `materialize-prod --apply-to-repo` with "open PR to prod-plugin-repo from generated diff."
- Wire `evaluate` into a CI workflow that runs on PRs into the testing repo.
- All of this is **a swap of two functions**; the core orchestrator and judge stay unchanged.

## 16. Resolved Design Choices (from Open Questions)

- **Judge LM choice:** Specify exact models (e.g., `gpt-4o` or `claude-3-5-sonnet-latest`) rather than families. The executor defaults to `composer-2` (Cursor default) unless overridden.
- **Hook artifact evaluation:** Hooks are evaluated by side-effects (e.g., linter ran) where possible, not only final text.
- **Calibration / goldens:** Goldens exist **only** to validate the **judge instrument** (JSON schema compliance, low drift). **Artifact scores** come from real rubric runs — no golden-output matching as a promotion gate.
- **Artifact visibility:** The judge receives enough artifact text to score process adherence; redact if sending externally.

## 17. Out of Scope

- Enterprise multi-repo orchestration with real PR automation (the **materialize** seam is reserved).
- Hosted UI for browsing runs.
- Distributed evaluation across multiple machines.
- Optimization (MIPRO/BootstrapFewShot) of the judge — possible later once verdicts have human
  labels, but not required for the harness to be useful.

## 18. References

- Cursor SDK — TypeScript API (RunResult, Agent.prompt, streaming, errors):  
  https://cursor.com/docs/sdk/typescript  
- Cursor evals (transcript / `tool_call` streaming pattern):  
  https://cursor.com/docs/evals  
- Cursor SDK skill (internal): `Agent.prompt` one-shot pattern, `local.settingSources = []`
  isolation, mandatory `CursorAgentError` vs `result.status === "error"` distinction, mandatory
  disposal, explicit `apiKey`/`model`/runtime.
- Repo conventions: `AGENTS.md`, `docs/CURSOR-AGENT-HANDBOOK.md`,
  `.cursor/skills/skills.index.json`, `.cursor/rules/skills-docs-routing.mdc`.
- Existing automation precedent: `packages/cursor-agents/` (TypeScript SDK use, `bootstrapCursorSdkRuntime`, `CURSOR_RIPGREP_PATH`), runtime selector pattern in `runtime-options.ts`.
