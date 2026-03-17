package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/meden/rpgtracker/internal/api"
	"github.com/meden/rpgtracker/internal/auth"
	"github.com/meden/rpgtracker/internal/skills"
	"github.com/meden/rpgtracker/internal/xpcurve"
)

// SkillStore is the full interface the handler needs from the DB layer.
type SkillStore interface {
	CreateSkill(ctx context.Context, userID uuid.UUID, name, description, unit string, presetID *uuid.UUID, startingLevel int, gateDescs [10]string) (*skills.Skill, error)
	ListSkills(ctx context.Context, userID uuid.UUID) ([]skills.Skill, error)
	GetSkill(ctx context.Context, userID, skillID uuid.UUID) (*skills.Skill, error)
	GetBlockerGates(ctx context.Context, skillID uuid.UUID) ([]skills.BlockerGate, error)
	UpdateSkill(ctx context.Context, userID, skillID uuid.UUID, name, description string) (*skills.Skill, error)
	SoftDeleteSkill(ctx context.Context, userID, skillID uuid.UUID) error
}

// SkillDetail is the JSON shape returned for GET /skills and GET /skills/{id}.
type SkillDetail struct {
	skills.Skill
	EffectiveLevel    int                  `json:"effective_level"`
	QuickLogChips     [4]int               `json:"quick_log_chips"`
	TierName          string               `json:"tier_name"`
	TierNumber        int                  `json:"tier_number"`
	Gates             []skills.BlockerGate `json:"gates,omitempty"`
	RecentLogs        []skills.XPEvent     `json:"recent_logs,omitempty"`
	XPToNextLevel     int                  `json:"xp_to_next_level"`
	XPForCurrentLevel int                  `json:"xp_for_current_level"`
}

// SkillHandler handles skill endpoints.
type SkillHandler struct{ store SkillStore }

// NewSkillHandler constructs a SkillHandler backed by the given DB pool.
func NewSkillHandler(db *pgxpool.Pool) *SkillHandler {
	return &SkillHandler{store: &dbSkillStore{db: db}}
}

// NewSkillHandlerWithStore constructs a SkillHandler with an injected store (for tests).
func NewSkillHandlerWithStore(s SkillStore) *SkillHandler {
	return &SkillHandler{store: s}
}

type dbSkillStore struct{ db *pgxpool.Pool }

func (s *dbSkillStore) CreateSkill(ctx context.Context, userID uuid.UUID, name, description, unit string, presetID *uuid.UUID, startingLevel int, gateDescs [10]string) (*skills.Skill, error) {
	return skills.CreateSkill(ctx, s.db, userID, name, description, unit, presetID, startingLevel, gateDescs)
}
func (s *dbSkillStore) ListSkills(ctx context.Context, userID uuid.UUID) ([]skills.Skill, error) {
	return skills.ListSkills(ctx, s.db, userID)
}
func (s *dbSkillStore) GetSkill(ctx context.Context, userID, skillID uuid.UUID) (*skills.Skill, error) {
	return skills.GetSkill(ctx, s.db, userID, skillID)
}
func (s *dbSkillStore) GetBlockerGates(ctx context.Context, skillID uuid.UUID) ([]skills.BlockerGate, error) {
	return skills.GetBlockerGates(ctx, s.db, skillID)
}
func (s *dbSkillStore) UpdateSkill(ctx context.Context, userID, skillID uuid.UUID, name, description string) (*skills.Skill, error) {
	return skills.UpdateSkill(ctx, s.db, userID, skillID, name, description)
}
func (s *dbSkillStore) SoftDeleteSkill(ctx context.Context, userID, skillID uuid.UUID) error {
	return skills.SoftDeleteSkill(ctx, s.db, userID, skillID)
}

