package auth

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"

	"github.com/google/uuid"
)

// fakeSupabase starts a test server simulating Supabase auth endpoints.
// tokenStatus controls POST /auth/v1/token response; userStatus controls PUT /auth/v1/user.
func fakeSupabase(t *testing.T, tokenStatus, userStatus int) *httptest.Server {
	t.Helper()
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case r.Method == http.MethodPost && strings.Contains(r.URL.Path, "/token"):
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(tokenStatus)
			if tokenStatus == http.StatusOK {
				_ = json.NewEncoder(w).Encode(map[string]string{
					"access_token":  "fake-access-token",
					"refresh_token": "fake-refresh-token",
				})
			}
		case r.Method == http.MethodPut && strings.Contains(r.URL.Path, "/user"):
			w.WriteHeader(userStatus)
		default:
			w.WriteHeader(http.StatusNotFound)
		}
	}))
}

// authedRequest builds a POST request with auth context (user ID + email) injected.
func authedRequest(body url.Values, userID uuid.UUID, email string) *http.Request {
	r := httptest.NewRequest(http.MethodPost, "/api/v1/account/password", strings.NewReader(body.Encode()))
	r.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	ctx := WithUserID(r.Context(), userID)
	ctx = WithEmail(ctx, email)
	return r.WithContext(ctx)
}

// unauthRequest builds a POST request with no auth context.
func unauthRequest(body url.Values) *http.Request {
	r := httptest.NewRequest(http.MethodPost, "/api/v1/account/password", strings.NewReader(body.Encode()))
	r.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	return r
}

func errorField(t *testing.T, body *httptest.ResponseRecorder) string {
	t.Helper()
	var resp map[string]string
	if err := json.NewDecoder(body.Body).Decode(&resp); err != nil {
		t.Fatalf("decode response body: %v", err)
	}
	return resp["error"]
}

func TestHandlePostPasswordChange_Unauthorized(t *testing.T) {
	h := NewAuthHandler("http://unused", "anon")
	form := url.Values{"current_password": {"old"}, "new_password": {"newpass1"}}
	w := httptest.NewRecorder()
	h.HandlePostPasswordChange(w, unauthRequest(form))
	if w.Code != http.StatusUnauthorized {
		t.Fatalf("want 401, got %d", w.Code)
	}
	if errorField(t, w) == "" {
		t.Error("expected non-empty error field")
	}
}

func TestHandlePostPasswordChange_MissingCurrentPassword(t *testing.T) {
	h := NewAuthHandler("http://unused", "anon")
	form := url.Values{"new_password": {"newpass12"}}
	w := httptest.NewRecorder()
	h.HandlePostPasswordChange(w, authedRequest(form, uuid.New(), "u@example.com"))
	if w.Code != http.StatusUnprocessableEntity {
		t.Fatalf("want 422, got %d: %s", w.Code, w.Body.String())
	}
	if got := errorField(t, w); got != "current_password is required" {
		t.Errorf("error = %q, want %q", got, "current_password is required")
	}
}

func TestHandlePostPasswordChange_NewPasswordTooShort(t *testing.T) {
	h := NewAuthHandler("http://unused", "anon")
	form := url.Values{"current_password": {"oldpass1"}, "new_password": {"short"}}
	w := httptest.NewRecorder()
	h.HandlePostPasswordChange(w, authedRequest(form, uuid.New(), "u@example.com"))
	if w.Code != http.StatusUnprocessableEntity {
		t.Fatalf("want 422, got %d: %s", w.Code, w.Body.String())
	}
	if got := errorField(t, w); got != "new_password must be at least 8 characters" {
		t.Errorf("error = %q, want %q", got, "new_password must be at least 8 characters")
	}
}

func TestHandlePostPasswordChange_MismatchedConfirmation(t *testing.T) {
	h := NewAuthHandler("http://unused", "anon")
	form := url.Values{
		"current_password":     {"oldpass1"},
		"new_password":         {"newpass12"},
		"confirm_new_password": {"different1"},
	}
	w := httptest.NewRecorder()
	h.HandlePostPasswordChange(w, authedRequest(form, uuid.New(), "u@example.com"))
	if w.Code != http.StatusUnprocessableEntity {
		t.Fatalf("want 422, got %d: %s", w.Code, w.Body.String())
	}
	if got := errorField(t, w); got != "new passwords do not match" {
		t.Errorf("error = %q, want %q", got, "new passwords do not match")
	}
}

func TestHandlePostPasswordChange_BadCurrentPassword(t *testing.T) {
	srv := fakeSupabase(t, http.StatusUnauthorized, http.StatusOK)
	defer srv.Close()
	h := NewAuthHandler(srv.URL, "anon")
	form := url.Values{"current_password": {"wrongpass"}, "new_password": {"newpass12"}}
	w := httptest.NewRecorder()
	h.HandlePostPasswordChange(w, authedRequest(form, uuid.New(), "u@example.com"))
	if w.Code != http.StatusUnprocessableEntity {
		t.Fatalf("want 422, got %d: %s", w.Code, w.Body.String())
	}
	if got := errorField(t, w); got != "current password is incorrect" {
		t.Errorf("error = %q, want %q", got, "current password is incorrect")
	}
}

func TestHandlePostPasswordChange_Success(t *testing.T) {
	srv := fakeSupabase(t, http.StatusOK, http.StatusOK)
	defer srv.Close()
	h := NewAuthHandler(srv.URL, "anon")
	form := url.Values{"current_password": {"oldpass1"}, "new_password": {"newpass12"}}
	w := httptest.NewRecorder()
	h.HandlePostPasswordChange(w, authedRequest(form, uuid.New(), "u@example.com"))
	if w.Code != http.StatusOK {
		t.Fatalf("want 200, got %d: %s", w.Code, w.Body.String())
	}
	var resp map[string]string
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if resp["status"] != "password_changed" {
		t.Errorf("status = %q, want %q", resp["status"], "password_changed")
	}
}

func TestHandlePostPasswordChange_SuccessWithConfirmation(t *testing.T) {
	srv := fakeSupabase(t, http.StatusOK, http.StatusOK)
	defer srv.Close()
	h := NewAuthHandler(srv.URL, "anon")
	form := url.Values{
		"current_password":     {"oldpass1"},
		"new_password":         {"newpass12"},
		"confirm_new_password": {"newpass12"},
	}
	w := httptest.NewRecorder()
	h.HandlePostPasswordChange(w, authedRequest(form, uuid.New(), "u@example.com"))
	if w.Code != http.StatusOK {
		t.Fatalf("want 200, got %d: %s", w.Code, w.Body.String())
	}
}

func TestHandlePostSignout_ClearsCookies(t *testing.T) {
	h := NewAuthHandler("http://unused", "anon")
	r := httptest.NewRequest(http.MethodPost, "/api/v1/auth/signout", nil)
	w := httptest.NewRecorder()
	h.HandlePostSignout(w, r)
	if w.Code != http.StatusOK {
		t.Fatalf("want 200, got %d", w.Code)
	}
	cleared := 0
	for _, c := range w.Result().Cookies() {
		if c.Name == "access_token" || c.Name == "refresh_token" {
			if c.MaxAge != -1 {
				t.Errorf("cookie %s MaxAge = %d, want -1", c.Name, c.MaxAge)
			}
			cleared++
		}
	}
	if cleared != 2 {
		t.Errorf("expected 2 cleared cookies, got %d", cleared)
	}
}
