package auth_test

// Wave 1 – T1 regression tests for POST /api/v1/account/password
//
// Contract (T1 branch): POST /api/v1/account/password
//   - form-urlencoded body
//   - current_password required (422 if wrong)
//   - new_password min 8 chars (422 if < 8)
//   - confirm_new_password optional; 422 if present and != new_password
//   - success → 200 {status:"password_changed"}
//   - JSON error body {error: "..."}
//   - unauthenticated → 401
//
// INTENTIONAL RED on main: HandlePostPasswordChange does not enforce min-8
// length at the handler layer — it delegates to Supabase. These tests express
// the T1 contract precisely. Tests that require Supabase network calls use a
// fake httptest server to avoid flakiness.

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/meden/rpgtracker/internal/auth"
)

// withUserAndEmail injects a user ID and email into a request context.
func withUserAndEmail(req *http.Request, userID uuid.UUID, email string) *http.Request {
	ctx := auth.WithUserID(req.Context(), userID)
	ctx = auth.WithEmail(ctx, email)
	return req.WithContext(ctx)
}

// fakeSupabaseServer creates a fake Supabase server for testing.
// tokenStatus: HTTP status for POST /auth/v1/token (password verify)
// updateStatus: HTTP status for PUT /auth/v1/user (password update)
func fakeSupabaseServer(t *testing.T, tokenStatus, updateStatus int) *httptest.Server {
	t.Helper()
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case r.Method == http.MethodPost && strings.HasPrefix(r.URL.Path, "/auth/v1/token"):
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(tokenStatus)
			if tokenStatus == http.StatusOK {
				json.NewEncoder(w).Encode(map[string]string{ //nolint:errcheck
					"access_token":  "fake-access-token",
					"refresh_token": "fake-refresh-token",
				})
			}
		case r.Method == http.MethodPut && r.URL.Path == "/auth/v1/user":
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(updateStatus)
			if updateStatus == http.StatusOK {
				json.NewEncoder(w).Encode(map[string]string{"id": "user-id"}) //nolint:errcheck
			}
		default:
			w.WriteHeader(http.StatusNotFound)
		}
	}))
}

// makeAuthHandler builds an AuthHandler pointed at the given fake server URL.
func makeAuthHandler(supabaseURL string) *auth.AuthHandler {
	h := auth.NewAuthHandler(supabaseURL, "fake-anon-key")
	h.SetHTTPClientTimeout(2 * time.Second)
	return h
}

// ─── T1-AC-1: Unauthorized (no user in context) ────────────────────────────

func TestHandlePostPasswordChange_Unauthorized(t *testing.T) {
	srv := fakeSupabaseServer(t, http.StatusOK, http.StatusOK)
	defer srv.Close()

	h := makeAuthHandler(srv.URL)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/account/password", nil)
	w := httptest.NewRecorder()
	h.HandlePostPasswordChange(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 for unauthenticated request, got %d: %s", w.Code, w.Body.String())
	}
	assertJSONError(t, w)
}

// ─── T1-AC-2: current_password required ────────────────────────────────────

func TestHandlePostPasswordChange_MissingCurrentPassword(t *testing.T) {
	srv := fakeSupabaseServer(t, http.StatusUnauthorized, http.StatusOK)
	defer srv.Close()

	h := makeAuthHandler(srv.URL)
	userID := uuid.New()
	form := url.Values{
		"new_password": {"newpass123"},
	}
	req := httptest.NewRequest(http.MethodPost, "/api/v1/account/password",
		strings.NewReader(form.Encode()))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req = withUserAndEmail(req, userID, "user@example.com")
	w := httptest.NewRecorder()
	h.HandlePostPasswordChange(w, req)

	if w.Code != http.StatusUnprocessableEntity {
		t.Fatalf("expected 422 for incorrect current_password, got %d: %s", w.Code, w.Body.String())
	}
	assertJSONError(t, w)
}

