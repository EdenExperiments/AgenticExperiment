Well# Architecture — Domain Model, Schema Design, and Integration Contracts

Last updated: 2026-03-15 (architecture-agent: initial pass — XP curve confirmed as D-014, A-001 confirmed as D-015, full domain model defined, NutriLog boundary reserved, integration contracts established; revised 2026-03-15 — D-014 tier structure updated: Master tier now starts at level 100, Veteran tier added at levels 60–99, Expert extended to levels 30–59, MaxLevel raised to 200, D-016 added)

---

## 0. Critical-Path Resolution First: XP Curve Shape (D-013 → D-014)

This section is addressed first because Phase 2 schema work is hard-gated on it.

### Requirement recap

D-013 confirms: non-linear XP curve, increasing cost per level. Exact shape left to architecture-agent.

### Candidate functions

Two candidate formulas are evaluated below with XP thresholds at representative levels. "XP to reach level N" means the total cumulative XP a user must have accumulated to be considered at level N.

**Candidate A — Quadratic: `XP(N) = base × N²`**

Using `base = 100`:

| Level | XP to reach level | XP gap from previous level |
|-------|-------------------|---------------------------|
| 1     | 100               | 100 (starting level)      |
| 5     | 2 500             | 900                       |
| 10    | 10 000            | 1 900                     |
| 20    | 40 000            | 3 900                     |
| 30    | 90 000            | 5 900                     |
| 50    | 250 000           | 9 900                     |

Growth shape: uniform quadratic. The gap between consecutive levels grows by a constant 200 XP each time (linear gap growth). This is easy to reason about and simple to implement. However, the curve feels somewhat mechanical — early levels feel too fast, late levels scale without bound in a way that may feel arbitrary at 50+.

**Candidate B — Polynomial with floor: `XP(N) = 50 × (N^2.5)`**

Using `multiplier = 50`, exponent `2.5`:

| Level | XP to reach level (rounded) | XP gap from previous level |
|-------|------------------------------|---------------------------|
| 1     | 50                           | 50                        |
| 5     | 2 795                        | 1 009                     |
| 10    | 15 811                       | 3 567                     |
| 20    | 89 443                       | 10 023                    |
| 30    | 246 545                      | 20 562                    |
| 50    | 883 883                      | 52 341                    |

Growth shape: the gap between levels grows super-linearly, meaning each successive level is meaningfully harder than the one before, and the increasing difficulty accelerates. This better models real-world skill mastery where the gap between intermediate and advanced is far larger than the gap between novice and intermediate.

**Recommendation: Candidate A (Quadratic) with a per-tier base multiplier**

Pure polynomial curves at exponent 2.5 produce very large numbers at high levels which complicate UI display and may feel obscure to users. A quadratic curve with tier-based scaling is the recommended approach because:

1. It is easy to explain to users ("each level costs 200 XP more than the previous one").
2. It produces clean numbers at every level.
3. Tier-based base multipliers allow the curve to steepen naturally at milestone tiers (levels 10, 20, 30) without a single complex formula.
4. It is straightforward to implement in Go without floating-point precision concerns.

**Confirmed formula:**

```
XP_to_reach_level(N) = base_multiplier(tier(N)) × N²

Where tier(N):
  - Levels 1–9:    base_multiplier = 100   (Tier 1: Novice)
  - Levels 10–19:  base_multiplier = 120   (Tier 2: Apprentice)
  - Levels 20–29:  base_multiplier = 150   (Tier 3: Journeyman)
  - Levels 30–59:  base_multiplier = 200   (Tier 4: Expert)
  - Levels 60–99:  base_multiplier = 260   (Tier 5: Veteran)
  - Levels 100+:   base_multiplier = 350   (Tier 6: Master)
```

Representative thresholds under the confirmed formula:

| Level | XP to reach level | XP gap from previous level | Tier        |
|-------|-------------------|---------------------------|-------------|
| 1     | 100               | 100                       | Novice      |
| 5     | 2 500             | 900                       | Novice      |
| 9     | 8 100             | 1 700                     | Novice      |
| 10    | 12 000            | 3 900 (tier jump)         | Apprentice  |
| 20    | 60 000            | 16 680 (tier jump)        | Journeyman  |
| 29    | 126 150           | 8 700                     | Journeyman  |
| 30    | 180 000           | 53 850 (tier jump)        | Expert      |
| 60    | 936 000           | 239 800 (tier jump)       | Veteran     |
| 100   | 3 500 000         | 951 740 (tier jump)       | Master      |
| 150   | 7 875 000         | 787 500                   | Master      |
| 200   | 14 000 000        | 1 400 000                 | Master      |

