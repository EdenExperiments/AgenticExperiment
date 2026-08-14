package nutrilog

import (
	"encoding/json"
	"errors"
	"log"
	"math"
	"net/http"
	"sort"
	"strconv"
	"strings"
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

func parseBoundedDays(raw string, fallback, max int) int {
	if raw == "" {
		return fallback
	}
	n, err := strconv.Atoi(raw)
	if err != nil || n < 1 {
		return fallback
	}
	if n > max {
		return max
	}
	return n
}

type Handler struct {
	weights WeightStore
	goals   GoalStore
	foods   FoodStore
	diary   DiaryStore
	search  FoodSearch
}

func NewHandler(weights WeightStore, goals GoalStore) *Handler {
	return &Handler{weights: weights, goals: goals}
}

func Routes() chi.Router {
	r := chi.NewRouter()
	h := &Handler{
		weights: &dbWeights{},
		goals:   &dbGoals{},
		foods:   &dbFoods{},
		diary:   &dbDiary{},
		search:  newOFFClient(),
	}
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
	r.Get("/foods/search", h.HandleSearchFoods)
	r.Post("/foods", h.HandlePostFood)
	r.Post("/diary", h.HandlePostDiary)
	r.Get("/diary", h.HandleGetDiary)
	r.Delete("/diary/{id}", h.HandleDeleteDiary)
	r.Get("/remaining", h.HandleGetRemaining)
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

	days := parseBoundedDays(r.URL.Query().Get("days"), defaultWeightChartDays, maxWeightChartDays)

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

func (h *Handler) HandleSearchFoods(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		api.RespondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	q := strings.TrimSpace(r.URL.Query().Get("q"))
	if q == "" {
		api.RespondError(w, http.StatusUnprocessableEntity, "q is required")
		return
	}
	var hits []Food
	var offErr error
	if h.search != nil {
		hits, offErr = h.search.Search(r.Context(), q)
	} else {
		offErr = errors.New("off unavailable")
	}
	if offErr != nil {
		if h.foods == nil {
			api.RespondError(w, http.StatusBadGateway, "food search unavailable")
			return
		}
		cached, err := h.foods.SearchCachedFoods(r.Context(), userID, q)
		if err != nil {
			log.Printf("ERROR: SearchCachedFoods user=%s: %v", userID, err)
			api.RespondError(w, http.StatusInternalServerError, "failed to search foods")
			return
		}
		api.RespondJSON(w, http.StatusOK, map[string]any{"source": "cache", "foods": cached})
		return
	}
	api.RespondJSON(w, http.StatusOK, map[string]any{"source": "off", "foods": hits})
}

type postFoodRequest struct {
	Name         string  `json:"name"`
	Calories     int     `json:"calories"`
	ProteinG     float64 `json:"protein_g"`
	CarbsG       float64 `json:"carbs_g"`
	FatG         float64 `json:"fat_g"`
	ServingLabel string  `json:"serving_label"`
}

func (h *Handler) HandlePostFood(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		api.RespondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	var body postFoodRequest
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		api.RespondError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}
	name := strings.TrimSpace(body.Name)
	if name == "" || body.Calories < 0 || body.ProteinG < 0 || body.CarbsG < 0 || body.FatG < 0 {
		api.RespondError(w, http.StatusUnprocessableEntity, "invalid food")
		return
	}
	saved, err := h.foods.CreateCustomFood(r.Context(), userID, Food{
		Name: name, Calories: body.Calories, ProteinG: body.ProteinG, CarbsG: body.CarbsG, FatG: body.FatG, ServingLabel: body.ServingLabel,
	})
	if err != nil {
		log.Printf("ERROR: CreateCustomFood user=%s: %v", userID, err)
		api.RespondError(w, http.StatusInternalServerError, "failed to save food")
		return
	}
	api.RespondJSON(w, http.StatusCreated, saved)
}

type postDiaryRequest struct {
	Name         string     `json:"name"`
	Calories     int        `json:"calories"`
	ProteinG     float64    `json:"protein_g"`
	CarbsG       float64    `json:"carbs_g"`
	FatG         float64    `json:"fat_g"`
	ServingQty   float64    `json:"serving_qty"`
	EatenAt      *time.Time `json:"eaten_at"`
	OffID        *string    `json:"off_id"`
	ServingLabel string     `json:"serving_label"`
}

func (h *Handler) HandlePostDiary(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		api.RespondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	var body postDiaryRequest
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		api.RespondError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}
	name := strings.TrimSpace(body.Name)
	if name == "" || body.ServingQty <= 0 {
		api.RespondError(w, http.StatusUnprocessableEntity, "name and positive serving_qty are required")
		return
	}
	eaten := time.Now().UTC()
	if body.EatenAt != nil {
		eaten = body.EatenAt.UTC()
	}
	entry := DiaryEntry{
		EatenAt:    eaten,
		ServingQty: body.ServingQty,
		Name:       name,
		Calories:   int(math.Round(float64(body.Calories) * body.ServingQty)),
		ProteinG:   body.ProteinG * body.ServingQty,
		CarbsG:     body.CarbsG * body.ServingQty,
		FatG:       body.FatG * body.ServingQty,
	}
	if h.foods != nil && body.OffID != nil && *body.OffID != "" {
		_, _ = h.foods.UpsertCachedFood(r.Context(), userID, Food{
			OffID: body.OffID, Name: name, Calories: body.Calories, ProteinG: body.ProteinG,
			CarbsG: body.CarbsG, FatG: body.FatG, ServingLabel: body.ServingLabel,
		})
	}
	saved, err := h.diary.CreateEntry(r.Context(), userID, entry)
	if err != nil {
		log.Printf("ERROR: CreateEntry user=%s: %v", userID, err)
		api.RespondError(w, http.StatusInternalServerError, "failed to log diary")
		return
	}
	api.RespondJSON(w, http.StatusCreated, saved)
}

