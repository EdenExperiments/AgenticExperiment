# PRD: Personal Agentic AI Lab (Local Testing and Experimentation)

> **ARCHIVED** — superseded by `Documentation/agentic-pipeline/Agentic-Pipeline-Brief-v2.md`. See `docs/archive/README.md`.

**Status:** Archived (was active draft for personal build-out)  
**Owner:** Mac  
**Last updated:** 2026-05-09

---

## 1. TL;DR

This document defines a **personal agentic AI lab** inside this repository.  
It is for **testing, learning, and iterative build-out** of agent workflows, not enterprise rollout.

The core objective is to create a repeatable, low-risk way to:

1. Build high-quality reusable **skills**.
2. Validate those skills with lightweight tests and fixtures.
3. Run agents against real tasks in this repo.
4. Track what works, simplify what does not, and evolve over time.

---

## 2. Scope and Guardrails

### In scope

- Personal experimentation in this repository.
- Skill authoring, validation, and iteration.
- Local automation patterns (pre-commit checks, local scripts, lightweight CI).
- Simple quality gates for confidence (lint/test/basic security checks).
- Documentation of decisions, lessons, and next actions.

### Out of scope

- Enterprise governance, org-wide rollout, procurement, or licensing decisions.
- Team cohort models, mandatory adoption programs, and org change management.
- Multi-team service-account operations and centralized production controls.
- Any wording that implies this is official business policy.

### Explicit framing

If prior versions of this PRD contain enterprise language, this version supersedes that framing for this repo.  
Agents should treat this as a **personal R&D blueprint**.

---

## 3. Problem Statement

Without a focused personal operating model, experimentation drifts:

- Skills become ad-hoc and hard to reuse.
- Successful patterns are not captured consistently.
- Agent behavior varies by prompt quality and context noise.
- Tooling changes are hard to compare without baseline checks.

The result is effort spent repeating setup work instead of compounding learning.

---

## 4. Product Vision

Build a personal "agent engineering playground" where each month adds durable capability:

- Better skills
- Better verification
- Better orchestration
- Better signal on what is worth keeping

The intended outcome is not "more automation at any cost."  
The intended outcome is **reliable, explainable, testable agent workflows** that improve developer velocity in this repo.

---

## 5. Goals and Non-Goals

### Goals


| ID  | Goal                                                            | Success signal                                                 |
| --- | --------------------------------------------------------------- | -------------------------------------------------------------- |
| G1  | Create a clean skill library with clear `when_to_use` triggers. | First 10 core skills documented and discoverable.              |
| G2  | Add repeatable validation for skill behavior.                   | Fixtures or checks exist for high-impact skills.               |
| G3  | Build a local PR-quality loop that agents can consume.          | Standard checks run locally and in CI with predictable output. |
| G4  | Establish a measured experimentation cadence.                   | Weekly review log captures keep/change/drop decisions.         |
| G5  | Keep complexity bounded and reversible.                         | Every major change has a rollback path and simple toggle.      |


### Non-goals

- Building a complete platform before proving value on small tasks.
- Automating merge approval or replacing human judgment.
- Introducing heavyweight process that slows down solo iteration.

---

## 6. Principles

1. **Skills first.** Reusable procedures are the foundation for everything else.
2. **Evidence over vibes.** Keep changes that improve measurable outcomes.
3. **Small blast radius.** Prefer reversible increments over broad rewrites.
4. **Single source of truth.** Keep current guidance in a small set of docs.
5. **Human-in-the-loop.** Agents propose and execute; owner approves high-impact changes.

---

## 7. Architecture for This Personal Repo

### 7.1 Capability layer

- Rules: stable constraints that prevent common mistakes.
- Skills: named procedures for recurring tasks.
- Hooks/scripts: deterministic checks on known events.
- Agent instructions: clear operating model for this workspace.

### 7.2 Quality loop

- Standard local checks (lint, tests, formatting, secrets scan where relevant).
- Optional CI mirror of key checks for consistency.
- Output shaped so agents can turn failures into concrete fixes.

### 7.3 Learning loop

- Record each experiment hypothesis, change, and outcome.
- Promote successful patterns into documented skills.
- Retire low-signal or duplicate skills quickly.

---

## 8. Phased Build Plan (Starting With Skills)

### Phase 0 (Week 0): Baseline and Cleanup

**Objective:** Remove ambiguity and establish a clean starting point.

