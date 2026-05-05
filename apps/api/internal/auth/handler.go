package auth

import (
	"bytes"
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/meden/rpgtracker/internal/api"
)

// AuthHandler handles Supabase-backed authentication routes.
type AuthHandler struct {
	supabaseProjectURL string
	supabaseAnonKey    string
	httpClient         *http.Client
}

// NewAuthHandler creates an AuthHandler configured with the given Supabase credentials.
func NewAuthHandler(supabaseProjectURL, supabaseAnonKey string) *AuthHandler {
	return &AuthHandler{
		supabaseProjectURL: supabaseProjectURL,
		supabaseAnonKey:    supabaseAnonKey,
		httpClient:         &http.Client{Timeout: 15 * time.Second},
	}
}

// loginRequest is the JSON body sent to the Supabase token endpoint.
type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// loginResponse holds the tokens returned by a successful Supabase auth call.
type loginResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
}

// HandleGetLogin returns 200 if not authenticated, or 302 redirect if already logged in.
func (h *AuthHandler) HandleGetLogin(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie("access_token")
	if err == nil && cookie.Value != "" {
		api.RespondJSON(w, http.StatusOK, map[string]string{"redirect": "/api/v1/account"})
		return
	}
	api.RespondJSON(w, http.StatusOK, map[string]string{"status": "unauthenticated"})
}