func (h *Handler) HandleGetDiary(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		api.RespondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	day, err := parseDay(r.URL.Query().Get("date"))
	if err != nil {
		api.RespondError(w, http.StatusUnprocessableEntity, "date must be YYYY-MM-DD")
		return
	}
	list, err := h.diary.ListEntriesOnDay(r.Context(), userID, day)
	if err != nil {
		log.Printf("ERROR: ListEntriesOnDay user=%s: %v", userID, err)
		api.RespondError(w, http.StatusInternalServerError, "failed to list diary")
		return
	}
	api.RespondJSON(w, http.StatusOK, list)
}

func (h *Handler) HandleDeleteDiary(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		api.RespondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		api.RespondError(w, http.StatusBadRequest, "invalid diary id")
		return
	}
	if err := h.diary.DeleteEntry(r.Context(), userID, id); err != nil {
		if errors.Is(err, ErrNotFound) {
			api.RespondError(w, http.StatusNotFound, "diary entry not found")
			return
		}
		log.Printf("ERROR: DeleteEntry user=%s: %v", userID, err)
		api.RespondError(w, http.StatusInternalServerError, "failed to delete diary")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) HandleGetRemaining(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		api.RespondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	day, err := parseDay(r.URL.Query().Get("date"))
	if err != nil {
		api.RespondError(w, http.StatusUnprocessableEntity, "date must be YYYY-MM-DD")
		return
	}
	g, err := h.goals.GetGoals(r.Context(), userID)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			api.RespondError(w, http.StatusNotFound, "goals not found")
			return
		}
		api.RespondError(w, http.StatusInternalServerError, "failed to load goals")
		return
	}
	entries, err := h.diary.ListEntriesOnDay(r.Context(), userID, day)
	if err != nil {
		api.RespondError(w, http.StatusInternalServerError, "failed to load diary")
		return
	}
	var eatenCal int
	var eatenP, eatenC, eatenF float64
	for _, e := range entries {
		eatenCal += e.Calories
		eatenP += e.ProteinG
		eatenC += e.CarbsG
		eatenF += e.FatG
	}
	api.RespondJSON(w, http.StatusOK, Remaining{
		Date:              day.Format("2006-01-02"),
		CalorieGoal:       g.CalorieGoal,
		CaloriesEaten:     eatenCal,
		CaloriesRemaining: g.CalorieGoal - eatenCal,
		ProteinG:          g.ProteinG,
		ProteinEaten:      eatenP,
		CarbsG:            g.CarbsG,
		CarbsEaten:        eatenC,
		FatG:              g.FatG,
		FatEaten:          eatenF,
	})
}

func parseDay(raw string) (time.Time, error) {
	if raw == "" {
		now := time.Now().UTC()
		return time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC), nil
	}
	return time.Parse("2006-01-02", raw)
}
