package skills_test

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/meden/rpgtracker/internal/skills"
)

func TestCreateSkill_FromScratch(t *testing.T) {
	db := testDB(t)

	// Need a real user_id in the users table. Use the test-user sentinel.
	userID := uuid.MustParse("00000000-0000-0000-0000-000000000099")
	_, _ = db.Exec(context.Background(),
		`INSERT INTO public.users (id, email) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
		userID, "testuser@example.com",
	)
	t.Cleanup(func() {
		_, _ = db.Exec(context.Background(), `DELETE FROM public.skills WHERE user_id = $1`, userID)
	})

	skill, err := skills.CreateSkill(context.Background(), db, userID, "Test Skill", "A description", "session", nil)
	if err != nil {
		t.Fatalf("CreateSkill: %v", err)
	}
	if skill.Name != "Test Skill" {
		t.Errorf("name = %q, want %q", skill.Name, "Test Skill")
	}
	if skill.PresetID != nil {
		t.Error("preset_id should be nil for scratch skill")
	}
}

func TestCreateSkill_FromPreset(t *testing.T) {
	db := testDB(t)

	userID := uuid.MustParse("00000000-0000-0000-0000-000000000099")
	_, _ = db.Exec(context.Background(),
		`INSERT INTO public.users (id, email) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
		userID, "testuser@example.com",
	)

	// Get a real preset ID
	cats, err := skills.ListCategoriesWithPresets(context.Background(), db, skills.PresetFilter{Category: "fitness"})
	if err != nil || len(cats) == 0 || len(cats[0].Presets) == 0 {
		t.Skip("no preset available to test with")
	}
	presetID := cats[0].Presets[0].ID

	t.Cleanup(func() {
		_, _ = db.Exec(context.Background(), `DELETE FROM public.skills WHERE user_id = $1`, userID)
	})

	skill, err := skills.CreateSkill(context.Background(), db, userID, "Running", "cardio", "km", &presetID)
	if err != nil {
		t.Fatalf("CreateSkill with preset: %v", err)
	}
	if skill.PresetID == nil || *skill.PresetID != presetID {
		t.Errorf("preset_id = %v, want %v", skill.PresetID, presetID)
	}
}