Tier transition jumps are intentional. They represent milestone gates and correspond to the blocker gate levels (9, 19, 29) defined in the product requirements. The blocker gates gate these tier transitions, so a user cannot advance from Novice to Apprentice without completing the level-9 blocker challenge. The Expert→Veteran jump at level 60 and the Veteran→Master jump at level 100 are the largest in the system and reflect the intentional design that Master is an elite long-term achievement.

**Known UX risk — tier-boundary XP jump:** The XP gap at tier boundaries is noticeably larger than the gaps within a tier. The most significant jumps occur at levels 10, 20, 30, 60, and 100. The jump into Master tier at level 100 (~951,740 XP above level 99) is by far the largest in the system and is intentional — Master is meant to represent years of consistent daily use, not a reachable short-term goal. The ux-agent should design visual affordances — for example, tier name displays, upcoming tier previews, and contextual callouts when a user enters the Veteran tier — so users understand these jumps are intentional and tied to the tier progression model. The Master tier threshold in particular should be presented to users as an aspirational milestone rather than a near-term target.

**This recommendation is confirmed as decision D-014.** D-013 is considered resolved by this entry. See decision-log.md.

---

## 1. A-001 Evaluation: Claude API Key Encryption (A-001 → D-015)

### The question

A-001 assumed AES-256-GCM envelope encryption at the Go application layer. The architecture-agent is asked to evaluate whether Supabase Vault or a Go KMS library is preferable.

### Evaluation

**Option 1: AES-256-GCM at the Go application layer (A-001 original)**

- The master key lives in an environment variable or a Go-compatible secret manager (e.g., HashiCorp Vault, AWS Secrets Manager, or a simple env var in early development).
- Each user gets a per-user data encryption key (DEK), itself AES-256-GCM encrypted by the master key.
- The Go process decrypts the DEK at request time, uses it to decrypt the Claude API key, performs the API call, and discards the plaintext.
- Key rotation: re-encrypt per-user DEKs under the new master key; old DEKs remain readable until migration completes.

Strengths: self-contained in the Go process; no additional managed service; straightforward to test; portable across hosting providers; audit trail controlled by the application.

Weaknesses: master key rotation requires a background migration job; if env var management is weak, the master key could be exposed; requires the application developer to correctly implement nonce/IV generation and ciphertext serialization.

**Option 2: Supabase Vault**

Supabase Vault is a PostgreSQL extension (`pgsodium`) that encrypts column values using a server-managed key stored in the Supabase infrastructure. Keys are managed by Supabase and are not accessible to application code.

Strengths: zero key management in the application; encryption happens at the database layer; Supabase manages the root key.

Weaknesses: the Go application layer has no control over key rotation timing; Supabase Vault is a managed dependency — if the project migrates away from Supabase, vault-encrypted data requires a migration path; the vault key is owned by Supabase, not by the application operator; the decryption surface moves to the database session, meaning any process with a Supabase service-role connection can decrypt data, which is a broader trust boundary than a single Go process holding the master key; Vault encryption is opaque to the application and harder to unit-test.

**Option 3: Go KMS library (e.g., tink-go or AWS KMS / GCP KMS)**

Google Tink provides a well-audited Go envelope encryption library. AWS KMS or GCP KMS provides a hosted key store if the project already uses that cloud provider. For a project at this stage, this adds significant operational overhead with no meaningful benefit over a well-implemented AES-256-GCM approach in Go — unless the deployment environment already uses a KMS.

### Recommendation

**Confirm A-001 as the approach**, with one clarification: the master key must not live in a bare environment variable in production. Instead:

- Development: environment variable is acceptable.
- Production: master key must be loaded from a secrets manager at startup (e.g., a mounted Kubernetes secret, AWS Secrets Manager, GCP Secret Manager, or HashiCorp Vault). The Go application reads the master key once at startup and holds it in memory only.

Rationale: Supabase Vault tightly couples key management to Supabase as an infrastructure dependency. For a product that may eventually self-host or migrate providers, that coupling is undesirable. The Go-layer AES-256-GCM approach satisfies D-009, is fully testable, and keeps decryption within a narrow Go process boundary. A Go KMS library adds operational complexity not warranted at this stage.

**This is confirmed as decision D-015.** A-001 is retired and superseded.

---

## 2. Domain Model: LifeQuest MVP (Release 1)

### Entity Overview

The LifeQuest MVP requires four core entity families:

