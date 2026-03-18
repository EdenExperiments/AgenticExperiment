# LifeQuest Go API Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the Go API endpoints required for the LifeQuest React port: skills CRUD with XP/level progression, quick XP logging, blocker gate tracking, and AI skill calibration.

**Architecture:** New DB migration (005) extends the `skills` table and creates `xp_events` and `blocker_gates`. Repositories wrap all DB access. Handlers call repositories, compute effective levels via the existing `xpcurve` package, and return JSON. All XP writes are a single three-way transaction: `xp_events` insert + `skills.current_xp` update + `skills.current_level` update (R-003). Server routes are added in `server.go`.

**Tech Stack:** Go 1.25, chi v5, pgx/v5, golang-migrate, xpcurve package (already correct for 11 tiers / MaxLevel=200), httptest for endpoint tests.

---

## File Map

### New files
- `apps/api/db/migrations/000005_skills_xp_gates.up.sql` — add columns to skills, create xp_events + blocker_gates
- `apps/api/db/migrations/000005_skills_xp_gates.down.sql` — reversal
- `apps/api/internal/skills/skill_repository.go` — ListSkills, GetSkill, UpdateSkill, SoftDeleteSkill, CreateSkill (update existing)
- `apps/api/internal/skills/skill_repository_test.go` — unit tests (needs real DB — skip in CI; tag build_integration)
- `apps/api/internal/skills/xp_repository.go` — LogXP, GetRecentLogs, effectiveLevel
- `apps/api/internal/skills/xp_repository_test.go`
- `apps/api/internal/handlers/skill.go` — MODIFIED: add GET/PUT/DELETE handlers
- `apps/api/internal/handlers/skill_test.go` — MODIFIED: add tests for new handlers
- `apps/api/internal/handlers/xp.go` — XPHandler: POST /skills/{id}/xp
- `apps/api/internal/handlers/xp_test.go`
- `apps/api/internal/handlers/calibrate.go` — CalibrateHandler: POST /calibrate
- `apps/api/internal/handlers/calibrate_test.go`
- `apps/api/internal/server/server.go` — MODIFIED: register new routes

### Modified files
- `apps/api/internal/skills/skill_repository.go` — extend Skill struct, update CreateSkill, add list/get/update/delete
- `packages/api-client/src/types.ts` — add XPLogRequest, XPLogResponse, SkillDetail, BlockerGate, CalibrateRequest, CalibrateResponse
- `packages/api-client/src/client.ts` — add listSkills, getSkill, createSkill (update), logXP, calibrateSkill

---

## Chunk 1: Database Migration + Skill Repository

### Task 1: DB migration 000005 — extend skills + create xp_events + blocker_gates

**Files:**
- Create: `apps/api/db/migrations/000005_skills_xp_gates.up.sql`
- Create: `apps/api/db/migrations/000005_skills_xp_gates.down.sql`

- [ ] **Step 1: Write the up migration**

```sql
-- apps/api/db/migrations/000005_skills_xp_gates.up.sql

-- Extend skills with progression columns and soft-delete.
ALTER TABLE public.skills
    ADD COLUMN starting_level INT NOT NULL DEFAULT 1,
    ADD COLUMN current_xp     INT NOT NULL DEFAULT 0,
    ADD COLUMN current_level  INT NOT NULL DEFAULT 1,
    ADD COLUMN deleted_at     TIMESTAMPTZ;

CREATE INDEX skills_user_active ON public.skills (user_id) WHERE deleted_at IS NULL;

-- xp_events: immutable ledger of every XP log entry.
-- Soft-deleting a skill does NOT cascade-delete its events (preserve history).
CREATE TABLE public.xp_events (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    skill_id   UUID        NOT NULL REFERENCES public.skills(id),
    user_id    UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    xp_delta   INT         NOT NULL CHECK (xp_delta > 0),
    log_note   TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX xp_events_skill ON public.xp_events (skill_id, created_at DESC);

ALTER TABLE public.xp_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY xp_events_self_rw ON public.xp_events
    USING (user_id = current_setting('app.current_user_id', TRUE)::UUID);

-- blocker_gates: one row per tier boundary per skill (10 gates per skill, levels 9,19,...99).
-- Created automatically when a skill is created; descriptions are set to defaults or AI-generated.
CREATE TABLE public.blocker_gates (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    skill_id          UUID        NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
    gate_level        INT         NOT NULL,
    title             TEXT        NOT NULL DEFAULT '',
    description       TEXT        NOT NULL DEFAULT '',
    first_notified_at TIMESTAMPTZ,           -- NULL = never shown to user; set on first hit
    is_cleared        BOOL        NOT NULL DEFAULT FALSE,
    cleared_at        TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (skill_id, gate_level)
);

CREATE INDEX blocker_gates_skill ON public.blocker_gates (skill_id, gate_level);

ALTER TABLE public.blocker_gates ENABLE ROW LEVEL SECURITY;
-- Gates belong to skills which belong to users; access via skill ownership enforced in Go.
```

- [ ] **Step 2: Write the down migration**

```sql
-- apps/api/db/migrations/000005_skills_xp_gates.down.sql

DROP TABLE IF EXISTS public.blocker_gates;
DROP TABLE IF EXISTS public.xp_events;

ALTER TABLE public.skills
    DROP COLUMN IF EXISTS deleted_at,
    DROP COLUMN IF EXISTS current_level,
    DROP COLUMN IF EXISTS current_xp,
    DROP COLUMN IF EXISTS starting_level;
```

- [ ] **Step 3: Verify migration runs cleanly (requires local Supabase)**

```bash
cd apps/api && go run -tags migrate ./cmd/server/main.go
# Expected: server starts without error, /health returns 200
```

- [ ] **Step 4: Commit**

```bash
git add apps/api/db/migrations/
git commit -m "feat: migration 005 — skills progression columns + xp_events + blocker_gates"
```

---

### Task 2: Extend Skill struct and repository

**Files:**
- Modify: `apps/api/internal/skills/skill_repository.go`

The current `Skill` struct and `CreateSkill` function need updating. The `CreateSkill` function must:
1. Accept `startingLevel int` parameter
2. Set `current_xp = XPToReachLevel(startingLevel)`, `current_level = startingLevel`
3. Insert 10 blocker gates with default descriptions after creating the skill (same transaction)
4. Validate `startingLevel` is between 1 and 99 inclusive (D-018).

New functions: `ListSkills`, `GetSkill`, `UpdateSkill`, `SoftDeleteSkill`.

- [ ] **Step 1: Write tests first**

