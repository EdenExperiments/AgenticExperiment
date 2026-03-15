# Feature Tracker

Last updated: 2026-03-15 (updated by architecture-agent: F-003 and F-008 unblocked; arch dependencies on D-013/A-001 resolved via D-014/D-015; new technical dependencies and risk notes added; NutriLog schema boundary reserved)

Status values:

- `needs-clarification` — has unresolved questions that block planning
- `ready-for-planning` — all product questions resolved; awaiting architecture/UX output before implementation tasks can be written
- `ready-for-build` — architecture and UX outputs received; implementation tasks can be written and estimated
- `in-progress` — actively being built
- `done` — shipped
- `deferred` — not in release 1; do not plan or estimate

---

## Release 1 Features

| ID | Feature | Area | Phase | Status | Owner | Dependencies | Open Questions | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| F-001 | Shared app shell and navigation | Platform | 1 | ready-for-planning | ux-agent (define), delivery-agent (build) | IA and mobile navigation model from ux-agent; F-002 for auth state | None | Unified shell confirmed for release 1 (D-005). Shell build is blocked on ux-agent completing the navigation IA. |
| F-002 | Supabase auth and user profile | Platform | 1 | ready-for-planning | architecture-agent | Supabase project setup; schema baseline (users table) | None | Email/password auth only (D-012). Social auth (OAuth) deferred. Schema baseline must exist before auth integration. |
| F-003 | User Claude API key storage | Platform | 1 | ready-for-planning | delivery-agent (build) | Schema baseline (user_ai_keys table); master key in secrets manager (D-015); Phase 1 complete | None — A-001 upgraded to D-015 (confirmed decision). Production secrets-manager selection is the only remaining pre-deploy open item (not a build blocker for Phase 1). | AES-256-GCM envelope encryption at Go app layer confirmed by D-015. Per-user DEK. master_key from secrets manager in prod, env var in dev. Validate at save time. Key never in client. Rotation via DEK re-encryption. Schema: `user_ai_keys` table with `encrypted_dek`, `encrypted_key`, `key_hint`. See architecture.md section 2. |
| F-004 | Skill CRUD | LifeQuest | 2 | ready-for-planning | architecture-agent (schema), delivery-agent (build) | Phase 1 complete; skill domain schema from architecture-agent (2a) | None | Core MVP feature. Blocked on skill domain schema from architecture-agent. |
| F-005 | AI skill calibration (optional) with manual starting-level fallback | LifeQuest | 2 | ready-for-planning | ux-agent (manual selection UX), delivery-agent (build) | F-003 (Claude key access); F-004 (skill creation flow); manual starting-level selection UX from ux-agent | None | D-011: optional path, never blocking. Manual selection is required and must ship alongside AI path. AI path must degrade gracefully if key absent or Claude call fails. |
| F-006 | Quick XP logging | LifeQuest | 2 | ready-for-planning | delivery-agent | F-004 (skill must exist); XP schema from architecture-agent (2a); skill domain schema | None | Lowest-friction MVP loop. Three taps or fewer on mobile is the acceptance bar. |
| F-008 | XP and level progression display | LifeQuest | 2 | ready-for-planning | delivery-agent (build) | XP schema (2a — Phase 2 start); F-006 (log entries to display) | None — XP curve confirmed as D-014. | D-014: quadratic curve with tier multipliers confirmed. Tier names: Novice (1–9), Apprentice (10–19), Journeyman (20–29), Expert (30–49), Master (50+). Level computation is a pure Go function in `xpcurve` package (see architecture.md section 2). XP thresholds: L1=100, L5=2500, L10=12000, L20=60000, L30=162000, L50=550000. Schema work (2a) is unblocked. |
| F-009 | Blocker gate visibility and locked progression state | LifeQuest | 2 | ready-for-planning | ux-agent (gate visibility screen design), delivery-agent (build) | F-008 (XP and level display); blocker gate schema from architecture-agent; gate visibility screen design from ux-agent | None | D-010: release 1 scope is gate visibility and locked state only. Show: gate level, blocker description, that advancement is locked. XP accrues (D-007). No completion flow in release 1. |

---

## Deferred Features

