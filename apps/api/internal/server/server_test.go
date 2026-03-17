package server_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/meden/rpgtracker/internal/config"
	"github.com/meden/rpgtracker/internal/server"
)

func TestHealthEndpoint(t *testing.T) {
	cfg := &config.Config{
		Port:      "8080",
		MasterKey: "12345678901234567890123456789012", // exactly 32 bytes
	}
	s := server.NewServer(cfg, noopMiddleware, nil)

	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	w := httptest.NewRecorder()
	s.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
}

func noopMiddleware(next http.Handler) http.Handler { return next }
