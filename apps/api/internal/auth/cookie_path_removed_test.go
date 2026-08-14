package auth

import (
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

func TestCookieSessionPathRemoved(t *testing.T) {
	_, file, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("runtime.Caller failed")
	}
	dir := filepath.Dir(file)

	middleware, err := os.ReadFile(filepath.Join(dir, "middleware.go"))
	if err != nil {
		t.Fatal(err)
	}
	if strings.Contains(string(middleware), "func NewSessionMiddleware") {
		t.Fatal("NewSessionMiddleware must stay deleted")
	}

	handler, err := os.ReadFile(filepath.Join(dir, "handler.go"))
	if err != nil {
		t.Fatal(err)
	}
	for _, name := range []string{"HandleGetLogin", "HandlePostLogin", "HandleGetRegister", "HandlePostRegister"} {
		if strings.Contains(string(handler), "func (h *AuthHandler) "+name) {
			t.Fatalf("%s must stay deleted", name)
		}
	}
}

func TestDecorativeWeightRLSDroppedInMigration(t *testing.T) {
	_, file, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("runtime.Caller failed")
	}
	up := filepath.Join(filepath.Dir(file), "..", "..", "db", "migrations", "000016_drop_nl_weight_rls.up.sql")
	sql, err := os.ReadFile(up)
	if err != nil {
		t.Fatal(err)
	}
	body := string(sql)
	if !strings.Contains(body, "DROP POLICY IF EXISTS nl_weight_logs_owner") {
		t.Fatal("expected DROP POLICY for nl_weight_logs_owner")
	}
	if !strings.Contains(body, "DISABLE ROW LEVEL SECURITY") {
		t.Fatal("expected DISABLE ROW LEVEL SECURITY on nl_weight_logs")
	}
}
