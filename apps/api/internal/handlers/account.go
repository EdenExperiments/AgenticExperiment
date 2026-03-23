package handlers

import (
	"context"
	"errors"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/meden/rpgtracker/internal/api"
	"github.com/meden/rpgtracker/internal/auth"
	"github.com/meden/rpgtracker/internal/users"
)

// UserStore abstracts user-related DB operations for testability.
type UserStore interface {
	GetOrCreateUser(ctx context.Context, userID uuid.UUID, email string) (*users.User, error)
	SetPrimarySkill(ctx context.Context, userID, skillID uuid.UUID) (*uuid.UUID, error)
}

// dbUserStore wraps a pgxpool.Pool to implement UserStore using the real DB functions.
type dbUserStore struct {
	db *pgxpool.Pool
}

func (s *dbUserStore) GetOrCreateUser(ctx context.Context, userID uuid.UUID, email string) (*users.User, error) {
	return users.GetOrCreateUser(ctx, s.db, userID, email)
}

func (s *dbUserStore) SetPrimarySkill(ctx context.Context, userID, skillID uuid.UUID) (*uuid.UUID, error) {
	return users.SetPrimarySkill(ctx, s.db, userID, skillID)
}

// UserHandler handles HTTP requests for the user account screen.
type UserHandler struct {
	db    *pgxpool.Pool
	store UserStore
}

// NewUserHandler constructs a UserHandler with the given connection pool.
func NewUserHandler(db *pgxpool.Pool) *UserHandler {
	var store UserStore
	if db != nil {
		store = &dbUserStore{db: db}
	}
	return &UserHandler{db: db, store: store}
}

// NewUserHandlerWithStore constructs a UserHandler with an injected store (for testing).
func NewUserHandlerWithStore(store UserStore) *UserHandler {
	return &UserHandler{store: store}
}

// HandleGetAccount returns the authenticated user's account data as JSON.
func (h *UserHandler) HandleGetAccount(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		api.RespondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	email := auth.EmailFromContext(r.Context())
	u, err := h.store.GetOrCreateUser(r.Context(), userID, email)
	if err != nil {
		api.RespondError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	api.RespondJSON(w, http.StatusOK, u)
}

// HandlePostAccount processes a display-name update and returns JSON confirmation.
func (h *UserHandler) HandlePostAccount(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		api.RespondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	displayName := r.FormValue("display_name")
	if len(displayName) > 100 {
		api.RespondError(w, http.StatusBadRequest, "display name too long")
		return
	}
	if err := users.UpdateDisplayName(r.Context(), h.db, userID, displayName); err != nil {
		api.RespondError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	api.RespondJSON(w, http.StatusOK, map[string]string{"status": "updated"})
}

// HandlePatchAccount handles PATCH /api/v1/account.
// Accepts: timezone (IANA timezone string). Returns 422 if timezone is invalid (D-029).
func (h *UserHandler) HandlePatchAccount(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		api.RespondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	if err := r.ParseForm(); err != nil {
		api.RespondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	timezone := r.FormValue("timezone")
	if timezone != "" {
		if _, err := time.LoadLocation(timezone); err != nil {
			api.RespondError(w, http.StatusUnprocessableEntity, "invalid timezone: must be a valid IANA timezone string")
			return
		}
	}

	if h.db != nil && timezone != "" {
		if err := users.UpdateTimezone(r.Context(), h.db, userID, timezone); err != nil {
			api.RespondError(w, http.StatusInternalServerError, "failed to update account")
			return
		}
	}

	api.RespondJSON(w, http.StatusOK, map[string]interface{}{
		"timezone": timezone,
	})
}

// HandlePatchPrimarySkill handles PATCH /api/v1/account/primary-skill.
// Toggle pattern: if skill_id matches current primary, unpin; otherwise pin.
func (h *UserHandler) HandlePatchPrimarySkill(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		api.RespondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	if err := r.ParseForm(); err != nil {
		api.RespondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	skillIDStr := r.FormValue("skill_id")
	skillID, err := uuid.Parse(skillIDStr)
	if err != nil {
		api.RespondError(w, http.StatusUnprocessableEntity, "invalid skill_id format")
		return
	}

	result, err := h.store.SetPrimarySkill(r.Context(), userID, skillID)
	if err != nil {
		if errors.Is(err, users.ErrSkillNotOwned) {
			api.RespondError(w, http.StatusNotFound, "skill not found")
			return
		}
		api.RespondError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	api.RespondJSON(w, http.StatusOK, map[string]interface{}{
		"primary_skill_id": result,
	})
}
