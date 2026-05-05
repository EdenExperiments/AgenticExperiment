package handlers_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/meden/rpgtracker/internal/auth"
	"github.com/meden/rpgtracker/internal/handlers"
	"github.com/meden/rpgtracker/internal/skills"
)

// stubXPChartStore implements handlers.XPChartStore for tests.
type stubXPChartStore struct {
	// data maps date strings ("2026-02-21") to XP totals.
	// Dates not present will be zero-filled by the handler.
	data map[string]int
	err  error
}

func (s *stubXPChartStore) GetXPEvents(
	_ context.Context,
	_ uuid.UUID, // skillID
	_ uuid.UUID, // userID
	days int,
) ([]skills.DailyXP, error) {
	if s.err != nil {
		return nil, s.err
	}
	var results []skills.DailyXP
	for dateStr, xp := range s.data {
		d, _ := time.Parse("2006-01-02", dateStr)
		results = append(results, skills.DailyXP{Date: d, XPTotal: xp})
	}
	return results, nil
}

func xpChartRequest(skillID uuid.UUID, days string) *http.Request {
	req := httptest.NewRequest(
		http.MethodGet,
		"/api/v1/skills/"+skillID.String()+"/xp-chart?days="+days,
		nil,
	)
	req = req.WithContext(auth.WithUserID(req.Context(), uuid.New()))
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", skillID.String())
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))
	return req
}

// TestXPChartReturns30Days verifies that GET /xp-chart?days=30 returns exactly 30 entries
// in ascending date order.
func TestXPChartReturns30Days(t *testing.T) {
	skillID := uuid.New()
	today := time.Now().UTC().Truncate(24 * time.Hour)
	// Provide only 2 days of actual data within the rolling window — the handler zero-fills the rest.
	stub := &stubXPChartStore{
		data: map[string]int{
			today.AddDate(0, 0, -2).Format("2006-01-02"): 350,
			today.AddDate(0, 0, -1).Format("2006-01-02"): 150,
		},
	}
	h := handlers.NewXPChartHandlerWithStore(stub)

	req := xpChartRequest(skillID, "30")
	w := httptest.NewRecorder()
	h.HandleGetXPChart(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp map[string]interface{}
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatalf("decode: %v", err)
	}

	data, ok := resp["data"].([]interface{})
	if !ok {
		t.Fatal("data field missing or wrong type in response")
	}

	// Must have exactly 30 entries.
	if len(data) != 30 {
		t.Errorf("data length: got %d want 30", len(data))
	}

	// Entries must be in ascending date order.
	var prevDate string
	for i, entry := range data {
		item, _ := entry.(map[string]interface{})
		date, _ := item["date"].(string)
		if date == "" {
			t.Errorf("entry[%d]: missing date field", i)
			continue
		}
		if prevDate != "" && date <= prevDate {
			t.Errorf("dates not ascending: entry[%d] %q <= entry[%d] %q", i, date, i-1, prevDate)
		}
		prevDate = date
	}

	// days field in response must reflect requested count.
	days, _ := resp["days"].(float64)
	if int(days) != 30 {
		t.Errorf("days: got %v want 30", days)
	}
}

// TestXPChartZeroFill verifies that days with no XP events appear with xp_total=0
// rather than being omitted from the response.
func TestXPChartZeroFill(t *testing.T) {
	skillID := uuid.New()
	today := time.Now().UTC().Truncate(24 * time.Hour)
	// One non-zero day inside the last 30 calendar days — 29 days must be zero-filled.
	stub := &stubXPChartStore{
		data: map[string]int{
			today.AddDate(0, 0, -10).Format("2006-01-02"): 500,
		},
	}
	h := handlers.NewXPChartHandlerWithStore(stub)

	req := xpChartRequest(skillID, "30")
	w := httptest.NewRecorder()
	h.HandleGetXPChart(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp map[string]interface{}
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatalf("decode: %v", err)
	}

	data, ok := resp["data"].([]interface{})
	if !ok {
		t.Fatal("data field missing")
	}

	zeroCount := 0
	nonZeroCount := 0
	for _, entry := range data {
		item, _ := entry.(map[string]interface{})
		xpTotal, _ := item["xp_total"].(float64)
		if xpTotal == 0 {
			zeroCount++
		} else {
			nonZeroCount++
		}
	}

	// Exactly 29 zero-XP days and 1 non-zero day.
	if zeroCount != 29 {
		t.Errorf("zero-fill days: got %d want 29", zeroCount)
	}
	if nonZeroCount != 1 {
		t.Errorf("non-zero days: got %d want 1", nonZeroCount)
	}
}
