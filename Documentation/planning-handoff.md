# Planning Handoff

Last updated: 2026-03-15 (updated by planning-agent: v1 delivery slice confirmed, phase exit criteria made explicit, epic-to-feature mapping finalized, deferred list locked, schema-churn ordering applied)

## Planning Intent

This document translates the product requirements into planning slices that another team or agent can estimate, sequence, and break into implementation tasks.

## Recommended Delivery Strategy

Build the shared platform and LifeQuest foundation first, then add NutriLog, then connect the two experiences. Within release 1, sequence work so that schema-defining decisions land before the features that consume them. This minimises the cost of schema churn as the product evolves.

---

## Approved Planning Baseline

These decisions are the locked planning baseline for release 1. Nothing below may be re-opened without a new decision-log entry.

- Release 1 is a LifeQuest-first MVP.
- NutriLog delivery is deferred until after the LifeQuest core loop is stable and in production.
- Release 1 uses one unified app shell.
- Core release-1 flows must work well on mobile; full desktop-mobile feature parity for every advanced feature is not required.
- XP accrues behind blocker gates; gate level advancement remains locked until blocker completion (D-007). Gate completion flow is deferred; release 1 ships gate visibility and locked progression state only (D-010).
- AI skill calibration is optional; manual starting-level selection is always available (D-011).
- Auth is email/password only for release 1; social auth is deferred (D-012).
- XP curve is non-linear with increasing cost per level; exact curve shape to be proposed and confirmed by architecture-agent (D-013).
- User Claude API keys are encrypted using AES-256-GCM envelope encryption at the Go app layer; Supabase Vault is not required but architecture-agent may evaluate it (A-001).
- Decision log has no remaining open questions.

---

## Release 1 — Confirmed MVP Feature Slice

The eight features below constitute release 1. Nothing else is in scope.

| ID | Feature | Phase |
| --- | --- | --- |
| F-001 | Shared app shell and navigation | Phase 1 |
| F-002 | Supabase auth and user profile (email/password only) | Phase 1 |
| F-003 | User Claude API key storage (AES-256-GCM envelope encryption) | Phase 1 |
| F-004 | Skill CRUD | Phase 2 |
| F-005 | AI skill calibration (optional) with manual starting-level fallback | Phase 2 |
| F-006 | Quick XP logging | Phase 2 |
| F-008 | XP and level progression display | Phase 2 |
| F-009 | Blocker gate visibility and locked progression state | Phase 2 |

F-009b (blocker completion UI flow) is explicitly deferred. It is not part of release 1.

---

## Confirmed Deferred List

These features are not part of release 1. They are not to be estimated or built until the LifeQuest core loop is in production.

| ID | Feature | Area | Reason Deferred |
| --- | --- | --- | --- |
| F-007 | Detailed natural-language logs | LifeQuest | Post-loop depth; parsing contract undefined |
| F-009b | Blocker completion UI flow | LifeQuest | D-010; evidence/unlock ceremony adds scope without validating the mechanic |
| F-010 | Reward moments and titles | LifeQuest | Post-loop polish |
| F-011 | Meta-skills and dependencies | LifeQuest | A-003; deferred until base loop is proven |
| F-012 | AI coaching feedback | LifeQuest | Requires log history; post-loop depth |
| F-013 | Weight logging and trend chart | NutriLog | NutriLog deferred entirely |
| F-014 | Calorie and macro logging | NutriLog | NutriLog deferred entirely |
| F-015 | Barcode scanning | NutriLog | NutriLog deferred entirely |
| F-016 | Saved meals and templates | NutriLog | NutriLog deferred entirely |
| F-017 | AI recipe and meal suggestions | NutriLog | NutriLog deferred entirely |
| F-018 | Goal setting and weekly rate | NutriLog | NutriLog deferred entirely |
| F-019 | Weekly AI review | Cross-app | Requires both loops stable |
| F-020 | Cross-app XP integration | Cross-app | Requires both loops stable |
| F-021 | PWA install and notifications | Platform | D-006; mobile usability is required, install/push deferred |
| F-022 | Data export | Platform | Add after schema stabilises |

---

## Epic Breakdown

### EPIC-01 Platform Foundation (Phase 1)

Goal: a deployable, authenticated, mobile-responsive app shell with secure AI key storage. No LifeQuest features ship yet.

Features: F-001, F-002, F-003

Includes:
- Go application scaffold (router, middleware, config)
- Templ and HTMX rendering pipeline
- Tailwind setup and responsive baseline
- Supabase Auth integration — email/password only
- PostgreSQL schema: users, user_ai_keys, schema versioning/migration tooling
- AES-256-GCM envelope encryption for Claude API keys
- Shared layout, mobile navigation shell, and error/loading states

Explicit exclusions: no LifeQuest-domain tables or routes yet; NutriLog schema reserved but not populated

### EPIC-02 LifeQuest Core (Phase 2)

Goal: a user can create a skill, log activity, earn XP, see their level progress, and encounter a blocker gate. The core loop is fully exercisable end-to-end.

Features: F-004, F-005, F-006, F-008, F-009