```go
//go:build integration

// apps/api/internal/skills/skill_repository_test.go
// Run with: cd apps/api && go test -tags integration ./internal/skills/...
// Requires TEST_DATABASE_URL pointing to a local Supabase instance.
// Requires a seed user row with id = '00000000-0000-0000-0000-000000000001'.
package skills_test

import (
    "context"
    "os"
    "testing"

    "github.com/google/uuid"
    "github.com/jackc/pgx/v5/pgxpool"
    "github.com/meden/rpgtracker/internal/skills"
    "github.com/meden/rpgtracker/internal/xpcurve"
)

func testDB(t *testing.T) *pgxpool.Pool {
    t.Helper()
    dsn := os.Getenv("TEST_DATABASE_URL")
    if dsn == "" {
        t.Skip("TEST_DATABASE_URL not set")
    }
    pool, err := pgxpool.New(context.Background(), dsn)
    if err != nil {
        t.Fatalf("open db: %v", err)
    }
    t.Cleanup(pool.Close)
    return pool
}

// seedUserID is a user that must exist in the test DB.
// Create it once with: INSERT INTO public.users(id,email) VALUES('00000000-0000-0000-0000-000000000001','test@test.com');
var seedUserID = uuid.MustParse("00000000-0000-0000-0000-000000000001")

func TestCreateSkill_SetsStartingLevel(t *testing.T) {
    db := testDB(t)
    skill, err := skills.CreateSkill(context.Background(), db, seedUserID,
        "Test Skill", "", "session", nil, 10, [10]string{})
    if err != nil {
        t.Fatalf("CreateSkill: %v", err)
    }
    if skill.StartingLevel != 10 {
        t.Errorf("starting_level: got %d want 10", skill.StartingLevel)
    }
    wantXP := xpcurve.XPToReachLevel(10)
    if skill.CurrentXP != wantXP {
        t.Errorf("current_xp: got %d want %d", skill.CurrentXP, wantXP)
    }
    if skill.CurrentLevel != 10 {
        t.Errorf("current_level: got %d want 10", skill.CurrentLevel)
    }
}

func TestCreateSkill_InsertsTenGates(t *testing.T) {
    db := testDB(t)
    skill, err := skills.CreateSkill(context.Background(), db, seedUserID,
        "Gate Test", "", "session", nil, 1, [10]string{})
    if err != nil {
        t.Fatalf("CreateSkill: %v", err)
    }
    gates, err := skills.GetBlockerGates(context.Background(), db, skill.ID)
    if err != nil {
        t.Fatalf("GetBlockerGates: %v", err)
    }
    if len(gates) != 10 {
        t.Fatalf("gate count: got %d want 10", len(gates))
    }
    want := [10]int{9, 19, 29, 39, 49, 59, 69, 79, 89, 99}
    for i, g := range gates {
        if g.GateLevel != want[i] {
            t.Errorf("gates[%d].gate_level: got %d want %d", i, g.GateLevel, want[i])
        }
        if g.Title == "" {
            t.Errorf("gates[%d].title must not be empty", i)
        }
    }
}

func TestCreateSkill_RejectsLevelAbove99(t *testing.T) {
    db := testDB(t)
    _, err := skills.CreateSkill(context.Background(), db, seedUserID,
        "Too High", "", "session", nil, 100, [10]string{})
    if err != skills.ErrStartingLevelTooHigh {
        t.Fatalf("expected ErrStartingLevelTooHigh, got %v", err)
    }
}

func TestListSkills_ExcludesSoftDeleted(t *testing.T) {
    db := testDB(t)
    skill, err := skills.CreateSkill(context.Background(), db, seedUserID,
        "Doomed Skill", "", "session", nil, 1, [10]string{})
    if err != nil {
        t.Fatalf("CreateSkill: %v", err)
    }
    if err := skills.SoftDeleteSkill(context.Background(), db, seedUserID, skill.ID); err != nil {
        t.Fatalf("SoftDeleteSkill: %v", err)
    }
    list, err := skills.ListSkills(context.Background(), db, seedUserID)
    if err != nil {
        t.Fatalf("ListSkills: %v", err)
    }
    for _, s := range list {
        if s.ID == skill.ID {
            t.Errorf("soft-deleted skill %s appeared in ListSkills", skill.ID)
        }
    }
}
```

Run: `cd apps/api && go test -tags integration ./internal/skills/...`
Expected: FAIL (functions not yet defined)

- [ ] **Step 2: Implement**

