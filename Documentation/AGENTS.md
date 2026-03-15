# Documentation Agent Guide

This folder contains the maintained planning and requirements set for the project.

## Document Roles

- `README.md`: navigation, source-of-truth rules, update workflow
- `product-requirements.md`: stable product intent and functional requirements
- `planning-handoff.md`: epics, sequencing, implementation planning view
- `feature-tracker.md`: per-feature status, ownership, dependencies, open questions
- `decision-log.md`: confirmed decisions and unresolved product questions
- `agent-operating-model.md`: coordination rules for multiple agents

## Editing Rules

- Update only the documents affected by the current change, but keep cross-links consistent.
- Prefer tables and short sections over long narrative when tracking status.
- Date new decision or status entries in ISO format.
- If information is inferred rather than explicitly requested, label it as an assumption.
- Do not duplicate the same detailed content across multiple docs. Link by section name instead.

## Completion Checklist

- Product requirement changed: update `product-requirements.md`
- Planning order or scope changed: update `planning-handoff.md`
- Feature state changed: update `feature-tracker.md`
- Decision made or unresolved: update `decision-log.md`
- Multi-agent workflow impacted: update `agent-operating-model.md`
