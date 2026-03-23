package handlers

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/meden/rpgtracker/internal/api"
	"github.com/meden/rpgtracker/internal/auth"
	"github.com/meden/rpgtracker/internal/users"
)

// AccountStats holds aggregated stats for the account page.
type AccountStats struct {
	TotalXP              int64           `json:"total_xp"`
	LongestStreak        int64           `json:"longest_streak"`
	SkillCount           int64           `json:"skill_count"`
	CategoryDistribution []CategoryCount `json:"category_distribution"`
}

// CategoryCount holds the number of skills per category.
type CategoryCount struct {
	Category string `json:"category"`
	Count    int64  `json:"count"`
}

// StorageClient abstracts avatar file storage operations for testability.
type StorageClient interface {
	PutAvatar(ctx context.Context, userID uuid.UUID, body io.Reader, contentType string) error
	DeleteAvatar(ctx context.Context, userID uuid.UUID) error
}

// UserStore abstracts user-related DB operations for testability.
type UserStore interface {
	GetOrCreateUser(ctx context.Context, userID uuid.UUID, email string) (*users.User, error)
	SetPrimarySkill(ctx context.Context, userID, skillID uuid.UUID) (*uuid.UUID, error)
	SetAvatarURL(ctx context.Context, userID uuid.UUID, url string) (*users.User, error)
	ClearAvatarURL(ctx context.Context, userID uuid.UUID) (*users.User, error)
	GetAccountStats(ctx context.Context, userID uuid.UUID) (*AccountStats, error)
}

// dbUserStore wraps a pgxpool.Pool to implement UserStore using the real DB functions.
type dbUserStore struct {
	db *pgxpool.Pool
}

func (s *dbUserStore) GetOrCreateUser(ctx context.Context, userID uuid.UUID, email string) (*users.User, error) {
	return users.GetOrCreateUser(ctx, s.db, userID, email)
}

func (s *dbUserStore) SetPrimarySkill(ctx context.Context, userID, skillID uuid.UUID) (*uuid.UUID, error) {
	return users.SetPrimarySkill(ctx, s.db, userID, skillID)
}

func (s *dbUserStore) SetAvatarURL(ctx context.Context, userID uuid.UUID, url string) (*users.User, error) {
	return users.SetAvatarURL(ctx, s.db, userID, url)
}

func (s *dbUserStore) ClearAvatarURL(ctx context.Context, userID uuid.UUID) (*users.User, error) {
	return users.ClearAvatarURL(ctx, s.db, userID)
}