```go
// apps/api/internal/skills/skill_repository.go
package skills

import (
    "context"
    "errors"
    "fmt"
    "time"

    "github.com/google/uuid"
    "github.com/jackc/pgx/v5/pgxpool"
    "github.com/meden/rpgtracker/internal/xpcurve"
)

// Skill is a user-owned skill with progression state.
type Skill struct {
    ID            uuid.UUID  `json:"id"`
    UserID        uuid.UUID  `json:"user_id"`
    Name          string     `json:"name"`
    Description   string     `json:"description"`
    Unit          string     `json:"unit"`
    PresetID      *uuid.UUID `json:"preset_id"`
    StartingLevel int        `json:"starting_level"`
    CurrentXP     int        `json:"current_xp"`
    CurrentLevel  int        `json:"current_level"`
    DeletedAt     *time.Time `json:"-"`
    CreatedAt     time.Time  `json:"created_at"`
    UpdatedAt     time.Time  `json:"updated_at"`
}

// BlockerGate is one gate row for a skill.
type BlockerGate struct {
    ID               uuid.UUID  `json:"id"`
    SkillID          uuid.UUID  `json:"skill_id"`
    GateLevel        int        `json:"gate_level"`
    Title            string     `json:"title"`
    Description      string     `json:"description"`
    FirstNotifiedAt  *time.Time `json:"first_notified_at"`
    IsCleared        bool       `json:"is_cleared"`
    ClearedAt        *time.Time `json:"cleared_at"`
}

var ErrStartingLevelTooHigh = errors.New("starting_level must be 99 or below (D-018)")
var ErrNotFound = errors.New("not found")

// gateLevels is the fixed list of gate boundaries (one per tier, D-014).
var gateLevels = [10]int{9, 19, 29, 39, 49, 59, 69, 79, 89, 99}

// defaultGateTitle returns a tier-appropriate default gate title.
func defaultGateTitle(gateLevel int) string {
    tier := xpcurve.TierName(gateLevel)
    next := xpcurve.TierName(gateLevel + 1)
    return fmt.Sprintf("%s Gate: Prove Your %s Mastery", tier, next)
}

// defaultGateDescription returns a default gate description.
func defaultGateDescription(gateLevel int) string {
    tier := xpcurve.TierName(gateLevel)
    return fmt.Sprintf(
        "You have reached the end of the %s tier. Complete a meaningful challenge in this skill to unlock the next tier. Log your achievement to proceed.",
        tier,
    )
}

// CreateSkill inserts a new skill and its 10 blocker gates in a single transaction.
// startingLevel must be 1–99 (D-018). gate descriptions may be nil (defaults used).
func CreateSkill(ctx context.Context, db *pgxpool.Pool, userID uuid.UUID, name, description, unit string, presetID *uuid.UUID, startingLevel int, gateDescs [10]string) (*Skill, error) {
    if startingLevel < 1 || startingLevel > 99 {
        return nil, ErrStartingLevelTooHigh
    }
    startXP := xpcurve.XPToReachLevel(startingLevel)

    tx, err := db.Begin(ctx)
    if err != nil {
        return nil, fmt.Errorf("skills: begin tx: %w", err)
    }
    defer tx.Rollback(ctx)

    s := &Skill{
        UserID:        userID,
        Name:          name,
        Description:   description,
        Unit:          unit,
        PresetID:      presetID,
        StartingLevel: startingLevel,
        CurrentXP:     startXP,
        CurrentLevel:  startingLevel,
    }
    err = tx.QueryRow(ctx, `
        INSERT INTO public.skills (user_id, name, description, unit, preset_id, starting_level, current_xp, current_level)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, created_at, updated_at
    `, userID, name, description, unit, presetID, startingLevel, startXP, startingLevel).
        Scan(&s.ID, &s.CreatedAt, &s.UpdatedAt)
    if err != nil {
        return nil, fmt.Errorf("skills: insert: %w", err)
    }

    // Insert the 10 blocker gates.
    for i, gl := range gateLevels {
        title := defaultGateTitle(gl)
        desc := defaultGateDescription(gl)
        if gateDescs[i] != "" {
            desc = gateDescs[i]
        }
        _, err = tx.Exec(ctx, `
            INSERT INTO public.blocker_gates (skill_id, gate_level, title, description)
            VALUES ($1, $2, $3, $4)
        `, s.ID, gl, title, desc)
        if err != nil {
            return nil, fmt.Errorf("skills: insert gate %d: %w", gl, err)
        }
    }

    if err = tx.Commit(ctx); err != nil {
        return nil, fmt.Errorf("skills: commit: %w", err)
    }
    return s, nil
}

// ListSkills returns all non-deleted skills for a user, sorted by most recently updated.
func ListSkills(ctx context.Context, db *pgxpool.Pool, userID uuid.UUID) ([]Skill, error) {
    rows, err := db.Query(ctx, `
        SELECT id, user_id, name, description, unit, preset_id,
               starting_level, current_xp, current_level, created_at, updated_at
        FROM public.skills
        WHERE user_id = $1 AND deleted_at IS NULL
        ORDER BY updated_at DESC
    `, userID)
    if err != nil {
        return nil, fmt.Errorf("skills: list: %w", err)
    }
    defer rows.Close()

    var out []Skill
    for rows.Next() {
        var s Skill
        if err := rows.Scan(&s.ID, &s.UserID, &s.Name, &s.Description, &s.Unit, &s.PresetID,
            &s.StartingLevel, &s.CurrentXP, &s.CurrentLevel, &s.CreatedAt, &s.UpdatedAt); err != nil {
            return nil, err
        }
        out = append(out, s)
    }
    return out, rows.Err()
}

// GetSkill returns a single non-deleted skill owned by userID.
func GetSkill(ctx context.Context, db *pgxpool.Pool, userID, skillID uuid.UUID) (*Skill, error) {
    var s Skill
    err := db.QueryRow(ctx, `
        SELECT id, user_id, name, description, unit, preset_id,
               starting_level, current_xp, current_level, created_at, updated_at
        FROM public.skills
        WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
    `, skillID, userID).Scan(
        &s.ID, &s.UserID, &s.Name, &s.Description, &s.Unit, &s.PresetID,
        &s.StartingLevel, &s.CurrentXP, &s.CurrentLevel, &s.CreatedAt, &s.UpdatedAt,
    )
    if err != nil {
        return nil, fmt.Errorf("skills: get: %w", err)
    }
    return &s, nil
}

// UpdateSkill updates name and description of a skill owned by userID.
func UpdateSkill(ctx context.Context, db *pgxpool.Pool, userID, skillID uuid.UUID, name, description string) (*Skill, error) {
    var s Skill
    err := db.QueryRow(ctx, `
        UPDATE public.skills SET name=$3, description=$4, updated_at=NOW()
        WHERE id=$1 AND user_id=$2 AND deleted_at IS NULL
        RETURNING id, user_id, name, description, unit, preset_id,
                  starting_level, current_xp, current_level, created_at, updated_at
    `, skillID, userID, name, description).Scan(
        &s.ID, &s.UserID, &s.Name, &s.Description, &s.Unit, &s.PresetID,
        &s.StartingLevel, &s.CurrentXP, &s.CurrentLevel, &s.CreatedAt, &s.UpdatedAt,
    )
    if err != nil {
        return nil, fmt.Errorf("skills: update: %w", err)
    }
    return &s, nil
}

// SoftDeleteSkill marks a skill as deleted without removing its data.
func SoftDeleteSkill(ctx context.Context, db *pgxpool.Pool, userID, skillID uuid.UUID) error {
    tag, err := db.Exec(ctx, `
        UPDATE public.skills SET deleted_at=NOW()
        WHERE id=$1 AND user_id=$2 AND deleted_at IS NULL
    `, skillID, userID)
    if err != nil {
        return fmt.Errorf("skills: delete: %w", err)
    }
    if tag.RowsAffected() == 0 {
        return ErrNotFound
    }
    return nil
}

// GetBlockerGates returns all gates for a skill, ordered by gate_level.
func GetBlockerGates(ctx context.Context, db *pgxpool.Pool, skillID uuid.UUID) ([]BlockerGate, error) {
    rows, err := db.Query(ctx, `
        SELECT id, skill_id, gate_level, title, description, first_notified_at, is_cleared, cleared_at
        FROM public.blocker_gates
        WHERE skill_id = $1
        ORDER BY gate_level
    `, skillID)
    if err != nil {
        return nil, fmt.Errorf("skills: get gates: %w", err)
    }
    defer rows.Close()

    var out []BlockerGate
    for rows.Next() {
        var g BlockerGate
        if err := rows.Scan(&g.ID, &g.SkillID, &g.GateLevel, &g.Title, &g.Description,
            &g.FirstNotifiedAt, &g.IsCleared, &g.ClearedAt); err != nil {
            return nil, err
        }
        out = append(out, g)
    }
    return out, rows.Err()
}

// EffectiveLevel returns the display level — capped at the lowest active (uncleared) gate.
// R-004: this lives in the repository layer, NOT in handler templates.
func EffectiveLevel(currentLevel int, gates []BlockerGate) int {
    for _, g := range gates {
        if !g.IsCleared && currentLevel >= g.GateLevel {
            return g.GateLevel
        }
    }
    return currentLevel
}
```

- [ ] **Step 3: Run tests (integration)**

```bash
cd apps/api && go test -tags integration ./internal/skills/... -v
```
Expected: PASS

- [ ] **Step 4: Run all unit tests (no integration tag)**

```bash
cd apps/api && go test ./...
```
Expected: all pass (no integration tests run)

- [ ] **Step 5: Commit**

```bash
git add apps/api/internal/skills/
git commit -m "feat: extend skill repository with progression, CRUD, and gate helpers"
```

---

### Task 3: XP repository — LogXP with three-way transaction

**Files:**
- Create: `apps/api/internal/skills/xp_repository.go`
- Create: `apps/api/internal/skills/xp_test.go`

The XP log transaction must (R-003):
1. Insert into `xp_events`
2. Update `skills.current_xp += xp_delta` and `current_level = LevelForXP(new_xp)` in the **same** statement using a DB-side expression
3. Check if any gate has just been hit for the first time — set `first_notified_at` atomically

The response includes whether a level-up occurred, whether a tier was crossed, and the first-hit gate if any.

- [ ] **Step 1: Write failing test**

```go
//go:build integration

// apps/api/internal/skills/xp_test.go
// Shares testDB() and seedUserID from skill_repository_test.go (same package).
package skills_test

import (
    "context"
    "testing"

    "github.com/meden/rpgtracker/internal/skills"
    "github.com/meden/rpgtracker/internal/xpcurve"
)

func TestLogXP_UpdatesSkillAtomically(t *testing.T) {
    db := testDB(t)
    skill, _ := skills.CreateSkill(context.Background(), db, seedUserID,
        "XP Test", "", "session", nil, 1, [10]string{})

    result, err := skills.LogXP(context.Background(), db, seedUserID, skill.ID, 200, "")
    if err != nil {
        t.Fatalf("LogXP: %v", err)
    }
    wantXP := xpcurve.XPToReachLevel(1) + 200
    if result.Skill.CurrentXP != wantXP {
        t.Errorf("current_xp: got %d want %d", result.Skill.CurrentXP, wantXP)
    }
    wantLevel := xpcurve.LevelForXP(wantXP)
    if result.Skill.CurrentLevel != wantLevel {
        t.Errorf("current_level: got %d want %d", result.Skill.CurrentLevel, wantLevel)
    }
    if result.XPAdded != 200 {
        t.Errorf("xp_added: got %d want 200", result.XPAdded)
    }
}

func TestLogXP_SetsFirstNotifiedAt_OnGateHit(t *testing.T) {
    db := testDB(t)
    // Create a level-1 skill; gate at L9. Log enough XP to reach L9.
    skill, _ := skills.CreateSkill(context.Background(), db, seedUserID,
        "Gate Hit Test", "", "session", nil, 1, [10]string{})

    xpToGate := xpcurve.XPToReachLevel(9) - skill.CurrentXP + 1
    result, err := skills.LogXP(context.Background(), db, seedUserID, skill.ID, xpToGate, "")
    if err != nil {
        t.Fatalf("LogXP to gate: %v", err)
    }
    if result.GateFirstHit == nil {
        t.Fatal("expected gate_first_hit to be non-nil on first gate hit")
    }
    if result.GateFirstHit.GateLevel != 9 {
        t.Errorf("gate_level: got %d want 9", result.GateFirstHit.GateLevel)
    }

    // Second log must NOT trigger gate_first_hit again.
    result2, err := skills.LogXP(context.Background(), db, seedUserID, skill.ID, 1, "")
    if err != nil {
        t.Fatalf("LogXP second: %v", err)
    }
    if result2.GateFirstHit != nil {
        t.Errorf("expected gate_first_hit nil on second log, got %+v", result2.GateFirstHit)
    }
}

func TestLogXP_RejectsNegativeDelta(t *testing.T) {
    db := testDB(t)
    skill, _ := skills.CreateSkill(context.Background(), db, seedUserID,
        "Neg Delta", "", "session", nil, 1, [10]string{})
    _, err := skills.LogXP(context.Background(), db, seedUserID, skill.ID, -50, "")
    if err == nil {
        t.Fatal("expected error for negative xp_delta, got nil")
    }
}
```

