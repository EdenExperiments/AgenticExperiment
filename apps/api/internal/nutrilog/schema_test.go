package nutrilog

import (
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

func TestNlGoalsMigrationStaysOffLifeQuest(t *testing.T) {
	_, file, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("runtime.Caller failed")
	}
	up := filepath.Join(filepath.Dir(file), "..", "..", "db", "migrations", "000018_nl_goals.up.sql")
	sql, err := os.ReadFile(up)
	if err != nil {
		t.Fatal(err)
	}
	body := strings.ToLower(string(sql))
	for _, banned := range []string{"public.goals", "row level security", "create policy", "skill_id"} {
		if strings.Contains(body, banned) {
			t.Fatalf("nl_goals must not contain %q", banned)
		}
	}
}

func TestNlFoodsDiaryMigrationStaysPerUser(t *testing.T) {
	_, file, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("runtime.Caller failed")
	}
	up := filepath.Join(filepath.Dir(file), "..", "..", "db", "migrations", "000019_nl_foods_diary.up.sql")
	sql, err := os.ReadFile(up)
	if err != nil {
		t.Fatal(err)
	}
	body := strings.ToLower(string(sql))
	for _, banned := range []string{"row level security", "create policy", "public.goals"} {
		if strings.Contains(body, banned) {
			t.Fatalf("foods/diary must not contain %q", banned)
		}
	}
}
