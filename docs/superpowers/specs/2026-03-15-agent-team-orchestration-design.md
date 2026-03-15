# Agent Team Orchestration Design

Date: 2026-03-15
Topic: Sequential 6-agent planning pass for RpgTracker with checkpoint summaries

## Purpose

Run the first full planning pass for the RpgTracker project using the existing Claude Code agent team. The goal is to take the project from pre-implementation (open questions, draft planning docs) to a coherent, build-ready planning package with a confirmed MVP boundary, first schema draft, IA direction, and implementation backlog.

## Orchestration Approach

Sequential dispatch with checkpoint summaries. Each agent runs to completion as a foreground subagent. After each completes, a brief checkpoint is presented to the user showing what changed, what is still open, and what the next agent will tackle. The user can stop the chain at any checkpoint to redirect before continuing.

This approach is preferred over full auto-chain because the requirements-agent will make judgment calls on open product questions (Q-006, Q-007, Q-008) that directly shape all downstream agent outputs. A checkpoint after Step 1 allows validation of those calls before they propagate.

## Agent Sequence

| Step | Agent | Mission | Primary Outputs |
|------|-------|---------|-----------------|
| 1 | requirements-agent | Resolve Q-006/Q-007/Q-008, tighten MVP boundary | Updated product-requirements.md, decision-log.md, feature-tracker.md |
| 2 | planning-agent | Define the v1 slice and delivery sequencing; no full backlog yet | Updated planning-handoff.md, feature-tracker.md |
| 3 | architecture-agent | First schema, service boundaries, Claude key handling | New schema/ADR file(s) under Documentation/ (agent chooses filename) |
| 4 | ux-agent | IA, navigation, mobile-first core journeys | New IA/UX file under Documentation/ (agent chooses filename) |
| 5 | planning-agent (2nd pass) | Build first implementation backlog for Phase 1 and Phase 2 | Updated planning-handoff.md, refined feature-tracker.md, backlog proposal |
| 6 | review-agent | Detect drift, gaps, contradictions; issue go/no-go | Review findings document |

Note: `claude-agent-team.md` uses `review-agent` as the final team step. `planning-handoff.md` Step 6 references a `delivery-agent` for bootstrapping implementation — that agent is out of scope for this planning pass and will be dispatched after a go verdict is issued.

## Coordination Protocol

All agents collaborate exclusively through files in `Documentation/`. No agent reads another agent's session output. This is the blackboard pattern already established in the repo.

Each agent:
- Reads `CLAUDE.md` first, then the full `Documentation/` set before acting
- Updates only the minimum valid set of documents for its role
- Leaves a handoff note stating: what changed, what remains open, what the next agent should do

The orchestrating session (this conversation) reads each agent's output, summarizes the key changes and decisions at each checkpoint, and dispatches the next agent.

## Handling Open Questions

Three product questions are blocking implementation. The requirements-agent addresses all three in Step 1:

- Q-006: Encryption, rotation, and validation mechanism for user Claude API keys
- Q-007: Whether MVP includes blocker completion flow or only visible gate state
- Q-008: Whether AI-assisted calibration is mandatory or optional with manual fallback

For each question, the agent will either:
- Convert to a confirmed decision (if context supports a clear resolution), or
- Convert to an explicit implementation assumption (with stated rationale, if human validation is still needed)

Silent guessing is not permitted.

## Checkpoint Format

After each agent completes, the following is presented to the user:

1. Documents updated (names and summary of key changes)
2. Decisions made or assumptions recorded
3. New open questions raised (if any)
4. What the next agent will tackle
5. Prompt: continue or redirect?

## Exit Criteria

The chain ends when the review-agent issues a verdict:

- **Go**: planning package is coherent, implementation can begin
- **No-go**: specific gaps identified with exact document references and required corrections

On a no-go, the findings are presented and the user decides whether to re-run specific agents or resolve gaps manually before proceeding to implementation.

## Outputs Required Before Implementation

Per `Documentation/planning-handoff.md`, implementation must not begin until:

- All open questions in `decision-log.md` are either resolved or explicitly accepted as implementation assumptions (including Q-006, Q-007, Q-008)
- MVP boundary is explicit
- App shell direction is explicit
- First schema draft exists
- First implementation backlog exists

The review-agent verifies all five conditions before issuing a go verdict.
