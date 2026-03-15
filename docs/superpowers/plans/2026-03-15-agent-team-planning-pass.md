# Agent Team Planning Pass Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Run the 6-agent sequential planning pass to take RpgTracker from pre-implementation to a coherent, build-ready planning package with a go/no-go verdict from the review-agent.

**Architecture:** Each agent runs as a foreground subagent, reads CLAUDE.md and the full Documentation/ set, updates the minimum valid set of docs for its role, and leaves a handoff note. The orchestrating session presents a checkpoint to the user after each agent, summarizing what changed and what the next agent will tackle. The user can stop the chain at any checkpoint to redirect.

**Tech Stack:** Claude Code Agent tool, `.claude/agents/` definitions, `Documentation/` as shared blackboard

---

## Chunk 1: Pre-flight and Requirements Pass

### Task 1: Pre-flight verification

**Files:**
- Read: `Documentation/decision-log.md`
- Read: `Documentation/feature-tracker.md`
- Read: `Documentation/product-requirements.md`

- [ ] **Step 1: Verify open questions are still unresolved**

Read `Documentation/decision-log.md`. Confirm Q-006, Q-007, Q-008 are still listed under Open Questions (not yet moved to Confirmed Decisions or Assumptions).

Expected: Three rows in the Open Questions table.

- [ ] **Step 2: Verify no implementation work has started**

Read `Documentation/feature-tracker.md`. Confirm no features have status `in-progress` or `done`.

Expected: All non-deferred release-1 features (Platform and LifeQuest area) show `ready-for-planning`. Rows with `deferred` status are expected and do not indicate a problem.

---

### Task 2: Dispatch requirements-agent

**Files:**
- Modify: `Documentation/product-requirements.md`
- Modify: `Documentation/decision-log.md`
- Modify: `Documentation/feature-tracker.md`

- [ ] **Step 1: Dispatch requirements-agent subagent**

Use agent definition: `.claude/agents/requirements-agent.md`

Prompt:
```
You are the requirements-agent for this repository. Read CLAUDE.md and Documentation/CLAUDE.md first, then read Documentation/product-requirements.md, Documentation/decision-log.md, and Documentation/feature-tracker.md.

Your job:
1. Resolve all three open questions by converting each to either a confirmed decision (D-xxx) or an explicit implementation assumption (A-xxx). Do not leave any as open questions.
   - Q-006: First check whether the project's tech stack (Go + Supabase) provides a ready-made key management mechanism (e.g., Supabase Vault, a Go KMS library). If such a mechanism is clearly available and suitable, record it as a confirmed decision. If context does not support a clearly better option, record AES-256-GCM with envelope encryption and a server-side master key as an implementation assumption. Cover encryption, rotation, and validation. Ensure the chosen mechanism is consistent with D-009 (keys must be encrypted at rest server-side and never exposed to the client).
   - Q-007: D-007 is already confirmed — XP accrues behind the gate and progression is locked until blocker completion. Build on D-007; do not re-litigate it. The only remaining open question is: does the blocker *completion UI flow* itself ship in release 1, or only the visible gate state with locked progression? Decide that narrower question only.
   - Q-008: Decide whether AI-assisted skill calibration is mandatory in the first onboarding flow or optional with a manual fallback path.
2. Tighten the LifeQuest-first MVP boundary in product-requirements.md — make the first-release scope explicit with no ambiguity.
3. Update feature-tracker.md for any features moved to deferred or confirmed in MVP.
4. Tighten scope rather than expand it. Prefer a smaller, buildable MVP over a broader but vague release plan.

Preserve the distinction between confirmed decisions, assumptions, and open questions. End with a short handoff: what changed, what remains open, what the planning-agent should do next.
```

- [ ] **Step 2: Verify outputs**

Check:
- `Documentation/decision-log.md`: Q-006, Q-007, Q-008 no longer appear in the Open Questions table; each appears in either the Confirmed Decisions table (as D-xxx) or the Assumptions table (as A-xxx)
- `Documentation/product-requirements.md`: MVP scope is explicit
- `Documentation/feature-tracker.md`: no non-deferred release-1 features left in ambiguous state

- [ ] **Step 3: Present Checkpoint 1**

Summarize to user:
- Documents updated (list each file changed and the key change made)
- Which of Q-006/Q-007/Q-008 became confirmed decisions (D-xxx) vs implementation assumptions (A-xxx), and what was decided for each
- Any new open questions raised by the agent
- What the planning-agent will tackle next

Ask: "Continue to planning-agent, or redirect?"

Wait for user response before proceeding.

---

## Chunk 2: Planning and Architecture Pass

### Task 3: Dispatch planning-agent (1st pass)

