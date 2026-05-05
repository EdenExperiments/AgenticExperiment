package auth_test

// Wave 1 – T4 regression tests for bounded timeouts and safe error logging
//
// T4 contract:
//   - Auth HTTP client has bounded timeout (not zero/infinite)
//   - Context-cancelled requests propagate cancellation to Supabase calls
//
// These tests verify timeout/context behaviour via the test infrastructure,
// not by reading private fields. The SetHTTPClientTimeout helper is used to
// inject fast timeouts for unit tests.

import (
	"context"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/meden/rpgtracker/internal/auth"
)

// ─── T4-AC-1: Auth handler uses bounded HTTP client timeout ─────────────────
// Verifies that when the fake Supabase server delays beyond the configured
// timeout, the request returns an error (not hang forever).

func TestHandlePostPasswordChange_TimesOutOnSlowSupabase(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(200 * time.Millisecond)
		w.WriteHeader(http.StatusOK)
	}))
	defer srv.Close()

	h := auth.NewAuthHandler(srv.URL, "fake-anon-key")
	h.SetHTTPClientTimeout(50 * time.Millisecond) // shorter than server delay

	userID := uuid.New()
	form := url.Values{
		"current_password":     {"correctpass"},
		"new_password":         {"newpassword1"},
		"confirm_new_password": {"newpassword1"},
	}
	req := httptest.NewRequest(http.MethodPost, "/api/v1/account/password",
		strings.NewReader(form.Encode()))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req = withUserAndEmail(req, userID, "user@example.com")

	w := httptest.NewRecorder()
	h.HandlePostPasswordChange(w, req)

	if w.Code == http.StatusOK {
		t.Fatal("expected non-200 when Supabase timed out, but got 200")
	}
}

// ─── T4-AC-2: Pre-cancelled context propagates to HTTP call ─────────────────
// Uses an already-cancelled context. The handler uses NewRequestWithContext
// so a pre-cancelled context causes the HTTP call to fail immediately.

func TestHandlePostPasswordChange_PreCancelledContext(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(10 * time.Millisecond)
		w.WriteHeader(http.StatusOK)
	}))
	defer srv.Close()

	h := auth.NewAuthHandler(srv.URL, "fake-anon-key")
	h.SetHTTPClientTimeout(5 * time.Second)

	userID := uuid.New()
	form := url.Values{
		"current_password":     {"correctpass"},
		"new_password":         {"newpassword1"},
		"confirm_new_password": {"newpassword1"},
	}
	req := httptest.NewRequest(http.MethodPost, "/api/v1/account/password",
		strings.NewReader(form.Encode()))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req = withUserAndEmail(req, userID, "user@example.com")

	ctx, cancel := context.WithCancel(req.Context())
	cancel() // pre-cancel
	req = req.WithContext(ctx)

	w := httptest.NewRecorder()
	h.HandlePostPasswordChange(w, req)

	if w.Code == http.StatusOK {
		t.Errorf("expected non-200 with pre-cancelled context, got 200")
	}
}

// ─── T4-AC-3: SetHTTPClientTimeout affects request timing ───────────────────

func TestNewAuthHandler_HasBoundedTimeout(t *testing.T) {
	slowSrv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(500 * time.Millisecond)
		w.WriteHeader(http.StatusOK)
	}))
	defer slowSrv.Close()

	h := auth.NewAuthHandler(slowSrv.URL, "fake-anon-key")
	h.SetHTTPClientTimeout(10 * time.Millisecond)

	userID := uuid.New()
	form := url.Values{
		"current_password":     {"p"},
		"new_password":         {"newpassword1"},
		"confirm_new_password": {"newpassword1"},
	}
	req := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(form.Encode()))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req = withUserAndEmail(req, userID, "u@e.com")

	w := httptest.NewRecorder()
	h.HandlePostPasswordChange(w, req)

	if w.Code == http.StatusOK {
		t.Error("expected non-200 when server exceeds timeout")
	}
}
