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
