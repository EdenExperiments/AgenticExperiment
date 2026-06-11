# /fix — known defect, straight to test-first fix

Thin router (brief §4a): skills do the work; every stage writes an artifact.

You are fixing a known defect. Skip elicitation.

1. Read `.cursor/skills/delivery/tdd-dispatch/SKILL.md` and follow it with ceremony level `fix`.
2. Write a minimal task artifact at `Documentation/delivery/<date>-fix-<slug>/task-01.md`:
   defect description, reproduction, acceptance criteria ("defect no longer reproduces" +
   regression-test requirement), target paths, and the named verification command from the
   relevant stack guide (`apps/api/AGENTS.md` or `apps/rpg-tracker/AGENTS.md`/`packages/AGENTS.md`).
3. Dispatch the TDD chain from the artifact: test-writer (red confirmed) → implementer (TDD lock
   active) → verifier.
4. Open a draft PR into the Pillar B convergence loop. Attach verification evidence.