// ─── T1-AC-3: new_password min 8 chars ─────────────────────────────────────
// INTENTIONAL RED on main: T1 branch adds handler-level min-8 validation.
// On main, if confirm_new_password matches (or both are absent), the handler
// delegates length enforcement to Supabase. Since our fake server returns 200,
// the handler succeeds (200) instead of 422.
// confirm_new_password is set here to match, so the confirm check passes and
// only the missing min-8 guard determines the outcome.
// This test fails on main → will be green after T1 merges.

func TestHandlePostPasswordChange_NewPasswordTooShort(t *testing.T) {
	// Fake server returns success — on main no handler-level length check exists.
	srv := fakeSupabaseServer(t, http.StatusOK, http.StatusOK)
	defer srv.Close()

	h := makeAuthHandler(srv.URL)
	userID := uuid.New()
	form := url.Values{
		"current_password":     {"correctpass"},
		"new_password":         {"short"}, // < 8 chars
		"confirm_new_password": {"short"}, // matches, so confirm check passes
	}
	req := httptest.NewRequest(http.MethodPost, "/api/v1/account/password",
		strings.NewReader(form.Encode()))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req = withUserAndEmail(req, userID, "user@example.com")
	w := httptest.NewRecorder()
	h.HandlePostPasswordChange(w, req)

	if w.Code != http.StatusUnprocessableEntity {
		t.Fatalf("[INTENTIONAL RED on main] expected 422 for new_password < 8 chars, got %d: %s", w.Code, w.Body.String())
	}
	assertJSONError(t, w)
}

// ─── T1-AC-4: confirm_new_password mismatch → 422 ──────────────────────────

func TestHandlePostPasswordChange_ConfirmPasswordMismatch(t *testing.T) {
	srv := fakeSupabaseServer(t, http.StatusOK, http.StatusOK)
	defer srv.Close()

	h := makeAuthHandler(srv.URL)
	userID := uuid.New()
	form := url.Values{
		"current_password":     {"correctpass"},
		"new_password":         {"newpassword1"},
		"confirm_new_password": {"differentpass"},
	}
	req := httptest.NewRequest(http.MethodPost, "/api/v1/account/password",
		strings.NewReader(form.Encode()))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req = withUserAndEmail(req, userID, "user@example.com")
	w := httptest.NewRecorder()
	h.HandlePostPasswordChange(w, req)

	if w.Code != http.StatusUnprocessableEntity {
		t.Fatalf("expected 422 for confirm_new_password mismatch, got %d: %s", w.Code, w.Body.String())
	}
	assertJSONError(t, w)
}

// ─── T1-AC-5: confirm_new_password absent → allowed ────────────────────────
// INTENTIONAL RED on main: on main, confirm_new_password="" is treated as a
// mismatch against new_password (empty-string comparison bug). T1 fixes this
// by only validating confirm when it is non-empty. Fails on main → 422.

func TestHandlePostPasswordChange_NoConfirmPassword_Succeeds(t *testing.T) {
	srv := fakeSupabaseServer(t, http.StatusOK, http.StatusOK)
	defer srv.Close()

	h := makeAuthHandler(srv.URL)
	userID := uuid.New()
	form := url.Values{
		"current_password": {"correctpass"},
		"new_password":     {"newpassword1"},
		// no confirm_new_password
	}
	req := httptest.NewRequest(http.MethodPost, "/api/v1/account/password",
		strings.NewReader(form.Encode()))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req = withUserAndEmail(req, userID, "user@example.com")
	w := httptest.NewRecorder()
	h.HandlePostPasswordChange(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("[INTENTIONAL RED on main] expected 200 when confirm_new_password absent, got %d: %s", w.Code, w.Body.String())
	}
	assertStatusField(t, w, "password_changed")
}

// ─── T1-AC-6: success → {status:"password_changed"} ───────────────────────

func TestHandlePostPasswordChange_Success(t *testing.T) {
	srv := fakeSupabaseServer(t, http.StatusOK, http.StatusOK)
	defer srv.Close()

	h := makeAuthHandler(srv.URL)
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

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 on success, got %d: %s", w.Code, w.Body.String())
	}
	assertStatusField(t, w, "password_changed")
}

// ─── T1-AC-7: wrong current_password → 422 ─────────────────────────────────