- [ ] **Step 2: Implement XP repository**

```go
// apps/api/internal/skills/xp_repository.go
package skills

import (
    "context"
    "fmt"

    "github.com/google/uuid"
    "github.com/jackc/pgx/v5/pgxpool"
    "github.com/meden/rpgtracker/internal/xpcurve"
)

// XPEvent is one log entry.
type XPEvent struct {
    ID      uuid.UUID `json:"id"`
    SkillID uuid.UUID `json:"skill_id"`
    XPDelta int       `json:"xp_delta"`
    LogNote string    `json:"log_note,omitempty"`
}

// LogXPResult is returned from LogXP.
type LogXPResult struct {
    Skill         *Skill       `json:"skill"`
    XPAdded       int          `json:"xp_added"`
    LevelBefore   int          `json:"level_before"`
    LevelAfter    int          `json:"level_after"`
    TierCrossed   bool         `json:"tier_crossed"`
    TierName      string       `json:"tier_name"`
    TierNumber    int          `json:"tier_number"`
    QuickLogChips [4]int       `json:"quick_log_chips"`
    GateFirstHit  *BlockerGate `json:"gate_first_hit"` // non-nil only on first hit
}

// LogXP records an XP event and updates skill progression atomically (R-003).
func LogXP(ctx context.Context, db *pgxpool.Pool, userID, skillID uuid.UUID, xpDelta int, logNote string) (*LogXPResult, error) {
    if xpDelta <= 0 {
        return nil, fmt.Errorf("xp_delta must be positive")
    }

    tx, err := db.Begin(ctx)
    if err != nil {
        return nil, fmt.Errorf("logxp: begin: %w", err)
    }
    defer tx.Rollback(ctx)

    // 1. Read current skill state (also locks the row).
    var skillBefore Skill
    err = tx.QueryRow(ctx, `
        SELECT id, current_xp, current_level
        FROM public.skills
        WHERE id=$1 AND user_id=$2 AND deleted_at IS NULL
        FOR UPDATE
    `, skillID, userID).Scan(&skillBefore.ID, &skillBefore.CurrentXP, &skillBefore.CurrentLevel)
    if err != nil {
        return nil, fmt.Errorf("logxp: get skill: %w", err)
    }

    levelBefore := skillBefore.CurrentLevel
    newXP := skillBefore.CurrentXP + xpDelta
    newLevel := xpcurve.LevelForXP(newXP)

    // 2. Insert xp_event.
    _, err = tx.Exec(ctx, `
        INSERT INTO public.xp_events (skill_id, user_id, xp_delta, log_note)
        VALUES ($1, $2, $3, NULLIF($4, ''))
    `, skillID, userID, xpDelta, logNote)
    if err != nil {
        return nil, fmt.Errorf("logxp: insert event: %w", err)
    }

    // 3. Update skill.current_xp + current_level atomically.
    var updatedSkill Skill
    err = tx.QueryRow(ctx, `
        UPDATE public.skills
        SET current_xp=$3, current_level=$4, updated_at=NOW()
        WHERE id=$1 AND user_id=$2
        RETURNING id, user_id, name, description, unit, preset_id,
                  starting_level, current_xp, current_level, created_at, updated_at
    `, skillID, userID, newXP, newLevel).Scan(
        &updatedSkill.ID, &updatedSkill.UserID, &updatedSkill.Name, &updatedSkill.Description,
        &updatedSkill.Unit, &updatedSkill.PresetID, &updatedSkill.StartingLevel,
        &updatedSkill.CurrentXP, &updatedSkill.CurrentLevel, &updatedSkill.CreatedAt, &updatedSkill.UpdatedAt,
    )
    if err != nil {
        return nil, fmt.Errorf("logxp: update skill: %w", err)
    }

    // 4. Check for first-hit gate — set first_notified_at if needed.
    var gateFirstHit *BlockerGate
    var g BlockerGate
    err = tx.QueryRow(ctx, `
        UPDATE public.blocker_gates
        SET first_notified_at=NOW()
        WHERE skill_id=$1
          AND gate_level <= $2
          AND is_cleared = FALSE
          AND first_notified_at IS NULL
        ORDER BY gate_level
        LIMIT 1
        RETURNING id, skill_id, gate_level, title, description, first_notified_at, is_cleared, cleared_at
    `, skillID, newLevel).Scan(
        &g.ID, &g.SkillID, &g.GateLevel, &g.Title, &g.Description,
        &g.FirstNotifiedAt, &g.IsCleared, &g.ClearedAt,
    )
    if err == nil {
        gateFirstHit = &g
    }
    // pgx returns pgx.ErrNoRows when no gate was first-hit — that is expected, not an error.

    if err = tx.Commit(ctx); err != nil {
        return nil, fmt.Errorf("logxp: commit: %w", err)
    }

    tierCrossed := xpcurve.TierNumber(levelBefore) != xpcurve.TierNumber(newLevel)

    return &LogXPResult{
        Skill:         &updatedSkill,
        XPAdded:       xpDelta,
        LevelBefore:   levelBefore,
        LevelAfter:    newLevel,
        TierCrossed:   tierCrossed,
        TierName:      xpcurve.TierName(newLevel),
        TierNumber:    xpcurve.TierNumber(newLevel),
        QuickLogChips: xpcurve.QuickLogChips(newLevel),
        GateFirstHit:  gateFirstHit,
    }, nil
}

// GetRecentLogs returns the last N xp_events for a skill (most recent first).
func GetRecentLogs(ctx context.Context, db *pgxpool.Pool, skillID uuid.UUID, limit int) ([]XPEvent, error) {
    if limit <= 0 {
        limit = 10
    }
    rows, err := db.Query(ctx, `
        SELECT id, skill_id, xp_delta, COALESCE(log_note, '')
        FROM public.xp_events
        WHERE skill_id=$1
        ORDER BY created_at DESC
        LIMIT $2
    `, skillID, limit)
    if err != nil {
        return nil, fmt.Errorf("logxp: recent logs: %w", err)
    }
    defer rows.Close()

    var out []XPEvent
    for rows.Next() {
        var e XPEvent
        if err := rows.Scan(&e.ID, &e.SkillID, &e.XPDelta, &e.LogNote); err != nil {
            return nil, err
        }
        out = append(out, e)
    }
    return out, rows.Err()
}
```

