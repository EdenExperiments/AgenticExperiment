# Claude Code Guide

This repository is in the requirements and planning stage. The authoritative working set is under `Documentation/`.

## Start Here

1. Read `Documentation/README.md`.
2. Read `Documentation/planning-handoff.md`.
3. Read `Documentation/feature-tracker.md`.
4. Read `Documentation/decision-log.md`.

If you are joining as part of a multi-agent team, also read `Documentation/claude-agent-team.md`.

This `CLAUDE.md` is intentionally kept concise. Project-specific agents live in `.claude/agents/`, project slash commands live in `.claude/commands/`, and subtree-specific guidance can live in nested `CLAUDE.md` files such as `Documentation/CLAUDE.md`.

## Repository Rules

- Keep `Documentation/product-requirements.md`, `Documentation/planning-handoff.md`, `Documentation/feature-tracker.md`, and `Documentation/decision-log.md` synchronized when changes affect them.
- Preserve the distinction between confirmed requirements, assumptions, and open questions.
- Record enough context that another Claude Code agent can resume without rereading the full brief.

## Claude Team Expectations

- Each meaningful feature should map to an entry in `Documentation/feature-tracker.md`.
- Each unresolved product decision should map to an entry in `Documentation/decision-log.md`.
- Do not start implementation work if core product assumptions are still undefined.
- If you make a planning or product change, state which docs were updated and why.

## Recommended First-Pass Order

1. requirements-agent
2. planning-agent
3. architecture-agent
4. ux-agent
5. planning-agent
6. review-agent

Use the role briefs and prompts in `Documentation/claude-agent-team.md`.
