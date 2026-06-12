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
		"Test Skill", "", "session", nil, nil, 10, [10]string{})
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
		"Gate Test", "", "session", nil, nil, 1, [10]string{})
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
		"Too High", "", "session", nil, nil, 100, [10]string{})
	if !errors.Is(err, skills.ErrInvalidStartingLevel) {
		t.Fatalf("expected ErrInvalidStartingLevel, got %v", err)
	}
}

func TestCreateSkill_AutoClearsGatesAtOrBelowStartingLevel(t *testing.T) {
	db := testDB(t)
	ctx := context.Background()

	skill, err := skills.CreateSkill(ctx, db, seedUserID,
		"High Start", "", "session", nil, nil, 28, [10]string{})
	if err != nil {
		t.Fatalf("CreateSkill: %v", err)
	}

	gates, err := skills.GetBlockerGates(ctx, db, skill.ID)
	if err != nil {
		t.Fatalf("GetBlockerGates: %v", err)
	}

	gateByLevel := make(map[int]skills.BlockerGate, len(gates))
	for _, g := range gates {
		gateByLevel[g.GateLevel] = g
	}

	g9, ok := gateByLevel[9]
	if !ok {
		t.Fatal("expected gate at level 9")
	}
	if !g9.IsCleared {
		t.Errorf("gate at level 9: is_cleared=false, want true (D-033 auto-clear)")
	}

	g19, ok := gateByLevel[19]
	if !ok {
		t.Fatal("expected gate at level 19")
	}
	if !g19.IsCleared {
		t.Errorf("gate at level 19: is_cleared=false, want true (D-033 auto-clear)")
	}

	g29, ok := gateByLevel[29]
	if !ok {
		t.Fatal("expected gate at level 29")
	}
	if g29.IsCleared {
		t.Errorf("gate at level 29: is_cleared=true, want false (next challenge)")
	}

	effective := skills.EffectiveLevel(skill.CurrentLevel, gates)
	if effective != 28 {
		t.Errorf("effective_level: got %d want 28", effective)
	}

	for _, gl := range []int{9, 19} {
		g := gateByLevel[gl]
		var verdict string
		err := db.QueryRow(ctx, `
			SELECT verdict FROM public.gate_submissions
			WHERE gate_id = $1 AND user_id = $2
			ORDER BY submitted_at DESC LIMIT 1
		`, g.ID, seedUserID).Scan(&verdict)
		if err != nil {
			t.Errorf("gate_submissions for gate %d: %v", gl, err)
			continue
		}
		if verdict != "self_reported" {
			t.Errorf("gate %d submission verdict: got %q want self_reported", gl, verdict)
		}
	}
}

func TestListSkills_ExcludesSoftDeleted(t *testing.T) {
	db := testDB(t)
	skill, err := skills.CreateSkill(context.Background(), db, seedUserID,
		"Doomed Skill", "", "session", nil, nil, 1, [10]string{})
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