- [ ] **Step 3: Run integration tests**

```bash
cd apps/api && go test -tags integration ./internal/skills/... -run TestLogXP -v
```
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/api/internal/skills/xp_repository.go apps/api/internal/skills/xp_test.go
git commit -m "feat: XP repository — atomic three-way log transaction + gate first-hit detection"
```

---

## Chunk 2: HTTP Handlers + Routing

### Task 4: Skill handlers — GET list, GET detail, PUT, DELETE

**Files:**
- Modify: `apps/api/internal/handlers/skill.go`
- Modify: `apps/api/internal/handlers/skill_test.go`

The existing `SkillHandler` and `SkillStore` interface are extended. The GET detail response includes blocker gates and a computed `effective_level`.

- [ ] **Step 1: Write failing tests for new handlers**

```go
// In apps/api/internal/handlers/skill_test.go — add:

func TestHandleGetSkills_ReturnsEmptyArray(t *testing.T) {
    store := &stubSkillStore{}
    h := NewSkillHandlerWithStore(store)
    req := httptest.NewRequest(http.MethodGet, "/api/v1/skills", nil)
    // Inject user ID into context
    req = req.WithContext(auth.WithUserID(req.Context(), uuid.New()))
    rr := httptest.NewRecorder()
    h.HandleGetSkills(rr, req)
    if rr.Code != http.StatusOK { t.Fatalf("got %d want 200", rr.Code) }
    // Body should be [] not null
    if strings.TrimSpace(rr.Body.String()) == "null\n" { t.Fatal("want [] got null") }
}

func TestHandleGetSkillDetail_ReturnsEffectiveLevel(t *testing.T) {
    // Skill at level 10, gate at 9 uncleared → effective_level should be 9
}

func TestHandleDeleteSkill_Returns204(t *testing.T) {}

func TestHandleDeleteSkill_Returns404_WhenNotOwner(t *testing.T) {}
```

Run: `cd apps/api && go test ./internal/handlers/... -run TestHandleGet -v`
Expected: FAIL (HandleGetSkills not defined)

- [ ] **Step 2: Extend SkillStore interface and add handlers**

```go
// apps/api/internal/handlers/skill.go — replace file content

package handlers

import (
    "context"
    "encoding/json"
    "net/http"
    "strings"

    "github.com/go-chi/chi/v5"
    "github.com/google/uuid"
    "github.com/jackc/pgx/v5/pgxpool"
    "github.com/meden/rpgtracker/internal/api"
    "github.com/meden/rpgtracker/internal/auth"
    "github.com/meden/rpgtracker/internal/skills"
    "github.com/meden/rpgtracker/internal/xpcurve"
)

// SkillStore is the full interface the handler needs from the DB layer.
type SkillStore interface {
    CreateSkill(ctx context.Context, userID uuid.UUID, name, description, unit string, presetID *uuid.UUID, startingLevel int, gateDescs [10]string) (*skills.Skill, error)
    ListSkills(ctx context.Context, userID uuid.UUID) ([]skills.Skill, error)
    GetSkill(ctx context.Context, userID, skillID uuid.UUID) (*skills.Skill, error)
    GetBlockerGates(ctx context.Context, skillID uuid.UUID) ([]skills.BlockerGate, error)
    UpdateSkill(ctx context.Context, userID, skillID uuid.UUID, name, description string) (*skills.Skill, error)
    SoftDeleteSkill(ctx context.Context, userID, skillID uuid.UUID) error
}

// SkillDetail is the JSON shape returned for GET /skills and GET /skills/{id}.
type SkillDetail struct {
    skills.Skill
    EffectiveLevel int               `json:"effective_level"`
    QuickLogChips  [4]int            `json:"quick_log_chips"`
    TierName       string            `json:"tier_name"`
    TierNumber     int               `json:"tier_number"`
    Gates          []skills.BlockerGate `json:"gates,omitempty"`
    RecentLogs     []skills.XPEvent  `json:"recent_logs,omitempty"`
    XPToNextLevel  int               `json:"xp_to_next_level"`
    XPForCurrentLevel int            `json:"xp_for_current_level"`
}

type SkillHandler struct{ store SkillStore }

func NewSkillHandler(db *pgxpool.Pool) *SkillHandler {
    return &SkillHandler{store: &dbSkillStore{db: db}}
}

func NewSkillHandlerWithStore(s SkillStore) *SkillHandler {
    return &SkillHandler{store: s}
}

type dbSkillStore struct{ db *pgxpool.Pool }

func (s *dbSkillStore) CreateSkill(ctx context.Context, userID uuid.UUID, name, description, unit string, presetID *uuid.UUID, startingLevel int, gateDescs [10]string) (*skills.Skill, error) {
    return skills.CreateSkill(ctx, s.db, userID, name, description, unit, presetID, startingLevel, gateDescs)
}
func (s *dbSkillStore) ListSkills(ctx context.Context, userID uuid.UUID) ([]skills.Skill, error) {
    return skills.ListSkills(ctx, s.db, userID)
}
func (s *dbSkillStore) GetSkill(ctx context.Context, userID, skillID uuid.UUID) (*skills.Skill, error) {
    return skills.GetSkill(ctx, s.db, userID, skillID)
}
func (s *dbSkillStore) GetBlockerGates(ctx context.Context, skillID uuid.UUID) ([]skills.BlockerGate, error) {
    return skills.GetBlockerGates(ctx, s.db, skillID)
}
func (s *dbSkillStore) UpdateSkill(ctx context.Context, userID, skillID uuid.UUID, name, description string) (*skills.Skill, error) {
    return skills.UpdateSkill(ctx, s.db, userID, skillID, name, description)
}
func (s *dbSkillStore) SoftDeleteSkill(ctx context.Context, userID, skillID uuid.UUID) error {
    return skills.SoftDeleteSkill(ctx, s.db, userID, skillID)
}

// HandlePostSkill handles POST /api/v1/skills.
func (h *SkillHandler) HandlePostSkill(w http.ResponseWriter, r *http.Request) {
    userID, ok := auth.UserIDFromContext(r.Context())
    if !ok {
        api.RespondError(w, http.StatusUnauthorized, "unauthorized")
        return
    }
    if err := r.ParseForm(); err != nil {
        api.RespondError(w, http.StatusBadRequest, "invalid request body")
        return
    }

    name := strings.TrimSpace(r.FormValue("name"))
    if name == "" {
        api.RespondError(w, http.StatusUnprocessableEntity, "skill name is required")
        return
    }
    description := strings.TrimSpace(r.FormValue("description"))
    unit := strings.TrimSpace(r.FormValue("unit"))
    if unit == "" {
        unit = "session"
    }

    startingLevel := 1
    if sl := r.FormValue("starting_level"); sl != "" {
        if n, err := parsePositiveInt(sl); err == nil {
            startingLevel = n
        }
    }
    if startingLevel < 1 || startingLevel > 99 {
        api.RespondError(w, http.StatusUnprocessableEntity, "starting_level must be between 1 and 99")
        return
    }

    var presetID *uuid.UUID
    if rawID := r.FormValue("preset_id"); rawID != "" {
        if id, err := uuid.Parse(rawID); err == nil {
            presetID = &id
        }
    }

    // Parse optional AI-generated gate descriptions (JSON array of 10 strings).
    var gateDescs [10]string
    if raw := r.FormValue("gate_descriptions"); raw != "" {
        var descs []string
        if err := json.Unmarshal([]byte(raw), &descs); err == nil {
            for i := 0; i < 10 && i < len(descs); i++ {
                gateDescs[i] = descs[i]
            }
        }
    }

    skill, err := h.store.CreateSkill(r.Context(), userID, name, description, unit, presetID, startingLevel, gateDescs)
    if err != nil {
        if err == skills.ErrStartingLevelTooHigh {
            api.RespondError(w, http.StatusUnprocessableEntity, err.Error())
            return
        }
        api.RespondError(w, http.StatusInternalServerError, "failed to create skill")
        return
    }
    api.RespondJSON(w, http.StatusCreated, toSkillDetail(skill, nil, nil))
}

