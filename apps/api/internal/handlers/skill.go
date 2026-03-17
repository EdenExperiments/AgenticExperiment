package handlers

import (
	"context"
	"log"
	"net/http"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/meden/rpgtracker/internal/auth"
	"github.com/meden/rpgtracker/internal/skills"
	"github.com/meden/rpgtracker/internal/templates"
	"github.com/meden/rpgtracker/internal/templates/pages"
)

// SkillStore is the write interface the handler needs from the DB layer.
type SkillStore interface {
	CreateSkill(ctx context.Context, userID uuid.UUID, name, description, unit string, presetID *uuid.UUID) (*skills.Skill, error)
}

// SkillHandler handles the skill creation endpoints.
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

// HandleGetNewSkill renders GET /skills/new/custom.
// If query params (name, description, unit, preset_id) are present, the form is pre-filled.
func (h *SkillHandler) HandleGetNewSkill(w http.ResponseWriter, r *http.Request) {
	d := pages.SkillNewData{
		Name:        r.URL.Query().Get("name"),
		Description: r.URL.Query().Get("description"),
		Unit:        r.URL.Query().Get("unit"),
		PresetID:    r.URL.Query().Get("preset_id"),
	}
	if err := templates.RenderPage(w, r, http.StatusOK,
		pages.SkillNew(d), pages.SkillNewContent(d),
	); err != nil {
		log.Printf("skill new: render: %v", err)
	}
}

// HandlePostNewSkill processes POST /skills/new/custom.
// Validates, creates the skill, then redirects to /skills.
func (h *SkillHandler) HandlePostNewSkill(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	name := strings.TrimSpace(r.FormValue("name"))
	if name == "" {
		d := pages.SkillNewData{
			Name:        name,
			Description: r.FormValue("description"),
			Unit:        r.FormValue("unit"),
			PresetID:    r.FormValue("preset_id"),
			Error:       "Skill name is required.",
		}
		if err := templates.RenderPage(w, r, http.StatusUnprocessableEntity,
			pages.SkillNew(d), pages.SkillNewContent(d),
		); err != nil {
			log.Printf("skill new post: render error: %v", err)
		}
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

	if _, err := h.store.CreateSkill(r.Context(), userID, name, description, unit, presetID); err != nil {
		log.Printf("skill new post: create skill: %v", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	http.Redirect(w, r, "/skills", http.StatusSeeOther)
}