func TestHandlePostPasswordChange_WrongCurrentPassword(t *testing.T) {
	srv := fakeSupabaseServer(t, http.StatusUnauthorized, http.StatusOK)
	defer srv.Close()

	h := makeAuthHandler(srv.URL)
	userID := uuid.New()
	form := url.Values{
		"current_password": {"wrongpass"},
		"new_password":     {"newpassword1"},
	}
	req := httptest.NewRequest(http.MethodPost, "/api/v1/account/password",
		strings.NewReader(form.Encode()))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req = withUserAndEmail(req, userID, "user@example.com")
	w := httptest.NewRecorder()
	h.HandlePostPasswordChange(w, req)

	if w.Code != http.StatusUnprocessableEntity {
		t.Fatalf("expected 422 for wrong current_password, got %d: %s", w.Code, w.Body.String())
	}
	assertJSONError(t, w)
}

// ─── T1-AC-8: form-urlencoded content type ──────────────────────────────────
// INTENTIONAL RED on main: same confirm_new_password bug as AC-5. On main,
// absent confirm_new_password="" is treated as mismatch. Fails → 422.
// Fixed by T1 implementation branch.

func TestHandlePostPasswordChange_AcceptsFormURLEncoded(t *testing.T) {
	srv := fakeSupabaseServer(t, http.StatusOK, http.StatusOK)
	defer srv.Close()

	h := makeAuthHandler(srv.URL)
	userID := uuid.New()

	rawBody := url.Values{
		"current_password": {"correctpass"},
		"new_password":     {"newpassword1"},
	}.Encode()

	req := httptest.NewRequest(http.MethodPost, "/api/v1/account/password",
		strings.NewReader(rawBody))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req = withUserAndEmail(req, userID, "user@example.com")
	w := httptest.NewRecorder()
	h.HandlePostPasswordChange(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("[INTENTIONAL RED on main] expected 200 with form-urlencoded body (no confirm), got %d: %s", w.Code, w.Body.String())
	}
}

// ─── T1-AC-9: error responses must have JSON body with {error} field ────────

func TestHandlePostPasswordChange_ErrorBodyIsJSON(t *testing.T) {
	srv := fakeSupabaseServer(t, http.StatusUnauthorized, http.StatusOK)
	defer srv.Close()

	h := makeAuthHandler(srv.URL)
	userID := uuid.New()
	form := url.Values{
		"current_password": {"wrong"},
		"new_password":     {"newpassword1"},
	}
	req := httptest.NewRequest(http.MethodPost, "/api/v1/account/password",
		strings.NewReader(form.Encode()))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req = withUserAndEmail(req, userID, "user@example.com")
	w := httptest.NewRecorder()
	h.HandlePostPasswordChange(w, req)

	if ct := w.Header().Get("Content-Type"); !strings.HasPrefix(ct, "application/json") {
		t.Errorf("expected Content-Type application/json, got %q", ct)
	}
	var body map[string]string
	if err := json.NewDecoder(w.Body).Decode(&body); err != nil {
		t.Fatalf("response body is not valid JSON: %v", err)
	}
	if body["error"] == "" {
		t.Error("expected non-empty 'error' field in JSON response")
	}
}

// ─── helpers ────────────────────────────────────────────────────────────────

func assertJSONError(t *testing.T, w *httptest.ResponseRecorder) {
	t.Helper()
	var body map[string]string
	if err := json.NewDecoder(w.Body).Decode(&body); err != nil {
		t.Fatalf("expected JSON error body, decode failed: %v", err)
	}
	if body["error"] == "" {
		t.Error("expected non-empty 'error' field in error response JSON")
	}
}

func assertStatusField(t *testing.T, w *httptest.ResponseRecorder, expected string) {
	t.Helper()
	var body map[string]string
	if err := json.NewDecoder(w.Body).Decode(&body); err != nil {
		t.Fatalf("expected JSON body, decode failed: %v", err)
	}
	if body["status"] != expected {
		t.Errorf("expected status=%q, got status=%q (full body: %v)", expected, body["status"], body)
	}
}
