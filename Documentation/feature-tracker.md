# Feature Tracker

Last updated: 2026-03-16 (Phase 1 implementation complete and verified running: F-001, F-002, F-003 marked done; prior: review-agent fix pass: TASK-116 added to F-002 entry and readiness table; TASK-215 added to F-001 entry and readiness table; TASK-206 corrected to TASK-212 for F-005; TASK-205 corrected to TASK-211 for F-008; prior update by planning-agent second pass: all release-1 features advanced to ready-for-build; task-slice mapping added for each feature; review-agent unblocked; prior update by ux-agent: F-001, F-005, F-009 advanced to ready-for-build; UX dependency on all three cleared; D-017 through D-022 logged; prior update by architecture-agent: F-003 and F-008 unblocked; arch dependencies on D-013/A-001 resolved via D-014/D-015; new technical dependencies and risk notes added; NutriLog schema boundary reserved)

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
| F-001 | Shared app shell and navigation | Platform | 1 | done | delivery-agent | None remaining | None | Unified shell confirmed (D-005). IA: four sections (Dashboard, LifeQuest, NutriLog placeholder, Account). Mobile: bottom tab bar (D-017). Desktop: left sidebar. Implemented by: TASK-101, TASK-102, TASK-103, TASK-113, TASK-114, TASK-215. See ux-spec.md Sections 1 and 2. TASK-215 (real dashboard, Phase 2) replaces the Phase 1 placeholder dashboard. |
| F-002 | Supabase auth and user profile | Platform | 1 | done | delivery-agent | None remaining | None | Email/password auth only (D-012). Supabase Auth trigger is a manual setup step (not a migration). Implemented by: TASK-106, TASK-108, TASK-109, TASK-110, TASK-116. Auth trigger SQL documented in TASK-106 runbook. TASK-116 implements password change flow (GET/POST /account/password). ES256 (ECDSA) JWT support added post-implementation for newer Supabase projects. |
| F-003 | User Claude API key storage | Platform | 1 | done | delivery-agent | None remaining | None. Production secrets-manager selection is the only pre-deploy item; not a build blocker. | AES-256-GCM envelope encryption confirmed (D-015). Per-user DEK. Key never in client. Implemented by: TASK-107, TASK-111, TASK-112. See architecture.md section 2. |
| F-004 | Skill CRUD | LifeQuest | 2 | ready-for-build | delivery-agent | Phase 1 complete; TASK-201 (schema) | None | Core MVP feature. Implemented by: TASK-201, TASK-202, TASK-203. Skill soft-delete preserves XP history. |
| F-005 | AI skill calibration (optional) with manual starting-level fallback | LifeQuest | 2 | ready-for-build | delivery-agent | F-003 (Claude key access); F-004 (skill creation flow) | None | D-011: optional path, never blocking. Manual selection always available. Starting level max 99 (D-018). Three-step creation flow. Implemented by: TASK-204 (manual path), TASK-212 (AI path). AI degrades on 401/429/other with specific messages per ux-spec.md Section 3.4. |
| F-006 | Quick XP logging | LifeQuest | 2 | ready-for-build | delivery-agent | F-004; TASK-201 (schema) | None | Three taps or fewer primary path (D-019): `+ Log` icon → chip → submit. Bottom sheet pattern. HTMX double-submission guard + server-side 1-second dedup. Implemented by: TASK-209, TASK-210. |
| F-008 | XP and level progression display | LifeQuest | 2 | ready-for-build | delivery-agent | TASK-201 (schema); F-006 (log entries) | None | D-014: quadratic curve with tier multipliers. Six tiers: Novice(1-9), Apprentice(10-19), Journeyman(20-29), Expert(30-59), Veteran(60-99), Master(100-200). Tier color system (D-020). Tier transition modal on every boundary crossing (D-022). EffectiveLevel in Go handler not template (R-004). Implemented by: TASK-115, TASK-211. |
| F-009 | Blocker gate visibility and locked progression state | LifeQuest | 2 | ready-for-build | delivery-agent | F-008; TASK-201 (schema) | None | D-010: gate visibility and locked state only. Gate section replaces XP bar (D-021). First-hit notification uses first_notified_at IS NULL check (schema column required). XP accrues behind gate (D-007). No completion action in release 1. Implemented by: TASK-213. |

---

## Deferred Features

| ID | Feature | Area | Status | Owner | Dependencies | Open Questions | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| F-007 | Detailed natural-language logs | LifeQuest | deferred | unassigned | Claude integration; log parsing contract | How much parsing should be automatic? | Post-release-1. Keep out of first implementation pass. log_note column exists in xp_events and is nullable; no schema change needed when this ships. |
| F-009b | Blocker completion UI flow | LifeQuest | deferred | unassigned | F-009; progression model | Evidence submission format; unlock ceremony design | Deferred from release 1 per D-010. Schema hook (is_cleared, cleared_at) already present in blocker_gates. No code for this exists in release 1. |
| F-010 | Reward moments and titles | LifeQuest | deferred | unassigned | Blocker system (F-009b) | Exact reward surface not defined | Post-release-1 polish. Valuable but not core MVP. |
| F-011 | Meta-skills and dependencies | LifeQuest | deferred | unassigned | Child skill progression model | Should this exist before or after NutriLog? | A-003: treat as post-MVP. Revisit after core loop is in production. |
| F-012 | AI coaching feedback | LifeQuest | deferred | unassigned | Log history; Claude integration | Trigger timing not finalized | Post-release-1 depth. Requires log history to be meaningful. |
| F-013 | Weight logging and trend chart | NutriLog | deferred | unassigned | Platform foundation; NutriLog schema | None | NutriLog fully deferred. Schema namespace reserved (nl_ prefix). |
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

