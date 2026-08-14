package nutrilog

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"sort"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/meden/rpgtracker/internal/api"
	"github.com/meden/rpgtracker/internal/auth"
)

const (
	defaultWeightLogListLimit = 50
	maxWeightLogListLimit     = 200
	defaultWeightChartDays    = 30
	maxWeightChartDays        = 365
)

type Handler struct {
	weights WeightStore
	goals   GoalStore
}

func NewHandler(weights WeightStore, goals GoalStore) *Handler {
	return &Handler{weights: weights, goals: goals}
}

func Routes() chi.Router {
	r := chi.NewRouter()
	h := NewHandler(&dbWeights{}, &dbGoals{})
	h.mount(r)
	return r
}

func (h *Handler) mount(r chi.Router) {
	r.Post("/weight-logs", h.HandlePostWeightLog)
	r.Get("/weight-logs", h.HandleGetWeightLogs)
	r.Get("/weight-chart", h.HandleGetWeightChart)
	r.Delete("/weight-logs/{id}", h.HandleDeleteWeightLog)
	r.Put("/goals", h.HandlePutGoals)
	r.Get("/goals", h.HandleGetGoals)
}

type postWeightLogRequest struct {
	WeightKg   float64    `json:"weight_kg"`
	Note       string     `json:"note"`
	MeasuredAt *time.Time `json:"measured_at"`
}

func (h *Handler) HandlePostWeightLog(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		api.RespondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var body postWeightLogRequest
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		api.RespondError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}

	if body.WeightKg <= 0 {
		api.RespondError(w, http.StatusUnprocessableEntity, "weight_kg must be positive")
		return
	}

	measuredAt := time.Now().UTC()
	if body.MeasuredAt != nil {
		measuredAt = body.MeasuredAt.UTC()
	}

	cutoff := time.Now().UTC().Add(-MaxMeasuredAtAge)
	if measuredAt.Before(cutoff) {
		api.RespondError(w, http.StatusUnprocessableEntity, "measured_at cannot be older than 30 days")
		return
	}

	logEntry, err := h.weights.CreateWeightLog(r.Context(), userID, body.WeightKg, body.Note, measuredAt)
	if err != nil {
		log.Printf("ERROR: CreateWeightLog user=%s: %v", userID, err)
		api.RespondError(w, http.StatusInternalServerError, "failed to create weight log")
		return
	}

	api.RespondJSON(w, http.StatusCreated, logEntry)
}

func (h *Handler) HandleGetWeightLogs(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		api.RespondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	limit := defaultWeightLogListLimit
	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		if n, err := strconv.Atoi(limitStr); err == nil && n > 0 {
			limit = n
		}
	}
	if limit > maxWeightLogListLimit {
		limit = maxWeightLogListLimit
	}

	logs, err := h.weights.ListWeightLogs(r.Context(), userID, limit)
	if err != nil {
		log.Printf("ERROR: ListWeightLogs user=%s: %v", userID, err)
		api.RespondError(w, http.StatusInternalServerError, "failed to list weight logs")
		return
	}
	if logs == nil {
		logs = []WeightLog{}
	}

	sort.Slice(logs, func(i, j int) bool {
		return logs[i].MeasuredAt.After(logs[j].MeasuredAt)
	})

	api.RespondJSON(w, http.StatusOK, logs)
}

type weightChartEntry struct {
	Date     string   `json:"date"`
	WeightKg *float64 `json:"weight_kg"`
}

