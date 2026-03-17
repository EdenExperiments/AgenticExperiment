//go:build integration

// Run with: cd apps/api && go test -tags integration ./internal/skills/...
// Requires DATABASE_URL pointing to a local Supabase instance.
// Requires a seed user row with id = '00000000-0000-0000-0000-000000000001'.
package skills_test

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"
	"github.com/meden/rpgtracker/internal/skills"
	"github.com/meden/rpgtracker/internal/xpcurve"
)

// seedUserID is a user that must exist in the test DB.
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
	if !errors.Is(err, skills.ErrInvalidStartingLevel) {
		t.Fatalf("expected ErrInvalidStartingLevel, got %v", err)
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
