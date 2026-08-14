package nutrilog

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

type KitchenStore interface {
	OpenFast(ctx context.Context, userID uuid.UUID, targetHours int) (*Fast, error)
	GetOpenFast(ctx context.Context, userID uuid.UUID) (*Fast, error)
	CloseFast(ctx context.Context, userID, fastID uuid.UUID, reason string) (*Fast, error)
	ListFasts(ctx context.Context, userID uuid.UUID, limit int) ([]Fast, error)
	ListPantry(ctx context.Context, userID uuid.UUID) ([]PantryItem, error)
	AddPantryItem(ctx context.Context, userID uuid.UUID, name, amountText string) (*PantryItem, error)
	DeletePantryItem(ctx context.Context, userID, itemID uuid.UUID) error
	ListRecipes(ctx context.Context, userID uuid.UUID) ([]Recipe, error)
	CreateRecipe(ctx context.Context, userID uuid.UUID, recipe Recipe) (*Recipe, error)
	DeleteRecipe(ctx context.Context, userID, recipeID uuid.UUID) error
	CookRecipe(ctx context.Context, userID, recipeID uuid.UUID, servings float64) (*DiaryEntry, error)
	ListDiary(ctx context.Context, userID uuid.UUID, limit int) ([]DiaryEntry, error)
}

type dbKitchenStore struct{}

func (s *dbKitchenStore) OpenFast(ctx context.Context, userID uuid.UUID, targetHours int) (*Fast, error) {
	return OpenFast(ctx, database.MustQuerier(ctx), userID, targetHours)
}
func (s *dbKitchenStore) GetOpenFast(ctx context.Context, userID uuid.UUID) (*Fast, error) {
	return GetOpenFast(ctx, database.MustQuerier(ctx), userID)
}
func (s *dbKitchenStore) CloseFast(ctx context.Context, userID, fastID uuid.UUID, reason string) (*Fast, error) {
	return CloseFast(ctx, database.MustQuerier(ctx), userID, fastID, reason)
}
func (s *dbKitchenStore) ListFasts(ctx context.Context, userID uuid.UUID, limit int) ([]Fast, error) {
	return ListFasts(ctx, database.MustQuerier(ctx), userID, limit)
}
func (s *dbKitchenStore) ListPantry(ctx context.Context, userID uuid.UUID) ([]PantryItem, error) {
	return ListPantry(ctx, database.MustQuerier(ctx), userID)
}
func (s *dbKitchenStore) AddPantryItem(ctx context.Context, userID uuid.UUID, name, amountText string) (*PantryItem, error) {
	return AddPantryItem(ctx, database.MustQuerier(ctx), userID, name, amountText)
}
func (s *dbKitchenStore) DeletePantryItem(ctx context.Context, userID, itemID uuid.UUID) error {
	return DeletePantryItem(ctx, database.MustQuerier(ctx), userID, itemID)
}
func (s *dbKitchenStore) ListRecipes(ctx context.Context, userID uuid.UUID) ([]Recipe, error) {
	return ListRecipes(ctx, database.MustQuerier(ctx), userID)
}
func (s *dbKitchenStore) CreateRecipe(ctx context.Context, userID uuid.UUID, recipe Recipe) (*Recipe, error) {
	return CreateRecipe(ctx, database.MustQuerier(ctx), userID, recipe)
}
func (s *dbKitchenStore) DeleteRecipe(ctx context.Context, userID, recipeID uuid.UUID) error {
	return DeleteRecipe(ctx, database.MustQuerier(ctx), userID, recipeID)
}
func (s *dbKitchenStore) CookRecipe(ctx context.Context, userID, recipeID uuid.UUID, servings float64) (*DiaryEntry, error) {
	return CookRecipe(ctx, database.MustQuerier(ctx), userID, recipeID, servings)
}
func (s *dbKitchenStore) ListDiary(ctx context.Context, userID uuid.UUID, limit int) ([]DiaryEntry, error) {
	return ListDiary(ctx, database.MustQuerier(ctx), userID, limit)
}

