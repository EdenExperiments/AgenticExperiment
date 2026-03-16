# Feature Tracker

Last updated: 2026-03-15 (updated by ux-agent: F-001, F-005, F-009 advanced to ready-for-build; UX dependency on all three cleared; D-017 through D-022 logged; prior update by architecture-agent: F-003 and F-008 unblocked; arch dependencies on D-013/A-001 resolved via D-014/D-015; new technical dependencies and risk notes added; NutriLog schema boundary reserved)

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
| F-001 | Shared app shell and navigation | Platform | 1 | ready-for-build | delivery-agent (build) | F-002 for auth state | None | Unified shell confirmed for release 1 (D-005). UX dependency cleared: IA defined in ux-spec.md. Navigation: bottom tab bar on mobile (D-017), left sidebar on desktop. Four sections: Dashboard, LifeQuest, NutriLog (Coming Soon placeholder), Account. See ux-spec.md Sections 1 and 2. |
| F-002 | Supabase auth and user profile | Platform | 1 | ready-for-planning | architecture-agent | Supabase project setup; schema baseline (users table) | None | Email/password auth only (D-012). Social auth (OAuth) deferred. Schema baseline must exist before auth integration. |
| F-003 | User Claude API key storage | Platform | 1 | ready-for-planning | delivery-agent (build) | Schema baseline (user_ai_keys table); master key in secrets manager (D-015); Phase 1 complete | None — A-001 upgraded to D-015 (confirmed decision). Production secrets-manager selection is the only remaining pre-deploy open item (not a build blocker for Phase 1). | AES-256-GCM envelope encryption at Go app layer confirmed by D-015. Per-user DEK. master_key from secrets manager in prod, env var in dev. Validate at save time. Key never in client. Rotation via DEK re-encryption. Schema: `user_ai_keys` table with `encrypted_dek`, `encrypted_key`, `key_hint`. See architecture.md section 2. |
| F-004 | Skill CRUD | LifeQuest | 2 | ready-for-planning | architecture-agent (schema), delivery-agent (build) | Phase 1 complete; skill domain schema from architecture-agent (2a) | None | Core MVP feature. Blocked on skill domain schema from architecture-agent. |
| F-005 | AI skill calibration (optional) with manual starting-level fallback | LifeQuest | 2 | ready-for-build | delivery-agent (build) | F-003 (Claude key access); F-004 (skill creation flow) | None | D-011: optional path, never blocking. Manual selection is required and must ship alongside AI path. UX dependency cleared: three-step creation flow defined in ux-spec.md Section 3. Level picker is a scrollable list (not a dropdown). Starting level max is 99 (D-018: Master tier excluded from picker). AI path degrades to manual if key absent or call fails. See ux-spec.md Section 3. |
| F-006 | Quick XP logging | LifeQuest | 2 | ready-for-planning | delivery-agent | F-004 (skill must exist); XP schema from architecture-agent (2a); skill domain schema | None | Lowest-friction MVP loop. Three taps or fewer on mobile is the acceptance bar. |
| F-008 | XP and level progression display | LifeQuest | 2 | ready-for-build | delivery-agent (build) | XP schema (2a — Phase 2 start); F-006 (log entries to display) | None — XP curve confirmed as D-014; tier colors confirmed as D-020; tier transition modal confirmed as D-022. | D-014: quadratic curve with tier multipliers confirmed. Tier names: Novice (1–9), Apprentice (10–19), Journeyman (20–29), Expert (30–59), Veteran (60–99), Master (100–200). Level computation is a pure Go function in `xpcurve` package (see architecture.md section 2). D-020: tier color system binding — see ux-spec.md Section 5.3. D-022: tier transitions use full-screen modal overlay (not toast) with XP jump explainer — see ux-spec.md Section 5.4. Master tier: gold palette, aspirational copy, enhanced modal at level 100. Schema work (2a) is unblocked. |
| F-009 | Blocker gate visibility and locked progression state | LifeQuest | 2 | ready-for-build | delivery-agent (build) | F-008 (XP and level display); blocker gate schema from architecture-agent | None | D-010: release 1 scope is gate visibility and locked state only. UX dependency cleared: gate section design defined in ux-spec.md Section 6. Gate section replaces XP bar when active (D-021). Shows: gate title, description, gate_level, current_xp (accruing), display level capped at gate, raw XP-computed level, explanatory text. First-hit notification modal defined. No completion action in release 1. |

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

### UX-agent pass complete (2026-03-15)

UX-agent has delivered (see ux-spec.md):
- Information architecture for the unified shell: four sections, route structure, NutriLog placeholder slot
- Mobile navigation model: bottom tab bar (D-017), left sidebar on desktop
- Skill creation flow: three-step manual path + AI-assisted path with degradation; level picker interaction (scrollable list); Master excluded from starting-level picker (D-018)
- Quick XP log interaction: bottom sheet/modal, exact three-tap sequence defined (D-019); preset XP amounts; custom amount chip
- Progress display: skill detail screen layout, tier name display rules, XP progress bar, tier color system (D-020)
- Tier boundary affordances: upcoming-tier preview callout, tier transition modal (D-022) with XP jump explainer, Master aspirational treatment
- Blocker gate visibility screen: gate section replaces XP bar (D-021), full field mapping to schema, first-hit gate notification modal
- Account screen layout and API key entry flow
- Mobile minimum requirements for all release-1 journeys

### Release 1 features unblocked for Phase 1 build

- F-001: App shell — UX dependency cleared; IA and navigation defined in ux-spec.md (D-017)
- F-002: Supabase auth — schema and integration contract defined in architecture.md
- F-003: Key storage — D-015 confirmed; schema defined; ready for delivery-agent after Phase 1 scaffold

### Release 1 features unblocked for Phase 2 build (after Phase 1 complete)

- F-004: Skill domain schema defined in architecture.md — ready for delivery-agent in Phase 2
- F-005: Skill creation UX defined in ux-spec.md Section 3 — UX dependency cleared
- F-006: XP schema defined; quick-log interaction defined (D-019); unblocked after Phase 1
- F-008: XP curve confirmed (D-014); tier colors (D-020) and tier transition modal (D-022) defined; unblocked after Phase 1
- F-009: Blocker gate schema defined; gate visibility screen defined in ux-spec.md Section 6 (D-021) — UX dependency cleared

### Nothing in release 1 is blocked on UX output

All three previously-blocked items are cleared. The dependency table in planning-handoff.md should be updated by the planning-agent to reflect this.

### Technical dependencies added by architecture-agent

| Dependency | Purpose | Notes |
|---|---|---|
| `pgx/v5` | Primary PostgreSQL driver (Go) | Replace `database/sql` if not already chosen |
| `golang-migrate/migrate` | Schema migration management | Plain SQL up/down files; runs at app startup |
| Supabase JWKS endpoint | JWT validation in Go middleware | Must be cached with 1h TTL; see R-001 |
| Go stdlib `crypto/aes`, `crypto/cipher` | AES-256-GCM encryption | No external dependency; see R-002 for nonce discipline |

### Nothing in release 1 is in `needs-clarification`

All product questions for release-1 features are resolved. The decision log has no open questions.