// HandlePostSkill handles POST /api/v1/skills.
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

	startingLevel := 1
	if sl := r.FormValue("starting_level"); sl != "" {
		if n, err := parsePositiveInt(sl); err == nil {
			startingLevel = n
		}
	}
	if startingLevel < 1 || startingLevel > 99 {
		api.RespondError(w, http.StatusUnprocessableEntity, "starting_level must be between 1 and 99")
		return
	}

	var presetID *uuid.UUID
	if rawID := r.FormValue("preset_id"); rawID != "" {
		if id, err := uuid.Parse(rawID); err == nil {
			presetID = &id
		}
	}

	var gateDescs [10]string
	if raw := r.FormValue("gate_descriptions"); raw != "" {
		var descs []string
		if err := json.Unmarshal([]byte(raw), &descs); err == nil {
			for i := 0; i < 10 && i < len(descs); i++ {
				gateDescs[i] = descs[i]
			}
		}
	}

	skill, err := h.store.CreateSkill(r.Context(), userID, name, description, unit, presetID, startingLevel, gateDescs)
	if err != nil {
		if errors.Is(err, skills.ErrInvalidStartingLevel) {
			api.RespondError(w, http.StatusUnprocessableEntity, err.Error())
			return
		}
		api.RespondError(w, http.StatusInternalServerError, "failed to create skill")
		return
	}
	api.RespondJSON(w, http.StatusCreated, toSkillDetail(skill, nil, nil))
}

// HandleGetSkills handles GET /api/v1/skills.
func (h *SkillHandler) HandleGetSkills(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		api.RespondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	list, err := h.store.ListSkills(r.Context(), userID)
	if err != nil {
		api.RespondError(w, http.StatusInternalServerError, "failed to list skills")
		return
	}
	out := make([]SkillDetail, len(list))
	for i := range list {
		out[i] = toSkillDetail(&list[i], nil, nil)
	}
	api.RespondJSON(w, http.StatusOK, out)
}

// HandleGetSkill handles GET /api/v1/skills/{id}.
func (h *SkillHandler) HandleGetSkill(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		api.RespondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	skillID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		api.RespondError(w, http.StatusBadRequest, "invalid skill id")
		return
	}
	skill, err := h.store.GetSkill(r.Context(), userID, skillID)
	if err != nil {
		api.RespondError(w, http.StatusNotFound, "skill not found")
		return
	}
	gates, _ := h.store.GetBlockerGates(r.Context(), skillID)
	api.RespondJSON(w, http.StatusOK, toSkillDetail(skill, gates, nil))
}

// HandlePutSkill handles PUT /api/v1/skills/{id}.
func (h *SkillHandler) HandlePutSkill(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		api.RespondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	skillID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		api.RespondError(w, http.StatusBadRequest, "invalid skill id")
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
	skill, err := h.store.UpdateSkill(r.Context(), userID, skillID, name, description)
	if err != nil {
		api.RespondError(w, http.StatusNotFound, "skill not found")
		return
	}
	api.RespondJSON(w, http.StatusOK, toSkillDetail(skill, nil, nil))
}

// HandleDeleteSkill handles DELETE /api/v1/skills/{id}.
func (h *SkillHandler) HandleDeleteSkill(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		api.RespondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	skillID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		api.RespondError(w, http.StatusBadRequest, "invalid skill id")
		return
	}
	if err := h.store.SoftDeleteSkill(r.Context(), userID, skillID); err != nil {
		if errors.Is(err, skills.ErrNotFound) {
			api.RespondError(w, http.StatusNotFound, "skill not found")
			return
		}
		api.RespondError(w, http.StatusInternalServerError, "failed to delete skill")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// toSkillDetail enriches a Skill with computed fields (R-004: effective level in Go layer).
func toSkillDetail(s *skills.Skill, gates []skills.BlockerGate, recentLogs []skills.XPEvent) SkillDetail {
	if gates == nil {
		gates = []skills.BlockerGate{}
	}
	effective := skills.EffectiveLevel(s.CurrentLevel, gates)
	return SkillDetail{
		Skill:             *s,
		EffectiveLevel:    effective,
		QuickLogChips:     xpcurve.QuickLogChips(s.CurrentLevel),
		TierName:          xpcurve.TierName(s.CurrentLevel),
		TierNumber:        xpcurve.TierNumber(s.CurrentLevel),
		Gates:             gates,
		RecentLogs:        recentLogs,
		XPToNextLevel:     xpcurve.XPToNextLevel(s.CurrentXP),
		XPForCurrentLevel: xpcurve.XPForCurrentLevel(s.CurrentXP),
	}
}

func parsePositiveInt(s string) (int, error) {
	var n int
	_, err := fmt.Sscanf(s, "%d", &n)
	if err != nil || n <= 0 {
		return 0, fmt.Errorf("not a positive int: %s", s)
	}
	return n, nil
}