// HandlePostLogin authenticates the user against the Supabase Auth REST API.
// On success it sets HttpOnly cookies and returns JSON confirmation.
// On failure it returns a JSON error.
func (h *AuthHandler) HandlePostLogin(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseForm(); err != nil {
		api.RespondError(w, http.StatusBadRequest, "bad request")
		return
	}
	email := r.FormValue("email")
	password := r.FormValue("password")

	tokenResp, err := h.supabaseTokenRequest(r, email, password)
	if err != nil {
		api.RespondError(w, http.StatusUnauthorized, "invalid email or password")
		return
	}

	secure := r.TLS != nil || r.Header.Get("X-Forwarded-Proto") == "https"

	http.SetCookie(w, &http.Cookie{
		Name:     "access_token",
		Value:    tokenResp.AccessToken,
		HttpOnly: true,
		Secure:   secure,
		SameSite: http.SameSiteLaxMode,
		Path:     "/",
		MaxAge:   3600,
	})
	http.SetCookie(w, &http.Cookie{
		Name:     "refresh_token",
		Value:    tokenResp.RefreshToken,
		HttpOnly: true,
		Secure:   secure,
		SameSite: http.SameSiteLaxMode,
		Path:     "/",
		MaxAge:   60 * 60 * 24 * 30,
	})

	api.RespondJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// HandleGetRegister returns 200 (or redirect if already logged in).
func (h *AuthHandler) HandleGetRegister(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie("access_token")
	if err == nil && cookie.Value != "" {
		api.RespondJSON(w, http.StatusOK, map[string]string{"redirect": "/api/v1/account"})
		return
	}
	api.RespondJSON(w, http.StatusOK, map[string]string{"status": "unauthenticated"})
}

// HandlePostRegister registers a new user via the Supabase Auth REST API.
// On success returns JSON confirmation. On failure returns a JSON error.
func (h *AuthHandler) HandlePostRegister(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseForm(); err != nil {
		api.RespondError(w, http.StatusBadRequest, "bad request")
		return
	}
	email := r.FormValue("email")
	password := r.FormValue("password")

	if r.FormValue("password") != r.FormValue("confirm_password") {
		api.RespondError(w, http.StatusUnprocessableEntity, "passwords do not match")
		return
	}

	body, _ := json.Marshal(loginRequest{Email: email, Password: password})
	req, err := http.NewRequestWithContext(r.Context(), http.MethodPost,
		h.supabaseProjectURL+"/auth/v1/signup", bytes.NewReader(body))
	if err != nil {
		api.RespondError(w, http.StatusInternalServerError, "registration failed")
		return
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("apikey", h.supabaseAnonKey)

	resp, err := h.httpClient.Do(req)
	if err != nil || resp.StatusCode != http.StatusOK {
		if resp != nil {
			statusCode := resp.StatusCode
			resp.Body.Close()
			log.Printf("auth: supabase signup returned non-200 status: %d", statusCode)
		} else {
			log.Printf("auth: supabase signup request failed: %v", err)
		}
		api.RespondError(w, http.StatusUnprocessableEntity, "registration failed")
		return
	}
	resp.Body.Close()

	api.RespondJSON(w, http.StatusOK, map[string]string{"status": "check_email"})
}

// HandlePostSignout clears the auth cookies and returns JSON confirmation.
func (h *AuthHandler) HandlePostSignout(w http.ResponseWriter, r *http.Request) {
	secure := r.TLS != nil || r.Header.Get("X-Forwarded-Proto") == "https"

	http.SetCookie(w, &http.Cookie{
		Name:     "access_token",
		Value:    "",
		HttpOnly: true,
		Secure:   secure,
		SameSite: http.SameSiteLaxMode,
		Path:     "/",
		MaxAge:   -1,
	})
	http.SetCookie(w, &http.Cookie{
		Name:     "refresh_token",
		Value:    "",
		HttpOnly: true,
		Secure:   secure,
		SameSite: http.SameSiteLaxMode,
		Path:     "/",
		MaxAge:   -1,
	})

	api.RespondJSON(w, http.StatusOK, map[string]string{"status": "signed_out"})
}

// updatePasswordRequest is the JSON body sent to the Supabase user-update endpoint.
type updatePasswordRequest struct {
	Password string `json:"password"`
}

// HandleGetPasswordChange returns 200 for authenticated users, 401 otherwise.
func (h *AuthHandler) HandleGetPasswordChange(w http.ResponseWriter, r *http.Request) {
	_, ok := UserIDFromContext(r.Context())
	if !ok {
		api.RespondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	api.RespondJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// HandlePostPasswordChange processes a password change request for an authenticated user.
func (h *AuthHandler) HandlePostPasswordChange(w http.ResponseWriter, r *http.Request) {
	_, ok := UserIDFromContext(r.Context())
	if !ok {
		api.RespondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	if err := r.ParseForm(); err != nil {
		api.RespondError(w, http.StatusBadRequest, "bad request")
		return
	}

	currentPassword := r.FormValue("current_password")
	newPassword := r.FormValue("new_password")
	confirmNewPassword := r.FormValue("confirm_new_password")

	if currentPassword == "" {
		api.RespondError(w, http.StatusUnprocessableEntity, "current_password is required")
		return
	}

	if len(newPassword) < 8 {
		api.RespondError(w, http.StatusUnprocessableEntity, "new_password must be at least 8 characters")
		return
	}

	// confirm_new_password is optional; when provided it must match.
	if confirmNewPassword != "" && newPassword != confirmNewPassword {
		api.RespondError(w, http.StatusUnprocessableEntity, "new passwords do not match")
		return
	}

	email := EmailFromContext(r.Context())
	if email == "" {
		api.RespondError(w, http.StatusInternalServerError, "unable to verify identity")
		return
	}
	tokenResp, err := h.supabaseTokenRequest(r, email, currentPassword)
	if err != nil {
		api.RespondError(w, http.StatusUnprocessableEntity, "current password is incorrect")
		return
	}

	body, _ := json.Marshal(updatePasswordRequest{Password: newPassword})
	req, err := http.NewRequestWithContext(r.Context(), http.MethodPut,
		h.supabaseProjectURL+"/auth/v1/user", bytes.NewReader(body))
	if err != nil {
		api.RespondError(w, http.StatusInternalServerError, "failed to update password")
		return
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("apikey", h.supabaseAnonKey)
	req.Header.Set("Authorization", "Bearer "+tokenResp.AccessToken)

	resp, err := h.httpClient.Do(req)
	if err != nil || resp.StatusCode != http.StatusOK {
		if resp != nil {
			resp.Body.Close()
		}
		api.RespondError(w, http.StatusUnprocessableEntity, "failed to update password")
		return
	}
	resp.Body.Close()

	api.RespondJSON(w, http.StatusOK, map[string]string{"status": "password_changed"})
}

// supabaseTokenRequest calls the Supabase token endpoint and returns the token response.
func (h *AuthHandler) supabaseTokenRequest(r *http.Request, email, password string) (*loginResponse, error) {
	body, _ := json.Marshal(loginRequest{Email: email, Password: password})
	req, err := http.NewRequestWithContext(r.Context(), http.MethodPost,
		h.supabaseProjectURL+"/auth/v1/token?grant_type=password", bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("apikey", h.supabaseAnonKey)

	resp, err := h.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, &authAPIError{statusCode: resp.StatusCode}
	}

	var tokenResp loginResponse
	if err := json.NewDecoder(resp.Body).Decode(&tokenResp); err != nil {
		return nil, err
	}
	return &tokenResp, nil
}

// authAPIError represents a non-200 response from the Supabase Auth API.
type authAPIError struct {
	statusCode int
}

func (e *authAPIError) Error() string {
	return "supabase auth API error"
}