// HandleGetSkills handles GET /api/v1/skills.
func (h *SkillHandler) HandleGetSkills(w http.ResponseWriter, r *http.Request) {
    userID, ok := auth.UserIDFromContext(r.Context())
    if !ok {
        api.RespondError(w, http.StatusUnauthorized, "unauthorized")
        return
    }
    list, err := h.store.ListSkills(r.Context(), userID)
    if err != nil {
        api.RespondError(w, http.StatusInternalServerError, "failed to list skills")
        return
    }
    out := make([]SkillDetail, len(list))
    for i := range list {
        out[i] = toSkillDetail(&list[i], nil, nil)
    }
    api.RespondJSON(w, http.StatusOK, out)
}

// HandleGetSkill handles GET /api/v1/skills/{id}.
func (h *SkillHandler) HandleGetSkill(w http.ResponseWriter, r *http.Request) {
    userID, ok := auth.UserIDFromContext(r.Context())
    if !ok {
        api.RespondError(w, http.StatusUnauthorized, "unauthorized")
        return
    }
    skillID, err := uuid.Parse(chi.URLParam(r, "id"))
    if err != nil {
        api.RespondError(w, http.StatusBadRequest, "invalid skill id")
        return
    }
    skill, err := h.store.GetSkill(r.Context(), userID, skillID)
    if err != nil {
        api.RespondError(w, http.StatusNotFound, "skill not found")
        return
    }
    gates, _ := h.store.GetBlockerGates(r.Context(), skillID)
    api.RespondJSON(w, http.StatusOK, toSkillDetail(skill, gates, nil))
}

// HandlePutSkill handles PUT /api/v1/skills/{id}.
func (h *SkillHandler) HandlePutSkill(w http.ResponseWriter, r *http.Request) {
    userID, ok := auth.UserIDFromContext(r.Context())
    if !ok {
        api.RespondError(w, http.StatusUnauthorized, "unauthorized")
        return
    }
    skillID, err := uuid.Parse(chi.URLParam(r, "id"))
    if err != nil {
        api.RespondError(w, http.StatusBadRequest, "invalid skill id")
        return
    }
    if err := r.ParseForm(); err != nil {
        api.RespondError(w, http.StatusBadRequest, "invalid request body")
        return
    }
    name := strings.TrimSpace(r.FormValue("name"))
    if name == "" {
        api.RespondError(w, http.StatusUnprocessableEntity, "skill name is required")
        return
    }
    description := strings.TrimSpace(r.FormValue("description"))
    skill, err := h.store.UpdateSkill(r.Context(), userID, skillID, name, description)
    if err != nil {
        api.RespondError(w, http.StatusNotFound, "skill not found")
        return
    }
    api.RespondJSON(w, http.StatusOK, toSkillDetail(skill, nil, nil))
}

// HandleDeleteSkill handles DELETE /api/v1/skills/{id}.
func (h *SkillHandler) HandleDeleteSkill(w http.ResponseWriter, r *http.Request) {
    userID, ok := auth.UserIDFromContext(r.Context())
    if !ok {
        api.RespondError(w, http.StatusUnauthorized, "unauthorized")
        return
    }
    skillID, err := uuid.Parse(chi.URLParam(r, "id"))
    if err != nil {
        api.RespondError(w, http.StatusBadRequest, "invalid skill id")
        return
    }
    if err := h.store.SoftDeleteSkill(r.Context(), userID, skillID); err != nil {
        if err == skills.ErrNotFound {
            api.RespondError(w, http.StatusNotFound, "skill not found")
            return
        }
        api.RespondError(w, http.StatusInternalServerError, "failed to delete skill")
        return
    }
    w.WriteHeader(http.StatusNoContent)
}

// toSkillDetail enriches a Skill with computed fields (R-004: effective level in Go layer).
func toSkillDetail(s *skills.Skill, gates []skills.BlockerGate, recentLogs []skills.XPEvent) SkillDetail {
    if gates == nil {
        gates = []skills.BlockerGate{}
    }
    effective := skills.EffectiveLevel(s.CurrentLevel, gates)
    return SkillDetail{
        Skill:             *s,
        EffectiveLevel:    effective,
        QuickLogChips:     xpcurve.QuickLogChips(s.CurrentLevel),
        TierName:          xpcurve.TierName(s.CurrentLevel),
        TierNumber:        xpcurve.TierNumber(s.CurrentLevel),
        Gates:             gates,
        RecentLogs:        recentLogs,
        XPToNextLevel:     xpcurve.XPToNextLevel(s.CurrentXP),
        XPForCurrentLevel: xpcurve.XPForCurrentLevel(s.CurrentXP),
    }
}

func parsePositiveInt(s string) (int, error) {
    var n int
    _, err := fmt.Sscanf(s, "%d", &n)
    if err != nil || n <= 0 {
        return 0, fmt.Errorf("not a positive int: %s", s)
    }
    return n, nil
}
```

- [ ] **Step 3: Run handler unit tests**

```bash
cd apps/api && go test ./internal/handlers/... -v
```
Expected: all pass

- [ ] **Step 4: Commit**

```bash
git add apps/api/internal/handlers/skill.go apps/api/internal/handlers/skill_test.go
git commit -m "feat: skill handlers — GET list/detail, PUT, DELETE with effective level (R-004)"
```

---

### Task 5: XP handler — POST /api/v1/skills/{id}/xp

**Files:**
- Create: `apps/api/internal/handlers/xp.go`
- Create: `apps/api/internal/handlers/xp_test.go`

- [ ] **Step 1: Write failing test**

```go
// apps/api/internal/handlers/xp_test.go
package handlers_test

import (
    "context"
    "net/http"
    "net/http/httptest"
    "net/url"
    "strings"
    "testing"

    "github.com/google/uuid"
    "github.com/meden/rpgtracker/internal/auth"
    "github.com/meden/rpgtracker/internal/handlers"
    "github.com/meden/rpgtracker/internal/skills"
)

type stubXPStore struct{ result *skills.LogXPResult; err error }

func (s *stubXPStore) LogXP(_ context.Context, _, _ uuid.UUID, _ int, _ string) (*skills.LogXPResult, error) {
    return s.result, s.err
}

func TestHandlePostXP_Returns200(t *testing.T) {
    stub := &stubXPStore{result: &skills.LogXPResult{
        Skill: &skills.Skill{Name: "Running"},
        XPAdded: 100, LevelBefore: 1, LevelAfter: 1,
    }}
    h := handlers.NewXPHandlerWithStore(stub)
    body := url.Values{"xp_delta": {"100"}}.Encode()
    req := httptest.NewRequest(http.MethodPost, "/api/v1/skills/"+uuid.New().String()+"/xp",
        strings.NewReader(body))
    req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
    req = req.WithContext(auth.WithUserID(req.Context(), uuid.New()))
    rr := httptest.NewRecorder()
    h.HandlePostXP(rr, req)
    if rr.Code != http.StatusOK { t.Fatalf("got %d want 200", rr.Code) }
}