1. **users** — identity and profile, owned by Supabase Auth with a mirror row in PostgreSQL
2. **skills** — the user-created skill objects
3. **xp_events** — the append-only log of XP-granting activities
4. **blocker_gates** — the gate definitions attached to specific level thresholds

Note: there is no `skill_levels` table. Levels are derived at runtime by the Go `LevelForXP` function in the `xpcurve` package (see the Level computation helper section below). No persistent level configuration is stored.

---

### Entity: `users`

The application maintains a `users` table that mirrors Supabase Auth's `auth.users` table. The mirror row is created automatically by a Supabase Auth webhook or database trigger on new user signup.

**Purpose:** store application-layer profile data; provide a FK anchor for all user-owned records.

```sql
CREATE TABLE public.users (
    id            UUID PRIMARY KEY,             -- mirrors auth.users.id exactly
    email         TEXT NOT NULL UNIQUE,          -- denormalised from auth.users for app-layer queries
    display_name  TEXT,                          -- user-settable display name; nullable
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Constraints:**
- `id` is set by Supabase Auth; not generated by the application.
- Row-level security (RLS) must enforce that each user can only read and update their own row.
- `email` is denormalised here for convenience; the authoritative email lives in `auth.users`.

**Application owns:** `display_name`, `updated_at`. Supabase Auth owns: `id`, `email` (authoritative copy), password hash, session tokens, MFA state.

---

### Entity: `user_ai_keys`

Stores the encrypted Claude API key per user.

```sql
CREATE TABLE public.user_ai_keys (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    encrypted_dek   BYTEA NOT NULL,    -- per-user DEK encrypted under master key (AES-256-GCM)
    encrypted_key   BYTEA NOT NULL,    -- Claude API key encrypted under the per-user DEK (AES-256-GCM)
    key_hint        TEXT,              -- last 4 characters of key, plaintext, for UI display only
    validated_at    TIMESTAMPTZ,       -- timestamp of last successful test-decrypt + format validation at save time
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_user_ai_keys_user UNIQUE (user_id)  -- one key per user
);
```

**Key hierarchy (from D-015 / A-001):**
```
master_key (env/secrets-manager, in-memory only)
  └─ encrypted_dek (stored in DB, decrypted by master_key at request time)
       └─ encrypted_key (stored in DB, decrypted by DEK at request time)
            └─ plaintext Claude API key (never stored; used only in the Go process)
