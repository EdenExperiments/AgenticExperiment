package handlers

import (
	"context"
	"net/http"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/meden/rpgtracker/internal/api"
	"github.com/meden/rpgtracker/internal/auth"
	"github.com/meden/rpgtracker/internal/skills"
)

// SkillStore is the write interface the handler needs from the DB layer.
type SkillStore interface {
	CreateSkill(ctx context.Context, userID uuid.UUID, name, description, unit string, presetID *uuid.UUID) (*skills.Skill, error)
}

// SkillHandler handles skill endpoints.
type SkillHandler struct {
	store SkillStore
}

// NewSkillHandler constructs a SkillHandler backed by the given DB pool.
func NewSkillHandler(db *pgxpool.Pool) *SkillHandler {
	return &SkillHandler{store: &dbSkillStore{db: db}}
}

// NewSkillHandlerWithStore constructs a SkillHandler with an injected store (for tests).
func NewSkillHandlerWithStore(s SkillStore) *SkillHandler {
	return &SkillHandler{store: s}
}

type dbSkillStore struct{ db *pgxpool.Pool }

func (s *dbSkillStore) CreateSkill(ctx context.Context, userID uuid.UUID, name, description, unit string, presetID *uuid.UUID) (*skills.Skill, error) {
	return skills.CreateSkill(ctx, s.db, userID, name, description, unit, presetID)
}

// HandlePostSkill processes POST /api/v1/skills.
// Expects application/x-www-form-urlencoded body: name, description, unit, preset_id (optional).
// Returns the created skill as JSON.
func (h *SkillHandler) HandlePostSkill(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		api.RespondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	if err := r.ParseForm(); err != nil {
		api.RespondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	name := strings.TrimSpace(r.FormValue("name"))
	if name == "" {
		api.RespondError(w, http.StatusUnprocessableEntity, "skill name is required")
		return
	}

	description := strings.TrimSpace(r.FormValue("description"))
	unit := strings.TrimSpace(r.FormValue("unit"))
	if unit == "" {
		unit = "session"
	}

	var presetID *uuid.UUID
	if rawID := r.FormValue("preset_id"); rawID != "" {
		if id, err := uuid.Parse(rawID); err == nil {
			presetID = &id
		}
	}

	skill, err := h.store.CreateSkill(r.Context(), userID, name, description, unit, presetID)
	if err != nil {
		api.RespondError(w, http.StatusInternalServerError, "failed to create skill")
		return
	}

	api.RespondJSON(w, http.StatusCreated, skill)
}