| ID | Feature | Area | Status | Owner | Dependencies | Open Questions | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| F-007 | Detailed natural-language logs | LifeQuest | deferred | unassigned | Claude integration; log parsing contract | How much parsing should be automatic? | Post-release-1. Keep out of first implementation pass. |
| F-009b | Blocker completion UI flow | LifeQuest | deferred | unassigned | F-009; progression model | Evidence submission format; unlock ceremony design | Deferred from release 1 per D-010. Full completion flow (evidence submission, confirmation, unlock animation) ships in a later release. |
| F-010 | Reward moments and titles | LifeQuest | deferred | unassigned | Blocker system (F-009b) | Exact reward surface not defined | Post-release-1 polish. Valuable but not core MVP. |
| F-011 | Meta-skills and dependencies | LifeQuest | deferred | unassigned | Child skill progression model | Should this exist before or after NutriLog? | A-003: treat as post-MVP. Revisit after core loop is in production. |
| F-012 | AI coaching feedback | LifeQuest | deferred | unassigned | Log history; Claude integration | Trigger timing not finalized | Post-release-1 depth. Requires log history to be meaningful. |
| F-013 | Weight logging and trend chart | NutriLog | deferred | unassigned | Platform foundation; NutriLog schema | None | NutriLog fully deferred. Architecture should reserve schema space. |
| F-014 | Calorie and macro logging | NutriLog | deferred | unassigned | NutriLog schema; food data source | Food source fallback beyond Open Food Facts? | NutriLog fully deferred. |
| F-015 | Barcode scanning | NutriLog | deferred | unassigned | Mobile browser camera flow; F-014 | Needed in MVP or not? | NutriLog fully deferred. Later mobile enhancement. |
| F-016 | Saved meals and templates | NutriLog | deferred | unassigned | F-014 | None | NutriLog fully deferred. Quality-of-life feature. |
| F-017 | AI recipe and meal suggestions | NutriLog | deferred | unassigned | Claude integration; calorie context; F-014 | Response format contract not defined | NutriLog fully deferred. Post-MVP AI slice. |
| F-018 | Goal setting and weekly rate | NutriLog | deferred | unassigned | NutriLog weight model | None | NutriLog fully deferred. |
| F-019 | Weekly AI review | Cross-app | deferred | unassigned | Both LifeQuest and NutriLog loops stable | MVP or post-MVP? | Keep after both loops are stable and in production. |
| F-020 | Cross-app XP integration | Cross-app | deferred | unassigned | LifeQuest and NutriLog event models | Which health events should award XP? | Post-MVP integration. |
| F-021 | PWA install and push notifications | Platform | deferred | ux-agent | Shared shell; browser support | None | D-006: mobile usability is required in release 1, but PWA install and push notifications are deferred. |
| F-022 | Data export | Platform | deferred | unassigned | Final schema | Export format priority unclear | Add after schema stabilises. |

---

## Readiness Summary

### Architecture-agent pass complete (2026-03-15)

Architecture-agent has delivered:
- Domain model for all release-1 entities (users, user_ai_keys, skills, xp_events, blocker_gates) — see architecture.md
- XP curve confirmed as D-014 — Phase 2 schema work (step 2a) is unblocked
- A-001 upgraded to D-015 (confirmed decision) — F-003 build is unblocked pending Phase 1 completion
- NutriLog schema namespace reserved (nl_ prefix); FK anchor pattern defined
- Integration contracts for Supabase Auth, PostgreSQL, Claude API, and food data provider
- Migration tooling approach confirmed (golang-migrate)
- Four implementation risks identified (R-001 through R-004 in decision-log.md)

### Release 1 features unblocked for Phase 1 build (after ux-agent completes Step 4)

- F-002: Supabase auth — schema and integration contract defined in architecture.md
- F-003: Key storage — D-015 confirmed; schema defined; ready for delivery-agent after Phase 1 scaffold
- F-001: App shell — still blocked on ux-agent navigation IA (Step 4)

### Release 1 features unblocked for Phase 2 build (after Phase 1 complete)

- F-004: Skill domain schema defined in architecture.md — ready for delivery-agent in Phase 2
- F-006: XP schema defined; unblocked after Phase 1
- F-008: XP curve confirmed (D-014); schema defined — unblocked after Phase 1
- F-009: Blocker gate schema defined — blocked on ux-agent gate visibility screen design (Step 4)

### Still blocked on ux-agent output (Step 4)

- F-001: Navigation IA and mobile pattern
- F-005: Manual starting-level selection UX design (tier names and levels 1–9 are Novice — available context)
- F-009: Blocker gate visibility screen design

### Technical dependencies added by architecture-agent

| Dependency | Purpose | Notes |
|---|---|---|
| `pgx/v5` | Primary PostgreSQL driver (Go) | Replace `database/sql` if not already chosen |
| `golang-migrate/migrate` | Schema migration management | Plain SQL up/down files; runs at app startup |
| Supabase JWKS endpoint | JWT validation in Go middleware | Must be cached with 1h TTL; see R-001 |
| Go stdlib `crypto/aes`, `crypto/cipher` | AES-256-GCM encryption | No external dependency; see R-002 for nonce discipline |

### Nothing in release 1 is in `needs-clarification`

All product questions for release-1 features are resolved. The decision log has no open questions.
