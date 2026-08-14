package workout

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/meden/rpgtracker/internal/api"
	"github.com/meden/rpgtracker/internal/auth"
)

const (
	defaultListLimit = 50
	maxListLimit     = 200
	defaultChartDays = 30
	maxChartDays     = 365
)

type Handler struct {
	store Store
}

func NewHandler(store Store) *Handler {
	return &Handler{store: store}
}

func Routes() chi.Router {
	r := chi.NewRouter()
	h := NewHandler(&dbStore{})
	r.Post("/sessions", h.CreateSession)
	r.Get("/sessions", h.ListSessions)
	r.Get("/sessions/{id}", h.GetSession)
	r.Post("/sessions/{id}/abandon", h.AbandonSession)
	r.Post("/sessions/{id}/finish", h.FinishSession)
	r.Post("/sessions/{id}/exercises", h.AddExercise)
	r.Post("/exercises/{id}/sets", h.AddSet)
	r.Get("/volume-chart", h.VolumeChart)
	return r
}

func (h *Handler) CreateSession(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		api.RespondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	sess, err := h.store.CreateSession(r.Context(), userID)
	if err != nil {
		log.Printf("ERROR: workout create session user=%s: %v", userID, err)
		api.RespondError(w, http.StatusInternalServerError, "failed to start session")
		return
	}
	api.RespondJSON(w, http.StatusCreated, sess)
}

func (h *Handler) ListSessions(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		api.RespondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	limit := defaultListLimit
	if raw := r.URL.Query().Get("limit"); raw != "" {
		if n, err := strconv.Atoi(raw); err == nil && n > 0 {
			limit = n
		}
	}
	if limit > maxListLimit {
		limit = maxListLimit
	}
	list, err := h.store.ListSessions(r.Context(), userID, limit)
	if err != nil {
		log.Printf("ERROR: workout list sessions user=%s: %v", userID, err)
		api.RespondError(w, http.StatusInternalServerError, "failed to list sessions")
		return
	}
	api.RespondJSON(w, http.StatusOK, list)
}

func (h *Handler) GetSession(w http.ResponseWriter, r *http.Request) {
	h.withSession(w, r, func(userID, sessionID uuid.UUID) {
		sess, err := h.store.GetSession(r.Context(), userID, sessionID)
		if err != nil {
			h.writeStoreErr(w, err, "failed to get session")
			return
		}
		api.RespondJSON(w, http.StatusOK, sess)
	})
}

func (h *Handler) AbandonSession(w http.ResponseWriter, r *http.Request) {
	h.withSession(w, r, func(userID, sessionID uuid.UUID) {
		sess, err := h.store.AbandonSession(r.Context(), userID, sessionID)
		if err != nil {
			h.writeStoreErr(w, err, "failed to abandon session")
			return
		}
		api.RespondJSON(w, http.StatusOK, sess)
	})
}

func (h *Handler) FinishSession(w http.ResponseWriter, r *http.Request) {
	h.withSession(w, r, func(userID, sessionID uuid.UUID) {
		sess, err := h.store.FinishSession(r.Context(), userID, sessionID)
		if err != nil {
			h.writeStoreErr(w, err, "failed to finish session")
			return
		}
		api.RespondJSON(w, http.StatusOK, sess)
	})
}

type addExerciseRequest struct {
	Name string `json:"name"`
}

func (h *Handler) AddExercise(w http.ResponseWriter, r *http.Request) {
	h.withSession(w, r, func(userID, sessionID uuid.UUID) {
		var body addExerciseRequest
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			api.RespondError(w, http.StatusBadRequest, "invalid JSON body")
			return
		}
		name := trimName(body.Name)
		if name == "" {
			api.RespondError(w, http.StatusUnprocessableEntity, "name is required")
			return
		}
		ex, err := h.store.AddExercise(r.Context(), userID, sessionID, name)
		if err != nil {
			h.writeStoreErr(w, err, "failed to add exercise")
			return
		}
		api.RespondJSON(w, http.StatusCreated, ex)
	})
}

type addSetRequest struct {
	Reps   int      `json:"reps"`
	LoadKg *float64 `json:"load_kg"`
	RPE    *int     `json:"rpe"`
}

func (h *Handler) AddSet(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		api.RespondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	exerciseID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		api.RespondError(w, http.StatusBadRequest, "invalid exercise id")
		return
	}
	var body addSetRequest
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		api.RespondError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}
	if body.Reps <= 0 {
		api.RespondError(w, http.StatusUnprocessableEntity, "reps must be a positive integer")
		return
	}
	if body.LoadKg != nil && *body.LoadKg <= 0 {
		api.RespondError(w, http.StatusUnprocessableEntity, "load_kg must be positive")
		return
	}
	if body.RPE != nil && (*body.RPE < 1 || *body.RPE > 10) {
		api.RespondError(w, http.StatusUnprocessableEntity, "rpe must be an integer from 1 to 10")
		return
	}
	st, err := h.store.AddSet(r.Context(), userID, exerciseID, body.Reps, body.LoadKg, body.RPE)
	if err != nil {
		h.writeStoreErr(w, err, "failed to add set")
		return
	}
	api.RespondJSON(w, http.StatusCreated, st)
}

func (h *Handler) VolumeChart(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		api.RespondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	days := defaultChartDays
	if raw := r.URL.Query().Get("days"); raw != "" {
		if n, err := strconv.Atoi(raw); err == nil && n > 0 {
			days = n
		}
	}
	if days > maxChartDays {
		days = maxChartDays
	}
	today := time.Now().UTC().Truncate(24 * time.Hour)
	since := today.AddDate(0, 0, -(days - 1))
	sessions, err := h.store.SessionsInRange(r.Context(), userID, since)
	if err != nil {
		log.Printf("ERROR: workout volume chart user=%s: %v", userID, err)
		api.RespondError(w, http.StatusInternalServerError, "failed to fetch volume chart")
		return
	}
	byDate := map[string]float64{}
	for _, sess := range sessions {
		if sess.Status != StatusCompleted {
			continue
		}
		key := sess.StartedAt.UTC().Format("2006-01-02")
		byDate[key] += sess.VolumeKg
	}
	data := make([]VolumePoint, days)
	for i := 0; i < days; i++ {
		d := today.AddDate(0, 0, -(days - 1 - i))
		key := d.Format("2006-01-02")
		point := VolumePoint{Date: key}
		if v, ok := byDate[key]; ok {
			vol := v
			point.VolumeKg = &vol
		}
		data[i] = point
	}
	api.RespondJSON(w, http.StatusOK, map[string]any{
		"days": days,
		"data": data,
	})
}

func (h *Handler) withSession(w http.ResponseWriter, r *http.Request, fn func(userID, sessionID uuid.UUID)) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		api.RespondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	sessionID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		api.RespondError(w, http.StatusBadRequest, "invalid session id")
		return
	}
	fn(userID, sessionID)
}

func (h *Handler) writeStoreErr(w http.ResponseWriter, err error, fallback string) {
	if errors.Is(err, ErrNotFound) {
		api.RespondError(w, http.StatusNotFound, "not found")
		return
	}
	if errors.Is(err, ErrConflict) {
		api.RespondError(w, http.StatusUnprocessableEntity, "session is not in progress")
		return
	}
	log.Printf("ERROR: workout: %s: %v", fallback, err)
	api.RespondError(w, http.StatusInternalServerError, fallback)
}