func (s *dbUserStore) GetAccountStats(ctx context.Context, userID uuid.UUID) (*AccountStats, error) {
	var stats AccountStats

	err := s.db.QueryRow(ctx,
		`SELECT COALESCE(SUM(current_xp), 0), COALESCE(MAX(longest_streak), 0), COUNT(*)
		 FROM public.skills WHERE user_id = $1`,
		userID,
	).Scan(&stats.TotalXP, &stats.LongestStreak, &stats.SkillCount)
	if err != nil {
		return nil, err
	}

	rows, err := s.db.Query(ctx,
		`SELECT sc.name, COUNT(*) FROM public.skills s
		 JOIN public.skill_categories sc ON s.category_id = sc.id
		 WHERE s.user_id = $1
		 GROUP BY sc.name
		 ORDER BY COUNT(*) DESC`,
		userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	stats.CategoryDistribution = []CategoryCount{}
	for rows.Next() {
		var cc CategoryCount
		if err := rows.Scan(&cc.Category, &cc.Count); err != nil {
			return nil, err
		}
		stats.CategoryDistribution = append(stats.CategoryDistribution, cc)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	return &stats, nil
}

// UserHandler handles HTTP requests for the user account screen.
type UserHandler struct {
	db         *pgxpool.Pool
	store      UserStore
	storage    StorageClient
	supabaseURL string
}

// NewUserHandler constructs a UserHandler with the given connection pool.
func NewUserHandler(db *pgxpool.Pool) *UserHandler {
	var store UserStore
	if db != nil {
		store = &dbUserStore{db: db}
	}
	return &UserHandler{db: db, store: store}
}

// NewUserHandlerWithStore constructs a UserHandler with an injected store (for testing).
func NewUserHandlerWithStore(store UserStore) *UserHandler {
	return &UserHandler{store: store}
}

// NewUserHandlerWithAvatarStore constructs a UserHandler with injected store and storage (for testing).
func NewUserHandlerWithAvatarStore(store UserStore, storage StorageClient) *UserHandler {
	return &UserHandler{store: store, storage: storage}
}

// NewUserHandlerFull constructs a UserHandler with all dependencies for production use.
func NewUserHandlerFull(db *pgxpool.Pool, storage StorageClient, supabaseURL string) *UserHandler {
	var store UserStore
	if db != nil {
		store = &dbUserStore{db: db}
	}
	return &UserHandler{db: db, store: store, storage: storage, supabaseURL: supabaseURL}
}

// HandleGetAccount returns the authenticated user's account data as JSON.
func (h *UserHandler) HandleGetAccount(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		api.RespondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	email := auth.EmailFromContext(r.Context())
	u, err := h.store.GetOrCreateUser(r.Context(), userID, email)
	if err != nil {
		api.RespondError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	api.RespondJSON(w, http.StatusOK, u)
}

// HandlePostAccount processes a display-name update and returns JSON confirmation.
func (h *UserHandler) HandlePostAccount(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		api.RespondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	displayName := r.FormValue("display_name")
	if len(displayName) > 100 {
		api.RespondError(w, http.StatusBadRequest, "display name too long")
		return
	}
	if err := users.UpdateDisplayName(r.Context(), h.db, userID, displayName); err != nil {
		api.RespondError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	api.RespondJSON(w, http.StatusOK, map[string]string{"status": "updated"})
}

// HandlePatchAccount handles PATCH /api/v1/account.
// Accepts: timezone (IANA timezone string). Returns 422 if timezone is invalid (D-029).
func (h *UserHandler) HandlePatchAccount(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		api.RespondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	if err := r.ParseForm(); err != nil {
		api.RespondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	timezone := r.FormValue("timezone")
	if timezone != "" {
		if _, err := time.LoadLocation(timezone); err != nil {
			api.RespondError(w, http.StatusUnprocessableEntity, "invalid timezone: must be a valid IANA timezone string")
			return
		}
	}

	if h.db != nil && timezone != "" {
		if err := users.UpdateTimezone(r.Context(), h.db, userID, timezone); err != nil {
			api.RespondError(w, http.StatusInternalServerError, "failed to update account")
			return
		}
	}

	api.RespondJSON(w, http.StatusOK, map[string]interface{}{
		"timezone": timezone,
	})
}

// HandlePatchPrimarySkill handles PATCH /api/v1/account/primary-skill.
// Toggle pattern: if skill_id matches current primary, unpin; otherwise pin.
func (h *UserHandler) HandlePatchPrimarySkill(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		api.RespondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	if err := r.ParseForm(); err != nil {
		api.RespondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	skillIDStr := r.FormValue("skill_id")
	skillID, err := uuid.Parse(skillIDStr)
	if err != nil {
		api.RespondError(w, http.StatusUnprocessableEntity, "invalid skill_id format")
		return
	}

	result, err := h.store.SetPrimarySkill(r.Context(), userID, skillID)
	if err != nil {
		if errors.Is(err, users.ErrSkillNotOwned) {
			api.RespondError(w, http.StatusNotFound, "skill not found")
			return
		}
		api.RespondError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	api.RespondJSON(w, http.StatusOK, map[string]interface{}{
		"primary_skill_id": result,
	})
}

const maxAvatarSize = 2 * 1024 * 1024 // 2MB

// HandlePostAvatar handles POST /api/v1/account/avatar.
// Accepts a multipart form with an "avatar" file field.
// Validates content type (jpeg/png/webp) and size (<=2MB), uploads to storage,
// then persists the URL in the DB.
func (h *UserHandler) HandlePostAvatar(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		api.RespondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	// Limit total body to slightly more than 2MB to detect oversized files
	r.Body = http.MaxBytesReader(w, r.Body, maxAvatarSize+1024)
	if err := r.ParseMultipartForm(32 << 20); err != nil {
		api.RespondError(w, http.StatusBadRequest, "invalid multipart form")
		return
	}

	file, _, err := r.FormFile("avatar")
	if err != nil {
		api.RespondError(w, http.StatusBadRequest, "avatar file required")
		return
	}
	defer file.Close()

	// Read all file bytes to check size and detect content type
	fileBytes, err := io.ReadAll(file)
	if err != nil {
		api.RespondError(w, http.StatusBadRequest, "failed to read file")
		return
	}

	if len(fileBytes) > maxAvatarSize {
		api.RespondError(w, http.StatusBadRequest, "file too large: maximum 2MB")
		return
	}

	// Detect content type from first 512 bytes (not request header)
	sniff := fileBytes
	if len(sniff) > 512 {
		sniff = sniff[:512]
	}
	contentType := http.DetectContentType(sniff)

	switch contentType {
	case "image/jpeg", "image/png", "image/webp":
		// allowed
	default:
		api.RespondError(w, http.StatusBadRequest, "unsupported image type: must be jpeg, png, or webp")
		return
	}

	// Upload to storage
	if err := h.storage.PutAvatar(r.Context(), userID, bytes.NewReader(fileBytes), contentType); err != nil {
		api.RespondError(w, http.StatusInternalServerError, "failed to upload avatar")
		return
	}

	// Construct URL from scratch — never use stored value
	avatarURL := fmt.Sprintf("%s/storage/v1/object/public/avatars/%s/avatar?v=%d",
		h.supabaseURL, userID, time.Now().Unix())

	u, err := h.store.SetAvatarURL(r.Context(), userID, avatarURL)
	if err != nil {
		api.RespondError(w, http.StatusInternalServerError, "failed to save avatar URL")
		return
	}

	api.RespondJSON(w, http.StatusOK, u)
}

// HandleDeleteAvatar handles DELETE /api/v1/account/avatar.
// Removes the avatar from storage and sets avatar_url to NULL. Idempotent.
func (h *UserHandler) HandleDeleteAvatar(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		api.RespondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	// Delete from storage — 404 is treated as success by the storage client
	if err := h.storage.DeleteAvatar(r.Context(), userID); err != nil {
		api.RespondError(w, http.StatusInternalServerError, "failed to delete avatar from storage")
		return
	}

	u, err := h.store.ClearAvatarURL(r.Context(), userID)
	if err != nil {
		api.RespondError(w, http.StatusInternalServerError, "failed to clear avatar URL")
		return
	}

	api.RespondJSON(w, http.StatusOK, u)
}

// HandleGetAccountStats handles GET /api/v1/account/stats.
// Returns aggregated XP, streak, skill count, and category distribution.
func (h *UserHandler) HandleGetAccountStats(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		api.RespondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	stats, err := h.store.GetAccountStats(r.Context(), userID)
	if err != nil {
		api.RespondError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	api.RespondJSON(w, http.StatusOK, stats)
}