Includes:
- Skill CRUD (create, view, edit, delete)
- Manual starting-level selection UI (required; part of F-005)
- AI-assisted skill calibration as an optional step during skill creation (F-005); requires Claude key to be present but must not block onboarding if key is absent or invalid
- XP schema: log entries, XP totals, level tracking
- Non-linear XP curve implementation — curve shape to be confirmed by architecture-agent before this feature is implemented
- Quick XP logging (minimal UI, fast path)
- XP and level progression display
- Blocker gate schema: gate definitions, threshold levels, blocker descriptions
- Blocker gate visibility: show gate, show blocker description, show that level advancement is locked; XP continues to accrue (D-007, D-010)

Explicit exclusions: no blocker completion flow (F-009b); no detailed logs (F-007); no coaching (F-012); no reward moments (F-010)

### EPIC-03 LifeQuest Progression Depth (Phase 3 — post-release-1)

Deferred. Not to be planned until EPIC-02 is in production. Includes F-007, F-009b, F-010, F-011, F-012.

### EPIC-04 NutriLog Core (Phase 4 — post-release-1)

Deferred. Not to be planned until EPIC-02 is in production. Includes F-013, F-014, F-018.

### EPIC-05 NutriLog Intelligence (Phase 5 — post-release-1)

Deferred. Includes F-015, F-016, F-017.

### EPIC-06 Cross-App Layer (Phase 6 — post-release-1)

Deferred. Includes F-019, F-020, F-021, F-022.

---

## Confirmed Phase Plan

### Phase 1: Platform Foundation

**Goal:** A deployable, authenticated, mobile-responsive shell with secure AI key handling. No LifeQuest product features ship yet.

**Scope:** F-001, F-002, F-003

**Exit Criteria** (all must be true before Phase 2 begins):

1. A user can register and log in using email/password via Supabase Auth.
2. A logged-in user can add, update, and delete their Claude API key; the key is stored AES-256-GCM encrypted and is never visible in client HTML, cookies, logs, or browser storage.
3. The app shell renders correctly on a 375 px mobile viewport and a 1280 px desktop viewport.
4. The shared layout and navigation shell are in place and render without LifeQuest content (placeholder state is acceptable).
5. The database schema has at minimum: `users`, `user_ai_keys`, and migration tooling is operational.
6. The local development environment can be stood up from a single documented command.
7. Architecture-agent has confirmed the XP curve shape (required before any XP schema work in Phase 2).

### Phase 2: LifeQuest Core

**Goal:** A user can create skills, log XP, see their level and progress, and encounter a blocker gate in a fully exercisable end-to-end loop.

**Scope:** F-004, F-005, F-006, F-008, F-009

**Exit Criteria** (all must be true before Phase 2 is considered complete):

1. A user can create a skill with a name, description, and a manually selected starting level.
2. A user who has a valid Claude API key saved can optionally trigger AI-assisted calibration during skill creation; the flow degrades gracefully if the key is absent or the Claude call fails.
3. A user can log a quick XP entry against a skill in three taps or fewer on mobile.
4. XP totals and current level update immediately after a log entry.
5. The level display reflects the non-linear XP curve confirmed in Phase 1 exit criterion 7.
6. When a user's XP reaches a blocker gate threshold, the UI clearly shows: the gate level, the blocker challenge description, and that level advancement beyond the gate is locked.
7. XP entries logged while a blocker gate is active are saved and applied; the level counter remains at the gate threshold and does not advance.
8. A user can edit and delete a skill they own.
9. All Phase 2 flows pass manual testing on a 375 px mobile viewport.
10. No blocker completion flow (F-009b) exists in the codebase or UI.

---

## Build Sequence Within Release 1

The following ordering minimises schema churn. Work streams that define shared schema must land before work streams that consume it.

```
Phase 1
  1a. Go scaffold, Templ/HTMX/Tailwind pipeline, local dev setup
  1b. Schema baseline + migration tooling (users, user_ai_keys)
  1c. Supabase Auth integration (email/password)                 [depends on 1a, 1b]
  1d. AES-256-GCM key storage implementation                     [depends on 1b, 1c]
  1e. Mobile-responsive app shell and navigation                 [depends on 1a]
  1f. Architecture-agent: propose and confirm XP curve shape     [parallel to 1a-1e]

Phase 2
  2a. Skill domain schema (skills, skill_levels, xp_logs, blocker_gates)
      [depends on Phase 1 complete + XP curve confirmed]
  2b. Skill CRUD (create, view, edit, delete) + manual starting-level selection
      [depends on 2a]
  2c. Quick XP logging                                           [depends on 2a, 2b]
  2d. XP and level progression display + non-linear curve        [depends on 2a, 2c]
  2e. AI skill calibration (optional path only)                  [depends on 2b, F-003]
  2f. Blocker gate schema + gate visibility UI                   [depends on 2a, 2d]
```

The XP curve must be confirmed by architecture-agent (step 1f) before any XP schema is written (step 2a). This is the single most important sequencing constraint.

---

## Critical Planning Dependencies

