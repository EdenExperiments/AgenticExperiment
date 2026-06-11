# Python Tooling Stack Guide (Layer 2)

Applies to work under `apps/cursor-lab/`. Inherits the base layer. No Layer 3 role variants exist
for Python (D-058): tooling volume is low, so knowledge lives here.

## Purpose

Cursor Lab is the local eval harness for `.cursor/` rules/skills/hooks (F-061): artifact discovery,
an `@cursor/sdk` Node bridge, and (planned) judge + promotion gates. It is also where the agentic
pipeline's golden-PR set and per-surface outcome metrics will accumulate as seed data for the
future eval project (brief §7).

## Toolchain

- Python package: `cursor_lab/` (CLI: `python3 -m cursor_lab`, commands `list`, `doctor`).
- Node bridge: `cursor_lab/bridge/node_bridge/run-agent.ts`, run via
  `pnpm exec tsx .../run-agent.ts` (JSON over stdin/stdout).
- Verification: `cursor-lab doctor` for environment + bridge smoke; pytest for Python units where
  present.

## Rules

- Keep the registry (`lab/registry.yaml`) the source of truth for evaluated artifacts.
- Lab experiments never modify live `.cursor/` config directly — promotion is an explicit,
  human-reviewed step (see `docs/guides/cursor-lab-eval-flow-plan.md`).
- Bridge changes must keep the JSON stdin/stdout contract stable for the Python side.
