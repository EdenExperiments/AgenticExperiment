# Planning Handoff

Last updated: 2026-03-16 (review-agent quality pass: 12 issues fixed — Phase 1 exit criterion 8 added (Supabase auth trigger verified); TASK-106 auth trigger AC added; TASK-116 password change handlers added; TASK-113 #modal-container added to shell and AC; TASK-210 TASK-203 dependency added; TASK-209 gate+tier edge case AC added; TASK-210 custom XP validation ACs added; TASK-213 tap-outside AC added; TASK-211 TASK-203 dependency added; TASK-213 TASK-203+TASK-210 dependencies added; TASK-212 TASK-202 dependency added; TASK-210 /skills/{id}/log route clarification added; TASK-215 real dashboard added; dependency graph corrected for TASK-209; prior update: planning-agent second pass: full Phase 1 and Phase 2 implementation backlog added; all task slices defined with dependencies and acceptance criteria; feature-tracker.md updated to in-progress-ready state; review-agent unblocked; prior update by ux-agent: UX step 4 complete; F-001, F-005, F-009 UX dependencies cleared; D-017 through D-022 added; ux-spec.md created; prior update by planning-agent v1: delivery slice confirmed, phase exit criteria made explicit, epic-to-feature mapping finalized, deferred list locked, schema-churn ordering applied)

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
- XP curve is non-linear with increasing cost per level; confirmed as D-014 (quadratic with tier multipliers).
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
- First delivery backlog (Phase 1 + Phase 2 tickets): DONE — see Implementation Backlog below
- Clear deferred list: DONE (see Confirmed Deferred List above)

---

## Implementation Backlog

### How to read this backlog

Each task slice is formatted as:

```
TASK-{ID}: {Title}
  Feature:    {F-ID}
  Phase step: {build-sequence step from the Build Sequence section above}
  Depends on: {prerequisite TASK-IDs or external conditions}
  Enables:    {TASK-IDs that are unblocked when this is done}
  What it builds: {concrete deliverable}
  Acceptance criteria:
    - {AC-1}
    - {AC-2}
    ...
```

Tasks are ordered to maximise sequential buildability. Within each phase step, tasks that have no mutual dependency can be built in parallel.

---

### PHASE 1 — PLATFORM FOUNDATION

---

#### Step 1a — Go scaffold, rendering pipeline, local dev setup

---

**TASK-101: Go module and project scaffold**

```
Feature:    F-001 (enables shell), F-002 (enables auth)
Phase step: 1a
Depends on: Nothing
Enables:    TASK-102, TASK-103, TASK-104, TASK-105

What it builds:
  A runnable Go module with:
  - go.mod / go.sum with initial dependencies:
      github.com/a-h/templ, github.com/jackc/pgx/v5,
      github.com/golang-migrate/migrate/v4, github.com/go-chi/chi/v5 (or net/http)
  - cmd/server/main.go: starts HTTP server, reads PORT from env
  - internal/config/config.go: loads env vars at startup; panics if required vars
    are missing (DATABASE_URL, SUPABASE_PROJECT_URL, SUPABASE_ANON_KEY, MASTER_KEY)
  - internal/server/server.go: wraps http.Server; wires router
  - Makefile targets: make run, make build, make test
  - .env.example listing all required env vars with placeholder values
  - README section: "Getting started — run make run"

Acceptance criteria:
  - `go build ./...` succeeds with zero errors
  - `go test ./...` succeeds (no tests yet; just must not fail)
  - `make run` starts the server on the configured port and responds to GET /
    with HTTP 200
  - .env.example documents every env var the application reads
  - No hardcoded secrets in source; all secrets loaded from env
```

---

**TASK-102: Templ + HTMX rendering pipeline**

```
Feature:    F-001
Phase step: 1a
Depends on: TASK-101
Enables:    TASK-105, TASK-106

What it builds:
  - Templ installed and integrated: `templ generate` step in Makefile
  - internal/templates/layout/base.templ: base HTML document with:
      <meta name="viewport" content="width=device-width, initial-scale=1">
      HTMX script tag (CDN or vendored)
      Tailwind CDN (Play CDN for development; full build for production)
      <div id="main-content"> swap target
  - internal/templates/layout/shell.templ: outer shell with nav placeholder
  - internal/templates/pages/home.templ: minimal landing/placeholder page
  - Templ component render helper function: renders a templ.Component to
    http.ResponseWriter; used by all handlers

Acceptance criteria:
  - `templ generate` runs without errors
  - A GET / request returns an HTML page that includes the HTMX script tag
  - The base layout includes the viewport meta tag for mobile rendering
  - `<div id="main-content">` exists in the rendered output
  - No JavaScript frameworks other than HTMX are present
```

---

**TASK-103: Tailwind responsive baseline**

```
Feature:    F-001
Phase step: 1a
Depends on: TASK-102
Enables:    TASK-105

What it builds:
  - Tailwind CSS integrated:
      Development: Tailwind Play CDN via script tag in base.templ
      Production: Tailwind CLI build step producing static/css/app.css
  - Base CSS variables for tier colors (D-020):
      --color-tier-novice:      gray-400 (#9ca3af)
      --color-tier-apprentice:  blue-500 (#3b82f6)
      --color-tier-journeyman:  green-500 (#22c55e)
      --color-tier-expert:      purple-600 (#9333ea)
      --color-tier-veteran:     amber-600 (#d97706)
      --color-tier-master:      yellow-500 (#eab308)
  - Tailwind config (tailwind.config.js) with content paths set to scan
    all .templ files
  - Responsive breakpoints confirmed:
      mobile: default (< 768px)
      desktop: md: (>= 768px)

Acceptance criteria:
  - Tailwind utility classes render correctly in development
  - Tier color CSS variables are defined and usable
  - Breakpoint classes (sm:, md:, lg:) resolve correctly in rendered output
  - `make build-css` produces a minified CSS file for production
```

---

**TASK-104: Local development setup**

```
Feature:    F-001, F-002 (enabler)
Phase step: 1a
Depends on: TASK-101
Enables:    TASK-106 (database migration runner)

What it builds:
  - docker-compose.yml: local PostgreSQL instance (version matching Supabase's
    hosted version; currently PostgreSQL 15)
  - docker-compose.yml includes: db service with volume for persistence,
    health check
  - Makefile targets:
      make db-up       — starts local PostgreSQL container
      make db-down     — stops container
      make db-reset    — drops and recreates database; re-runs all migrations
  - .env.example updated with local DATABASE_URL pointing to docker-compose db
  - Documentation: README section "Local development setup"
    Steps: (1) copy .env.example to .env, (2) make db-up, (3) make run

Acceptance criteria:
  - `make db-up` starts a PostgreSQL container accessible at localhost:5432
  - `make db-reset` drops and recreates the database and runs all pending
    migrations without error
  - A developer with Docker installed can stand up the full local environment
    by running: cp .env.example .env && make db-up && make run
  - The README documents this three-command setup
```

---

#### Step 1b — Schema baseline and migration tooling

---

**TASK-105: Migration tooling bootstrap**

```
Feature:    F-002, F-003 (schema prerequisite)
Phase step: 1b
Depends on: TASK-101, TASK-104
Enables:    TASK-106, TASK-107

What it builds:
  - golang-migrate integrated as a Go library (not a CLI binary)
  - internal/database/migrate.go: RunMigrations(ctx, db) function that runs
    all pending migrations at startup; called from main.go before the HTTP
    server starts accepting traffic
  - db/migrations/ directory with numbered up/down SQL pairs:
      (empty at this point; populated by TASK-106 and TASK-107)
  - Makefile targets:
      make migrate-up     — runs pending migrations
      make migrate-down   — rolls back one migration
      make migrate-status — shows current migration version

Acceptance criteria:
  - golang-migrate is imported as a Go module dependency (not a shell binary)
  - RunMigrations() is called at application startup before the HTTP server binds
  - If a migration fails, the application does not start (returns non-zero exit code)
  - `make migrate-status` shows the current migration version
  - An empty db/migrations/ directory is valid (no migrations = no error)
```

---

**TASK-106: users table migration**

```
Feature:    F-002
Phase step: 1b
Depends on: TASK-105
Enables:    TASK-107, TASK-108

What it builds:
  db/migrations/000001_create_users.up.sql:
    CREATE TABLE public.users (
        id            UUID PRIMARY KEY,
        email         TEXT NOT NULL UNIQUE,
        display_name  TEXT,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    -- RLS: users can only read/update their own row
    ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
    CREATE POLICY users_self_rw ON public.users
        USING (id = current_setting('app.current_user_id', TRUE)::UUID);

  db/migrations/000001_create_users.down.sql:
    DROP TABLE IF EXISTS public.users;

  Runbook documentation (README or docs/setup.md):
    "Supabase Auth trigger — MUST BE CREATED MANUALLY via Supabase SQL Editor.
     golang-migrate cannot access the auth schema. Run the following SQL in
     the Supabase dashboard after deploying the application for the first time:"
    [Includes verbatim SQL from architecture.md section 4.1.1:
     public.handle_new_user() trigger function + on_auth_user_created trigger]

Acceptance criteria:
  - `make migrate-up` creates the public.users table without error
  - `make migrate-down` drops the table cleanly
  - RLS is enabled on the table
  - The runbook section for the Supabase Auth trigger is present in the
    repository documentation
  - The trigger SQL is NOT in any migration file (it is documented as a
    manual step only)
  - No migration file references the auth schema
  - After creating a new user via Supabase Auth, a row exists in public.users
    with the matching id — verified by manual test in the Supabase SQL editor
    or integration test
```

---

**TASK-107: user_ai_keys table migration**

```
Feature:    F-003
Phase step: 1b
Depends on: TASK-106
Enables:    TASK-109

What it builds:
  db/migrations/000002_create_user_ai_keys.up.sql:
    CREATE TABLE public.user_ai_keys (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        encrypted_dek   BYTEA NOT NULL,
        encrypted_key   BYTEA NOT NULL,
        key_hint        TEXT,
        validated_at    TIMESTAMPTZ,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT uq_user_ai_keys_user UNIQUE (user_id)
    );
    ALTER TABLE public.user_ai_keys ENABLE ROW LEVEL SECURITY;
    CREATE POLICY user_ai_keys_self_rw ON public.user_ai_keys
        USING (user_id = current_setting('app.current_user_id', TRUE)::UUID);

  db/migrations/000002_create_user_ai_keys.down.sql:
    DROP TABLE IF EXISTS public.user_ai_keys;

Acceptance criteria:
  - `make migrate-up` creates the public.user_ai_keys table without error
  - `make migrate-down` drops the table cleanly
  - The UNIQUE constraint on user_id is present (one key per user)
  - RLS is enabled on the table
  - encrypted_dek and encrypted_key are BYTEA (not TEXT)
  - key_hint is TEXT nullable
```

---

#### Step 1c — Supabase Auth integration

---

**TASK-108: JWT validation middleware**

```
Feature:    F-002
Phase step: 1c
Depends on: TASK-101, TASK-106
Enables:    TASK-109, TASK-110, TASK-111

What it builds:
  internal/auth/middleware.go:
  - Fetches Supabase JWKS from SUPABASE_PROJECT_URL + "/.well-known/jwks.json"
    at startup and caches with 1-hour TTL (R-001 mitigation)
  - On every request: reads Authorization: Bearer {token} header
  - Validates JWT signature, expiry, and issuer (iss = Supabase project URL)
  - On unknown key ID: re-fetches JWKS once before rejecting (R-001 mitigation)
  - Extracts sub claim (= auth.users.id = public.users.id) as UUID
  - Injects user_id UUID into request context via context.WithValue
  - Returns HTTP 401 with plain-text body "Unauthorized" for missing,
    invalid, or expired tokens
  - All downstream handlers obtain user_id exclusively from request context;
    they never read user ID from URL parameters or request bodies (IDOR prevention)

  internal/auth/context.go:
  - UserIDFromContext(ctx) (uuid.UUID, bool) helper function

Acceptance criteria:
  - A request with no Authorization header returns HTTP 401
  - A request with an expired JWT returns HTTP 401
  - A request with a valid JWT returns HTTP 200 (for any protected route)
  - user_id is available in request context for all handlers wrapped by this
    middleware
  - JWKS is cached; the JWKS endpoint is not called on every request
  - On JWKS key-ID miss: JWKS is re-fetched once; if still not found, returns 401
  - Unit test: middleware correctly rejects a tampered JWT
  - Unit test: middleware correctly accepts a validly-signed JWT
  - No handler reads user_id from URL params or request body
```

---

**TASK-109: User profile handler (F-002)**

```
Feature:    F-002
Phase step: 1c
Depends on: TASK-106, TASK-108
Enables:    TASK-110 (account screen), TASK-111 (API key handler)

What it builds:
  internal/users/service.go:
  - GetOrCreateUser(ctx, userID UUID, email string) (*User, error)
    Upserts into public.users on first login (in case the Supabase trigger
    had not yet fired or the app-layer row needs refreshing)
  - UpdateDisplayName(ctx, userID UUID, name string) error

  internal/users/handler.go:
  - GET /account: renders the account screen (see ux-spec.md Section 7.1)
    Shows: display name (editable), email (read-only), API key status,
    sign-out button, change-password link
  - POST /account: updates display name; redirects to GET /account

  internal/templates/pages/account.templ:
  - Account screen layout per ux-spec.md Section 7.1
  - Email/password only (D-012); no social auth UI
  - Change Password link present (targets /account/password)
  - Sign Out button (targets POST /auth/signout — clears session cookie)

Acceptance criteria:
  - GET /account returns HTTP 200 for a valid authenticated session
  - GET /account returns HTTP 401 for an unauthenticated request
  - POST /account with a new display name updates the name and redirects
  - The email field is displayed read-only; no form input for email
  - No OAuth or social auth UI elements are present anywhere on the account screen
  - Auth is email/password only (D-012 enforced at UI level)
```

---

**TASK-110: Login, register, and sign-out handlers (F-002)**

```
Feature:    F-002
Phase step: 1c
Depends on: TASK-108, TASK-109
Enables:    TASK-111 (key storage route depends on auth)

What it builds:
  internal/auth/handler.go:
  - GET /login: renders login form (email + password + submit)
  - POST /login: calls Supabase Auth REST API (POST /auth/v1/token?grant_type=password)
    with email + password; on success, stores access_token and refresh_token in
    HttpOnly Secure cookies (not in JavaScript or local storage); redirects to /dashboard
  - GET /register: renders registration form (email + password + confirm password)
  - POST /register: calls Supabase Auth REST API (POST /auth/v1/signup)
    with email + password; on success, redirects to /login with
    "Check your email to confirm your account" message
  - POST /auth/signout: clears session cookies; redirects to /login

  internal/templates/pages/login.templ: standard login form
  internal/templates/pages/register.templ: standard registration form

  Middleware:
  - Redirect authenticated users away from /login and /register to /dashboard
  - Redirect unauthenticated users away from any protected route to /login

Acceptance criteria:
  - POST /login with valid credentials sets HttpOnly Secure cookies and
    redirects to /dashboard
  - POST /login with invalid credentials returns the login form with an
    inline error: "Invalid email or password"
  - POST /register creates the user and shows the email confirmation message
  - POST /auth/signout clears cookies and redirects to /login
  - Session tokens are stored in HttpOnly Secure cookies only — never in
    JavaScript, local storage, or rendered HTML
  - No social auth (OAuth) UI or routes exist (D-012)
  - GET /login redirects to /dashboard if the user is already authenticated
```

---

---

**TASK-116: Password change handlers (F-002)**

```
Feature:    F-002
Phase step: 1c
Depends on: TASK-110, TASK-108
Enables:    Complete account section

What it builds:
  internal/auth/handler.go additions:
  - GET /account/password: renders the password change form
      Fields: current password, new password, confirm new password
      Email/password auth only (D-012)
  - POST /account/password: submits new password via Supabase Auth API
      Calls Supabase Auth Admin API to verify current password and update
      On success: redirects to GET /account with confirmation message
      On wrong current password: returns form with inline validation error
      On any other error: returns form with generic error message
  Middleware: route is accessible only to authenticated users (401 if not)

  internal/templates/pages/password_change.templ:
    Password change form with current password, new password, confirm fields

Acceptance criteria:
  - GET /account/password returns the password change form for authenticated users
  - GET /account/password returns HTTP 401 for unauthenticated requests
  - POST /account/password with valid current password and matching new passwords
    returns success and redirects to GET /account
  - POST /account/password with wrong current password returns the form with
    a validation error (does not update the password)
  - POST /account/password returns HTTP 401 for unauthenticated requests
  - No OAuth or social auth UI elements are present (D-012)
```

---

#### Step 1d — AES-256-GCM key storage

---

**TASK-111: Encryption service (D-015)**

```
Feature:    F-003
Phase step: 1d
Depends on: TASK-101 (config)
Enables:    TASK-112

What it builds:
  internal/crypto/aes.go:
  - Encrypt(masterKey []byte, plaintext []byte) (ciphertext []byte, err error)
    Uses AES-256-GCM; generates a fresh 12-byte nonce via crypto/rand on every call;
    stores as [nonce || ciphertext] concatenated
  - Decrypt(masterKey []byte, ciphertext []byte) (plaintext []byte, err error)
    Splits [nonce || ciphertext] on the first 12 bytes
  - GenerateDEK() ([]byte, error)
    Generates a random 32-byte AES-256 key via crypto/rand

  internal/crypto/validate.go:
  - ValidateClaudeKeyFormat(key string) bool
    Returns true if key matches ^sk-ant-[A-Za-z0-9-_]+$

  Startup: config.go reads MASTER_KEY env var; panics if absent or < 32 bytes

Acceptance criteria:
  - Unit test: Encrypt → Decrypt round-trip produces original plaintext
  - Unit test: two Encrypt calls on the same plaintext produce different
    ciphertexts (nonce randomness verified)
  - Unit test: Decrypt with wrong key returns an error (not silently wrong data)
  - Unit test: ValidateClaudeKeyFormat accepts "sk-ant-abc123" and rejects
    "sk-abc123", "", and a key without the sk-ant- prefix
  - Nonces are generated via crypto/rand only (R-002 mitigation)
  - No external crypto libraries; Go stdlib only
  - The master key is loaded from env at startup; if missing or < 32 bytes
    the application fails to start with an explicit error message
```

---

**TASK-112: API key storage handlers (F-003)**

```
Feature:    F-003
Phase step: 1d
Depends on: TASK-107, TASK-108, TASK-111
Enables:    Phase 2 AI calibration (TASK-212)

What it builds:
  internal/keys/service.go:
  - SaveKey(ctx, userID UUID, plaintextKey string) error
    1. Validates key format (ValidateClaudeKeyFormat)
    2. Generates per-user DEK via GenerateDEK()
    3. Encrypts DEK under master key: encryptedDEK = Encrypt(masterKey, DEK)
    4. Encrypts plaintextKey under DEK: encryptedKey = Encrypt(DEK, plaintextKey)
    5. Sets key_hint = last 4 characters of plaintextKey
    6. Upserts into user_ai_keys (sets validated_at = now())
  - DeleteKey(ctx, userID UUID) error
    Deletes the user_ai_keys row for the given user
  - GetDecryptedKey(ctx, userID UUID) (string, error)
    1. Loads user_ai_keys row
    2. Decrypts DEK using master key
    3. Decrypts Claude API key using DEK
    4. Returns plaintext key (never logged, never stored beyond function scope)
  - GetKeyStatus(ctx, userID UUID) (*KeyStatus, error)
    Returns: { Exists bool, Hint string, ValidatedAt *time.Time }
    Never returns any form of the key itself

  internal/keys/handler.go:
  - GET /account/api-key: renders key management screen (ux-spec.md Section 7.2)
    Shows hint if key exists, or "No key saved" if not
  - POST /account/api-key: calls SaveKey; on success redirects to GET /account
    On validation error: renders inline error message in the form
  - DELETE /account/api-key: calls DeleteKey; redirects to GET /account

  internal/templates/pages/api_key.templ: per ux-spec.md Section 7.2
    - Input type="password" (masked)
    - "Verify and Save" button
    - "Your key is encrypted and stored securely." disclaimer text
    - Key hint display when saved: "Key ending in ****{hint}"
    - No key ever appears in rendered HTML

Acceptance criteria:
  - POST /account/api-key with a valid key stores an encrypted form in the DB
    and returns HTTP 200 or redirect; the plaintext key never appears in
    the response body, cookies, or response headers
  - POST /account/api-key with an invalid key format returns the form with
    inline error: "This doesn't look like a valid Claude API key."
  - GET /account/api-key shows the last-4-char hint when a key is saved;
    shows "No key saved" when none exists
  - DELETE /account/api-key removes the key; GET /account/api-key
    subsequently shows "No key saved"
  - The plaintext key never appears in: HTML responses, cookies, headers,
    application logs, or database rows (verified by code review)
  - Round-trip test: save key → retrieve decrypted key → assert plaintext matches
  - The key input field uses type="password" (browser masks it)
  - The encrypted_dek and encrypted_key columns store BYTEA, not TEXT
```

---

#### Step 1e — Mobile-responsive app shell and navigation

---

**TASK-113: App shell and bottom tab bar navigation (F-001)**

```
Feature:    F-001
Phase step: 1e
Depends on: TASK-102, TASK-103
Enables:    TASK-114, all Phase 2 UI tasks

What it builds:
  internal/templates/layout/shell.templ:
    Unified app shell with:
    - <header>: app name/logo (top bar on mobile, top of sidebar on desktop)
    - <main id="main-content">: swap target for HTMX partial loads
    - <div id="modal-container"></div>: placed at the end of the body, outside
      the main content area; used as the HTMX swap target for bottom sheets
      and modals from any page
    - Mobile bottom tab bar (< 768px):
        Four items: Dashboard, LifeQuest, NutriLog, Account
        Icons: home, sword, leaf, person
        Fixed position at bottom of viewport
        Safe-area-inset padding for notched phones
        Active tab highlighted server-side via CSS class injected by handler
    - Desktop left sidebar (>= 768px):
        Same four items; collapsible to icon-only rail at 768–1024px;
        expanded permanently at > 1024px
        LifeQuest expands to show Skills sub-item and "+ Add Skill" when active
    - NutriLog item: visible but shows "Coming Soon" placeholder on tap (ux-spec.md 1.4)
    - HTMX navigation:
        Tab/sidebar links use hx-get + hx-target="#main-content" + hx-push-url="true"
        Server sets active tab CSS class in the rendered fragment

  internal/templates/layout/nav_helpers.templ:
    NavItem component: renders one nav entry with active-state awareness

  Routes registered:
    GET /dashboard     → dashboard handler (placeholder content for Phase 1)
    GET /skills        → placeholder redirect to dashboard in Phase 1
    GET /nutri         → NutriLog coming-soon template
    GET /account       → account handler (TASK-109)

  internal/templates/pages/dashboard.templ:
    Phase 1 placeholder: "LifeQuest — skills coming soon in Phase 2"
    Renders inside shell; shows the correct nav active state

Acceptance criteria:
  - On 375px viewport: bottom tab bar is visible and fixed at bottom of screen
  - On 1280px viewport: left sidebar is visible; bottom tab bar is not visible
  - Tapping/clicking a tab loads content via HTMX partial swap without full reload
  - hx-push-url="true" updates the browser URL on navigation
  - The active tab is highlighted correctly based on the current route
    (server-side class injection, not client-side JS)
  - NutriLog tab is visible; tapping it shows the "Coming Soon" placeholder
  - The shell renders without any LifeQuest content in Phase 1
  - No JavaScript files other than HTMX CDN are loaded
  - Safe-area-inset padding is applied to the bottom nav on notched devices
  - The shell HTML includes <div id="modal-container"></div> (or equivalent)
    that is accessible as an HTMX hx-target from any page
```

---

**TASK-114: Error states and loading states (F-001)**

```
Feature:    F-001
Phase step: 1e
Depends on: TASK-113
Enables:    All UI tasks (foundational error patterns)

What it builds:
  internal/templates/partials/error.templ:
    Generic error partial: title + message + optional retry link
    Used for: 500 errors, 404s, auth failures

  internal/templates/pages/error_404.templ: "Page not found" full-page screen
  internal/templates/pages/error_500.templ: "Something went wrong" full-page screen
  internal/templates/partials/loading.templ: spinner / skeleton for HTMX loads

  HTTP handler wiring:
    router.NotFound(handler) → renders error_404.templ
    Middleware error recovery → renders error_500.templ on panics
    HTMX 404/500 handler: returns partial error fragment when
    HX-Request header is present (avoids full-page error in partial swap context)

Acceptance criteria:
  - GET /nonexistent-route returns HTTP 404 with the error_404 template
  - Application panics are recovered and return HTTP 500 with error_500 template
  - HTMX requests to erroring routes receive the error partial fragment,
    not a full-page HTML response
  - The loading spinner is defined and reusable by any HTMX hx-indicator usage
```

---

#### Step 1f — xpcurve package (parallel to 1a–1e)

---

**TASK-115: xpcurve package and unit tests**

```
Feature:    F-008 (prerequisite), F-009 (prerequisite)
Phase step: 1f
Depends on: TASK-101 (module exists)
Enables:    TASK-201 (Phase 2 schema that depends on curve logic),
            TASK-203 (XP write service),
            TASK-204 (level display)

What it builds:
  internal/xpcurve/xpcurve.go:
    Exactly as specified in architecture.md Section 2:
    - TierMultiplier(level int) int
        < 10:  100 (Novice)
        < 20:  120 (Apprentice)
        < 30:  150 (Journeyman)
        < 60:  200 (Expert)
        < 100: 260 (Veteran)
        default: 350 (Master)
    - XPToReachLevel(level int) int
        Returns TierMultiplier(level) * level * level
    - MaxLevel = 200
    - LevelForXP(totalXP int) int
        Iterates from 1 to MaxLevel; returns highest level whose threshold <= totalXP
    - TierName(level int) string
        Returns: "Novice", "Apprentice", "Journeyman", "Expert", "Veteran", "Master"
    - TierColorClass(level int) string
        Returns a Tailwind color class token for the tier (used by templates):
        Novice: "tier-novice", Apprentice: "tier-apprentice", etc.
        (Actual CSS class names match the custom classes defined in TASK-103)

  internal/xpcurve/xpcurve_test.go:
    - TestLevelForXP: asserts exact levels for XP thresholds from architecture.md
        XP=100 → Level 1, XP=12000 → Level 10, XP=60000 → Level 20,
        XP=180000 → Level 30, XP=936000 → Level 60, XP=3500000 → Level 100
        XP=14000000 → Level 200, XP=99999999 → Level 200 (MaxLevel cap)
    - TestXPToReachLevel: spot-checks the representative threshold table
    - TestTierMultiplier: all six tier boundaries
    - TestLevelForXP_NoInfiniteLoop: calls LevelForXP(MaxInt) and asserts it
        returns MaxLevel without hanging
    - TestTierName: all six tiers return correct string
    - All tests must pass: go test ./internal/xpcurve/...

  Also defines:
  - XPForCurrentLevel(totalXP int) int
    Returns XP accumulated within the current level band (for progress bar display):
    totalXP - XPToReachLevel(LevelForXP(totalXP))
  - XPToNextLevel(totalXP int) int
    Returns XP remaining to reach the next level:
    XPToReachLevel(LevelForXP(totalXP) + 1) - totalXP
    (Returns 0 if at MaxLevel)

Acceptance criteria:
  - All unit tests pass: go test ./internal/xpcurve/...
  - LevelForXP(100) == 1
  - LevelForXP(12000) == 10 (first Apprentice level)
  - LevelForXP(60000) == 20 (first Journeyman level)
  - LevelForXP(180000) == 30 (first Expert level)
  - LevelForXP(936000) == 60 (first Veteran level)
  - LevelForXP(3500000) == 100 (first Master level)
  - LevelForXP(14000000) == 200 (MaxLevel)
  - LevelForXP(math.MaxInt) == 200 (MaxLevel cap; no infinite loop)
  - TierName returns the correct string for a level in each of the six tiers
  - No floating-point arithmetic anywhere in this package
```

---

### PHASE 2 — LIFEQUEST CORE

All Phase 2 tasks depend on Phase 1 complete (all TASK-1xx done and passing).

---

#### Step 2a — Skill domain schema

---

**TASK-201: skills, xp_events, blocker_gates migrations**

```
Feature:    F-004, F-006, F-008, F-009 (schema prerequisite for all)
Phase step: 2a
Depends on: TASK-106 (users table), TASK-115 (xpcurve confirmed)
Enables:    TASK-202, TASK-203

What it builds:
  db/migrations/000003_create_skills.up.sql:
    CREATE TABLE public.skills (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        name            TEXT NOT NULL,
        description     TEXT,
        current_level   SMALLINT NOT NULL DEFAULT 1 CHECK (current_level >= 1),
        current_xp      INTEGER NOT NULL DEFAULT 0 CHECK (current_xp >= 0),
        is_active       BOOLEAN NOT NULL DEFAULT TRUE,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX idx_skills_user_id ON public.skills(user_id);
    ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
    CREATE POLICY skills_owner ON public.skills
        USING (user_id = current_setting('app.current_user_id', TRUE)::UUID);

  db/migrations/000003_create_skills.down.sql:
    DROP TABLE IF EXISTS public.skills;

  db/migrations/000004_create_xp_events.up.sql:
    CREATE TABLE public.xp_events (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        skill_id        UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
        user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        xp_delta        INTEGER NOT NULL CHECK (xp_delta > 0),
        log_note        TEXT,
        logged_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX idx_xp_events_skill_id ON public.xp_events(skill_id);
    CREATE INDEX idx_xp_events_user_id  ON public.xp_events(user_id);
    CREATE INDEX idx_xp_events_logged_at ON public.xp_events(skill_id, logged_at DESC);
    ALTER TABLE public.xp_events ENABLE ROW LEVEL SECURITY;
    CREATE POLICY xp_events_owner ON public.xp_events
        USING (user_id = current_setting('app.current_user_id', TRUE)::UUID);

  db/migrations/000004_create_xp_events.down.sql:
    DROP TABLE IF EXISTS public.xp_events;

  db/migrations/000005_create_blocker_gates.up.sql:
    CREATE TABLE public.blocker_gates (
        id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        skill_id            UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
        gate_level          SMALLINT NOT NULL CHECK (gate_level >= 1),
        title               TEXT NOT NULL,
        description         TEXT NOT NULL,
        is_cleared          BOOLEAN NOT NULL DEFAULT FALSE,
        cleared_at          TIMESTAMPTZ,
        first_notified_at   TIMESTAMPTZ,
        created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT uq_blocker_per_skill_level UNIQUE (skill_id, gate_level)
    );
    CREATE INDEX idx_blocker_gates_skill_id ON public.blocker_gates(skill_id);
    ALTER TABLE public.blocker_gates ENABLE ROW LEVEL SECURITY;
    CREATE POLICY blocker_gates_owner ON public.blocker_gates
        USING (skill_id IN (
            SELECT id FROM public.skills
            WHERE user_id = current_setting('app.current_user_id', TRUE)::UUID
        ));

  db/migrations/000005_create_blocker_gates.down.sql:
    DROP TABLE IF EXISTS public.blocker_gates;

Acceptance criteria:
  - `make migrate-up` creates all three tables without error
  - `make migrate-down` (run three times) drops all three tables cleanly
  - All three tables have RLS enabled
  - xp_events.xp_delta has CHECK (xp_delta > 0) — no zero or negative XP
  - blocker_gates has UNIQUE (skill_id, gate_level) constraint
  - blocker_gates.first_notified_at column is TIMESTAMPTZ nullable (required
    for D-009 first-hit gate tracking per architecture.md)
  - All indexes defined in architecture.md Section 2 are present
  - No skill_levels table is created (levels are computed at runtime)
```

---

#### Step 2b — Skill CRUD

---

**TASK-202: Skill service and repository layer**

```
Feature:    F-004
Phase step: 2b
Depends on: TASK-201
Enables:    TASK-203, TASK-204, TASK-209

What it builds:
  internal/skills/repository.go:
  - CreateSkill(ctx, userID UUID, name, description string, startingLevel int)
    (*Skill, error)
    Inserts into skills; sets current_level = startingLevel;
    sets current_xp = XPToReachLevel(startingLevel)  [so XP reflects starting point]
    Also inserts three default blocker_gates rows at levels 9, 19, 29 with
    title = "Level {N} Gate" and description = "Reach this level to unlock
    the next stage of your skill journey." (architecture.md non-AI defaults)
    All four inserts in one transaction.
  - GetSkill(ctx, userID UUID, skillID UUID) (*Skill, error)
    Loads skill + active blocker gates; verifies user ownership
  - ListSkills(ctx, userID UUID) ([]*Skill, error)
    Returns all is_active = TRUE skills for the user, ordered by updated_at DESC
  - UpdateSkill(ctx, userID UUID, skillID UUID, name, description string) error
  - SoftDeleteSkill(ctx, userID UUID, skillID UUID) error
    Sets is_active = FALSE; does not delete rows

  internal/skills/model.go:
  - Skill struct with all fields from schema
  - EffectiveLevel(skill *Skill, gates []*BlockerGate) int
    Implements the effective_level() computation from architecture.md Section 2:
    Calls LevelForXP(current_xp); for each non-cleared gate, if raw_level >
    gate_level, cap at gate_level; return the lowest applicable cap
    This must be in the service layer, NOT in any template (R-004 mitigation)

Acceptance criteria:
  - CreateSkill inserts skill + 3 blocker_gates in a single transaction
  - SoftDeleteSkill sets is_active=FALSE; skill is excluded from ListSkills
  - GetSkill returns HTTP 404 (not 500) if the skill does not exist or
    belongs to another user
  - EffectiveLevel returns gate_level when raw XP would advance past a
    non-cleared gate
  - EffectiveLevel is tested: level 10 with a non-cleared gate at 9 → returns 9
  - Unit test: CreateSkill with startingLevel=5 sets current_xp=2500
    (XPToReachLevel(5) per D-014)
```

---

**TASK-203: Skill CRUD handlers and templates**

```
Feature:    F-004
Phase step: 2b
Depends on: TASK-202, TASK-113
Enables:    TASK-204 (creation flow), TASK-212 (AI calibration)

What it builds:
  internal/skills/handler.go:
  - GET /skills: skill list screen
      Renders all active skills as cards per ux-spec.md Section 5.6
      Empty state: if no skills, shows prominent "Create your first skill" CTA
      + FAB button (floating action button, bottom-right, mobile only)
  - GET /skills/new: skill creation flow step 1
  - POST /skills: processes creation form (step 3 submit)
      Validates: name required, len(name) <= 60, len(description) <= 400
      Validates: starting_level >= 1 AND starting_level <= 99 (D-018)
      On validation error: returns form with inline errors
      On success: redirects to /skills/{id}
  - GET /skills/{id}: skill detail screen per ux-spec.md Section 5.1
      Calls EffectiveLevel() in Go handler (not in template) (R-004 mitigation)
      Shows: skill name, tier name, effective level, XP progress bar,
      Log XP button, skill description, recent logs (last 5 xp_events)
  - GET /skills/{id}/edit: edit form (name + description prefilled)
  - POST /skills/{id}/edit: updates skill; redirects to /skills/{id}
  - DELETE /skills/{id}: soft-deletes skill; redirects to /skills
      Destructive confirm pattern: confirmation modal before delete

  internal/templates/pages/skill_list.templ
  internal/templates/pages/skill_detail.templ
  internal/templates/pages/skill_new.templ  (step 1 of creation flow)
  internal/templates/pages/skill_edit.templ
  internal/templates/partials/skill_card.templ  (reused in list + dashboard)

Acceptance criteria:
  - GET /skills renders all active skills for the authenticated user
  - GET /skills renders the empty-state CTA when no skills exist
  - POST /skills with starting_level = 100 returns a validation error
    "Starting level must be between 1 and 99" (D-018 server-side enforcement)
  - POST /skills with starting_level = 99 succeeds (Veteran tier max)
  - POST /skills with an empty name returns a validation error
  - DELETE /skills/{id} for a skill owned by user B is rejected with 403
    when requested by user A (ownership enforcement)
  - The skill detail screen shows the correct tier name and level
  - All skills routes return HTTP 401 for unauthenticated requests
  - Skill list is sorted by updated_at DESC
```

---

**TASK-204: Three-step skill creation flow with level picker (F-005 manual path)**

```
Feature:    F-005 (manual path; AI path handled in TASK-212)
Phase step: 2b
Depends on: TASK-203
Enables:    TASK-212 (AI path extends this flow)

What it builds:
  The three-step creation flow (ux-spec.md Section 3.2) using HTMX step progression:

  Step 1 handler: GET /skills/new
    - Renders step 1 form: skill name + description + AI calibration offer
      (offer is shown only if user has a saved Claude API key)
    - Step indicator: "Step 1 of 3"
    - Bottom tab bar hidden during flow (ux-spec.md Section 2.1)

  Step 1 → Step 2 transition:
    POST /skills/new/step2 (HTMX swap)
    - Validates name and description (server-side)
    - Stores step-1 data in signed session cookie or hidden form fields
    - Returns step 2 HTML fragment (level picker)

  Step 2: Level picker
    - Scrollable list showing levels 1–99 with tier name and tier description
      for each tier boundary (ux-spec.md Section 3.2)
    - On mobile: touch-scrollable list (not a <select> dropdown) (D-019)
    - Levels 1–30 shown by default; "Show levels 31–99" expandable section
    - Tier boundary visual markers at levels 10, 20, 30, 60 (dividers + labels)
    - Master tier (100+) NOT present in the list (D-018)
    - Default selection: Level 1
    - "— Apprentice tier starts here —" style labels at each tier boundary
    - Step indicator: "Step 2 of 3"

  Step 2 → Step 3 transition:
    POST /skills/new/step3 (HTMX swap)
    - Validates starting_level: must be 1 <= level <= 99 (D-018)
    - Returns step 3 summary + Create button

  Step 3: Confirm and Create
    - Summary card: name, description, starting level, tier name
    - Collapsed "What are Blocker Gates?" section showing default gates at 9, 19, 29
    - [Create Skill] primary button (full-width, bottom of viewport)
    - [Back] link (top-left, secondary)
    - Step indicator: "Step 3 of 3"

  POST /skills (final create):
    - All validation as per TASK-203
    - starting_level server-side check: starting_level <= 99 (D-018)
    - On success: redirect to /skills/{id}

Acceptance criteria:
  - The three-step flow progresses via HTMX partial swaps without full-page reload
  - The bottom tab bar is hidden during the entire creation flow
  - Step indicator ("Step N of 3") is visible at the top of each step
  - The level picker on mobile renders as a scrollable list, not a <select> element
  - The level picker does not show any level >= 100 (D-018 enforced in UI)
  - POST /skills with starting_level = 100 returns HTTP 422 with the error
    "Starting level must be between 1 and 99" (D-018 server-side validation)
  - Tier boundary markers are visible in the level picker at levels 10, 20, 30
  - The "What are Blocker Gates?" section is collapsed by default and expandable
  - All form data persists across steps (no data loss on back navigation)
  - The step 3 confirmation shows the correct tier name for the selected level
```

---

#### Step 2c — Quick XP logging

---

**TASK-209: XP write service (transactional)**

```
Feature:    F-006
Phase step: 2c
Depends on: TASK-201, TASK-202, TASK-115
Enables:    TASK-210 (quick-log UI), TASK-211 (display after log), TASK-213 (gate visibility)

What it builds:
  internal/xp/service.go:
  - LogXP(ctx, userID UUID, skillID UUID, xpDelta int, note string) (*LogResult, error)
    Executes in a single BEGIN/COMMIT transaction (R-003 mitigation):
      1. Verify skill exists and belongs to userID (returns 403 if not)
      2. INSERT INTO xp_events (skill_id, user_id, xp_delta, log_note)
      3. new_xp = skill.current_xp + xpDelta
      4. new_level = LevelForXP(new_xp) from xpcurve package
      5. effective_level = EffectiveLevel(new_level, active_gates)
         (caps level at active non-cleared gate threshold)
      6. UPDATE skills SET current_xp = new_xp,
                           current_level = effective_level,
                           updated_at = now()
      7. If a gate just became active (new_level > gate.gate_level AND
         gate.first_notified_at IS NULL):
         UPDATE blocker_gates SET first_notified_at = now() WHERE id = gate.id
         (within same transaction)
      8. Return LogResult containing:
           NewXP int, EffectiveLevel int, RawLevel int,
           TierName string, TierColorClass string,
           LeveledUp bool, TierCrossed bool, NewTierName string,
           GateHit bool, GateFirstHit bool, Gate *BlockerGate

  Idempotency (architecture.md xp_events idempotency section):
    Before inserting, check: does an xp_events row exist with the same
    (skill_id, user_id) and created_at within the last 1 second?
    If yes: return the existing LogResult without a new insert.
    (Server-side 1-second dedup per skill+user)

  internal/xp/model.go:
  - LogResult struct (as above)
  - IsLevelUp(oldLevel, newLevel int) bool
  - IsTierCrossed(oldLevel, newLevel int) bool
    (checks if TierName(oldLevel) != TierName(newLevel))

Acceptance criteria:
  - LogXP executes xp_events INSERT + skills UPDATE in a single transaction (R-003)
  - If the transaction fails midway, no partial write is committed
  - LogXP with a skillID belonging to another user returns an error
  - Server-side dedup: calling LogXP twice within 1 second for the same
    (skill_id, user_id) returns the same LogResult without inserting a second row
    (verified by checking xp_events count)
  - LogXP correctly caps effective_level at the gate_level of any active gate
  - LogXP sets first_notified_at on the gate in the same transaction the first
    time a gate threshold is crossed (GateFirstHit = true in LogResult)
  - Unit test: after LogXP with 9000 XP on a skill at level 8, effective_level = 9
    (gate at level 9 caps progression)
  - TierCrossed is true when going from level 9 to level 10
  - If a single LogXP call causes both a gate hit (effective_level capped) and
    a tier crossing (raw level crosses a tier boundary), the LogResult sets
    GateHit=true and TierCrossed=false; gate state takes precedence — the tier
    transition modal does NOT fire while a gate is active
```

---

**TASK-210: Quick-log bottom sheet UI (F-006)**

```
Feature:    F-006
Phase step: 2c
Depends on: TASK-209, TASK-203, TASK-113
Enables:    TASK-211 (progression display), TASK-213 (gate notification)

What it builds:
  internal/xp/handler.go:
  - POST /skills/{id}/log: processes XP log submission
      Reads: xp_delta (required), log_note (optional)
      Validates: xp_delta must be > 0 and <= 50000 (reasonable upper bound)
      Calls LogXP service
      Returns HTMX fragment based on LogResult:
        - If GateFirstHit: returns first-hit gate notification modal fragment
          (ux-spec.md Section 6.3)
        - If TierCrossed: returns tier transition modal fragment (D-022)
        - If LeveledUp (no tier cross, no gate): returns level-up toast fragment
        - Otherwise: returns standard post-log toast fragment
      The skill card on the list and skill detail update via hx-swap-oob

  internal/templates/partials/quick_log_sheet.templ:
    Bottom sheet (mobile) / modal dialog (desktop) per ux-spec.md Section 4.2:
    - Header: "[Skill Name] — Quick Log"
    - XP chip buttons: [50 XP] [100 XP] [250 XP] [500 XP] [Custom]
      Default selection on every open: 100 XP chip (D-019)
      Chips are ≥ 44×44px touch targets
    - Optional note field (visible, marked "(optional)", single-line)
    - [Log XP] submit button: full-width, ≥ 48px tall, at bottom of sheet
    - hx-disabled-elt="[Log XP button]" on the form to disable on first submit
      (HTMX double-submission guard per architecture.md)
    - Close button (×) at top-right of header

  Skill card `+ Log` icon:
    Added to skill_card.templ (TASK-203):
    Bottom-right of each card; tapping opens the quick-log bottom sheet
    via hx-get="/skills/{id}/log-sheet" hx-target="#modal-container"
    No navigation change (D-019: bottom sheet, not a new route)

  Route clarification: /skills/{id}/log is not a standalone navigable page.
    GET /skills/{id}/log-sheet returns the bottom sheet HTMX fragment;
    POST /skills/{id}/log processes the submission. There is no full-page
    fallback route for this path in release 1 — the IA route listing is a
    conceptual label, not a distinct server route.

  GET /skills/{id}/log-sheet: returns the bottom sheet HTML fragment

  internal/templates/partials/toast.templ: standard post-log toast
  internal/templates/partials/level_up_toast.templ: level-up toast variant
  internal/templates/partials/tier_transition_modal.templ: full-screen overlay (D-022)
  internal/templates/partials/gate_first_hit_modal.templ: first-hit gate modal (D-021)

Acceptance criteria:
  - Primary fast-log path: tap `+ Log` icon (1) → tap XP chip (2) → tap Log XP (3)
    completes a log entry in exactly 3 taps from the skill list (D-019)
  - This 3-tap primary path is the canonical acceptance test for F-006 (Phase 2 exit
    criterion 3; acceptance criterion for D-019)
  - The `+ Log` icon on skill cards opens the bottom sheet without navigating away
    from the skill list (HTMX modal swap, not a route change)
  - The 100 XP chip is selected by default on every sheet open (D-019)
  - XP chip touch targets are ≥ 44×44px on mobile
  - The [Log XP] button is full-width and ≥ 48px tall
  - hx-disabled-elt disables the submit button after first click (prevents double-submit)
  - Server-side dedup rejects a duplicate POST within 1 second (second submit
    returns the same result without a new xp_events row)
  - After successful log: bottom sheet closes; skill card XP/level updates in-place
  - Standard toast appears after a normal level-up (no tier cross)
  - Tier transition modal (full-screen overlay) appears when crossing a tier boundary
    (D-022); includes XP jump explainer text
  - First-hit gate notification modal appears the first time a gate threshold is
    reached (D-021); sets first_notified_at in DB in the same transaction
  - Subsequent logs on the same gate return the standard toast (not the gate modal)
  - The keyboard does not cover the [Log XP] button when the note field is focused
  - Custom XP input: submitting 0 or a negative value returns a validation error
    without logging
  - Custom XP input: submitting a value > 50,000 returns a validation error
    without logging
  - Custom XP input: valid custom values (1–50,000) log correctly
```

---

**TASK-215: Real dashboard with skill summary cards (F-001, F-004, F-006)**

```
Feature:    F-001 (dashboard route), F-004 (skill display), F-006 (fast-log path)
Phase step: 2c (follows TASK-210)
Depends on: TASK-203 (skill_card.templ), TASK-210 (log bottom sheet), TASK-113 (app shell)
Enables:    TASK-214 (integration tests can now test the dashboard fast-log path)

What it builds:
  internal/templates/pages/dashboard.templ (replaces Phase 1 placeholder):
    Real dashboard at GET /dashboard showing the user's skills as summary cards.
    Each card uses skill_card.templ (TASK-203) with its + Log icon (TASK-210).
    The log bottom sheet (TASK-210) opens from dashboard cards via the same
    hx-get="/skills/{id}/log-sheet" hx-target="#modal-container" path used
    from the /skills list — no separate dashboard-specific log path.
    Empty state: if the user has no skills, shows a "Create your first skill" CTA
    linking to /skills/new.
    Replaces the Phase 1 placeholder content ("LifeQuest — skills coming soon").

  internal/dashboard/handler.go:
  - GET /dashboard: loads all active skills via ListSkills(ctx, userID);
    renders dashboard.templ with skill cards

Acceptance criteria:
  - GET /dashboard returns a page with one skill_card per active skill
    for the authenticated user
  - Each skill card on the dashboard has a + Log icon
  - Tapping the + Log icon from the dashboard opens the quick-log bottom sheet
    (same HTMX path as from /skills list; no separate route)
  - Empty state: when the user has no skills, a "Create your first skill" CTA
    is shown on the dashboard
  - The Phase 1 placeholder text ("skills coming soon") no longer appears
  - GET /dashboard returns HTTP 401 for unauthenticated requests
```

---

#### Step 2d — XP and level progression display

---

**TASK-211: Skill detail progression display (F-008)**

```
Feature:    F-008
Phase step: 2d
Depends on: TASK-209, TASK-210, TASK-203, TASK-115
Enables:    TASK-213 (gate section sits within the detail screen)

What it builds:
  Updates to internal/templates/pages/skill_detail.templ:

  Tier name + level heading:
    "[Tier Name] — Level [N]" (em dash separator per ux-spec.md Section 5.2)
    Tier name is NOT hidden; it is a first-class heading element
    Format for Master tier: "MASTER — Level [N]" (uppercase per ux-spec.md 5.5)

  XP progress bar (non-gate state):
    Shows: XP within current level band / XP needed to reach next level
    Formula: XPForCurrentLevel(totalXP) / XPToNextLevel(totalXP)
    Fill color: CSS class from TierColorClass() — applies D-020 tier color system
    Height: 12px on mobile, 8px in compact card
    Background: tier-appropriate background color from D-020
    Rounded ends
    Gradient fill for Master tier (gold → amber) per ux-spec.md 5.5
    Below bar: "[current XP in band] / [XP to next level] XP to level [N+1]"
    At MaxLevel (200): bar shown as 100% full; "Maximum Level Reached" label

  Tier badge on skill detail and skill list card:
    Renders tier name as a colored badge using TierColorClass()
    Applied consistently on: skill detail header, skill list card, dashboard card

  Tier boundary affordances:
    Upcoming-tier preview callout (ux-spec.md Section 5.4 item 2):
      Shown when user is within the last 10% of XP for the current tier's
      final level (e.g., within 10% of the XP gap between level 9 and level 10)
      Text: "Next tier: [Tier Name]. The XP cost will increase at this
      boundary — this is intentional."

    Veteran aspirational callout (ux-spec.md Section 5.5):
      Shown on skill detail for levels 60–99 (Veteran tier)
      Text: "Master tier begins at Level 100. Only the most dedicated
      practitioners reach it. Keep going."
      Styled as inspirational pull-quote; gold accent color

  Recent logs section:
    Last 5 xp_events rows for this skill (ordered logged_at DESC)
    Compact list: date, XP delta, note (if present)

  HTMX update targets:
    POST /skills/{id}/log response swaps the skill detail progression section
    in-place using hx-swap-oob (XP bar + level heading update without full reload)

Acceptance criteria:
  - The tier name is shown on the same line as the level number, separated by em dash
  - The XP progress bar fill color matches the tier color system (D-020):
      Novice: gray; Apprentice: blue; Journeyman: green; Expert: purple;
      Veteran: amber; Master: gold/yellow gradient
  - The tier color system is applied to: progress bar, tier badge, card accent
    (all three surfaces consistently — D-020)
  - After a successful XP log, the progress bar and level heading update
    in-place without full-page reload
  - Upcoming-tier preview callout appears when within 10% of crossing a tier boundary
  - Veteran aspirational callout appears for any skill at levels 60–99
  - At level 200, the progress bar is full and "Maximum Level Reached" is shown
  - Tier transition modal (D-022) is triggered server-side when level-up crosses
    a tier boundary; the modal includes:
      - "You've reached [New Tier Name]!" headline
      - Tier description
      - XP jump explainer text
      - Full-width dismiss button
  - Tier transition modal fires on EVERY tier-boundary crossing (D-022) —
    not just the first one
  - Master tier transition at level 100 shows enhanced copy per ux-spec.md 5.5
  - The skill list and dashboard cards show tier badge and compact XP bar
    with correct tier color
  - EffectiveLevel computation is performed in the Go handler, not in any
    template (R-004 mitigation)
```

---

#### Step 2e — AI skill calibration (optional path)

---

**TASK-212: AI calibration handler (F-005 AI path)**

```
Feature:    F-005 (AI path; manual path is TASK-204)
Phase step: 2e
Depends on: TASK-204 (creation flow), TASK-112 (key retrieval), TASK-202 (skill service)
Enables:    Nothing additional in Phase 2; Phase 3 features will build on this

What it builds:
  internal/ai/claude.go:
  - ClaudeClient struct: wraps Anthropic API calls using the user's decrypted key
  - CalibrateSkill(ctx, key string, name, description string) (*CalibrationResult, error)
    Sends skill name + description to Claude with a structured prompt asking for:
      a. Suggested starting level (1–99 only; model constrained by prompt)
      b. Gate descriptions for levels 9, 19, 29
      c. Brief rationale for the suggested level
    Returns CalibrationResult{ SuggestedLevel int, GateDescs [3]string, Rationale string }
    Streams the response back to the handler (streaming per architecture.md 4.3)
    Timeout: 30 seconds (non-streaming); 60 seconds if streaming

  Error handling (architecture.md 4.3 and ux-spec.md Section 3.4):
    401 from Anthropic → return error code "invalid_key"
    429 from Anthropic → retry with exponential backoff (max 2 retries);
      if exhausted, return error code "rate_limited"
    5xx from Anthropic → single retry after 1 second;
      if fails, return error code "service_unavailable"
    All other errors → return error code "service_unavailable"

  internal/skills/handler.go additions:
  - GET /skills/new: updated to check GetKeyStatus; if key exists, shows
    AI calibration offer in step 1 (ux-spec.md Section 3.2)
    If no key: step 1 goes directly to step 2 without showing the offer

  - POST /skills/new/calibrate: HTMX handler for the AI calibration step
    1. Calls GetDecryptedKey(ctx, userID)
    2. If no key: returns the manual level picker fragment directly
    3. If key present: calls CalibrateSkill; streams response back
    Returns HTMX fragment:
      - On success: AI suggestion display with [Accept] / [Choose Manually] buttons
        plus AI-generated gate descriptions below
      - On error code "invalid_key": inline notice + manual picker
        Text: "Your Claude API key appears to be invalid. Check your key in
        Account settings. You can set a starting level manually below."
      - On error code "rate_limited": inline notice + manual picker
        Text: "Claude API rate limit reached. Try again shortly, or set a
        starting level manually below."
      - On any other error: inline notice + manual picker
        Text: "AI calibration is unavailable right now. You can set a
        starting level manually below."
    In all error cases: manual level picker is shown immediately; no dead end

  Skill creation: when AI-generated gate descriptions are accepted, use them
    instead of the default placeholder values when calling CreateSkill

Acceptance criteria:
  - AI calibration is only available if GetKeyStatus returns Exists=true
  - If no Claude key is saved, the AI calibration offer is not shown (step 1
    goes directly to step 2 without any Claude-related UI)
  - If the user selects [Yes, use AI] and the key is valid, Claude is called
    server-side; streamed response populates the calibration step
  - If Claude returns 401: inline message "Your Claude API key appears to be
    invalid..." is shown; manual picker is available immediately (D-011, ux-spec 3.4)
  - If Claude returns 429: inline message "Claude API rate limit reached..."
    is shown; manual picker is available immediately (D-011, ux-spec 3.4)
  - If Claude returns 5xx/network error: inline message "AI calibration is
    unavailable right now..." is shown; manual picker available (D-011, ux-spec 3.4)
  - In all three error cases, no data entered in Step 1 is lost
  - The AI-suggested level is pre-selected in step 2 but the user can override it
  - The AI-suggested level is clamped to 1–99 before display (D-018)
  - AI-generated gate descriptions are used in CreateSkill instead of defaults
    when accepted by the user
  - The plaintext Claude API key is never logged, never returned to the client,
    and is discarded after the Claude call completes
  - AI calibration degrades gracefully on 401, 429, and any other error with
    the correct error messages defined above (explicit acceptance criterion from
    F-005 UX requirements)
```

---

#### Step 2f — Blocker gate schema + gate visibility UI

---

**TASK-213: Blocker gate visibility and first-hit notification (F-009)**

```
Feature:    F-009
Phase step: 2f
Depends on: TASK-201, TASK-211, TASK-209, TASK-203, TASK-210
Enables:    Phase 2 complete

What it builds:
  Updates to internal/templates/pages/skill_detail.templ:

  Gate-active section (replaces XP bar when gate is active — D-021):
    Rendered when EffectiveLevel == gate.gate_level and gate.is_cleared == false
    Per ux-spec.md Section 6.2:
    - [🔒 GATE LOCKED] header: Amber/Warning color palette
    - "Level [gate_level] — Progression Paused"
    - Gate title: blocker_gates.title
    - Gate description: blocker_gates.description
    - Divider
    - "XP Accruing: [skills.current_xp]" (updates live via HTMX swap)
    - "Level shown: [gate_level] (actual level: [LevelForXP(current_xp)])"
    - Explanatory text: "Your XP keeps growing. You'll advance to Level
      [gate_level + 1] when this challenge is complete."
    - Note: "Gate completion is coming in a future update. Keep logging to stay ready."
    - NO completion action button (D-010 enforced)
    The gate section occupies the same vertical position as the XP bar (D-021)

  Gate-active skill list card indicator:
    When a skill has an active gate, the skill_card.templ shows:
    🔒 lock icon + "Gate at Level [N]" in the card

  First-hit gate notification modal:
    Rendered by TASK-209 LogXP when GateFirstHit = true
    Full-screen modal per ux-spec.md Section 6.3:
    - "[🔒 You've hit a gate!]" header
    - "Level [gate_level] Gate: [title]"
    - [description]
    - "Your XP keeps growing, but your level display is paused here until
      you complete this challenge."
    - [Got it — see gate details] full-width button
      → navigates to /skills/{id} (hx-get or full redirect)
    No dismiss without acknowledgement — user must tap the button
    Full-screen on mobile (ux-spec.md Section 8)

  First-hit tracking:
    blocker_gates.first_notified_at IS NULL check is performed in LogXP
    service (TASK-209) in the same transaction that returns the modal
    Once first_notified_at is set, subsequent LogXP calls return standard toast
    No client-side state used for this check (server-authoritative per ux-spec 6.3)

  Skill list and dashboard update:
    After any XP log, the skill card HTMX swap includes the gate indicator
    if a gate is now active; removes it if not applicable

Acceptance criteria:
  - When a skill's effective_level equals a non-cleared gate's gate_level,
    the gate section replaces the XP bar on the skill detail screen (D-021)
  - The gate section does NOT appear below the XP bar — it replaces it at
    the same vertical position (D-021)
  - The gate section is above the fold on a 375px screen (i.e., visible
    without scrolling) (ux-spec.md Section 6.4)
  - The gate section shows: lock icon, gate title, gate description,
    current_xp (from skills.current_xp), effective level (gate_level),
    raw XP-computed level (LevelForXP(current_xp))
  - XP continues to accrue while gate is active: logging XP increments
    skills.current_xp but does not advance current_level past gate_level (D-007)
  - No completion action exists in the UI (no "Submit Evidence", no "Mark Complete"
    button anywhere) (D-010)
  - First-hit modal fires when first_notified_at IS NULL and the gate is
    first reached (correct DB column check per architecture.md)
  - After first-hit modal is dismissed, subsequent logs on the same gate
    return the standard post-log toast (not the first-hit modal)
  - first_notified_at is set in the same transaction as the XP insert
    (not a separate request)
  - The lock icon is ≥ 24×24px and recognizable (ux-spec.md Section 6.4)
  - The "XP Accruing" number updates in real-time after each log
    (same HTMX partial swap as regular XP display)
  - Skill list card shows lock indicator when a gate is active
  - Tapping outside the first-hit gate notification modal does NOT dismiss it;
    the user must tap the acknowledgement button; no backdrop-click-to-close
    behavior is present
```

---

### Phase 2 integration acceptance tests

These tests verify the end-to-end core loop and are the final gate before Phase 2 is marked complete.

**TASK-214: Phase 2 integration acceptance tests**

```
Feature:    All Phase 2 features
Phase step: After 2f (final task)
Depends on: TASK-201 through TASK-213, TASK-215
Enables:    Phase 2 sign-off; delivery-agent can hand off to review-agent

What it builds:
  A manual or automated test checklist covering all Phase 2 exit criteria:

  EC-1: Create a skill with a name, description, and manually selected starting level
    - Set starting level = 25; verify skill detail shows "Journeyman — Level 25"
    - Set starting level = 99; verify skill detail shows "Veteran — Level 99"

  EC-2: AI calibration degrades gracefully
    - Remove Claude key; verify AI offer is not shown in skill creation step 1
    - Save an invalid key; initiate AI calibration; verify "invalid key" message
      appears with manual picker immediately available
    - (Requires mocking Claude 429 response): verify "rate limit" message
      appears with manual picker immediately available

  EC-3: Three-tap quick log from skill list (D-019)
    - Open skill list
    - Tap the `+ Log` icon on a skill card (tap 1)
    - Tap the 100 XP chip (tap 2)
    - Tap [Log XP] (tap 3)
    - Verify: bottom sheet closes, skill card XP and level update in-place,
      toast notification appears

  EC-4: XP and level update immediately after log
    - Verify current_xp in DB matches skill card display
    - Verify current_level in DB matches effective level shown

  EC-5: Non-linear XP curve is applied correctly
    - Create skill at level 1; log enough XP to reach level 10 (need 12,000 total)
    - Verify tier name changes from "Novice" to "Apprentice"
    - Verify tier transition modal appears at level 10 crossing

  EC-6: Blocker gate shows when reached
    - Create skill at level 8; log 3,900 XP (reaches level 9 gate)
    - First-hit gate modal appears; dismiss it
    - Skill detail shows gate section instead of XP bar
    - Gate section shows title, description, current_xp, gate_level

  EC-7: XP accrues behind gate; level stays at gate_level
    - While gate is active at level 9: log 10,000 more XP
    - Verify current_xp increases; current_level stays at 9
    - Verify "actual level: [N]" in gate section shows the uncapped raw level

  EC-8: Skill edit and delete
    - Edit skill name and description; verify changes on detail screen
    - Delete skill; verify it disappears from skill list and dashboard

  EC-9: All flows on 375px mobile viewport
    - Run all above tests on a 375px viewport (Chrome DevTools device emulation
      or real device)

  EC-10: No blocker completion UI exists
    - Audit all templates and handlers: assert no button, link, or form with
      text or action suggesting gate completion, evidence submission, or unlock

Acceptance criteria:
  - All 10 acceptance test groups pass
  - No blockers on a 375px mobile viewport
  - No blocker completion UI exists anywhere in the codebase (EC-10)
```

---

## Risks

- **Schema churn**: Skills, XP logs, blocker gates, and (later) NutriLog data are interrelated. Architecture-agent has designed the skill-domain schema before Phase 2 implementation begins. Any schema change after coding starts is expensive.
- **XP curve dependency**: RESOLVED. D-014 confirmed. xpcurve package (TASK-115) must be built in Phase 1 and fully tested before any XP write or display work begins.
- **Cross-app ambition creep**: NutriLog and cross-app features must remain genuinely deferred. Any feature addition to release 1 requires a new decision-log entry.
- **AI calibration graceful degradation**: F-005 has a hard requirement that onboarding never blocks on a missing or invalid Claude key. This constraint is explicitly tested in TASK-214 EC-2.
- **Mobile UX drift**: All Phase 2 features require mobile sign-off on a 375px viewport. TASK-214 EC-9 is the explicit test gate.
- **R-003 XP aggregate drift**: Mitigated by TASK-209 LogXP using a single transaction for all three writes (xp_events insert + current_xp update + current_level update).
- **R-004 Level gate bypass**: Mitigated by explicit acceptance criteria on TASK-202, TASK-211, and TASK-213 requiring EffectiveLevel computation in Go handlers, not templates.

---

## Summary: Task Dependency Graph

```
Phase 1 (all TASK-1xx):

TASK-101 (scaffold)
  ├── TASK-102 (Templ/HTMX)
  │   └── TASK-103 (Tailwind)
  │       └── TASK-113 (app shell + nav) ─────────────────┐
  ├── TASK-104 (local dev setup)                          │
  │   └── TASK-105 (migration tooling)                    │
  │       └── TASK-106 (users table migration)            │
  │           ├── TASK-107 (user_ai_keys migration)       │
  │           └── TASK-108 (JWT middleware)               │
  │               ├── TASK-109 (user profile handler)     │
  │               ├── TASK-110 (login/register handlers)  │
  │               └── TASK-111 (encryption service) ──────┤
  │                   └── TASK-112 (key storage handler)  │
  ├── TASK-115 (xpcurve package) [parallel]               │
  └── TASK-114 (error/loading states) [depends on 113]   │
                                                          ▼
                          PHASE 1 COMPLETE (all 1xx done + passing)

Phase 2 (all TASK-2xx):

TASK-201 (skills/xp_events/blocker_gates schema)
  └── TASK-202 (skill service + repository)
      └── TASK-203 (skill CRUD handlers + templates)
          ├── TASK-204 (3-step creation flow + level picker)  ──► TASK-212 (AI calibration)
          │                                                        [TASK-212 also depends on TASK-202]
          │
          └── [TASK-209 depends on TASK-201, TASK-202, TASK-115 — parallel track with TASK-204]
              Note: TASK-209 and TASK-204 are parallel tracks, both depending on TASK-202.
              TASK-209 does NOT depend on TASK-203.

TASK-201 + TASK-202 + TASK-115
  └── TASK-209 (XP write service — transactional)
      └── TASK-210 (quick-log bottom sheet UI) [also depends on TASK-203, TASK-113]
          ├── TASK-215 (real dashboard)
          └── TASK-211 (skill detail progression display) [also depends on TASK-203, TASK-115]
              └── TASK-213 (blocker gate visibility + first-hit modal) [also depends on TASK-203, TASK-210]
                  └── TASK-214 (Phase 2 integration acceptance tests)
                      │
                  PHASE 2 COMPLETE
```

---

## Handoff

### What changed in this pass

- Full Phase 1 backlog defined: 15 task slices (TASK-101 through TASK-115)
- Full Phase 2 backlog defined: 14 task slices (TASK-201 through TASK-214; includes TASK-209 through TASK-214 for XP service, quick-log UI, progression display, AI calibration, gate UI, integration tests)
- Every task includes: what it builds, what it depends on, what it enables, and explicit acceptance criteria
- All key acceptance criteria from architecture.md and ux-spec.md are carried forward explicitly:
  - D-019 three-tap path: explicit AC on TASK-210 and TASK-214 EC-3
  - D-018 starting_level <= 99 server-side validation: explicit AC on TASK-203, TASK-204
  - D-020 tier color system applied consistently: explicit AC on TASK-211
  - D-022 tier transition modal fires on every tier-boundary crossing: explicit AC on TASK-211
  - D-021 gate section replaces XP bar: explicit AC on TASK-213
  - first_notified_at IS NULL check: explicit AC on TASK-213
  - R-003 three-way transactional XP write: explicit AC on TASK-209
  - R-004 EffectiveLevel in handler not template: explicit AC on TASK-202, TASK-211, TASK-213
  - D-012 email/password only: explicit AC on TASK-109, TASK-110
  - D-015 encryption constraints: explicit AC on TASK-111, TASK-112
- Supabase Auth trigger manual setup documented in TASK-106 (not a migration file)
- feature-tracker.md updated: all release-1 features advanced to ready-for-build

### What remains open

| Item | Owner | Priority |
|---|---|---|
| Production secrets-manager selection | delivery-agent / ops | Medium — must be resolved before production deployment of F-003; does not block Phase 1 build |
| Phase 2 task numbering | delivery-agent | Resolved — tasks are TASK-201 through TASK-214; all IDs are unique |
| Phase 3+ planning | planning-agent (future pass) | Low — fully deferred; do not plan until Phase 2 is in production |
| NutriLog entity detail | architecture-agent (Phase 4) | Low — fully deferred; boundary is reserved |

### What the review-agent should do next (Step 6)

The review-agent is unblocked and should:

1. **Verify backlog completeness**: confirm that every Phase 2 exit criterion maps to at least one task's acceptance criteria. The mapping is:
   - EC-1 → TASK-203, TASK-204
   - EC-2 → TASK-212 (AI degradation ACs)
   - EC-3 → TASK-210 (3-tap path AC)
   - EC-4 → TASK-209 (transactional write ACs)
   - EC-5 → TASK-115 (xpcurve ACs), TASK-211 (display ACs)
   - EC-6, EC-7 → TASK-213 (gate visibility ACs)
   - EC-8 → TASK-203 (CRUD ACs)
   - EC-9 → TASK-214 (mobile integration test)
   - EC-10 → TASK-214 (no completion UI audit)

2. **Check for scope creep**: confirm that no task in this backlog builds a deferred feature (F-007, F-009b, F-010, F-011, F-012, any NutriLog feature).

3. **Verify constraint carry-forward**: confirm that each of the following has an explicit AC in the backlog:
   - D-019 three-tap primary path (TASK-210, TASK-214)
   - D-018 starting_level <= 99 server-side (TASK-203, TASK-204)
   - D-020 tier color consistency (TASK-211)
   - D-022 tier transition modal on every tier crossing (TASK-211)
   - D-021 gate section replaces XP bar (TASK-213)
   - first_notified_at IS NULL gate check (TASK-213)
   - R-003 three-way XP transaction (TASK-209)
   - D-012 email/password only (TASK-110)

4. **Flag any gaps or conflicts** between the backlog and the architecture.md / ux-spec.md source documents.

5. **Confirm the delivery-agent can start Phase 1 with TASK-101**: no further planning input is needed to begin.