### Planning-agent second pass complete (2026-03-15)

Planning-agent has delivered (see planning-handoff.md Implementation Backlog):
- 15 Phase 1 task slices (TASK-101 through TASK-115) with full acceptance criteria
- 14 Phase 2 task slices (TASK-201 through TASK-214, with gap at 205-208 from renaming) with full acceptance criteria
- All acceptance criteria from architecture.md and ux-spec.md carried forward explicitly
- Task dependency graph confirmed; Phase 1 starts at TASK-101 with no blockers
- feature-tracker.md: all release-1 features are now ready-for-build

### Architecture-agent pass complete (2026-03-15)

Architecture-agent has delivered:
- Domain model for all release-1 entities (users, user_ai_keys, skills, xp_events, blocker_gates) — see architecture.md
- XP curve confirmed as D-014 — Phase 2 schema work (step 2a) is unblocked
- A-001 upgraded to D-015 (confirmed decision) — F-003 build is unblocked pending Phase 1 completion
- NutriLog schema namespace reserved (nl_ prefix); FK anchor pattern defined
- Integration contracts for Supabase Auth, PostgreSQL, Claude API, and food data provider
- Migration tooling approach confirmed (golang-migrate)
- Five implementation risks identified (R-001 through R-005 in decision-log.md)

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

### Release 1 feature readiness: all features are ready-for-build

| ID | Feature | Status | Delivery Task(s) |
| --- | --- | --- | --- |
| F-001 | Shared app shell and navigation | **done** | TASK-101, 102, 103, 113, 114, 215 |
| F-002 | Supabase auth and user profile | **done** | TASK-106, 108, 109, 110, 116 |
| F-003 | User Claude API key storage | **done** | TASK-107, 111, 112 |
| F-004 | Skill CRUD | ready-for-build | TASK-201, 202, 203 |
| F-005 | AI skill calibration (manual + AI paths) | ready-for-build | TASK-204, TASK-212 |
| F-006 | Quick XP logging | ready-for-build | TASK-209, TASK-210 |
| F-008 | XP and level progression display | ready-for-build | TASK-115, TASK-211 |
| F-009 | Blocker gate visibility and locked state | ready-for-build | TASK-213 |

No release-1 feature is in `needs-clarification`. No release-1 feature is in `ready-for-planning`. All open product and architecture questions are resolved.

### Key constraints carried into backlog (mandatory in every implementation)

| Constraint | Source | Enforced in Task |
| --- | --- | --- |
| Primary quick-log path: 3 taps or fewer (+ Log → chip → submit) | D-019, ux-spec 4.1 | TASK-210 AC, TASK-214 EC-3 |
| starting_level <= 99 server-side validation (Master excluded) | D-018, ux-spec 3.2 | TASK-203 AC, TASK-204 AC |
| Tier color system applied consistently (D-020) to bar, badge, accent | D-020, ux-spec 5.3 | TASK-211 AC |
| Tier transition modal on every tier-boundary crossing (not just first) | D-022, ux-spec 5.4 | TASK-211 AC |
| Gate section replaces XP bar (D-021); same vertical position, above fold | D-021, ux-spec 6.2 | TASK-213 AC |
| first_notified_at IS NULL check for first-hit gate modal | architecture.md, ux-spec 6.3 | TASK-213 AC |
| XP write = xp_events insert + skills.current_xp + skills.current_level in one transaction | R-003, architecture.md | TASK-209 AC |
| HTMX double-submission guard: hx-disabled-elt + 1-second server-side dedup | architecture.md | TASK-210 AC |
| EffectiveLevel computed in Go handler, not template | R-004, architecture.md | TASK-202 AC, TASK-211 AC, TASK-213 AC |
| Email/password auth only; no OAuth UI | D-012 | TASK-110 AC |
| Plaintext Claude key never in HTML, cookies, logs, or DB | D-015, D-009 | TASK-112 AC |
| Supabase Auth trigger created manually (not in migration files) | architecture.md 4.1.1 | TASK-106 runbook |
| AI calibration degrades on 401/429/other with specific error messages | F-005, ux-spec 3.4 | TASK-212 AC |
| MaxLevel = 200; no infinite loop in LevelForXP | R-005, architecture.md | TASK-115 AC |

### Technical dependencies confirmed

| Dependency | Purpose | Notes |
|---|---|---|
| `pgx/v5` | Primary PostgreSQL driver (Go) | Required; do not use database/sql |
| `golang-migrate/migrate` | Schema migration management | Plain SQL up/down files; runs at app startup |
| Supabase JWKS endpoint | JWT validation in Go middleware | Must be cached with 1h TTL; see R-001 |
| Go stdlib `crypto/aes`, `crypto/cipher` | AES-256-GCM encryption | No external dependency; see R-002 for nonce discipline |
| `github.com/a-h/templ` | HTML templating | Required; no other template engine |
| HTMX (CDN or vendored) | Client-side interaction | No JavaScript frameworks |
| Tailwind CSS | Styling | Tier color CSS variables defined in TASK-103 |

### Nothing in release 1 is in `needs-clarification`

All product questions for release-1 features are resolved. The decision log has no open questions. The delivery-agent can begin at TASK-101 immediately.