type kitchenHandler struct {
	store KitchenStore
}

func Routes() chi.Router {
	return RoutesWithStore(&dbKitchenStore{})
}

func RoutesWithStore(store KitchenStore) chi.Router {
	h := &kitchenHandler{store: store}
	r := chi.NewRouter()
	r.Get("/fasts/current", h.currentFast)
	r.Get("/fasts", h.listFasts)
	r.Post("/fasts", h.startFast)
	r.Post("/fasts/{id}/close", h.closeFast)
	r.Get("/pantry", h.listPantry)
	r.Post("/pantry", h.addPantry)
	r.Delete("/pantry/{id}", h.deletePantry)
	r.Get("/recipes", h.listRecipes)
	r.Post("/recipes", h.createRecipe)
	r.Delete("/recipes/{id}", h.deleteRecipe)
	r.Get("/diary", h.listDiary)
	r.Post("/cook", h.cook)
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

func (h *kitchenHandler) currentFast(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUser(w, r)
	if !ok {
		return
	}
	fast, err := h.store.GetOpenFast(r.Context(), userID)
	if errors.Is(err, ErrNotFound) {
		w.WriteHeader(http.StatusNoContent)
		return
	}
	if err != nil {
		log.Printf("ERROR: GetOpenFast user=%s: %v", userID, err)
		api.RespondError(w, http.StatusInternalServerError, "failed to load fast")
		return
	}
	api.RespondJSON(w, http.StatusOK, fast)
}

func (h *kitchenHandler) listFasts(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUser(w, r)
	if !ok {
		return
	}
	fasts, err := h.store.ListFasts(r.Context(), userID, 30)
	if err != nil {
		log.Printf("ERROR: ListFasts user=%s: %v", userID, err)
		api.RespondError(w, http.StatusInternalServerError, "failed to list fasts")
		return
	}
	api.RespondJSON(w, http.StatusOK, fasts)
}

type startFastBody struct {
	TargetHours *int `json:"target_hours"`
}

func (h *kitchenHandler) startFast(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUser(w, r)
	if !ok {
		return
	}
	var body startFastBody
	_ = json.NewDecoder(r.Body).Decode(&body)
	hours := 16
	if body.TargetHours != nil {
		hours = *body.TargetHours
	}
	fast, err := h.store.OpenFast(r.Context(), userID, hours)
	if errors.Is(err, ErrInvalidTarget) {
		api.RespondError(w, http.StatusUnprocessableEntity, "target_hours must be 12, 14, 16, 18, 20, 24, or 36")
		return
	}
	if err != nil {
		log.Printf("ERROR: OpenFast user=%s: %v", userID, err)
		api.RespondError(w, http.StatusInternalServerError, "failed to start fast")
		return
	}
	api.RespondJSON(w, http.StatusOK, fast)
}

type closeFastBody struct {
	Reason string `json:"reason"`
}

func (h *kitchenHandler) closeFast(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUser(w, r)
	if !ok {
		return
	}
	fastID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		api.RespondError(w, http.StatusBadRequest, "invalid fast id")
		return
	}
	var body closeFastBody
	_ = json.NewDecoder(r.Body).Decode(&body)
	if body.Reason == "" {
		body.Reason = "completed"
	}
	fast, err := h.store.CloseFast(r.Context(), userID, fastID, body.Reason)
	if errors.Is(err, ErrNotFound) {
		api.RespondError(w, http.StatusNotFound, "not found")
		return
	}
	if err != nil {
		api.RespondError(w, http.StatusUnprocessableEntity, err.Error())
		return
	}
	api.RespondJSON(w, http.StatusOK, fast)
}

