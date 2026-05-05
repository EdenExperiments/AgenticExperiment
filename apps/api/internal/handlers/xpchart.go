package handlers

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"sort"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/meden/rpgtracker/internal/api"
	"github.com/meden/rpgtracker/internal/database"
	"github.com/meden/rpgtracker/internal/auth"
	"github.com/meden/rpgtracker/internal/skills"
)

// XPChartStore is the persistence interface for XP chart data.
type XPChartStore interface {
	GetXPEvents(ctx context.Context, skillID, userID uuid.UUID, days int) ([]skills.DailyXP, error)
}

// XPChartHandler handles the XP chart endpoint.
type XPChartHandler struct {
	store XPChartStore
}

// NewXPChartHandlerWithStore constructs an XPChartHandler with an injected store (for tests).
func NewXPChartHandlerWithStore(s XPChartStore) *XPChartHandler {
	return &XPChartHandler{store: s}
}

// NewXPChartHandler constructs an XPChartHandler (DB via database.Querier from context).
func NewXPChartHandler() *XPChartHandler {
	return &XPChartHandler{store: &dbXPChartStore{}}
}

// HandleGetXPChart handles GET /api/v1/skills/{id}/xp-chart?days=N.
// Default days=30, max 365. Returns N entries in ascending date order, zero-filling missing days.
func (h *XPChartHandler) HandleGetXPChart(w http.ResponseWriter, r *http.Request) {
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

	days := 30
	if daysStr := r.URL.Query().Get("days"); daysStr != "" {
		if n, err := strconv.Atoi(daysStr); err == nil && n > 0 {
			days = n
		}
	}
	if days > 365 {
		days = 365
	}

	dbResults, err := h.store.GetXPEvents(r.Context(), skillID, userID, days)
	if err != nil {
		log.Printf("ERROR: GetXPEvents skill=%s: %v", skillID, err)
		api.RespondError(w, http.StatusInternalServerError, "failed to fetch xp events")
		return
	}

	// Build a map of date string → XP total from DB results.
	xpByDate := make(map[string]int, len(dbResults))
	for _, row := range dbResults {
		key := row.Date.Format("2006-01-02")
		xpByDate[key] += row.XPTotal
	}

	// Generate the full N-day slice ending today, ascending.
	today := time.Now().UTC().Truncate(24 * time.Hour)
	type chartEntry struct {
		Date    string `json:"date"`
		XPTotal int    `json:"xp_total"`
	}
	entries := make([]chartEntry, days)
	for i := 0; i < days; i++ {
		d := today.AddDate(0, 0, -(days - 1 - i))
		key := d.Format("2006-01-02")
		entries[i] = chartEntry{
			Date:    key,
			XPTotal: xpByDate[key],
		}
	}

	// Sort ascending (already in order, but ensure it).
	sort.Slice(entries, func(i, j int) bool {
		return entries[i].Date < entries[j].Date
	})

	api.RespondJSON(w, http.StatusOK, map[string]interface{}{
		"data": entries,
		"days": days,
	})
}

// dbXPChartStore is the real DB-backed implementation of XPChartStore.
type dbXPChartStore struct{}

func (s *dbXPChartStore) GetXPEvents(ctx context.Context, skillID, userID uuid.UUID, days int) ([]skills.DailyXP, error) {
	rows, err := database.MustQuerier(ctx).Query(ctx, `
		SELECT (e.created_at AT TIME ZONE 'UTC')::date AS day,
		       SUM(e.xp_delta)::int                    AS xp_total
		FROM   public.xp_events e
		JOIN   public.skills s ON s.id = e.skill_id
		WHERE  e.skill_id    = $1
		  AND  s.user_id     = $2
		  AND  s.deleted_at  IS NULL
		  AND  e.created_at >= NOW() AT TIME ZONE 'UTC' - ($3::int * INTERVAL '1 day')
		GROUP  BY 1
		ORDER  BY 1
	`, skillID, userID, days)
	if err != nil {
		return nil, fmt.Errorf("xpchart: query: %w", err)
	}
	defer rows.Close()

	var out []skills.DailyXP
	for rows.Next() {
		var d skills.DailyXP
		if err := rows.Scan(&d.Date, &d.XPTotal); err != nil {
			return nil, fmt.Errorf("xpchart: scan: %w", err)
		}
		out = append(out, d)
	}
	return out, rows.Err()
}