func (h *Handler) HandleGetWeightChart(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		api.RespondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	days := defaultWeightChartDays
	if daysStr := r.URL.Query().Get("days"); daysStr != "" {
		if n, err := strconv.Atoi(daysStr); err == nil && n > 0 {
			days = n
		}
	}
	if days > maxWeightChartDays {
		days = maxWeightChartDays
	}

	dbLogs, err := h.weights.GetWeightLogsInRange(r.Context(), userID, days)
	if err != nil {
		log.Printf("ERROR: GetWeightLogsInRange user=%s: %v", userID, err)
		api.RespondError(w, http.StatusInternalServerError, "failed to fetch weight chart")
		return
	}

	weightByDate := make(map[string]float64, len(dbLogs))
	for _, entry := range dbLogs {
		key := entry.MeasuredAt.UTC().Format("2006-01-02")
		weightByDate[key] = entry.WeightKg
	}

	today := time.Now().UTC().Truncate(24 * time.Hour)
	data := make([]weightChartEntry, days)
	for i := 0; i < days; i++ {
		d := today.AddDate(0, 0, -(days - 1 - i))
		key := d.Format("2006-01-02")
		entry := weightChartEntry{Date: key}
		if weight, ok := weightByDate[key]; ok {
			w := weight
			entry.WeightKg = &w
		}
		data[i] = entry
	}

	api.RespondJSON(w, http.StatusOK, map[string]interface{}{
		"days": days,
		"unit": "kg",
		"data": data,
	})
}

func (h *Handler) HandleDeleteWeightLog(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		api.RespondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	logID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		api.RespondError(w, http.StatusBadRequest, "invalid weight log id")
		return
	}

	if err := h.weights.DeleteWeightLog(r.Context(), userID, logID); err != nil {
		if errors.Is(err, ErrNotFound) || err.Error() == ErrNotFound.Error() {
			api.RespondError(w, http.StatusNotFound, "weight log not found")
			return
		}
		log.Printf("ERROR: DeleteWeightLog user=%s log=%s: %v", userID, logID, err)
		api.RespondError(w, http.StatusInternalServerError, "failed to delete weight log")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

type putGoalsRequest struct {
	CalorieGoal    int      `json:"calorie_goal"`
	ProteinG       *int     `json:"protein_g"`
	CarbsG         *int     `json:"carbs_g"`
	FatG           *int     `json:"fat_g"`
	TargetWeightKg *float64 `json:"target_weight_kg"`
}

func (h *Handler) HandlePutGoals(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		api.RespondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	var body putGoalsRequest
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		api.RespondError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}
	if body.CalorieGoal <= 0 {
		api.RespondError(w, http.StatusUnprocessableEntity, "calorie_goal must be positive")
		return
	}
	if body.ProteinG != nil && *body.ProteinG < 0 {
		api.RespondError(w, http.StatusUnprocessableEntity, "protein_g must be >= 0")
		return
	}
	if body.CarbsG != nil && *body.CarbsG < 0 {
		api.RespondError(w, http.StatusUnprocessableEntity, "carbs_g must be >= 0")
		return
	}
	if body.FatG != nil && *body.FatG < 0 {
		api.RespondError(w, http.StatusUnprocessableEntity, "fat_g must be >= 0")
		return
	}
	if body.TargetWeightKg != nil && *body.TargetWeightKg <= 0 {
		api.RespondError(w, http.StatusUnprocessableEntity, "target_weight_kg must be positive")
		return
	}
	saved, err := h.goals.UpsertGoals(r.Context(), userID, Goals{
		CalorieGoal:    body.CalorieGoal,
		ProteinG:       body.ProteinG,
		CarbsG:         body.CarbsG,
		FatG:           body.FatG,
		TargetWeightKg: body.TargetWeightKg,
	})
	if err != nil {
		log.Printf("ERROR: UpsertGoals user=%s: %v", userID, err)
		api.RespondError(w, http.StatusInternalServerError, "failed to save goals")
		return
	}
	api.RespondJSON(w, http.StatusOK, saved)
}

func (h *Handler) HandleGetGoals(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		api.RespondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	g, err := h.goals.GetGoals(r.Context(), userID)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			api.RespondError(w, http.StatusNotFound, "goals not found")
			return
		}
		log.Printf("ERROR: GetGoals user=%s: %v", userID, err)
		api.RespondError(w, http.StatusInternalServerError, "failed to load goals")
		return
	}
	api.RespondJSON(w, http.StatusOK, g)
}
