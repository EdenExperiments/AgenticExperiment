package workout

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/meden/rpgtracker/internal/api"
	"github.com/meden/rpgtracker/internal/auth"
	"github.com/meden/rpgtracker/internal/database"
)

type Store interface {
	StartSession(ctx context.Context, userID uuid.UUID, title string) (*Session, error)
	GetOpenSession(ctx context.Context, userID uuid.UUID) (*Session, error)
	GetSession(ctx context.Context, userID, sessionID uuid.UUID) (*Session, error)
	ListFinished(ctx context.Context, userID uuid.UUID, limit int) ([]Session, error)
	AddSet(ctx context.Context, userID, sessionID uuid.UUID, exercise string, reps int, loadKg, rpe *float64) (*Set, error)
	DeleteSet(ctx context.Context, userID, setID uuid.UUID) error
	FinishSession(ctx context.Context, userID, sessionID uuid.UUID) (*Session, error)
}

type dbStore struct{}

func (s *dbStore) StartSession(ctx context.Context, userID uuid.UUID, title string) (*Session, error) {
	return StartSession(ctx, database.MustQuerier(ctx), userID, title)
}
func (s *dbStore) GetOpenSession(ctx context.Context, userID uuid.UUID) (*Session, error) {
	return GetOpenSession(ctx, database.MustQuerier(ctx), userID)
}
func (s *dbStore) GetSession(ctx context.Context, userID, sessionID uuid.UUID) (*Session, error) {
	return GetSession(ctx, database.MustQuerier(ctx), userID, sessionID)
}
func (s *dbStore) ListFinished(ctx context.Context, userID uuid.UUID, limit int) ([]Session, error) {
	return ListFinished(ctx, database.MustQuerier(ctx), userID, limit)
}
func (s *dbStore) AddSet(ctx context.Context, userID, sessionID uuid.UUID, exercise string, reps int, loadKg, rpe *float64) (*Set, error) {
	return AddSet(ctx, database.MustQuerier(ctx), userID, sessionID, exercise, reps, loadKg, rpe)
}
func (s *dbStore) DeleteSet(ctx context.Context, userID, setID uuid.UUID) error {
	return DeleteSet(ctx, database.MustQuerier(ctx), userID, setID)
}
func (s *dbStore) FinishSession(ctx context.Context, userID, sessionID uuid.UUID) (*Session, error) {
	return FinishSession(ctx, database.MustQuerier(ctx), userID, sessionID)
}

type handler struct {
	store Store
}

func Routes() chi.Router {
	return RoutesWithStore(&dbStore{})
}

func RoutesWithStore(store Store) chi.Router {
	h := &handler{store: store}
	r := chi.NewRouter()
	r.Get("/sessions/current", h.current)
	r.Get("/sessions", h.list)
	r.Post("/sessions", h.start)
	r.Get("/sessions/{id}", h.get)
	r.Post("/sessions/{id}/finish", h.finish)
	r.Post("/sessions/{id}/sets", h.addSet)
	r.Delete("/sets/{id}", h.deleteSet)
	return r
}

func requireUser(w http.ResponseWriter, r *http.Request) (uuid.UUID, bool) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		api.RespondError(w, http.StatusUnauthorized, "unauthorized")
		return uuid.Nil, false
	}
	return userID, true
}

func (h *handler) current(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUser(w, r)
	if !ok {
		return
	}
	session, err := h.store.GetOpenSession(r.Context(), userID)
	if errors.Is(err, ErrNotFound) {
		w.WriteHeader(http.StatusNoContent)
		return
	}
	if err != nil {
		log.Printf("ERROR: GetOpenSession user=%s: %v", userID, err)
		api.RespondError(w, http.StatusInternalServerError, "failed to load session")
		return
	}
	api.RespondJSON(w, http.StatusOK, session)
}

func (h *handler) list(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUser(w, r)
	if !ok {
		return
	}
	sessions, err := h.store.ListFinished(r.Context(), userID, 30)
	if err != nil {
		api.RespondError(w, http.StatusInternalServerError, "failed to list sessions")
		return
	}
	api.RespondJSON(w, http.StatusOK, sessions)
}

type startBody struct {
	Title string `json:"title"`
}

func (h *handler) start(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUser(w, r)
	if !ok {
		return
	}
	var body startBody
	_ = json.NewDecoder(r.Body).Decode(&body)
	session, err := h.store.StartSession(r.Context(), userID, body.Title)
	if err != nil {
		api.RespondError(w, http.StatusInternalServerError, "failed to start session")
		return
	}
	api.RespondJSON(w, http.StatusOK, session)
}

func (h *handler) get(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUser(w, r)
	if !ok {
		return
	}
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		api.RespondError(w, http.StatusBadRequest, "invalid id")
		return
	}
	session, err := h.store.GetSession(r.Context(), userID, id)
	if errors.Is(err, ErrNotFound) {
		api.RespondError(w, http.StatusNotFound, "not found")
		return
	}
	if err != nil {
		api.RespondError(w, http.StatusInternalServerError, "failed to load session")
		return
	}
	api.RespondJSON(w, http.StatusOK, session)
}

func (h *handler) finish(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUser(w, r)
	if !ok {
		return
	}
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		api.RespondError(w, http.StatusBadRequest, "invalid id")
		return
	}
	session, err := h.store.FinishSession(r.Context(), userID, id)
	if errors.Is(err, ErrNotFound) {
		api.RespondError(w, http.StatusNotFound, "not found")
		return
	}
	if errors.Is(err, ErrSessionEmpty) {
		api.RespondError(w, http.StatusUnprocessableEntity, "log at least one set before finishing")
		return
	}
	if err != nil {
		api.RespondError(w, http.StatusInternalServerError, "failed to finish session")
		return
	}
	api.RespondJSON(w, http.StatusOK, session)
}

type setBody struct {
	ExerciseName string   `json:"exercise_name"`
	Reps         int      `json:"reps"`
	LoadKg       *float64 `json:"load_kg"`
	RPE          *float64 `json:"rpe"`
}

func (h *handler) addSet(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUser(w, r)
	if !ok {
		return
	}
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		api.RespondError(w, http.StatusBadRequest, "invalid id")
		return
	}
	var body setBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		api.RespondError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}
	set, err := h.store.AddSet(r.Context(), userID, id, body.ExerciseName, body.Reps, body.LoadKg, body.RPE)
	if errors.Is(err, ErrNotFound) {
		api.RespondError(w, http.StatusNotFound, "not found")
		return
	}
	if errors.Is(err, ErrSessionClosed) {
		api.RespondError(w, http.StatusConflict, "session already finished")
		return
	}
	if err != nil {
		api.RespondError(w, http.StatusUnprocessableEntity, "exercise_name and reps are required")
		return
	}
	api.RespondJSON(w, http.StatusCreated, set)
}

func (h *handler) deleteSet(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUser(w, r)
	if !ok {
		return
	}
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		api.RespondError(w, http.StatusBadRequest, "invalid id")
		return
	}
	if err := h.store.DeleteSet(r.Context(), userID, id); errors.Is(err, ErrNotFound) {
		api.RespondError(w, http.StatusNotFound, "not found")
		return
	} else if err != nil {
		api.RespondError(w, http.StatusInternalServerError, "failed to delete set")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