| Dependency | Blocks | Owner | Status |
| --- | --- | --- | --- |
| XP curve shape confirmed | Phase 2 schema (2a), level display (2d) | architecture-agent | Open — must be resolved before Phase 2 schema work begins |
| Architecture review of AES-256-GCM approach vs. Supabase Vault | F-003 build | architecture-agent | Open — A-001 is an assumption; arch may upgrade to confirmed decision |
| UX: shared app shell IA and mobile navigation pattern | Phase 1 (1e) | ux-agent | Open — ux-agent must define before Phase 1 shell build |
| UX: manual starting-level selection interaction model | Phase 2 (2b) | ux-agent | Open — must be defined before skill creation is built |
| UX: blocker gate visibility screen design | Phase 2 (2f) | ux-agent | Open — must be defined before blocker UI is built |
| Schema: NutriLog domain reserved (not built) | Phase 2 schema (2a) | architecture-agent | Architecture-agent must include NutriLog table namespacing or schema partitioning notes even if not built |

---

## Agent Team Kickoff Plan

### Current Step

The planning-agent has completed the first pass. The next step is concurrent architecture-agent and ux-agent work (Steps 3 and 4 below) before returning to planning-agent for the delivery breakdown (Step 5).

### Sequence

| Step | Workstream | Primary Owner | Output | Depends On |
| --- | --- | --- | --- | --- |
| 1 | Product clarification | requirements-agent | Resolved answers for blocker behavior, MVP boundary, app shell, mobile, auth, XP curve, key encryption | None — COMPLETE |
| 2 | MVP definition and phase plan | planning-agent | Confirmed v1 feature slice, deferred list, phase plan with exit criteria, delivery build sequence | Step 1 — COMPLETE (this document) |
| 3 | Domain and schema design | architecture-agent | Versioned domain model; XP curve proposal; encryption approach confirmed; NutriLog schema reserved | Steps 1–2 |
| 4 | UX and IA definition | ux-agent | Shared navigation, primary screens, mobile-first flow specs for skill creation, quick logging, progress display, blocker gate state | Steps 1–2 |
| 5 | Delivery breakdown | planning-agent | Epic-to-ticket breakdown for Phase 1 and Phase 2 with estimates and acceptance criteria | Steps 3–4 |
| 6 | Bootstrap implementation | delivery-agent | Initial app scaffold aligned to confirmed schema and IA | Step 5 |

### First Pass Deliverables (Status)

- Confirmed MVP statement: DONE
- Resolved open product questions: DONE (decision log has no open questions)
- Initial schema draft: OPEN — assigned to architecture-agent (Step 3)
- App shell and navigation direction: OPEN — assigned to ux-agent (Step 4)
- First delivery backlog (Phase 1 + Phase 2 tickets): OPEN — planned for Step 5 after Steps 3 and 4 complete
- Clear deferred list: DONE (see Confirmed Deferred List above)

---

## Risks

- **Schema churn**: Skills, XP logs, blocker gates, and (later) NutriLog data are interrelated. Architecture-agent must design the skill-domain schema before Phase 2 implementation begins. Any schema change after coding starts is expensive.
- **XP curve dependency**: The non-linear XP curve (D-013) must be confirmed before any XP schema or display work begins. If this is delayed, Phase 2 start is delayed.
- **Cross-app ambition creep**: NutriLog and cross-app features must remain genuinely deferred. Any feature addition to release 1 requires a new decision-log entry.
- **AI calibration graceful degradation**: F-005 has a hard requirement that onboarding never blocks on a missing or invalid Claude key. This constraint must be tested explicitly.
- **Mobile UX drift**: If desktop templates are built first without mobile validation, correcting layout debt late is expensive. All Phase 2 features require mobile sign-off.

---

## Suggested Agent Assignments

### architecture-agent (next step — Step 3)

Primary tasks:
- Propose the XP curve shape (quadratic, polynomial, or custom step function); confirm as a decision before Phase 2 schema work begins. This is the single highest-priority output.
- Design the full domain model covering: users, skills, skill_levels, xp_logs, blocker_gates (and reserved NutriLog table namespace).
- Evaluate AES-256-GCM approach (A-001) and either confirm it or propose an alternative that satisfies D-009. Produce a confirmed decision to replace A-001.
- Define integration contracts for Supabase Auth and Claude API (request/response shapes, error handling, retry strategy).
- Document the schema versioning and migration tooling approach.
- Note where NutriLog tables will live without building them.

### ux-agent (next step — Step 4)

Primary tasks:
- Define the shared shell navigation model (global nav, product-area switching, mobile bottom nav vs. hamburger vs. tab bar).
- Establish mobile-first layout expectations for all Phase 2 screens.
- Outline the core journeys: skill creation (manual path + AI-assisted path), quick logging, progress display, blocker gate state.
- Define the manual starting-level selection interaction model (required for F-005 fallback).
- Define what the blocker gate visibility screen looks like and what information it surfaces.

### planning-agent (Step 5 — after Steps 3 and 4)

- Break Phase 1 and Phase 2 work into specific implementation tasks with acceptance criteria.
- Verify that all open dependencies in the dependency table above are resolved before approving Phase 2 start.
- Update feature-tracker.md ownership to delivery-agent or specific build owners once the backlog is ready.