```

**Constraints:**
- `encrypted_dek` and `encrypted_key` store `[nonce || ciphertext]` concatenated; the Go layer splits them by the known nonce size (12 bytes for AES-256-GCM).
- `key_hint` is derived from the plaintext at save time and stored as the only visible identifier; never more than the last 4 characters.
- `validated_at` is updated on save only; it is not a real-time validity indicator. Do not use it to gate API calls — always attempt decryption at call time.
- RLS: only the owning user can read their row; the Go service role can write.
- Validation at save time: decrypt both layers in the Go process; confirm the result matches `^sk-ant-[A-Za-z0-9-_]+$`; reject with an error if not.

---

### Entity: `skills`

The user-created skill object. One user may own many skills.

```sql
CREATE TABLE public.skills (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    description     TEXT,
    current_level   SMALLINT NOT NULL DEFAULT 1 CHECK (current_level >= 1),
    current_xp      INTEGER NOT NULL DEFAULT 0 CHECK (current_xp >= 0),
    -- XP continues to accrue even when a blocker gate is active (D-007).
    -- current_level is capped at the gate threshold until the blocker is cleared.
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_skills_user_id ON public.skills(user_id);
```

**Fields:**
- `current_level`: the level actually displayed. Does not advance past a blocker gate threshold until the gate is cleared (application logic, not DB constraint). **`current_level` is a denormalised cache of the computed level.** It must be updated in the same transaction as every `xp_events` insert: the service layer must call `LevelForXP(current_xp)` and write both `current_xp` and `current_level` atomically. See R-003 in decision-log.md for the three-way sync requirement.
- `current_xp`: total cumulative XP. Derived from the sum of `xp_events` but stored as a denormalised aggregate for fast reads. Must be kept consistent with `xp_events` — updated atomically in the same transaction as each new `xp_event` row.
- `is_active`: soft-delete flag; deleted skills are set inactive rather than hard-deleted, preserving log history.

**Constraints:**
- Skill name is required and must not be blank.
- A user may have multiple skills with the same name (no uniqueness constraint on `(user_id, name)` — product-level concern, not enforced at the DB).
- RLS: users can only read and modify their own skills.

---

### Entity: `xp_events`

The append-only log of XP-granting activity. This is the authoritative record; `skills.current_xp` is a denormalised aggregate.

```sql
CREATE TABLE public.xp_events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    skill_id        UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    -- user_id is denormalised here to simplify RLS and query filtering
    xp_delta        INTEGER NOT NULL CHECK (xp_delta > 0),
    -- For release 1, only positive XP deltas are supported.
    -- XP decay (negative delta) is deferred (product-requirements.md).
    log_note        TEXT,               -- optional free-text note; quick log leaves this null
    logged_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_xp_events_skill_id ON public.xp_events(skill_id);
CREATE INDEX idx_xp_events_user_id  ON public.xp_events(user_id);
CREATE INDEX idx_xp_events_logged_at ON public.xp_events(skill_id, logged_at DESC);
```

**Fields:**
- `xp_delta`: always positive in release 1. The CHECK constraint enforces this.
- `log_note`: free text, nullable. Quick logging (F-006) leaves this null. Detailed natural-language logs (F-007, deferred) will populate this field when implemented — no schema change required.
- `logged_at`: the time the activity occurred (user-provided or defaulted to now). Distinct from `created_at` (server insert time) to support future backdated entries.

**Invariant:** `skills.current_xp` must always equal `SUM(xp_events.xp_delta) WHERE skill_id = ?`. The application must update both in a single transaction.

**Idempotency / double-submission guard (Phase 2):** The Phase 2 XP log handler must implement idempotency protection against double-POST on slow connections (common in HTMX apps). Recommended approach: use HTMX `hx-disabled-elt` on the submit button to disable it on the first click, plus a server-side 1-second dedup window per `(skill_id, user_id)` — reject a new `xp_events` insert if a row with the same `(skill_id, user_id)` was inserted within the last second.

---

### Entity: `blocker_gates`

Gate definitions. A gate is a challenge that must be completed before level advancement past a specific threshold is permitted. In release 1 these are visible but not completeable (D-010).

```sql
CREATE TABLE public.blocker_gates (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    skill_id            UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
    gate_level          SMALLINT NOT NULL CHECK (gate_level >= 1),
    -- The level at which progression becomes locked (e.g., 9, 19, 29).
    -- current_level is capped at (gate_level) until is_cleared = TRUE.
    title               TEXT NOT NULL,
    description         TEXT NOT NULL,
    -- Human-readable challenge description shown to the user.
    is_cleared          BOOLEAN NOT NULL DEFAULT FALSE,
    -- FALSE in release 1 for all gates (no completion flow, D-010).
    -- The column exists so Phase 3 (F-009b) can flip it without a schema migration.
    cleared_at          TIMESTAMPTZ,
    first_notified_at   TIMESTAMPTZ,
    -- NULL until the first-hit gate notification modal has been shown to the user.
    -- Set to NOW() by the XP log handler in the same transaction that returns the
    -- full-screen notification fragment. Once set, subsequent XP log events for this
    -- gate return the standard post-log toast instead. Never reset after being set.
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_blocker_per_skill_level UNIQUE (skill_id, gate_level)
);

CREATE INDEX idx_blocker_gates_skill_id ON public.blocker_gates(skill_id);
```

**Fields:**
- `gate_level`: the threshold at which the gate activates. When `skills.current_xp` is sufficient to advance to `gate_level + 1` but `is_cleared = FALSE`, the level display caps at `gate_level`.
- `description`: the challenge the user must complete. Set during skill creation (optionally AI-suggested, D-011).
- `is_cleared` / `cleared_at`: both false/null in release 1 for all gates. Schema includes them so Phase 3 (blocker completion flow, F-009b) requires no migration.
- `first_notified_at`: NULL until the first-hit gate notification modal has been shown. The Go XP log handler checks `first_notified_at IS NULL` when a gate threshold is first reached, returns the full-screen notification fragment, and sets this column to `NOW()` in the same transaction. Subsequent log events for the same gate find a non-null value and return the standard toast. This avoids any client-side or session-based tracking for the one-time notification. See ux-spec.md Section 6.3.

**Default gate levels per product requirements:** 9, 19, 29 (and equivalents at higher tier transitions). These are created as rows in `blocker_gates` when a skill is created. The gate description is populated by the user or AI-suggested during skill creation.

**Non-AI creation defaults:** When a skill is created without AI calibration (or when AI calibration is skipped/unavailable), the delivery-agent must insert gate rows with standard placeholder values: `title = "Level {gate_level} Gate"` and `description = "Reach this level to unlock the next stage of your skill journey."` (where `{gate_level}` is substituted with the actual gate level number, e.g. 9, 19, 29). These values can be overridden by AI calibration output if the user opts in to AI assistance.

**Application logic for level advancement:**

```
effective_level(skill) =
  let raw_level = level_for_xp(skill.current_xp)   -- computed from XP curve (D-014)
  in
    for each gate in skill.blocker_gates where gate.is_cleared = FALSE:
      if raw_level > gate.gate_level:
        return gate.gate_level   -- cap at gate
    return raw_level             -- no active gate, show real level
```

---

### Level computation helper

The XP curve (D-014) is implemented as a pure function in Go. No table is needed — the formula is deterministic:

```go
// TierMultiplier returns the base multiplier for a given level.
func TierMultiplier(level int) int {
    switch {
    case level < 10:
        return 100
    case level < 20:
        return 120
    case level < 30:
        return 150
    case level < 60:
        return 200
    case level < 100:
        return 260
    default:
        return 350
    }
}

// XPToReachLevel returns the cumulative XP required to reach a given level.
func XPToReachLevel(level int) int {
    return TierMultiplier(level) * level * level
}

// MaxLevel is the hard upper bound for level computation. The LevelForXP loop
// will not advance beyond this value regardless of accumulated XP.
// Master tier starts at level 100; MaxLevel is set to 200 to give Master-tier
// users continued progression headroom. The top 100 levels are all Master tier.
const MaxLevel = 200

// LevelForXP returns the highest level whose XP threshold is <= totalXP,
// capped at MaxLevel.
// This is O(level_count) but level counts are small; a binary search can be
// substituted if profiling shows it matters.
func LevelForXP(totalXP int) int {
    level := 1
    for level < MaxLevel && XPToReachLevel(level+1) <= totalXP {
        level++
    }
    return level
}
```

This function is the single source of truth for level computation. It lives in a dedicated `xpcurve` package and is tested exhaustively as part of the Phase 1 exit criteria gate.

---

## 3. NutriLog Domain Boundary (Placeholder)

NutriLog is deferred until after the LifeQuest core loop is in production (D-004). The following defines the boundary to prevent schema churn when NutriLog is added.

### Schema namespace reservation

All NutriLog tables will be prefixed `nl_` to keep them clearly separated from LifeQuest tables (`skills`, `xp_events`, `blocker_gates`) and platform tables (`users`, `user_ai_keys`).

### Anticipated top-level NutriLog entities (names only — not designed here)

- `nl_food_logs` — daily calorie and macro log entries
- `nl_weight_logs` — weight measurement records
- `nl_goals` — calorie, macro, and weight targets
- `nl_foods` — custom food registry (user-created and cached from external provider)
- `nl_meal_templates` — saved meal compositions

### Foreign key anchoring

All NutriLog tables will anchor to `public.users(id)` using the same `user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE` pattern. No LifeQuest table references a NutriLog table or vice versa in the base schema. Cross-app mechanics (F-020) will be implemented as a separate integration layer when that work begins.

### Food data provider boundary

The food data provider (Open Food Facts or equivalent) is an external service. The application:
- **Owns:** the `nl_foods` table (local cache of food data, user-created entries, nutritional overrides)
- **Does not own:** the external food database, barcode-to-nutrition mapping, or search index
- **Integration contract:** the application calls the external provider API at search/barcode-scan time, caches results into `nl_foods` with a `source` field (`'open_food_facts'` | `'user_defined'`), and uses only the local cache thereafter. If the external provider is unavailable, the user can still access previously cached foods and user-defined entries.

This boundary is documented here to avoid designing NutriLog now while ensuring the schema leaves the correct anchoring in place.

---

## 4. Integration Contracts

### 4.1 Supabase Auth

**What Supabase owns:**
- User identity records (`auth.users` table in the `auth` schema — not directly accessible to the application)
- Session tokens (JWTs), refresh tokens
- Password hashing and verification
- Email confirmation flow
- User creation, deletion, and deactivation

**What the application owns:**
- `public.users` mirror row (created via trigger on `auth.users` insert)
- All application-level profile data (`display_name`, preferences)
- All game data (skills, XP, gates, keys) anchored via `user_id → public.users.id`

**Integration pattern:**
1. Client sends credentials to Supabase Auth (via Supabase JS client or direct REST call).
2. Supabase returns a JWT access token.
3. The Go application validates the JWT on every request using Supabase's JWKS endpoint (cached, refreshed on key rotation).
4. The Go application extracts `sub` (= `auth.users.id`) from the validated JWT and uses it as the `user_id` for all database queries.
5. The Go application never stores session tokens; it reads them from the `Authorization: Bearer` header on each request.

**Go middleware responsibility:**
- Parse and validate JWT signature and expiry.
- Extract `user_id` UUID and inject into request context.
- Return HTTP 401 for missing, invalid, or expired tokens.
- All downstream handlers read `user_id` from context; none accept user ID from request body or URL parameter (IDOR prevention).

**Supabase Auth does not own:**
- Encryption of Claude API keys (Go application layer only, per D-015)
- Game progression logic
- Any cross-app business logic

#### 4.1.1 Trigger: `auth.users` → `public.users` mirror row

The `public.users` mirror row must be created automatically when a new user registers. This is implemented as a PostgreSQL trigger function on `auth.users`.

**Important migration note:** `golang-migrate` (used for all other schema changes) cannot access the `auth` schema — it runs with a role that is restricted to the `public` schema. This trigger **must be created manually** via the Supabase dashboard (SQL Editor) or the Supabase Management API. It is not a file-based migration. The delivery-agent must document this as a one-time manual setup step in the deployment runbook.

The required SQL:

```sql
-- Step 1: Create the trigger function in the public schema.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.users (id, email, created_at, updated_at)
    VALUES (
        NEW.id,
        NEW.email,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

-- Step 2: Attach the trigger to auth.users.
-- Must be run in the Supabase SQL Editor (requires access to the auth schema).
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();
```

This trigger fires after every `INSERT` on `auth.users` and inserts the corresponding row into `public.users`. The `ON CONFLICT (id) DO NOTHING` guard prevents failures if the row somehow already exists. The `SECURITY DEFINER` attribute ensures the function executes with the privileges of its owner (the Supabase `postgres` superuser), not the calling role.

### 4.2 PostgreSQL (via Supabase-hosted PostgreSQL)

**What the application owns:**
- All DDL (schema definitions, migrations)
- All DML (queries, mutations via Go's `database/sql` or `pgx`)
- Row-level security policy definitions
- Indexes and query performance

**What Supabase owns (infrastructure):**
- Server provisioning, backup, and restore
- Connection pooling (PgBouncer)
- Network security and TLS
- The `auth` schema

**Application ↔ PostgreSQL contract:**
- The application uses `pgx/v5` (Go driver) with connection pooling via `pgx/v5/pgxpool`.
- All migrations are managed by the application using a migration tool (recommended: `golang-migrate/migrate` or `goose`); Supabase's dashboard migration UI is not used for schema changes.
- All queries use parameterized statements; no string concatenation in SQL.
- The application connects with the `service_role` key only in the Go process (server-side); the `anon` key is never used server-side.
- RLS is enabled on all user-data tables. The Go application connects as the `service_role` but explicitly passes `user_id` via application logic, not via Supabase's RLS auto-injection (which relies on JWT context in direct client connections). RLS is a defence-in-depth layer, not the primary authorisation mechanism in the Go server path.

**Connection string management:**
- Database URL is loaded from environment at startup.
- Connection pool max size: 10 connections (configurable).
- Idle connection timeout: 5 minutes.

### 4.3 Claude API

**What Anthropic owns:**
- The Claude model and inference infrastructure
- The API key authentication mechanism
- Rate limiting and quota enforcement
- Model versioning

**What the application owns:**
- Prompt construction and context assembly
- Streaming response handling
- Error handling, retry logic, and timeout enforcement
- The user's API key (encrypted at rest per D-015)

**Request flow for Claude API calls:**

```
1. Handler receives authenticated request (user_id in context).
2. Handler calls KeyService.GetDecryptedKey(ctx, user_id):
   a. Load user_ai_keys row by user_id.
   b. Decrypt DEK using master key (AES-256-GCM).
   c. Decrypt Claude API key using DEK (AES-256-GCM).
   d. Return plaintext key (in-process only; not logged, not returned to client).
3. Handler constructs Claude API request with:
   - Model: claude-3-5-sonnet (or latest recommended; configurable)
   - System prompt: application context (skill description, current level, recent XP history)
   - User turn: the specific request (calibration, blocker suggestion, etc.)
   - Max tokens: feature-appropriate limit
   - Stream: true (for UI streaming)
4. Application calls Anthropic API with Authorization: Bearer <plaintext_key>.
5. Response is streamed back to the Go handler.
6. Go handler streams HTMX-compatible fragments to the client via SSE or chunked response.
7. Plaintext key reference is discarded at end of function scope (not stored, not logged).
```

**Error handling:**
- If `user_ai_keys` row does not exist: return feature-specific degraded state (e.g., skip AI calibration, show manual-only path). Never block the user from non-AI flows.
- If decryption fails (corrupt data, wrong master key): log error server-side (key ID only, not ciphertext); return generic error to client.
- If Anthropic returns 401: treat as invalid key; surface "your API key appears to be invalid" in UI; prompt user to update key.
- If Anthropic returns 429: apply exponential backoff (max 2 retries); surface "AI is busy, please try again" if retries exhausted.
- If Anthropic returns 5xx: single retry after 1 second; surface error if retry fails.
- Timeout: 30 seconds for non-streaming calls; 60 seconds for streaming calls.

**What the application does not do with Claude:**
- Send the plaintext key to the client under any circumstances.
- Cache Claude responses in a way that associates them with the user's plaintext key.
- Use the key for any purpose other than the user's own AI-assisted features.

### 4.4 Food Data Provider (NutriLog — boundary only)

This integration is not built in release 1. The boundary is defined here to prevent schema assumptions that would cause churn.

**Expected external provider:** Open Food Facts (free, open-licensed food database with barcode support). Alternative: Nutritionix API (paid, more comprehensive).

**Contract boundary:**
- Application queries provider at: food search by name, barcode lookup.
- Provider returns: nutritional data per 100g or per serving.
- Application caches result into `nl_foods` with `source = 'open_food_facts'`.
- Application never re-fetches the same barcode from the provider if a local cache entry exists.
- If the provider is unavailable, the food log flow must still work using cached/user-defined entries.

---

## 5. Schema Versioning and Migration Tooling

**Chosen tool:** `golang-migrate/migrate` with PostgreSQL driver.

Rationale: well-maintained, widely used in the Go ecosystem, supports numbered up/down migrations as plain `.sql` files, integrates with the application binary for programmatic migrations, and does not require a separate binary to be installed in CI.

**Migration file structure:**
```
db/
  migrations/
    000001_create_users.up.sql
    000001_create_users.down.sql
    000002_create_user_ai_keys.up.sql
    000002_create_user_ai_keys.down.sql
    000003_create_skills.up.sql
    000003_create_skills.down.sql
    000004_create_xp_events.up.sql
    000004_create_xp_events.down.sql
    000005_create_blocker_gates.up.sql
    000005_create_blocker_gates.down.sql
```

**Migration rules:**
- Every schema change is a new numbered migration pair (.up.sql / .down.sql).
- No DDL is executed outside migration files.
- Migrations run automatically at application startup before the server accepts traffic.
- The `schema_migrations` table (managed by golang-migrate) tracks the current version.

---

## 6. Security Constraints Summary

All of the following must remain true in any implementation. These are the binding constraints from D-009 and D-015:

1. The plaintext Claude API key never appears in: HTTP responses, HTML templates, JavaScript, cookies, browser storage, server logs, or database rows.
2. The master key never appears in: the database, version control, or server logs.
3. Decryption of the Claude API key happens only inside the Go process, only at request time, and only when an AI feature is being exercised.
4. The Go process discards the plaintext key reference immediately after the Claude API call completes.
5. Key validation (test-decrypt + format check) is performed at key-save time. An invalid key is rejected with a user-visible error before any ciphertext is stored.
6. RLS is enabled on `user_ai_keys` as a defence-in-depth measure.
7. All database connections use TLS.
8. All application endpoints that touch user data require a valid, non-expired JWT.

---

## 7. New Technical Dependencies and Risks

### New dependencies introduced by this architecture pass

The following are added to the dependency registry:

| Dependency | Purpose | Risk |
|---|---|---|
| `pgx/v5` (Go PostgreSQL driver) | Primary database driver | Low — mature, widely used |
| `golang-migrate/migrate` | Schema migration management | Low — well-maintained |
| Supabase JWKS endpoint | JWT validation in Go middleware | Medium — Go app must cache and refresh JWKS; unavailability breaks auth |
| `crypto/aes` + `crypto/cipher` (stdlib) | AES-256-GCM encryption | Low — Go stdlib, no external dependency |

### New risks identified

The following risk entries are added to feature-tracker.md and decision-log.md:

**Risk R-001: Supabase JWKS cache staleness**
If the Go process caches the Supabase JWKS and Supabase rotates its signing keys, the cache must be invalidated. Mitigation: cache JWKS with a TTL of 1 hour; on JWT validation failure due to unknown key ID, re-fetch JWKS once before rejecting the token.

**Risk R-002: Nonce reuse in AES-256-GCM**
AES-256-GCM is catastrophically broken if a nonce is reused with the same key. Mitigation: use `crypto/rand` to generate a fresh 12-byte nonce for every encryption operation; never derive nonces deterministically or from counters.

**Risk R-003: XP aggregate drift**
`skills.current_xp` is a denormalised aggregate of `xp_events`. If a write to `skills` fails after a write to `xp_events`, they drift. Mitigation: always update both in a single `BEGIN` / `COMMIT` transaction. Add a reconciliation function that can be run as a maintenance query: `UPDATE skills SET current_xp = (SELECT COALESCE(SUM(xp_delta), 0) FROM xp_events WHERE skill_id = skills.id)`.

**Risk R-004: Level gate logic bypass**
If the level-cap logic is implemented only in the UI layer (template), a client that constructs direct API requests could observe or act on an uncapped level. Mitigation: the effective level computation must live in the Go handler / service layer, not in the Templ template. Templates receive the already-capped level value.

---

## 8. Decisions Produced by This Document

The following confirmed decisions are added to decision-log.md:

- **D-014**: XP curve shape confirmed as quadratic with tier-based base multipliers. (Resolves D-013.) Revised 2026-03-15: tier structure updated — Master now starts at level 100, Veteran tier added at levels 60–99, Expert extended to levels 30–59, MaxLevel raised to 200.
- **D-015**: Claude API key encryption confirmed as AES-256-GCM Go-layer envelope encryption with a production secrets-manager requirement for the master key. (Supersedes A-001.)
- **D-016**: Master tier starts at level 100. Reaching Master requires years of consistent daily use and is intended as an elite aspirational milestone. MaxLevel is set to 200.

---

## 9. Handoff

### What changed in this pass

- D-014 added: XP curve shape fully confirmed with exact formula, tier multipliers, and representative thresholds. Phase 2 schema work (step 2a) is now unblocked.
- D-015 added: A-001 upgraded to a confirmed decision. F-003 build is now unblocked pending only Phase 1 completion.
- Full domain model defined for all release-1 entities: `users`, `user_ai_keys`, `skills`, `xp_events`, `blocker_gates`.
- NutriLog schema namespace reserved (`nl_` prefix); foreign key anchor pattern defined; food data provider boundary documented.
- Integration contracts written for: Supabase Auth, PostgreSQL, Claude API, food data provider (boundary only).
- Migration tooling approach confirmed (`golang-migrate`).
- Four implementation risks identified (R-001 through R-004).
- `decision-log.md` and `feature-tracker.md` updated.

### What remains open

| Item | Owner | Priority |
|---|---|---|
| UX: shared app shell navigation model | ux-agent | High — blocks Phase 1 shell build (1e) |
| UX: manual starting-level selection interaction | ux-agent | High — blocks Phase 2 skill creation (2b) |
| UX: blocker gate visibility screen design | ux-agent | High — blocks Phase 2 blocker UI (2f) |
| Planning: Phase 1 + Phase 2 ticket breakdown | planning-agent | High — after ux-agent completes Step 4 |
| F-009b (blocker completion flow) schema detail | architecture-agent (Phase 3) | Low — deferred, but the schema hook (`is_cleared`, `cleared_at`) is already present |
| NutriLog entity detail | architecture-agent (Phase 4) | Low — fully deferred; boundary is reserved |
| Production secrets-manager selection | delivery-agent / ops | Medium — must be resolved before production deployment of F-003 |

### What the ux-agent should do next (Step 4)

The ux-agent is unblocked and should now deliver:

1. **Shared shell navigation model** — define the global nav, mobile bottom bar vs. hamburger, and how the user switches between LifeQuest and (future) NutriLog areas. The schema is ready; the shell needs the IA to proceed with F-001 build.

2. **Skill creation flow** — cover both paths:
   - Manual starting-level selection (required, must always be available): define the level-picker interaction. The architecture confirms levels 1–9 are Novice tier; this is visible information for the UX.
   - AI-assisted calibration (optional): define what the AI step looks like and how the flow degrades if the Claude key is absent.

3. **Quick XP log interaction** — three taps or fewer on mobile is the acceptance bar (Phase 2 exit criterion 3). Define what those three taps are.

4. **XP and level progression display** — define what the level/XP bar looks like; the tier names (Novice, Apprentice, Journeyman, Expert, Veteran, Master) are confirmed by D-014 / D-016 and should be surfaced in the UI. Master tier begins at level 100 and is an elite aspirational milestone; the UX should communicate this aspiration clearly.

5. **Blocker gate visibility screen** — define the information hierarchy: gate level, blocker description, locked progression indicator, accrued-but-locked XP indicator. The schema confirms `title`, `description`, and `is_cleared` are the available fields.

The ux-agent does not need to design the blocker completion flow (F-009b is deferred) or any NutriLog screens.
