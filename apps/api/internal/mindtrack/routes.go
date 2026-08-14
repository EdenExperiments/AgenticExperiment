package mindtrack

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
	CreateMood(ctx context.Context, userID uuid.UUID, valence, energy int, note string) (*MoodLog, error)
	ListMood(ctx context.Context, userID uuid.UUID, limit int) ([]MoodLog, error)
	CreateJournal(ctx context.Context, userID uuid.UUID, body string) (*JournalEntry, error)
	ListJournal(ctx context.Context, userID uuid.UUID, limit int) ([]JournalEntry, error)
	UpdateJournal(ctx context.Context, userID, id uuid.UUID, body string) (*JournalEntry, error)
	DeleteJournal(ctx context.Context, userID, id uuid.UUID) error
}

type dbStore struct{}

func (s *dbStore) CreateMood(ctx context.Context, userID uuid.UUID, valence, energy int, note string) (*MoodLog, error) {
	return CreateMood(ctx, database.MustQuerier(ctx), userID, valence, energy, note)
}
func (s *dbStore) ListMood(ctx context.Context, userID uuid.UUID, limit int) ([]MoodLog, error) {
	return ListMood(ctx, database.MustQuerier(ctx), userID, limit)
}
func (s *dbStore) CreateJournal(ctx context.Context, userID uuid.UUID, body string) (*JournalEntry, error) {
	return CreateJournal(ctx, database.MustQuerier(ctx), userID, body)
}
func (s *dbStore) ListJournal(ctx context.Context, userID uuid.UUID, limit int) ([]JournalEntry, error) {
	return ListJournal(ctx, database.MustQuerier(ctx), userID, limit)
}
func (s *dbStore) UpdateJournal(ctx context.Context, userID, id uuid.UUID, body string) (*JournalEntry, error) {
	return UpdateJournal(ctx, database.MustQuerier(ctx), userID, id, body)
}
func (s *dbStore) DeleteJournal(ctx context.Context, userID, id uuid.UUID) error {
	return DeleteJournal(ctx, database.MustQuerier(ctx), userID, id)
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
	r.Get("/mood", h.listMood)
	r.Post("/mood", h.createMood)
	r.Get("/journal", h.listJournal)
	r.Post("/journal", h.createJournal)
	r.Put("/journal/{id}", h.updateJournal)
	r.Delete("/journal/{id}", h.deleteJournal)
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

func (h *handler) listMood(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUser(w, r)
	if !ok {
		return
	}
	logs, err := h.store.ListMood(r.Context(), userID, 30)
	if err != nil {
		log.Printf("ERROR: ListMood user=%s: %v", userID, err)
		api.RespondError(w, http.StatusInternalServerError, "failed to list mood")
		return
	}
	api.RespondJSON(w, http.StatusOK, logs)
}

type moodBody struct {
	Valence int    `json:"valence"`
	Energy  int    `json:"energy"`
	Note    string `json:"note"`
}

func (h *handler) createMood(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUser(w, r)
	if !ok {
		return
	}
	var body moodBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		api.RespondError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}
	logEntry, err := h.store.CreateMood(r.Context(), userID, body.Valence, body.Energy, body.Note)
	if err != nil {
		api.RespondError(w, http.StatusUnprocessableEntity, "valence must be 1-5 and energy 1-3")
		return
	}
	api.RespondJSON(w, http.StatusCreated, logEntry)
}

func (h *handler) listJournal(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUser(w, r)
	if !ok {
		return
	}
	entries, err := h.store.ListJournal(r.Context(), userID, 50)
	if err != nil {
		api.RespondError(w, http.StatusInternalServerError, "failed to list journal")
		return
	}
	api.RespondJSON(w, http.StatusOK, entries)
}

type journalBody struct {
	Body string `json:"body"`
}

func (h *handler) createJournal(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUser(w, r)
	if !ok {
		return
	}
	var body journalBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		api.RespondError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}
	entry, err := h.store.CreateJournal(r.Context(), userID, body.Body)
	if err != nil {
		api.RespondError(w, http.StatusUnprocessableEntity, "body is required")
		return
	}
	api.RespondJSON(w, http.StatusCreated, entry)
}

func (h *handler) updateJournal(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUser(w, r)
	if !ok {
		return
	}
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		api.RespondError(w, http.StatusBadRequest, "invalid id")
		return
	}
	var body journalBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		api.RespondError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}
	entry, err := h.store.UpdateJournal(r.Context(), userID, id, body.Body)
	if errors.Is(err, ErrNotFound) {
		api.RespondError(w, http.StatusNotFound, "not found")
		return
	}
	if err != nil {
		api.RespondError(w, http.StatusUnprocessableEntity, "body is required")
		return
	}
	api.RespondJSON(w, http.StatusOK, entry)
}

func (h *handler) deleteJournal(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUser(w, r)
	if !ok {
		return
	}
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		api.RespondError(w, http.StatusBadRequest, "invalid id")
		return
	}
	if err := h.store.DeleteJournal(r.Context(), userID, id); errors.Is(err, ErrNotFound) {
		api.RespondError(w, http.StatusNotFound, "not found")
		return
	} else if err != nil {
		api.RespondError(w, http.StatusInternalServerError, "failed to delete journal")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
