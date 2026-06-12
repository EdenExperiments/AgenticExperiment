package handlers

import (
	"context"
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
	"github.com/meden/rpgtracker/internal/database"
	"github.com/meden/rpgtracker/internal/nutrilog"
)

const (
	defaultWeightLogListLimit = 50
	maxWeightLogListLimit     = 200
	defaultWeightChartDays    = 30
	maxWeightChartDays        = 365
)

// NutrilogWeightStore is the persistence interface for weight log handlers.
type NutrilogWeightStore interface {
	CreateWeightLog(ctx context.Context, userID uuid.UUID, weightKg float64, note string, measuredAt time.Time) (*nutrilog.WeightLog, error)
	ListWeightLogs(ctx context.Context, userID uuid.UUID, limit int) ([]nutrilog.WeightLog, error)
	GetWeightLogsInRange(ctx context.Context, userID uuid.UUID, days int) ([]nutrilog.WeightLog, error)
	DeleteWeightLog(ctx context.Context, userID, logID uuid.UUID) error
}

type dbNutrilogWeightStore struct{}

func (s *dbNutrilogWeightStore) CreateWeightLog(ctx context.Context, userID uuid.UUID, weightKg float64, note string, measuredAt time.Time) (*nutrilog.WeightLog, error) {
	return nutrilog.CreateWeightLog(ctx, database.MustQuerier(ctx), userID, weightKg, note, measuredAt)
}

func (s *dbNutrilogWeightStore) ListWeightLogs(ctx context.Context, userID uuid.UUID, limit int) ([]nutrilog.WeightLog, error) {
	return nutrilog.ListWeightLogs(ctx, database.MustQuerier(ctx), userID, limit)
}

func (s *dbNutrilogWeightStore) GetWeightLogsInRange(ctx context.Context, userID uuid.UUID, days int) ([]nutrilog.WeightLog, error) {
	return nutrilog.GetWeightLogsInRange(ctx, database.MustQuerier(ctx), userID, days)
}

func (s *dbNutrilogWeightStore) DeleteWeightLog(ctx context.Context, userID, logID uuid.UUID) error {
	return nutrilog.DeleteWeightLog(ctx, database.MustQuerier(ctx), userID, logID)
}

// NutrilogWeightHandler handles NutriLog weight log HTTP endpoints.
type NutrilogWeightHandler struct {
	store NutrilogWeightStore
}

// NewNutrilogWeightHandler constructs a NutrilogWeightHandler backed by the database.
func NewNutrilogWeightHandler() *NutrilogWeightHandler {
	return &NutrilogWeightHandler{store: &dbNutrilogWeightStore{}}
}

// NewNutrilogWeightHandlerWithStore constructs a NutrilogWeightHandler with an injected store (for tests).
func NewNutrilogWeightHandlerWithStore(store any) *NutrilogWeightHandler {
	return &NutrilogWeightHandler{store: adaptWeightStore(store)}
}

type postWeightLogRequest struct {
	WeightKg   float64    `json:"weight_kg"`
	Note       string     `json:"note"`
	MeasuredAt *time.Time `json:"measured_at"`
}

// HandlePostWeightLog handles POST /api/v1/nutrilog/weight-logs.
func (h *NutrilogWeightHandler) HandlePostWeightLog(w http.ResponseWriter, r *http.Request) {
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

	cutoff := time.Now().UTC().Add(-nutrilog.MaxMeasuredAtAge)
	if measuredAt.Before(cutoff) {
		api.RespondError(w, http.StatusUnprocessableEntity, "measured_at cannot be older than 30 days")
		return
	}

	logEntry, err := h.store.CreateWeightLog(r.Context(), userID, body.WeightKg, body.Note, measuredAt)
	if err != nil {
		log.Printf("ERROR: CreateWeightLog user=%s: %v", userID, err)
		api.RespondError(w, http.StatusInternalServerError, "failed to create weight log")
		return
	}

	api.RespondJSON(w, http.StatusCreated, logEntry)
}

// HandleGetWeightLogs handles GET /api/v1/nutrilog/weight-logs.
func (h *NutrilogWeightHandler) HandleGetWeightLogs(w http.ResponseWriter, r *http.Request) {
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

	logs, err := h.store.ListWeightLogs(r.Context(), userID, limit)
	if err != nil {
		log.Printf("ERROR: ListWeightLogs user=%s: %v", userID, err)
		api.RespondError(w, http.StatusInternalServerError, "failed to list weight logs")
		return
	}
	if logs == nil {
		logs = []nutrilog.WeightLog{}
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

// HandleGetWeightChart handles GET /api/v1/nutrilog/weight-chart.
func (h *NutrilogWeightHandler) HandleGetWeightChart(w http.ResponseWriter, r *http.Request) {
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

	dbLogs, err := h.store.GetWeightLogsInRange(r.Context(), userID, days)
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

// HandleDeleteWeightLog handles DELETE /api/v1/nutrilog/weight-logs/{id}.
func (h *NutrilogWeightHandler) HandleDeleteWeightLog(w http.ResponseWriter, r *http.Request) {
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

	if err := h.store.DeleteWeightLog(r.Context(), userID, logID); err != nil {
		if isNutrilogNotFound(err) {
			api.RespondError(w, http.StatusNotFound, "weight log not found")
			return
		}
		log.Printf("ERROR: DeleteWeightLog user=%s log=%s: %v", userID, logID, err)
		api.RespondError(w, http.StatusInternalServerError, "failed to delete weight log")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func isNutrilogNotFound(err error) bool {
	return errors.Is(err, nutrilog.ErrNotFound) ||
		(err != nil && err.Error() == nutrilog.ErrNotFound.Error())
}
