# /epic — elicitation → decomposition → per-task dispatch

Thin router (brief §4a). Adds decomposition between requirements and dispatch.

1. Read `.cursor/skills/delivery/requirements-elicitation/SKILL.md` and follow it. Output the
   signed requirements artifact at `Documentation/delivery/<date>-epic-<slug>/requirements.md`.
   Stop for explicit human sign-off.
2. Read `.cursor/skills/delivery/task-decomposition/SKILL.md` and follow it. Output:
   `task-list.md` plus one `task-NN.md` per independently-verifiable task, each tagged with target
   paths (this drives mechanical routing to the right stack implementer) and a named verification
   command.
3. For each task, in dependency order, read `.cursor/skills/delivery/tdd-dispatch/SKILL.md` and
   dispatch a fresh agent per task (prefer many short agents over one long one). Tasks with
   overlapping files are serialised, never parallelised.
4. Each task lands as its own draft PR into the Pillar B convergence loop.