func (h *kitchenHandler) listPantry(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUser(w, r)
	if !ok {
		return
	}
	items, err := h.store.ListPantry(r.Context(), userID)
	if err != nil {
		api.RespondError(w, http.StatusInternalServerError, "failed to list pantry")
		return
	}
	api.RespondJSON(w, http.StatusOK, items)
}

type pantryBody struct {
	Name       string `json:"name"`
	AmountText string `json:"amount_text"`
}

func (h *kitchenHandler) addPantry(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUser(w, r)
	if !ok {
		return
	}
	var body pantryBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		api.RespondError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}
	item, err := h.store.AddPantryItem(r.Context(), userID, body.Name, body.AmountText)
	if err != nil {
		api.RespondError(w, http.StatusUnprocessableEntity, "name is required")
		return
	}
	api.RespondJSON(w, http.StatusCreated, item)
}

func (h *kitchenHandler) deletePantry(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUser(w, r)
	if !ok {
		return
	}
	itemID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		api.RespondError(w, http.StatusBadRequest, "invalid id")
		return
	}
	if err := h.store.DeletePantryItem(r.Context(), userID, itemID); errors.Is(err, ErrNotFound) {
		api.RespondError(w, http.StatusNotFound, "not found")
		return
	} else if err != nil {
		api.RespondError(w, http.StatusInternalServerError, "failed to delete pantry item")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *kitchenHandler) listRecipes(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUser(w, r)
	if !ok {
		return
	}
	recipes, err := h.store.ListRecipes(r.Context(), userID)
	if err != nil {
		api.RespondError(w, http.StatusInternalServerError, "failed to list recipes")
		return
	}
	api.RespondJSON(w, http.StatusOK, recipes)
}

func (h *kitchenHandler) createRecipe(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUser(w, r)
	if !ok {
		return
	}
	var body Recipe
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		api.RespondError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}
	recipe, err := h.store.CreateRecipe(r.Context(), userID, body)
	if err != nil {
		api.RespondError(w, http.StatusUnprocessableEntity, "title is required")
		return
	}
	api.RespondJSON(w, http.StatusCreated, recipe)
}

func (h *kitchenHandler) deleteRecipe(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUser(w, r)
	if !ok {
		return
	}
	recipeID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		api.RespondError(w, http.StatusBadRequest, "invalid id")
		return
	}
	if err := h.store.DeleteRecipe(r.Context(), userID, recipeID); errors.Is(err, ErrRecipeNotFound) {
		api.RespondError(w, http.StatusNotFound, "not found")
		return
	} else if err != nil {
		api.RespondError(w, http.StatusInternalServerError, "failed to delete recipe")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *kitchenHandler) listDiary(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUser(w, r)
	if !ok {
		return
	}
	entries, err := h.store.ListDiary(r.Context(), userID, 50)
	if err != nil {
		api.RespondError(w, http.StatusInternalServerError, "failed to list diary")
		return
	}
	api.RespondJSON(w, http.StatusOK, entries)
}

type cookBody struct {
	RecipeID uuid.UUID `json:"recipe_id"`
	Servings float64   `json:"servings"`
}

func (h *kitchenHandler) cook(w http.ResponseWriter, r *http.Request) {
	userID, ok := requireUser(w, r)
	if !ok {
		return
	}
	var body cookBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.RecipeID == uuid.Nil {
		api.RespondError(w, http.StatusBadRequest, "recipe_id is required")
		return
	}
	entry, err := h.store.CookRecipe(r.Context(), userID, body.RecipeID, body.Servings)
	if errors.Is(err, ErrEmptyPantry) {
		api.RespondJSON(w, http.StatusUnprocessableEntity, map[string]string{"error": "empty_pantry"})
		return
	}
	if errors.Is(err, ErrRecipeNotFound) {
		api.RespondError(w, http.StatusNotFound, "not found")
		return
	}
	if err != nil {
		api.RespondError(w, http.StatusInternalServerError, "failed to cook")
		return
	}
	api.RespondJSON(w, http.StatusCreated, entry)
}
