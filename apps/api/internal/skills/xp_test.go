//go:build integration

// apps/api/internal/skills/xp_test.go
// Shares testDB() and seedUserID from skill_repository_test.go (same package).
package skills_test

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/meden/rpgtracker/internal/skills"
	"github.com/meden/rpgtracker/internal/xpcurve"
)

func countXPEvents(t *testing.T, db *pgxpool.Pool, skillID uuid.UUID) int {
	t.Helper()
	var count int
	err := db.QueryRow(context.Background(), `
		SELECT COUNT(*) FROM public.xp_events WHERE skill_id = $1
	`, skillID).Scan(&count)
	if err != nil {
		t.Fatalf("count xp_events: %v", err)
	}
	return count
}

func TestLogXP_UpdatesSkillAtomically(t *testing.T) {
	db := testDB(t)
	skill, _ := skills.CreateSkill(context.Background(), db, seedUserID,
		"XP Test", "", "session", nil, nil, 1, [10]string{})

	result, err := skills.LogXP(context.Background(), db, seedUserID, skill.ID, 200, "", nil)
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
		"Gate Hit Test", "", "session", nil, nil, 1, [10]string{})

	xpToGate := xpcurve.XPToReachLevel(9) - skill.CurrentXP + 1
	result, err := skills.LogXP(context.Background(), db, seedUserID, skill.ID, xpToGate, "", nil)
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
	result2, err := skills.LogXP(context.Background(), db, seedUserID, skill.ID, 1, "", nil)
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
		"Neg Delta", "", "session", nil, nil, 1, [10]string{})
	_, err := skills.LogXP(context.Background(), db, seedUserID, skill.ID, -50, "", nil)
	if err == nil {
		t.Fatal("expected error for negative xp_delta, got nil")
	}
}

func TestLogXP_RejectsZeroDelta(t *testing.T) {
	db := testDB(t)
	skill, _ := skills.CreateSkill(context.Background(), db, seedUserID,
		"Zero Delta", "", "session", nil, nil, 1, [10]string{})
	_, err := skills.LogXP(context.Background(), db, seedUserID, skill.ID, 0, "", nil)
	if err == nil {
		t.Fatal("expected error for zero xp_delta, got nil")
	}
}

func TestLogXP_InsertsXPEventRow(t *testing.T) {
	db := testDB(t)
	ctx := context.Background()
	skill, err := skills.CreateSkill(ctx, db, seedUserID,
		"XP Event Row", "", "session", nil, nil, 1, [10]string{})
	if err != nil {
		t.Fatalf("CreateSkill: %v", err)
	}

	before := countXPEvents(t, db, skill.ID)
	const xpDelta = 150
	const logNote = "focused practice session"

	_, err = skills.LogXP(ctx, db, seedUserID, skill.ID, xpDelta, logNote, nil)
	if err != nil {
		t.Fatalf("LogXP: %v", err)
	}

	after := countXPEvents(t, db, skill.ID)
	if after-before != 1 {
		t.Fatalf("xp_events count: got %d new rows, want 1", after-before)
	}

	logs, err := skills.GetRecentLogs(ctx, db, skill.ID, 1)
	if err != nil {
		t.Fatalf("GetRecentLogs: %v", err)
	}
	if len(logs) != 1 {
		t.Fatalf("GetRecentLogs: got %d rows, want 1", len(logs))
	}
	if logs[0].XPDelta != xpDelta {
		t.Errorf("xp_delta: got %d want %d", logs[0].XPDelta, xpDelta)
	}
	if logs[0].LogNote != logNote {
		t.Errorf("log_note: got %q want %q", logs[0].LogNote, logNote)
	}
}

func TestLogXP_TierCrossedOnBoundary(t *testing.T) {
	db := testDB(t)
	ctx := context.Background()
	skill, err := skills.CreateSkill(ctx, db, seedUserID,
		"Tier Cross", "", "session", nil, nil, 9, [10]string{})
	if err != nil {
		t.Fatalf("CreateSkill: %v", err)
	}

	xpDelta := xpcurve.XPToReachLevel(10) - skill.CurrentXP
	result, err := skills.LogXP(ctx, db, seedUserID, skill.ID, xpDelta, "tier boundary", nil)
	if err != nil {
		t.Fatalf("LogXP: %v", err)
	}

	if result.LevelBefore != 9 {
		t.Errorf("level_before: got %d want 9", result.LevelBefore)
	}
	if result.LevelAfter != 10 {
		t.Errorf("level_after: got %d want 10", result.LevelAfter)
	}
	if !result.TierCrossed {
		t.Error("tier_crossed: got false want true")
	}
	if result.TierNumber != 2 {
		t.Errorf("tier_number: got %d want 2", result.TierNumber)
	}
	if result.TierName != "Apprentice" {
		t.Errorf("tier_name: got %q want Apprentice", result.TierName)
	}
}