- Confirm this PRD as canonical for personal experimentation.
- Capture current agent/rule/skill inventory.
- Identify top 3 recurring tasks you want agents to do better.
- Define a simple scorecard: speed, correctness, rework, confidence.

**Exit criteria:**

- Baseline inventory written.
- Initial scorecard template ready.

### Phase 1 (Weeks 1-2): Skill Foundation (Highest Priority)

**Objective:** Build a minimal, high-quality skill pack for daily work.

Initial skill set to prioritize:

1. `task-intake-and-scope` - normalize requests before edits.
2. `repo-context-scan` - collect just enough context quickly.
3. `safe-edit-and-verify` - change code/docs with mandatory checks.
4. `debug-failure-loop` - triage failures systematically.
5. `closeout-and-report` - clear summary with next actions.

For each skill:

- Define trigger (`when_to_use`), inputs, outputs, constraints.
- Add positive and negative examples.
- Add at least one verification example or fixture.

**Exit criteria:**

- 5 core skills implemented and usable.
- Skills are discoverable from a single index/reference.

### Phase 2 (Weeks 3-4): Verification Harness for Skills

**Objective:** Prevent regressions in prompt/skill behavior.

- Add fixtures for deterministic skills (input -> expected output shape).
- Add snapshot-like checks for plan/report structures where deterministic output is unrealistic.
- Add a lightweight `validate-skills` command/script.
- Document failure triage steps when checks break.

**Exit criteria:**

- High-impact skills covered by repeatable checks.
- Skill validation can run in one command.

### Phase 3 (Weeks 5-6): Local Quality Automation Loop

**Objective:** Make agent edits safer by default.

- Standardize local checks agents should run after substantive edits.
- Ensure outputs are concise and machine-readable where practical.
- Add one "autofix-safe-lane" pattern (formatting, minor lint fixes, docs sync).
- Keep a clear boundary for what always requires manual review.

**Exit criteria:**

- A documented quality loop exists and is used consistently.
- At least one safe autofix lane is running.

### Phase 4 (Weeks 7-8): Personal Templates and Reusable Patterns

**Objective:** Speed up new experiments through structure.

- Create template skeletons for common project types in this repo.
- Embed your tested skill references and verification defaults.
- Include "first 30 minutes" setup guidance for each template.

**Exit criteria:**

- At least 2 templates available and tested.
- New experiment bootstrap time significantly reduced.

### Phase 5 (Weeks 9+): Orchestration and Advanced Experiments

**Objective:** Expand capability only after earlier phases are stable.

- Add selective multi-agent orchestration for independent tasks.
- Add cost/time tracking for bigger runs.
- Trial cloud/remote lanes only when local loops are dependable.

**Exit criteria:**

- Orchestrated workflows show clear net value over single-agent flow.
- Advanced lanes are opt-in and reversible.

---

## 9. Backlog Structure

Use three lists to avoid overload:

- **Now:** Tasks tied directly to current phase exit criteria.
- **Next:** High-value follow-ups for the next phase.
- **Later:** Ideas parked until they have clear evidence or demand.

Every task should include:

- Why now
- Definition of done
- Verification command(s)
- Rollback path

---

## 10. Measurement and Review Cadence

### Weekly review (30-45 min)

- What changed this week?
- Which skill usage increased/decreased?
- What failed repeatedly?
- What should be simplified or removed?

### Metrics to track lightly

- Task cycle time (before vs after skill usage).
- Rework rate after agent-generated changes.
- Verification pass rate on first run.
- Number of retired vs added skills (guard against bloat).

---

## 11. Risks and Mitigations


| Risk                                 | Mitigation                                                |
| ------------------------------------ | --------------------------------------------------------- |
| Skill sprawl and overlap             | Enforce small, single-purpose skills and quarterly prune. |
| Over-automation of brittle workflows | Keep human checkpoints for high-impact changes.           |
| Validation overhead becomes heavy    | Start minimal; only harden checks where failures repeat.  |
| Ambiguous guidance confuses agents   | Keep this PRD and skill index concise and current.        |


---

## 12. Immediate Next Actions (This Week)

1. Create/update a single source of truth skill index.
2. Define the first 5 core skills listed in Phase 1.
3. Add a `validate-skills` script placeholder (even if minimal).
4. Run 3 real tasks using the new skills and log outcomes.
5. Review logs and refine one skill based on evidence.

---

## 13. Change Log

- **2026-05-09:** Reframed PRD from enterprise rollout language to personal experimentation and local build plan; introduced phased roadmap starting with skills.