package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"strconv"
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
	CreateSkill(ctx context.Context, userID uuid.UUID, name, description, unit string, presetID *uuid.UUID, categoryID *uuid.UUID, startingLevel int, gateDescs [10]string) (*skills.Skill, error)
	ListSkills(ctx context.Context, userID uuid.UUID) ([]skills.Skill, error)
	GetSkill(ctx context.Context, userID, skillID uuid.UUID) (*skills.Skill, error)
	GetBlockerGates(ctx context.Context, skillID uuid.UUID) ([]skills.BlockerGate, error)
	UpdateSkill(ctx context.Context, userID, skillID uuid.UUID, name, description string, categoryID *uuid.UUID) (*skills.Skill, error)
	SoftDeleteSkill(ctx context.Context, userID, skillID uuid.UUID) error
	ToggleFavourite(ctx context.Context, userID, skillID uuid.UUID) (bool, error)
	SetSkillTags(ctx context.Context, userID, skillID uuid.UUID, tagNames []string) ([]skills.Tag, error)
	ListTags(ctx context.Context, userID uuid.UUID) ([]skills.TagWithCount, error)
	ListCategories(ctx context.Context) ([]skills.Category, error)
	ValidateCategoryID(ctx context.Context, categoryID uuid.UUID) error
}

// SkillDetail is the JSON shape returned for GET /skills and GET /skills/{id}.
type SkillDetail struct {
	skills.Skill
	EffectiveLevel    int                  `json:"effective_level"`
	QuickLogChips     [4]int               `json:"quick_log_chips"`
	TierName          string               `json:"tier_name"`
	TierNumber        int                  `json:"tier_number"`
	Gates             []skills.BlockerGate `json:"gates"`
	RecentLogs        []skills.XPEvent     `json:"recent_logs"`
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

func (s *dbSkillStore) CreateSkill(ctx context.Context, userID uuid.UUID, name, description, unit string, presetID *uuid.UUID, categoryID *uuid.UUID, startingLevel int, gateDescs [10]string) (*skills.Skill, error) {
	return skills.CreateSkill(ctx, s.db, userID, name, description, unit, presetID, categoryID, startingLevel, gateDescs)
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
func (s *dbSkillStore) UpdateSkill(ctx context.Context, userID, skillID uuid.UUID, name, description string, categoryID *uuid.UUID) (*skills.Skill, error) {
	return skills.UpdateSkill(ctx, s.db, userID, skillID, name, description, categoryID)
}
func (s *dbSkillStore) SoftDeleteSkill(ctx context.Context, userID, skillID uuid.UUID) error {
	return skills.SoftDeleteSkill(ctx, s.db, userID, skillID)
}
func (s *dbSkillStore) ToggleFavourite(ctx context.Context, userID, skillID uuid.UUID) (bool, error) {
	return skills.ToggleFavourite(ctx, s.db, userID, skillID)
}
func (s *dbSkillStore) SetSkillTags(ctx context.Context, userID, skillID uuid.UUID, tagNames []string) ([]skills.Tag, error) {
	return skills.SetSkillTags(ctx, s.db, userID, skillID, tagNames)
}
func (s *dbSkillStore) ListTags(ctx context.Context, userID uuid.UUID) ([]skills.TagWithCount, error) {
	return skills.ListTags(ctx, s.db, userID)
}
func (s *dbSkillStore) ListCategories(ctx context.Context) ([]skills.Category, error) {
	return skills.ListCategories(ctx, s.db)
}
func (s *dbSkillStore) ValidateCategoryID(ctx context.Context, categoryID uuid.UUID) error {
	return skills.ValidateCategoryID(ctx, s.db, categoryID)
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

	var categoryID *uuid.UUID
	if rawCat := r.FormValue("category_id"); rawCat != "" {
		if catID, err := uuid.Parse(rawCat); err != nil {
			api.RespondError(w, http.StatusUnprocessableEntity, "invalid category")
			return
		} else {
			if err := h.store.ValidateCategoryID(r.Context(), catID); err != nil {
				api.RespondError(w, http.StatusUnprocessableEntity, "invalid category")
				return
			}
			categoryID = &catID
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

	skill, err := h.store.CreateSkill(r.Context(), userID, name, description, unit, presetID, categoryID, startingLevel, gateDescs)
	if err != nil {
		if errors.Is(err, skills.ErrInvalidStartingLevel) {
			api.RespondError(w, http.StatusUnprocessableEntity, err.Error())
			return
		}
		log.Printf("ERROR: CreateSkill user=%s: %v", userID, err)
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
		log.Printf("ERROR: ListSkills user=%s: %v", userID, err)
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
		if errors.Is(err, skills.ErrNotFound) {
			api.RespondError(w, http.StatusNotFound, "skill not found")
			return
		}
		log.Printf("ERROR: GetSkill user=%s skill=%s: %v", userID, skillID, err)
		api.RespondError(w, http.StatusInternalServerError, "failed to fetch skill")
		return
	}
	gates, err := h.store.GetBlockerGates(r.Context(), skillID)
	if err != nil {
		// Non-fatal: return skill without gates rather than failing the whole request.
		// Log for observability.
		log.Printf("WARN: GetBlockerGates for skill %s: %v", skillID, err)
		gates = []skills.BlockerGate{}
	}
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

	var categoryID *uuid.UUID
	if rawCat := r.FormValue("category_id"); rawCat != "" {
		if catID, err := uuid.Parse(rawCat); err != nil {
			api.RespondError(w, http.StatusUnprocessableEntity, "invalid category")
			return
		} else {
			if err := h.store.ValidateCategoryID(r.Context(), catID); err != nil {
				api.RespondError(w, http.StatusUnprocessableEntity, "invalid category")
				return
			}
			categoryID = &catID
		}
	}

	skill, err := h.store.UpdateSkill(r.Context(), userID, skillID, name, description, categoryID)
	if err != nil {
		if errors.Is(err, skills.ErrNotFound) {
			api.RespondError(w, http.StatusNotFound, "skill not found")
			return
		}
		log.Printf("ERROR: UpdateSkill user=%s skill=%s: %v", userID, skillID, err)
		api.RespondError(w, http.StatusInternalServerError, "failed to update skill")
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
		log.Printf("ERROR: SoftDeleteSkill user=%s skill=%s: %v", userID, skillID, err)
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
	if recentLogs == nil {
		recentLogs = []skills.XPEvent{}
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
	n, err := strconv.Atoi(s)
	if err != nil || n <= 0 {
		return 0, fmt.Errorf("not a positive int: %s", s)
	}
	return n, nil
}

// HandlePatchFavourite handles PATCH /api/v1/skills/{id}/favourite.
func (h *SkillHandler) HandlePatchFavourite(w http.ResponseWriter, r *http.Request) {
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
	newVal, err := h.store.ToggleFavourite(r.Context(), userID, skillID)
	if err != nil {
		if errors.Is(err, skills.ErrNotFound) {
			api.RespondError(w, http.StatusNotFound, "skill not found")
			return
		}
		log.Printf("ERROR: ToggleFavourite user=%s skill=%s: %v", userID, skillID, err)
		api.RespondError(w, http.StatusInternalServerError, "failed to toggle favourite")
		return
	}
	api.RespondJSON(w, http.StatusOK, map[string]bool{"is_favourite": newVal})
}

// HandlePutSkillTags handles PUT /api/v1/skills/{id}/tags.
func (h *SkillHandler) HandlePutSkillTags(w http.ResponseWriter, r *http.Request) {
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
	raw := strings.TrimSpace(r.FormValue("tag_names"))
	var tagNames []string
	if raw != "" {
		for _, t := range strings.Split(raw, ",") {
			t = strings.TrimSpace(t)
			if t != "" {
				tagNames = append(tagNames, t)
			}
		}
	}
	tags, err := h.store.SetSkillTags(r.Context(), userID, skillID, tagNames)
	if err != nil {
		if errors.Is(err, skills.ErrTooManyTags) {
			api.RespondError(w, http.StatusUnprocessableEntity, err.Error())
			return
		}
		if errors.Is(err, skills.ErrNotFound) {
			api.RespondError(w, http.StatusNotFound, "skill not found")
			return
		}
		log.Printf("ERROR: SetSkillTags user=%s skill=%s: %v", userID, skillID, err)
		api.RespondError(w, http.StatusInternalServerError, "failed to set tags")
		return
	}
	api.RespondJSON(w, http.StatusOK, tags)
}

// HandleGetTags handles GET /api/v1/tags.
func (h *SkillHandler) HandleGetTags(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		api.RespondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	tags, err := h.store.ListTags(r.Context(), userID)
	if err != nil {
		log.Printf("ERROR: ListTags user=%s: %v", userID, err)
		api.RespondError(w, http.StatusInternalServerError, "failed to list tags")
		return
	}
	if tags == nil {
		tags = []skills.TagWithCount{}
	}
	api.RespondJSON(w, http.StatusOK, tags)
}

// HandleGetCategories handles GET /api/v1/categories.
func (h *SkillHandler) HandleGetCategories(w http.ResponseWriter, r *http.Request) {
	cats, err := h.store.ListCategories(r.Context())
	if err != nil {
		log.Printf("ERROR: ListCategories: %v", err)
		api.RespondError(w, http.StatusInternalServerError, "failed to list categories")
		return
	}
	api.RespondJSON(w, http.StatusOK, cats)
}