**Files:**
- Modify: `Documentation/planning-handoff.md`
- Modify: `Documentation/feature-tracker.md`

- [ ] **Step 1: Dispatch planning-agent subagent**

Use agent definition: `.claude/agents/planning-agent.md`

Prompt:
```
You are the planning-agent for this repository. Read CLAUDE.md first, then read Documentation/planning-handoff.md, Documentation/feature-tracker.md, Documentation/product-requirements.md, and Documentation/decision-log.md.

Your job:
1. Convert the approved product direction into a tight v1 delivery slice with a clear deferred list.
2. Confirm the phase plan (Phase 1: Platform Foundation, Phase 2: LifeQuest Core) with explicit exit criteria for each phase.
3. Update planning-handoff.md with the confirmed epic breakdown and delivery sequence.
4. Update feature-tracker.md with current readiness, ownership, and dependencies for all release-1 features.
5. Separate true MVP features from later enhancements. Keep NutriLog deferred.

Order work to reduce schema churn. Do not produce a full implementation backlog yet — that is the 2nd planning pass after architecture and UX are defined.

End with a short handoff: what changed, what remains open, what the architecture-agent should do next.
```

- [ ] **Step 2: Verify outputs**

Check:
- `Documentation/planning-handoff.md`: Phase 1 and Phase 2 defined with exit criteria
- `Documentation/planning-handoff.md` or `Documentation/feature-tracker.md`: explicit deferred list present
- `Documentation/feature-tracker.md`: All release-1 features have owners and clear status

- [ ] **Step 3: Present Checkpoint 2**

Summarize key planning decisions and what the architecture-agent will tackle. Ask: "Continue to architecture-agent, or redirect?" Wait for response.

---

### Task 4: Dispatch architecture-agent

**Files:**
- Create: `Documentation/architecture.md` or ADR files (agent chooses filename)
- Modify: `Documentation/decision-log.md` (if new decisions or risks discovered)
- Modify: `Documentation/feature-tracker.md` (if new dependencies identified)

- [ ] **Step 1: Dispatch architecture-agent subagent**

Use agent definition: `.claude/agents/architecture-agent.md`

Prompt:
```
You are the architecture-agent for this repository. Read CLAUDE.md first, then read Documentation/product-requirements.md, Documentation/planning-handoff.md, Documentation/decision-log.md, and Documentation/feature-tracker.md.

Your job:
1. Produce the first domain and data model for the LifeQuest-first MVP. Define entities and relationships for: users, skills, XP events, blocker gates, and logs. Include the key fields and constraints needed to implement the core progression loop.
2. Model only the NutriLog domain dependencies needed to prevent obvious future schema churn — do not enumerate or design NutriLog entities in detail. This is a placeholder boundary, not a full NutriLog design.
3. Define the secure Claude API key storage and usage flow. Check how Q-006 was resolved in decision-log.md (it may be a confirmed decision D-xxx or an implementation assumption A-xxx) and apply it accordingly, preserving that distinction in your output.
4. Define integration contracts for Supabase auth, PostgreSQL, and the food data provider (what the app owns vs. what each external service owns).
5. Add any new technical dependencies or risks to decision-log.md or feature-tracker.md.

Save your output as a new file under Documentation/ with a clear name (e.g., architecture.md or schema.md). Keep it focused on MVP scope.

End with a short handoff: what changed, what remains open, what the ux-agent should do next.
```

- [ ] **Step 2: Verify outputs**

Check that a new file exists under `Documentation/` containing at minimum:
- Entity definitions for users, skills, XP, logs, blockers
- Claude key storage approach (marked as decision or assumption, matching decision-log.md)
- Supabase auth integration boundary
- Food data provider integration boundary

Also check: if the agent added new entries to `Documentation/decision-log.md` or `Documentation/feature-tracker.md`, confirm those entries are present.

- [ ] **Step 3: Present Checkpoint 3**

Summarize schema decisions and any new risks or dependencies. Ask: "Continue to ux-agent, or redirect?" Wait for response.

---

## Chunk 3: UX, Backlog, and Review

### Task 5: Dispatch ux-agent

**Files:**
- Create: `Documentation/ux.md` or equivalent (agent chooses filename)
- Modify: `Documentation/decision-log.md` (if UX-driven clarifications needed)
- Modify: `Documentation/feature-tracker.md` (if UX changes scope)

- [ ] **Step 1: Dispatch ux-agent subagent**

Use agent definition: `.claude/agents/ux-agent.md`

