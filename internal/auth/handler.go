package auth

import (
	"bytes"
	"encoding/json"
	"net/http"
	"time"

	"github.com/meden/rpgtracker/internal/templates"
	"github.com/meden/rpgtracker/internal/templates/pages"
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

// HandleGetLogin renders the login page, or redirects to /dashboard if already authenticated.
func (h *AuthHandler) HandleGetLogin(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie("access_token")
	if err == nil && cookie.Value != "" {
		http.Redirect(w, r, "/dashboard", http.StatusFound)
		return
	}

	successMsg := ""
	if r.URL.Query().Get("msg") == "check_email" {
		successMsg = "Check your email to confirm your account"
	}

	if err := templates.Render(w, r, http.StatusOK, pages.Login("", successMsg)); err != nil {
		http.Error(w, "render error", http.StatusInternalServerError)
	}
}

// HandlePostLogin authenticates the user against the Supabase Auth REST API.
// On success it sets HttpOnly cookies and redirects to /dashboard (303).
// On failure it re-renders the login form with an error message.
func (h *AuthHandler) HandlePostLogin(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseForm(); err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	email := r.FormValue("email")
	password := r.FormValue("password")

	tokenResp, err := h.supabaseTokenRequest(r, email, password)
	if err != nil {
		if renderErr := templates.Render(w, r, http.StatusUnprocessableEntity, pages.Login("Invalid email or password", "")); renderErr != nil {
			http.Error(w, "render error", http.StatusInternalServerError)
		}
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
		MaxAge:   3600, // 1 hour
	})
	http.SetCookie(w, &http.Cookie{
		Name:     "refresh_token",
		Value:    tokenResp.RefreshToken,
		HttpOnly: true,
		Secure:   secure,
		SameSite: http.SameSiteLaxMode,
		Path:     "/",
		MaxAge:   60 * 60 * 24 * 30, // 30 days
	})

	http.Redirect(w, r, "/dashboard", http.StatusSeeOther)
}

// HandleGetRegister renders the registration page, or redirects to /dashboard if already authenticated.
func (h *AuthHandler) HandleGetRegister(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie("access_token")
	if err == nil && cookie.Value != "" {
		http.Redirect(w, r, "/dashboard", http.StatusFound)
		return
	}

	if err := templates.Render(w, r, http.StatusOK, pages.Register("")); err != nil {
		http.Error(w, "render error", http.StatusInternalServerError)
	}
}

// HandlePostRegister registers a new user via the Supabase Auth REST API.
// On success it redirects to /login?msg=check_email (303).
// On failure it re-renders the registration form with an error message.
func (h *AuthHandler) HandlePostRegister(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseForm(); err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	email := r.FormValue("email")
	password := r.FormValue("password")

	if r.FormValue("password") != r.FormValue("confirm_password") {
		if renderErr := templates.Render(w, r, http.StatusUnprocessableEntity, pages.Register("Passwords do not match")); renderErr != nil {
			http.Error(w, "render error", http.StatusInternalServerError)
		}
		return
	}

	body, _ := json.Marshal(loginRequest{Email: email, Password: password})
	req, err := http.NewRequestWithContext(r.Context(), http.MethodPost,
		h.supabaseProjectURL+"/auth/v1/signup", bytes.NewReader(body))
	if err != nil {
		if renderErr := templates.Render(w, r, http.StatusUnprocessableEntity, pages.Register("Registration failed. Please try again.")); renderErr != nil {
			http.Error(w, "render error", http.StatusInternalServerError)
		}
		return
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("apikey", h.supabaseAnonKey)

	resp, err := h.httpClient.Do(req)
	if err != nil || resp.StatusCode != http.StatusOK {
		if resp != nil {
			resp.Body.Close()
		}
		if renderErr := templates.Render(w, r, http.StatusUnprocessableEntity, pages.Register("Registration failed. Please try again.")); renderErr != nil {
			http.Error(w, "render error", http.StatusInternalServerError)
		}
		return
	}
	resp.Body.Close()

	http.Redirect(w, r, "/login?msg=check_email", http.StatusSeeOther)
}

// HandlePostSignout clears the auth cookies and redirects to /login (303).
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

	http.Redirect(w, r, "/login", http.StatusSeeOther)
}

// updatePasswordRequest is the JSON body sent to the Supabase user-update endpoint.
type updatePasswordRequest struct {
	Password string `json:"password"`
}

// HandleGetPasswordChange renders the password change form for an authenticated user.
func (h *AuthHandler) HandleGetPasswordChange(w http.ResponseWriter, r *http.Request) {
	_, ok := UserIDFromContext(r.Context())
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	if err := templates.RenderPage(w, r, http.StatusOK, pages.PasswordChange("", ""), pages.PasswordChangeContent("", "")); err != nil {
		http.Error(w, "render error", http.StatusInternalServerError)
	}
}

// HandlePostPasswordChange processes a password change request for an authenticated user.
func (h *AuthHandler) HandlePostPasswordChange(w http.ResponseWriter, r *http.Request) {
	_, ok := UserIDFromContext(r.Context())
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	if err := r.ParseForm(); err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}

	currentPassword := r.FormValue("current_password")
	newPassword := r.FormValue("new_password")
	confirmNewPassword := r.FormValue("confirm_new_password")

	if newPassword != confirmNewPassword {
		if renderErr := templates.RenderPage(w, r, http.StatusUnprocessableEntity,
			pages.PasswordChange("New passwords do not match", ""),
			pages.PasswordChangeContent("New passwords do not match", "")); renderErr != nil {
			http.Error(w, "render error", http.StatusInternalServerError)
		}
		return
	}

	email := EmailFromContext(r.Context())
	if email == "" {
		http.Error(w, "Unable to verify identity. Please sign out and back in.", http.StatusInternalServerError)
		return
	}
	tokenResp, err := h.supabaseTokenRequest(r, email, currentPassword)
	if err != nil {
		if renderErr := templates.RenderPage(w, r, http.StatusUnprocessableEntity,
			pages.PasswordChange("Current password is incorrect", ""),
			pages.PasswordChangeContent("Current password is incorrect", "")); renderErr != nil {
			http.Error(w, "render error", http.StatusInternalServerError)
		}
		return
	}

	body, _ := json.Marshal(updatePasswordRequest{Password: newPassword})
	req, err := http.NewRequestWithContext(r.Context(), http.MethodPut,
		h.supabaseProjectURL+"/auth/v1/user", bytes.NewReader(body))
	if err != nil {
		if renderErr := templates.RenderPage(w, r, http.StatusUnprocessableEntity,
			pages.PasswordChange("Failed to update password. Please try again.", ""),
			pages.PasswordChangeContent("Failed to update password. Please try again.", "")); renderErr != nil {
			http.Error(w, "render error", http.StatusInternalServerError)
		}
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
		if renderErr := templates.RenderPage(w, r, http.StatusUnprocessableEntity,
			pages.PasswordChange("Failed to update password. Please try again.", ""),
			pages.PasswordChangeContent("Failed to update password. Please try again.", "")); renderErr != nil {
			http.Error(w, "render error", http.StatusInternalServerError)
		}
		return
	}
	resp.Body.Close()

	http.Redirect(w, r, "/account?msg=password_changed", http.StatusSeeOther)
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
