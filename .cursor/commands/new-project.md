# /new-project — elicitation → architecture → decomposition → dispatch

Thin router (brief §4a). Adds an architecture stage before decomposition.

1. Read `.cursor/skills/delivery/requirements-elicitation/SKILL.md` and follow it. Output the
   signed requirements artifact at `Documentation/delivery/<date>-project-<slug>/requirements.md`.
   Stop for explicit human sign-off.
2. Architecture stage: produce `architecture.md` in the same folder — domain model, zone placement
   (which `apps/`/`packages/` areas), contracts, and constraints. Align with
   `Documentation/architecture.md` and record any new binding decisions in
   `Documentation/decision-log.md`. Get sign-off on architecture too.
3. Read `.cursor/skills/delivery/task-decomposition/SKILL.md` → `task-list.md` + per-task
   artifacts.
4. Dispatch each task via `.cursor/skills/delivery/tdd-dispatch/SKILL.md`; draft PRs into the
   Pillar B convergence loop.