Prompt:
```
You are the ux-agent for this repository. Read CLAUDE.md first, then read Documentation/product-requirements.md, Documentation/planning-handoff.md, Documentation/decision-log.md, Documentation/feature-tracker.md, and any new architecture or schema files created in this planning pass.

Your job:
1. Define the information architecture for the unified app shell (confirmed: single shell for release 1, not split-mode).
2. Establish the shared navigation model — what top-level sections exist, how users move between LifeQuest and NutriLog areas.
3. Define the core user journeys for: skill creation, quick XP logging, and progress/level display.
4. Define mobile-first expectations for all three journeys — what must work well on a phone screen from day one.
5. Flag any UX requirement that materially changes scope or sequencing, and log it to the decision-log.

Optimize for low-friction logging and clear progression visibility. Document decisions in the maintained planning docs rather than isolated notes. Save your output as a new file under Documentation/ — do not save it outside this directory, as downstream agents read all new files from Documentation/.

End with a short handoff: what changed, what remains open, what the planning-agent should do next.
```

- [ ] **Step 2: Verify outputs**

Check that a new IA/UX file exists under `Documentation/` containing:
- Navigation structure for the unified shell
- Core journey definitions (skill creation, quick log, progress display)
- Mobile expectations stated explicitly

- [ ] **Step 3: Present Checkpoint 4**

Summarize UX decisions and any scope flags. Ask: "Continue to planning-agent (2nd pass), or redirect?" Wait for response.

---

### Task 6: Dispatch planning-agent (2nd pass)

**Files:**
- Modify: `Documentation/planning-handoff.md`
- Modify: `Documentation/feature-tracker.md`

- [ ] **Step 1: Dispatch planning-agent subagent (2nd pass)**

Use agent definition: `.claude/agents/planning-agent.md`

Prompt:
```
You are the planning-agent for this repository doing a second pass. Read CLAUDE.md first, then read all files under Documentation/ including any new architecture and UX files created in this planning pass.

Your job:
1. Convert the approved architecture and UX direction into the first implementation backlog for Phase 1 (Platform Foundation) and Phase 2 (LifeQuest Core).
2. Break each epic into concrete, buildable task slices — specific enough that a developer can begin without additional research.
3. For each task slice, specify: what it builds, what it depends on, and what it enables.
4. Order tasks to reduce schema churn and maximize sequential buildability.
5. Update planning-handoff.md with the full backlog and build order.
6. Update feature-tracker.md with final readiness state for all release-1 features.

Do not expand scope beyond approved Phase 1 and Phase 2 work. Keep NutriLog deferred. Do not plan Phase 3+ in detail.

End with a short handoff: what changed, what remains open, what the review-agent should do next.
```

- [ ] **Step 2: Verify outputs**

Check `Documentation/planning-handoff.md` for a concrete backlog with task-level granularity for Platform Foundation and LifeQuest Core.

- [ ] **Step 3: Present Checkpoint 5**

Summarize the backlog shape and remaining open items. Ask: "Continue to review-agent, or redirect?" Wait for response.

---

### Task 7: Dispatch review-agent

**Files:**
- Create: `Documentation/review.md`
- Read only: all files under `Documentation/`

- [ ] **Step 1: Dispatch review-agent subagent**

Use agent definition: `.claude/agents/review-agent.md`

Prompt:
```
You are the review-agent for this repository. Read CLAUDE.md first, then read all files under Documentation/ including all new files created in this planning pass.

Your job:
1. Review the full planning package for contradictions, missing decisions, weak assumptions, and readiness gaps.
2. Verify that all five kickoff exit criteria are met. Use Documentation/planning-handoff.md's "Kickoff Exit Criteria" section as the definitive reference — not claude-agent-team.md, which uses narrower phrasing. The five criteria are:
   - All remaining open questions in decision-log.md are either resolved or explicitly accepted as implementation assumptions
   - The MVP feature slice is approved and explicit
   - The app shell and navigation direction are documented
   - A first schema draft exists
   - A first delivery backlog is ready for build
3. Order findings by severity — critical blockers first.
4. Issue an explicit go or no-go recommendation for beginning implementation.
5. Save your findings to Documentation/review.md.

Do not edit any other files. Findings come first. Be precise — reference exact document names and sections for each issue.

End with: findings ordered by severity, go or no-go verdict, and what the next responsible agent or person should do.
```

- [ ] **Step 2: Read review verdict**

Read `Documentation/review.md`.

**If go:** Present final summary to user. Planning package is complete — ready for implementation kickoff.

**If no-go:** Present the specific blocking findings to the user. Decide together: re-run specific agents to fix gaps, or resolve manually before proceeding. After any gap resolution — whether by re-running an agent or manual edits — a follow-up review-agent pass is required before implementation may begin. Do not skip this second review.

- [ ] **Step 3: Present Final Checkpoint**

Summarize:
- Go or no-go verdict
- Critical findings (if any)
- Recommended next step: implementation kickoff (dispatch delivery-agent) or gap resolution
