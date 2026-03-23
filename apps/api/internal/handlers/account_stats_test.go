package handlers_test

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/google/uuid"
	"github.com/meden/rpgtracker/internal/auth"
	"github.com/meden/rpgtracker/internal/handlers"
	"github.com/meden/rpgtracker/internal/users"
)

// ---- stub UserStore for stats tests ----

type stubStatsStore struct {
	user  *users.User
	stats *handlers.AccountStats
}

func (s *stubStatsStore) GetOrCreateUser(_ context.Context, userID uuid.UUID, email string) (*users.User, error) {
	if s.user != nil {
		return s.user, nil
	}
	return &users.User{ID: userID, Email: email}, nil
}

func (s *stubStatsStore) SetPrimarySkill(_ context.Context, _, _ uuid.UUID) (*uuid.UUID, error) {
	return nil, nil
}

func (s *stubStatsStore) SetAvatarURL(_ context.Context, userID uuid.UUID, url string) (*users.User, error) {
	u := &users.User{ID: userID, AvatarURL: &url}
	return u, nil
}

func (s *stubStatsStore) ClearAvatarURL(_ context.Context, userID uuid.UUID) (*users.User, error) {
	u := &users.User{ID: userID, AvatarURL: nil}
	return u, nil
}

func (s *stubStatsStore) GetAccountStats(_ context.Context, _ uuid.UUID) (*handlers.AccountStats, error) {
	if s.stats != nil {
		return s.stats, nil
	}
	// Default: zeroed stats with empty distribution (ACL-8 case)
	return &handlers.AccountStats{
		TotalXP:              0,
		LongestStreak:        0,
		SkillCount:           0,
		CategoryDistribution: []handlers.CategoryCount{},
	}, nil
}

// ---- stub StorageClient for stats tests (no-op — stats handler doesn't use storage) ----

type noopStorageClient struct{}

func (n *noopStorageClient) PutAvatar(_ context.Context, _ uuid.UUID, _ io.Reader, _ string) error {
	return nil
}

func (n *noopStorageClient) DeleteAvatar(_ context.Context, _ uuid.UUID) error {
	return nil
}

// ---- ACL-7: GET /api/v1/account/stats returns total_xp, longest_streak, skill_count, category_distribution ----

func TestGetAccountStats_ACL7_ReturnsAllFields(t *testing.T) {
	userID := uuid.New()
	store := &stubStatsStore{
		stats: &handlers.AccountStats{
			TotalXP:       125000,
			LongestStreak: 14,
			SkillCount:    8,
			CategoryDistribution: []handlers.CategoryCount{
				{Category: "Physical", Count: 3},
				{Category: "Mental", Count: 2},
				{Category: "Creative", Count: 2},
				{Category: "Professional", Count: 1},
			},
		},
	}
	storage := &noopStorageClient{}

	h := handlers.NewUserHandlerWithAvatarStore(store, storage)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/account/stats", nil)
	req = req.WithContext(auth.WithUserID(req.Context(), userID))

	w := httptest.NewRecorder()
	h.HandleGetAccountStats(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("ACL-7: expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("ACL-7: invalid JSON: %v", err)
	}

	requiredFields := []string{"total_xp", "longest_streak", "skill_count", "category_distribution"}
	for _, field := range requiredFields {
		if _, exists := resp[field]; !exists {
			t.Errorf("ACL-7: required field %q missing from response: %s", field, w.Body.String())
		}
	}

	if resp["total_xp"] != float64(125000) {
		t.Errorf("ACL-7: expected total_xp=125000, got %v", resp["total_xp"])
	}
	if resp["longest_streak"] != float64(14) {
		t.Errorf("ACL-7: expected longest_streak=14, got %v", resp["longest_streak"])
	}
	if resp["skill_count"] != float64(8) {
		t.Errorf("ACL-7: expected skill_count=8, got %v", resp["skill_count"])
	}

	dist, ok := resp["category_distribution"].([]interface{})
	if !ok {
		t.Fatalf("ACL-7: category_distribution is not an array: %v", resp["category_distribution"])
	}
	if len(dist) != 4 {
		t.Errorf("ACL-7: expected 4 category entries, got %d", len(dist))
	}
}

// ---- ACL-8: GET /api/v1/account/stats with no skills returns zeroed stats and empty distribution ----

func TestGetAccountStats_ACL8_NoSkillsReturnsZeroedStats(t *testing.T) {
	userID := uuid.New()
	// stubStatsStore returns zeroed stats by default (nil stats field)
	store := &stubStatsStore{}
	storage := &noopStorageClient{}

	h := handlers.NewUserHandlerWithAvatarStore(store, storage)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/account/stats", nil)
	req = req.WithContext(auth.WithUserID(req.Context(), userID))

	w := httptest.NewRecorder()
	h.HandleGetAccountStats(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("ACL-8: expected 200 for zero stats, got %d: %s", w.Code, w.Body.String())
	}

	var resp map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("ACL-8: invalid JSON: %v", err)
	}

	if resp["total_xp"] != float64(0) {
		t.Errorf("ACL-8: expected total_xp=0, got %v", resp["total_xp"])
	}
	if resp["longest_streak"] != float64(0) {
		t.Errorf("ACL-8: expected longest_streak=0, got %v", resp["longest_streak"])
	}
	if resp["skill_count"] != float64(0) {
		t.Errorf("ACL-8: expected skill_count=0, got %v", resp["skill_count"])
	}

	dist, ok := resp["category_distribution"].([]interface{})
	if !ok {
		// An empty JSON array might decode as nil slice — handle both
		if resp["category_distribution"] != nil {
			t.Fatalf("ACL-8: category_distribution is not an array or null: %v", resp["category_distribution"])
		}
	} else if len(dist) != 0 {
		t.Errorf("ACL-8: expected empty category_distribution, got %d entries", len(dist))
	}
}

// ---- ACL-9: GET /api/v1/account/stats without auth returns 401 ----

func TestGetAccountStats_ACL9_NoAuthReturns401(t *testing.T) {
	store := &stubStatsStore{}
	storage := &noopStorageClient{}

	h := handlers.NewUserHandlerWithAvatarStore(store, storage)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/account/stats", nil)
	// No auth context set

	w := httptest.NewRecorder()
	h.HandleGetAccountStats(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("ACL-9: expected 401, got %d: %s", w.Code, w.Body.String())
	}
}