func TestHandlePostXP_RejectsMissingDelta(t *testing.T) {
    h := handlers.NewXPHandlerWithStore(&stubXPStore{})
    req := httptest.NewRequest(http.MethodPost, "/api/v1/skills/"+uuid.New().String()+"/xp",
        strings.NewReader(""))
    req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
    req = req.WithContext(auth.WithUserID(req.Context(), uuid.New()))
    rr := httptest.NewRecorder()
    h.HandlePostXP(rr, req)
    if rr.Code != http.StatusUnprocessableEntity { t.Fatalf("got %d want 422", rr.Code) }
}
```

Run: `go test ./internal/handlers/... -run TestHandlePostXP -v`
Expected: FAIL

- [ ] **Step 2: Implement**

```go
// apps/api/internal/handlers/xp.go
package handlers

import (
    "context"
    "net/http"

    "github.com/go-chi/chi/v5"
    "github.com/google/uuid"
    "github.com/jackc/pgx/v5/pgxpool"
    "github.com/meden/rpgtracker/internal/api"
    "github.com/meden/rpgtracker/internal/auth"
    "github.com/meden/rpgtracker/internal/skills"
)

type XPStore interface {
    LogXP(ctx context.Context, userID, skillID uuid.UUID, xpDelta int, logNote string) (*skills.LogXPResult, error)
}

type XPHandler struct{ store XPStore }

func NewXPHandler(db *pgxpool.Pool) *XPHandler {
    return &XPHandler{store: &dbXPStore{db: db}}
}

func NewXPHandlerWithStore(s XPStore) *XPHandler {
    return &XPHandler{store: s}
}

type dbXPStore struct{ db *pgxpool.Pool }

func (s *dbXPStore) LogXP(ctx context.Context, userID, skillID uuid.UUID, xpDelta int, logNote string) (*skills.LogXPResult, error) {
    return skills.LogXP(ctx, s.db, userID, skillID, xpDelta, logNote)
}

// HandlePostXP handles POST /api/v1/skills/{id}/xp.
// Body (form-urlencoded): xp_delta (required, int > 0), log_note (optional).
func (h *XPHandler) HandlePostXP(w http.ResponseWriter, r *http.Request) {
    userID, ok := auth.UserIDFromContext(r.Context())
    if !ok {
        api.RespondError(w, http.StatusUnauthorized, "unauthorized")
        return
    }
    skillID, err := uuid.Parse(chi.URLParam(r, "id"))
    if err != nil {
        api.RespondError(w, http.StatusBadRequest, "invalid skill id")
        return
    }
    if err := r.ParseForm(); err != nil {
        api.RespondError(w, http.StatusBadRequest, "invalid request body")
        return
    }
    xpDelta, err := parsePositiveInt(r.FormValue("xp_delta"))
    if err != nil {
        api.RespondError(w, http.StatusUnprocessableEntity, "xp_delta must be a positive integer")
        return
    }
    logNote := r.FormValue("log_note")

    result, err := h.store.LogXP(r.Context(), userID, skillID, xpDelta, logNote)
    if err != nil {
        api.RespondError(w, http.StatusInternalServerError, "failed to log xp")
        return
    }
    api.RespondJSON(w, http.StatusOK, result)
}
```

- [ ] **Step 3: Run tests**

```bash
cd apps/api && go test ./internal/handlers/... -v
```
Expected: all pass

- [ ] **Step 4: Commit**

```bash
git add apps/api/internal/handlers/xp.go apps/api/internal/handlers/xp_test.go
git commit -m "feat: XP handler — POST /skills/{id}/xp with level-up and gate detection"
```

---

### Task 6: AI calibration endpoint — POST /api/v1/calibrate

**Files:**
- Create: `apps/api/internal/handlers/calibrate.go`
- Create: `apps/api/internal/handlers/calibrate_test.go`

This endpoint:
1. Reads the user's decrypted Claude API key from the keys service
2. Sends skill name + description to Claude asking for: suggested starting level (1–99), 2-3 sentence rationale, 10 gate descriptions (one per tier boundary)
3. Returns `{ suggested_level, rationale, gate_descriptions }` as JSON
4. On any Claude API failure, returns the appropriate error for the React app to degrade gracefully

- [ ] **Step 1: Write failing test (stub Claude call)**

```go
// apps/api/internal/handlers/calibrate_test.go
package handlers_test

func TestHandlePostCalibrate_Returns200_WithMockClaude(t *testing.T) {
    // With a mock key store that returns a valid key and a mock Claude caller
    // that returns a fixed JSON response, the handler should return 200 with
    // { suggested_level, rationale, gate_descriptions }
}

func TestHandlePostCalibrate_Returns401_WhenNoKey(t *testing.T) {
    // When key store returns no key, handler returns 400 with "no api key configured"
}
```

- [ ] **Step 2: Implement**

```go
// apps/api/internal/handlers/calibrate.go
package handlers

import (
    "bytes"
    "context"
    "encoding/json"
    "errors"
    "fmt"
    "net/http"
    "strings"
    "time"

    "github.com/jackc/pgx/v5"
    "github.com/jackc/pgx/v5/pgxpool"
    "github.com/meden/rpgtracker/internal/api"
    "github.com/meden/rpgtracker/internal/auth"
    "github.com/meden/rpgtracker/internal/keys"
)

const calibratePrompt = `You are helping calibrate a skill tracker. Given the skill name and description, provide:
1. A suggested starting level (integer, 1-99, where 1=complete beginner, 50=advanced practitioner, 99=near-peak mastery)
2. A 2-3 sentence rationale explaining your suggestion
3. Exactly 10 gate descriptions (one per tier boundary) appropriate to this skill. Each gate description should be 1-2 sentences describing what mastery looks like at that tier boundary.

Respond with ONLY a valid JSON object in this exact format:
{
  "suggested_level": <integer 1-99>,
  "rationale": "<2-3 sentences>",
  "gate_descriptions": ["<gate at L9>", "<gate at L19>", "<gate at L29>", "<gate at L39>", "<gate at L49>", "<gate at L59>", "<gate at L69>", "<gate at L79>", "<gate at L89>", "<gate at L99>"]
}

Skill name: %s
Skill description: %s`

// CalibrateResponse is what the handler returns.
type CalibrateResponse struct {
    SuggestedLevel   int      `json:"suggested_level"`
    Rationale        string   `json:"rationale"`
    GateDescriptions []string `json:"gate_descriptions"`
}

type CalibrateHandler struct {
    db         *pgxpool.Pool
    masterKey  []byte
    httpClient *http.Client
}

func NewCalibrateHandler(db *pgxpool.Pool, masterKey []byte) *CalibrateHandler {
    return &CalibrateHandler{db: db, masterKey: masterKey, httpClient: &http.Client{Timeout: 30 * time.Second}}
}

// HandlePostCalibrate handles POST /api/v1/calibrate.
// Body: name, description (form-urlencoded)
func (h *CalibrateHandler) HandlePostCalibrate(w http.ResponseWriter, r *http.Request) {
    userID, ok := auth.UserIDFromContext(r.Context())
    if !ok {
        api.RespondError(w, http.StatusUnauthorized, "unauthorized")
        return
    }
    if err := r.ParseForm(); err != nil {
        api.RespondError(w, http.StatusBadRequest, "invalid request")
        return
    }
    name := strings.TrimSpace(r.FormValue("name"))
    description := strings.TrimSpace(r.FormValue("description"))
    if name == "" {
        api.RespondError(w, http.StatusUnprocessableEntity, "name is required")
        return
    }

    // Retrieve decrypted API key for user.
    // keys.GetDecryptedKey returns pgx.ErrNoRows when no key row exists.
    apiKey, err := keys.GetDecryptedKey(r.Context(), h.db, h.masterKey, userID)
    if err != nil {
        if errors.Is(err, pgx.ErrNoRows) {
            api.RespondError(w, http.StatusBadRequest, "no api key configured")
        } else {
            api.RespondError(w, http.StatusInternalServerError, "failed to retrieve api key")
        }
        return
    }

    prompt := fmt.Sprintf(calibratePrompt, name, description)
    result, status, err := h.callClaude(r.Context(), apiKey, prompt)
    if err != nil {
        // Map Claude API errors to the degradation responses the frontend expects.
        switch status {
        case http.StatusUnauthorized:
            api.RespondError(w, http.StatusUnauthorized, "invalid claude api key")
        case http.StatusTooManyRequests:
            api.RespondError(w, http.StatusTooManyRequests, "claude api rate limit reached")
        default:
            api.RespondError(w, http.StatusBadGateway, "ai calibration unavailable")
        }
        return
    }
    api.RespondJSON(w, http.StatusOK, result)
}

