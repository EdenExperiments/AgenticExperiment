# Documentation Set Reference

## Canonical Documents

- `CLAUDE.md`: Claude Code repository entry guidance
- `Documentation/product-requirements.md`: authoritative product requirements
- `Documentation/planning-handoff.md`: authoritative planning and sequencing view
- `Documentation/feature-tracker.md`: authoritative feature readiness and dependency view
- `Documentation/decision-log.md`: authoritative record of decisions and open questions
- `Documentation/agent-operating-model.md`: authoritative coordination rules for multiple agents
- `Documentation/claude-agent-team.md`: authoritative Claude Code team briefs and starter prompts

## Update Pattern

- Requirement changes usually imply a tracker update.
- Planning changes usually imply either a tracker update or a decision update.
- New ambiguity should be logged rather than silently resolved.
- Rough source notes should be normalized into the structured docs instead of expanded indefinitely.

## Preferred Outputs

- Short, shareable product language in `product-requirements.md`
- Clear phase and epic framing in `planning-handoff.md`
- Operationally useful status rows in `feature-tracker.md`
- Explicit open questions in `decision-log.md`
