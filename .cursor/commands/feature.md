# /feature — lightweight elicitation → spec → dispatch

Thin router (brief §4a): skills do the work; every stage writes an artifact; the next stage
consumes the artifact, not the chat.

1. Read `.cursor/skills/delivery/requirements-elicitation/SKILL.md` and follow it. Output:
   `Documentation/delivery/<date>-feature-<slug>/requirements.md` — the **signed requirements
   artifact**, the one mandatory human checkpoint. Stop and get explicit user sign-off on it
   before proceeding.
2. After sign-off, write the task artifact (`task-01.md` in the same folder) from the requirements:
   acceptance criteria, target paths, named verification command. Apply the task breakdown rules
   (one verifiable outcome; self-contained context; size cap: if it cannot be verified in one PR,
   use `/epic` instead).
3. Read `.cursor/skills/delivery/tdd-dispatch/SKILL.md` and dispatch the TDD chain:
   test-writer (red confirmed) → implementer (TDD lock active) → verifier.
4. Open a draft PR into the Pillar B convergence loop with verification evidence attached.
