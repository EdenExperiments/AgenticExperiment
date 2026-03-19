# Planning Handoff

> **Status (2026-03-19): Phase 2 COMPLETE.** All release-1 features shipped: F-001–F-009 done, 78 tests green. Additional polish delivered: real dashboard (StatCard, ActivityFeedItem, `/api/v1/activity` endpoint), skill interaction polish (useMotionPreference hook, XPGainAnimation, sort/filter, date-grouped XP history). Next: NutriLog, Mental Health, or further LifeQuest depth (blocker gate completion, AI coaching). Use the orchestrator with `plan-feature` for any new feature.

Last updated: 2026-03-18 (Phase 1 completion banner added). Prior: 2026-03-16 (review-agent quality pass: 12 issues fixed — Phase 1 exit criterion 8 added (Supabase auth trigger verified); TASK-106 auth trigger AC added; TASK-116 password change handlers added; TASK-113 #modal-container added to shell and AC; TASK-210 TASK-203 dependency added; TASK-209 gate+tier edge case AC added; TASK-210 custom XP validation ACs added; TASK-213 tap-outside AC added; TASK-211 TASK-203 dependency added; TASK-213 TASK-203+TASK-210 dependencies added; TASK-212 TASK-202 dependency added; TASK-210 /skills/{id}/log route clarification added; TASK-215 real dashboard added; dependency graph corrected for TASK-209; prior update: planning-agent second pass: full Phase 1 and Phase 2 implementation backlog added; all task slices defined with dependencies and acceptance criteria; feature-tracker.md updated to in-progress-ready state; review-agent unblocked; prior update by ux-agent: UX step 4 complete; F-001, F-005, F-009 UX dependencies cleared; D-017 through D-022 added; ux-spec.md created; prior update by planning-agent v1: delivery slice confirmed, phase exit criteria made explicit, epic-to-feature mapping finalized, deferred list locked, schema-churn ordering applied)

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
- XP curve is non-linear with increasing cost per level; confirmed as D-014 (quadratic with tier multipliers, 10 tiers + Legend, gates at every tier boundary 9–99).
- User Claude API keys are encrypted using AES-256-GCM envelope encryption at the Go app layer; confirmed as D-015.
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
- Non-linear XP curve implementation (D-014: quadratic with tier multipliers)
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
7. Architecture-agent has confirmed the XP curve shape (DONE: D-014 confirmed; `xpcurve` package spec is complete).
8. A new Supabase user registration results in a corresponding row in public.users within 1 second (the auth trigger has been created in Supabase and verified to fire).

### Phase 2: LifeQuest Core

**Goal:** A user can create skills, log XP, see their level and progress, and encounter a blocker gate in a fully exercisable end-to-end loop.

**Scope:** F-004, F-005, F-006, F-008, F-009

**Exit Criteria** (all must be true before Phase 2 is considered complete):

1. A user can create a skill with a name, description, and a manually selected starting level.
2. A user who has a valid Claude API key saved can optionally trigger AI-assisted calibration during skill creation; the flow degrades gracefully if the key is absent or the Claude call fails.
3. A user can log a quick XP entry against a skill in three taps or fewer on mobile (primary path: `+ Log` icon → chip select → submit).
4. XP totals and current level update immediately after a log entry.
5. The level display reflects the non-linear XP curve (D-014).
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
  1f. xpcurve package + unit tests                               [parallel to 1a-1e; D-014 confirmed]

Phase 2
  2a. Skill domain schema (skills, xp_events, blocker_gates)
      [depends on Phase 1 complete + D-014 confirmed]
      Note: there is no skill_levels table — levels are computed at runtime by
      the Go LevelForXP function. The authoritative table name is xp_events.
  2b. Skill CRUD (create, view, edit, delete) + manual starting-level selection
      [depends on 2a]
  2c. Quick XP logging                                           [depends on 2a, 2b]
  2d. XP and level progression display + non-linear curve        [depends on 2a, 2c]
  2e. AI skill calibration (optional path only)                  [depends on 2b, F-003]
  2f. Blocker gate schema + gate visibility UI                   [depends on 2a, 2d]
```

The XP curve is confirmed (D-014). The `xpcurve` package must be built in Phase 1 (step 1f) so it is available for Phase 2 schema and display work.

---

## Critical Planning Dependencies

| Dependency | Blocks | Owner | Status |
| --- | --- | --- | --- |
| XP curve shape confirmed | Phase 2 schema (2a), level display (2d) | architecture-agent | **RESOLVED** — D-014 confirmed |
| Architecture review of AES-256-GCM approach | F-003 build | architecture-agent | **RESOLVED** — D-015 confirmed |
| UX: shared app shell IA and mobile navigation pattern | Phase 1 (1e) | ux-agent | **RESOLVED** — see ux-spec.md Sections 1 and 2; D-017 confirmed |
| UX: manual starting-level selection interaction model | Phase 2 (2b) | ux-agent | **RESOLVED** — see ux-spec.md Section 3; D-018, D-019 confirmed |
| UX: blocker gate visibility screen design | Phase 2 (2f) | ux-agent | **RESOLVED** — see ux-spec.md Section 6; D-021 confirmed |
| Schema: NutriLog domain reserved (not built) | Phase 2 schema (2a) | architecture-agent | **RESOLVED** — nl_ prefix reserved; FK anchor pattern defined |

All planning dependencies are resolved. The delivery-agent is unblocked for Phase 1.

---

## Agent Team Kickoff Plan

### Current Step

Step 5 is complete. The full Phase 1 and Phase 2 implementation backlog is defined below. The review-agent is unblocked to begin Step 6: verify the backlog, check all acceptance criteria, and confirm readiness for the delivery-agent.

### Sequence

| Step | Workstream | Primary Owner | Output | Depends On |
| --- | --- | --- | --- | --- |
| 1 | Product clarification | requirements-agent | Resolved answers for blocker behavior, MVP boundary, app shell, mobile, auth, XP curve, key encryption | None — COMPLETE |
| 2 | MVP definition and phase plan | planning-agent | Confirmed v1 feature slice, deferred list, phase plan with exit criteria, delivery build sequence | Step 1 — COMPLETE (this document) |
| 3 | Domain and schema design | architecture-agent | Versioned domain model; XP curve proposal; encryption approach confirmed; NutriLog schema reserved | Steps 1–2 — COMPLETE (architecture.md) |
| 4 | UX and IA definition | ux-agent | Shared navigation, primary screens, mobile-first flow specs for skill creation, quick logging, progress display, blocker gate state | Steps 1–2 — COMPLETE (ux-spec.md) |
| 5 | Delivery breakdown | planning-agent | Epic-to-ticket breakdown for Phase 1 and Phase 2 with estimates and acceptance criteria | Steps 3–4 — COMPLETE (this document, backlog below) |
| 6 | Bootstrap implementation | delivery-agent | Initial app scaffold aligned to confirmed schema and IA | Step 5 — UNBLOCKED |

### First Pass Deliverables (Status)

- Confirmed MVP statement: DONE
- Resolved open product questions: DONE (decision log has no open questions)
- Initial schema draft: DONE — architecture.md (Step 3 complete)
- App shell and navigation direction: DONE — ux-spec.md (Step 4 complete)
- First delivery backlog (Phase 1 + Phase 2 tickets): DONE — all tasks shipped, 78 tests green
- Clear deferred list: DONE (see Confirmed Deferred List above)

---

> **Implementation Backlog (TASK-101 through TASK-215) removed 2026-03-19** — all tasks complete and merged. The detailed task specs were only needed during implementation. The exit criteria above are the durable reference for what was built and why.