// callClaude sends a prompt to Claude and parses the JSON response.
func (h *CalibrateHandler) callClaude(ctx context.Context, apiKey, prompt string) (*CalibrateResponse, int, error) {
    body, _ := json.Marshal(map[string]any{
        "model":      "claude-haiku-4-5-20251001",
        "max_tokens": 1024,
        "messages": []map[string]string{
            {"role": "user", "content": prompt},
        },
    })

    req, _ := http.NewRequestWithContext(ctx, http.MethodPost,
        "https://api.anthropic.com/v1/messages", bytes.NewReader(body))
    req.Header.Set("Content-Type", "application/json")
    req.Header.Set("x-api-key", apiKey)
    req.Header.Set("anthropic-version", "2023-06-01")

    resp, err := h.httpClient.Do(req)
    if err != nil {
        return nil, 0, err
    }
    defer resp.Body.Close()
    if resp.StatusCode != http.StatusOK {
        return nil, resp.StatusCode, fmt.Errorf("claude returned %d", resp.StatusCode)
    }

    var anthropicResp struct {
        Content []struct{ Text string `json:"text"` } `json:"content"`
    }
    if err := json.NewDecoder(resp.Body).Decode(&anthropicResp); err != nil {
        return nil, 0, err
    }
    if len(anthropicResp.Content) == 0 {
        return nil, 0, fmt.Errorf("empty response from claude")
    }

    var result CalibrateResponse
    if err := json.Unmarshal([]byte(anthropicResp.Content[0].Text), &result); err != nil {
        return nil, 0, fmt.Errorf("claude response parse error: %w", err)
    }
    // Clamp suggested_level to valid range.
    if result.SuggestedLevel < 1 { result.SuggestedLevel = 1 }
    if result.SuggestedLevel > 99 { result.SuggestedLevel = 99 }

    return &result, http.StatusOK, nil
}
```

- [ ] **Step 3: Run unit tests**

```bash
cd apps/api && go test ./internal/handlers/... -v
```

- [ ] **Step 4: Commit**

```bash
git add apps/api/internal/handlers/calibrate.go apps/api/internal/handlers/calibrate_test.go
git commit -m "feat: calibrate handler — AI skill level suggestion via Claude API"
```

---

### Task 7: Wire routes in server.go + update api-client types

**Files:**
- Modify: `apps/api/internal/server/server.go`
- Modify: `packages/api-client/src/types.ts`
- Modify: `packages/api-client/src/client.ts`

- [ ] **Step 1: Add routes to server.go**

In the `r.Route("/api/v1", ...)` block, after the existing `skillHandler` lines, add:

```go
// In server.go, inside r.Route("/api/v1", ...):
r.Get("/skills", skillHandler.HandleGetSkills)
r.Get("/skills/{id}", skillHandler.HandleGetSkill)
r.Put("/skills/{id}", skillHandler.HandlePutSkill)
r.Delete("/skills/{id}", skillHandler.HandleDeleteSkill)

xpHandler := handlers.NewXPHandler(db)
r.Post("/skills/{id}/xp", xpHandler.HandlePostXP)

calibrateHandler := handlers.NewCalibrateHandler(db, []byte(cfg.MasterKey))
r.Post("/calibrate", calibrateHandler.HandlePostCalibrate)
```

- [ ] **Step 2: Update api-client types**

```typescript
// packages/api-client/src/types.ts — add to existing file:

export interface BlockerGate {
  id: string
  skill_id: string
  gate_level: number
  title: string
  description: string
  first_notified_at: string | null
  is_cleared: boolean
  cleared_at: string | null
}

export interface XPEvent {
  id: string
  skill_id: string
  xp_delta: number
  log_note: string
}

export interface SkillDetail extends Skill {
  effective_level: number
  quick_log_chips: [number, number, number, number]
  tier_name: string
  tier_number: number
  gates: BlockerGate[]
  recent_logs: XPEvent[]
  xp_to_next_level: number
  xp_for_current_level: number
}

export interface XPLogResponse {
  // skill is the raw Skill (without gates/computed fields — refetch SkillDetail if needed)
  skill: Skill
  xp_added: number
  level_before: number
  level_after: number
  tier_crossed: boolean
  // Computed fields from Go — available without a second round-trip
  tier_name: string
  tier_number: number
  quick_log_chips: [number, number, number, number]
  gate_first_hit: BlockerGate | null
}

export interface CalibrateRequest {
  name: string
  description: string
}

export interface CalibrateResponse {
  suggested_level: number
  rationale: string
  gate_descriptions: string[]
}
```

- [ ] **Step 3: Update api-client client.ts**

```typescript
// packages/api-client/src/client.ts — add these functions:

export function listSkills(): Promise<SkillDetail[]> {
  return request('/api/skills')
}

export function getSkill(id: string): Promise<SkillDetail> {
  return request(`/api/skills/${id}`)
}

export function createSkill(data: {
  name: string
  description: string
  unit?: string
  preset_id?: string
  starting_level: number
  gate_descriptions?: string[]
}): Promise<SkillDetail> {
  const body = Object.entries({
    ...data,
    gate_descriptions: data.gate_descriptions ? JSON.stringify(data.gate_descriptions) : undefined,
  }).filter(([, v]) => v !== undefined)
  return request('/api/skills', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(Object.fromEntries(body) as Record<string, string>).toString(),
  })
}

export function logXP(skillId: string, xpDelta: number, logNote?: string): Promise<XPLogResponse> {
  return request(`/api/skills/${skillId}/xp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(
      Object.fromEntries(
        Object.entries({ xp_delta: String(xpDelta), log_note: logNote }).filter(([, v]) => v !== undefined)
      ) as Record<string, string>
    ).toString(),
  })
}

export function deleteSkill(id: string): Promise<void> {
  return request(`/api/skills/${id}`, { method: 'DELETE' })
}

export function calibrateSkill(req: CalibrateRequest): Promise<CalibrateResponse> {
  return request('/api/calibrate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ name: req.name, description: req.description }).toString(),
  })
}
```

- [ ] **Step 4: Run all tests**

```bash
cd apps/api && go test ./...
# From monorepo root:
pnpm turbo test
```
Expected: all pass

- [ ] **Step 5: Commit**

```bash
git add apps/api/internal/server/server.go \
        packages/api-client/src/types.ts \
        packages/api-client/src/client.ts
git commit -m "feat: wire LifeQuest routes + extend api-client types and functions"
```

---

## Completion Criteria

- `cd apps/api && go test ./...` passes (all unit tests, no integration tag)
- `pnpm turbo test` passes across all packages
- `GET /api/v1/skills` returns `[]` for a new user (not `null`)
- `POST /api/v1/skills` with `starting_level=10` returns `current_level=10`, `effective_level=9` (first gate at 9 blocks)
- `POST /api/v1/skills/{id}/xp` returns `gate_first_hit` on first gate hit, `null` on subsequent logs
- `POST /api/v1/calibrate` with no API key returns `400`
