# Cursor Lab

Evaluation harness for `.cursor/` rules, skills, and hooks. See the full design at
[`docs/guides/cursor-lab-eval-flow-plan.md`](../../docs/guides/cursor-lab-eval-flow-plan.md).

## Phase A (current)

- Node bridge: `Agent.prompt` with `local.settingSources = []`, ripgrep bootstrap, JSON on stdin/stdout.
- Python CLI: `doctor` (env + bridge smoke test), `list` (artifact discovery skeleton).

## Setup

From the monorepo root:

```bash
pnpm install
cd apps/cursor-lab
python3 -m venv .venv
source .venv/bin/activate
pip install -e .
```

Set `CURSOR_API_KEY` (and optionally `CURSOR_RIPGREP_PATH` in CI).

## Commands

From `apps/cursor-lab` after `pip install -e .` (or from anywhere with `PYTHONPATH`):

```bash
python3 -m cursor_lab list
python3 -m cursor_lab doctor --deps-only
# With CURSOR_API_KEY set (uses API quota):
python3 -m cursor_lab doctor
```

The `cursor-lab` console script is also installed; ensure your pip script directory is on `PATH` if you prefer that entry point.

The bridge is also runnable directly (expects JSON on stdin, `CURSOR_API_KEY` in env):

```bash
cd apps/cursor-lab
pnpm exec tsx cursor_lab/bridge/node_bridge/run-agent.ts < request.json
```

## Layout

| Path | Role |
|------|------|
| `lab/.cursor/` | Candidate plugin files under test |
| `lab/registry.yaml` | Lifecycle metadata (future gates) |
| `prod/.cursor/` | Materialized approved bundle (future) |
| `fixtures/` | Per-artifact eval cases (future) |
| `cursor_lab/bridge/node_bridge/` | TypeScript `@cursor/sdk` bridge |
