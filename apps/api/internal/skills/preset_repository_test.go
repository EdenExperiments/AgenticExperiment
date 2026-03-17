package skills_test

import (
	"context"
	"os"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/meden/rpgtracker/internal/skills"
)

func testDB(t *testing.T) *pgxpool.Pool {
	t.Helper()
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		t.Skip("DATABASE_URL not set")
	}
	db, err := pgxpool.New(context.Background(), dbURL)
	if err != nil {
		t.Fatalf("connect to DB: %v", err)
	}
	t.Cleanup(db.Close)
	return db
}

func TestListCategories(t *testing.T) {
	db := testDB(t)
	cats, err := skills.ListCategories(context.Background(), db)
	if err != nil {
		t.Fatalf("ListCategories: %v", err)
	}
	if len(cats) != 9 {
		t.Errorf("got %d categories, want 9", len(cats))
	}
	// First category should be Fitness by sort_order
	if cats[0].Slug != "fitness" {
		t.Errorf("first category slug = %q, want %q", cats[0].Slug, "fitness")
	}
}

func TestListCategoriesWithPresets_NoFilter(t *testing.T) {
	db := testDB(t)
	result, err := skills.ListCategoriesWithPresets(context.Background(), db, skills.PresetFilter{})
	if err != nil {
		t.Fatalf("ListCategoriesWithPresets: %v", err)
	}
	if len(result) != 9 {
		t.Errorf("got %d categories, want 9", len(result))
	}
	totalPresets := 0
	for _, c := range result {
		totalPresets += len(c.Presets)
	}
	if totalPresets < 90 {
		t.Errorf("got %d total presets, want ≥90", totalPresets)
	}
}

func TestListCategoriesWithPresets_CategoryFilter(t *testing.T) {
	db := testDB(t)
	result, err := skills.ListCategoriesWithPresets(context.Background(), db, skills.PresetFilter{
		Category: "fitness",
	})
	if err != nil {
		t.Fatalf("ListCategoriesWithPresets with category filter: %v", err)
	}
	if len(result) != 1 {
		t.Errorf("got %d categories, want 1", len(result))
	}
	if result[0].Slug != "fitness" {
		t.Errorf("category slug = %q, want %q", result[0].Slug, "fitness")
	}
	if len(result[0].Presets) < 10 {
		t.Errorf("got %d fitness presets, want ≥10", len(result[0].Presets))
	}
}

func TestListCategoriesWithPresets_SearchFilter(t *testing.T) {
	db := testDB(t)
	result, err := skills.ListCategoriesWithPresets(context.Background(), db, skills.PresetFilter{
		Query: "running",
	})
	if err != nil {
		t.Fatalf("ListCategoriesWithPresets with search: %v", err)
	}
	// "Running" should appear
	found := false
	for _, c := range result {
		for _, p := range c.Presets {
			if p.Name == "Running" {
				found = true
			}
		}
	}
	if !found {
		t.Error("search for 'running' did not return the Running preset")
	}
}

func TestGetPreset(t *testing.T) {
	db := testDB(t)
	// First list to get a real ID
	cats, err := skills.ListCategoriesWithPresets(context.Background(), db, skills.PresetFilter{
		Category: "fitness",
	})
	if err != nil || len(cats) == 0 || len(cats[0].Presets) == 0 {
		t.Fatal("could not get a preset ID to look up")
	}
	id := cats[0].Presets[0].ID

	preset, err := skills.GetPreset(context.Background(), db, id)
	if err != nil {
		t.Fatalf("GetPreset: %v", err)
	}
	if preset.ID != id {
		t.Errorf("GetPreset ID = %v, want %v", preset.ID, id)
	}
}

func TestGetPreset_NotFound(t *testing.T) {
	db := testDB(t)
	// Use a nil UUID which will never exist
	_, err := skills.GetPreset(context.Background(), db, [16]byte{})
	if err == nil {
		t.Error("expected error for non-existent preset, got nil")
	}
}
