package workout

import (
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

func TestWorkoutMigrationHasNoLifeQuestCoupling(t *testing.T) {
	_, file, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("runtime.Caller failed")
	}
	up := filepath.Join(filepath.Dir(file), "..", "..", "db", "migrations", "000017_wo_sessions.up.sql")
	sql, err := os.ReadFile(up)
	if err != nil {
		t.Fatal(err)
	}
	body := strings.ToLower(string(sql))
	for _, banned := range []string{"skill_id", "training_sessions", "xp_events", "row level security", "create policy"} {
		if strings.Contains(body, banned) {
			t.Fatalf("wo_* migration must not contain %q", banned)
		}
	}
	if !strings.Contains(body, "references public.users") {
		t.Fatal("expected FK to public.users")
	}
}
