package handlers_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/meden/rpgtracker/internal/auth"
	"github.com/meden/rpgtracker/internal/handlers"
	"github.com/meden/rpgtracker/internal/skills"
)

// stubSkillStore implements SkillStore for tests.
type stubSkillStore struct {
	created      *skills.Skill
	list         []skills.Skill
	detail       *skills.Skill
	gates        []skills.BlockerGate
	updated      *skills.Skill
	err          error
	deleteErr    error
	favouriteVal bool
	tags         []skills.Tag
	tagList      []skills.TagWithCount
	categories   []skills.Category
	validateErr  error
	// capture fields for assertions
	lastCategoryID *uuid.UUID
	lastTagNames   []string
}

func (s *stubSkillStore) CreateSkill(_ context.Context, _ uuid.UUID, name, _, _ string, _ *uuid.UUID, categoryID *uuid.UUID, _ int, _ [10]string) (*skills.Skill, error) {
	s.lastCategoryID = categoryID
	if s.err != nil {
		return nil, s.err
	}
	created := *s.created
	created.CategoryID = categoryID
	return &created, nil
}

func (s *stubSkillStore) ListSkills(_ context.Context, _ uuid.UUID) ([]skills.Skill, error) {
	return s.list, s.err
}

func (s *stubSkillStore) GetSkill(_ context.Context, _, _ uuid.UUID) (*skills.Skill, error) {
	if s.err != nil {
		return nil, s.err
	}
	return s.detail, nil
}

func (s *stubSkillStore) GetBlockerGates(_ context.Context, _ uuid.UUID) ([]skills.BlockerGate, error) {
	return s.gates, nil
}

func (s *stubSkillStore) UpdateSkill(_ context.Context, _, _ uuid.UUID, _, _ string, categoryID *uuid.UUID) (*skills.Skill, error) {
	s.lastCategoryID = categoryID
	if s.err != nil {
		return nil, s.err
	}
	updated := *s.updated
	updated.CategoryID = categoryID
	return &updated, nil
}

func (s *stubSkillStore) SoftDeleteSkill(_ context.Context, _, _ uuid.UUID) error {
	return s.deleteErr
}

func (s *stubSkillStore) ToggleFavourite(_ context.Context, _, _ uuid.UUID) (bool, error) {
	if s.err != nil {
		return false, s.err
	}
	s.favouriteVal = !s.favouriteVal
	return s.favouriteVal, nil
}

func (s *stubSkillStore) SetSkillTags(_ context.Context, _, _ uuid.UUID, tagNames []string) ([]skills.Tag, error) {
	s.lastTagNames = tagNames
	if s.err != nil {
		return nil, s.err
	}
	return s.tags, nil
}

func (s *stubSkillStore) ListTags(_ context.Context, _ uuid.UUID) ([]skills.TagWithCount, error) {
	return s.tagList, s.err
}

func (s *stubSkillStore) ListCategories(_ context.Context) ([]skills.Category, error) {
	return s.categories, s.err
}

func (s *stubSkillStore) ValidateCategoryID(_ context.Context, _ uuid.UUID) error {
	return s.validateErr
}

func userCtx(userID uuid.UUID) context.Context {
	return auth.WithUserID(context.Background(), userID)
}

func TestHandlePostSkill_Success(t *testing.T) {
	userID := uuid.New()
	skillID := uuid.New()
	stub := &stubSkillStore{
		created: &skills.Skill{ID: skillID, Name: "Piano", Unit: "session"},
	}
	h := handlers.NewSkillHandlerWithStore(stub)

	form := url.Values{"name": {"Piano"}, "unit": {"session"}}
	req := httptest.NewRequest(http.MethodPost, "/api/v1/skills", strings.NewReader(form.Encode()))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req = req.WithContext(userCtx(userID))

	w := httptest.NewRecorder()
	h.HandlePostSkill(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", w.Code, w.Body.String())
	}
	var resp skills.Skill
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatal(err)
	}
	if resp.Name != "Piano" {
		t.Fatalf("expected Piano, got %s", resp.Name)
	}
}

func TestHandlePostSkill_MissingName(t *testing.T) {
	h := handlers.NewSkillHandlerWithStore(&stubSkillStore{})
	userID := uuid.New()

	form := url.Values{"name": {""}}
	req := httptest.NewRequest(http.MethodPost, "/api/v1/skills", strings.NewReader(form.Encode()))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req = req.WithContext(userCtx(userID))

	w := httptest.NewRecorder()
	h.HandlePostSkill(w, req)

	if w.Code != http.StatusUnprocessableEntity {
		t.Fatalf("expected 422, got %d", w.Code)
	}
}

func TestHandlePostSkill_Unauthorized(t *testing.T) {
	h := handlers.NewSkillHandlerWithStore(&stubSkillStore{})
	req := httptest.NewRequest(http.MethodPost, "/api/v1/skills", nil)
	w := httptest.NewRecorder()
	h.HandlePostSkill(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", w.Code)
	}
}

func TestHandleGetSkills_ReturnsEmptyArray(t *testing.T) {
	store := &stubSkillStore{list: []skills.Skill{}}
	h := handlers.NewSkillHandlerWithStore(store)
	req := httptest.NewRequest(http.MethodGet, "/api/v1/skills", nil)
	req = req.WithContext(userCtx(uuid.New()))
	w := httptest.NewRecorder()
	h.HandleGetSkills(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("got %d want 200", w.Code)
	}
	body := strings.TrimSpace(w.Body.String())
	if body == "null" {
		t.Fatal("want [] got null")
	}
}

func TestHandleGetSkillDetail_ReturnsEffectiveLevel(t *testing.T) {
	skillID := uuid.New()
	store := &stubSkillStore{
		detail: &skills.Skill{ID: skillID, CurrentLevel: 10},
		gates: []skills.BlockerGate{
			{GateLevel: 9, IsCleared: false},
		},
	}
	h := handlers.NewSkillHandlerWithStore(store)

	// Build request with chi URL param
	req := httptest.NewRequest(http.MethodGet, "/api/v1/skills/"+skillID.String(), nil)
	req = req.WithContext(userCtx(uuid.New()))
	// Inject chi URLParam
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", skillID.String())
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.HandleGetSkill(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("got %d want 200: %s", w.Code, w.Body.String())
	}
	var resp map[string]interface{}
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatal(err)
	}
	effectiveLevel := int(resp["effective_level"].(float64))
	if effectiveLevel != 9 {
		t.Errorf("effective_level: got %d want 9", effectiveLevel)
	}
}

func TestHandleDeleteSkill_Returns204(t *testing.T) {
	skillID := uuid.New()
	store := &stubSkillStore{deleteErr: nil}
	h := handlers.NewSkillHandlerWithStore(store)

	req := httptest.NewRequest(http.MethodDelete, "/api/v1/skills/"+skillID.String(), nil)
	req = req.WithContext(userCtx(uuid.New()))
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", skillID.String())
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.HandleDeleteSkill(w, req)

	if w.Code != http.StatusNoContent {
		t.Fatalf("got %d want 204", w.Code)
	}
}

func TestHandleDeleteSkill_Returns404_WhenNotOwner(t *testing.T) {
	skillID := uuid.New()
	store := &stubSkillStore{deleteErr: skills.ErrNotFound}
	h := handlers.NewSkillHandlerWithStore(store)

	req := httptest.NewRequest(http.MethodDelete, "/api/v1/skills/"+skillID.String(), nil)
	req = req.WithContext(userCtx(uuid.New()))
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", skillID.String())
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.HandleDeleteSkill(w, req)

	if w.Code != http.StatusNotFound {
		t.Fatalf("got %d want 404", w.Code)
	}
}

// ─── AC-L1: Category assignment at creation ───

func TestHandlePostSkill_WithCategoryID(t *testing.T) {
	userID := uuid.New()
	skillID := uuid.New()
	catID := uuid.New()
	stub := &stubSkillStore{
		created: &skills.Skill{ID: skillID, Name: "Guitar", Unit: "session"},
	}
	h := handlers.NewSkillHandlerWithStore(stub)

	form := url.Values{"name": {"Guitar"}, "unit": {"session"}, "category_id": {catID.String()}}
	req := httptest.NewRequest(http.MethodPost, "/api/v1/skills", strings.NewReader(form.Encode()))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req = req.WithContext(userCtx(userID))

	w := httptest.NewRecorder()
	h.HandlePostSkill(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", w.Code, w.Body.String())
	}
	if stub.lastCategoryID == nil || *stub.lastCategoryID != catID {
		t.Fatalf("expected category_id %s, got %v", catID, stub.lastCategoryID)
	}
}

func TestHandlePostSkill_InvalidCategoryUUID(t *testing.T) {
	stub := &stubSkillStore{
		created: &skills.Skill{ID: uuid.New(), Name: "X", Unit: "session"},
	}
	h := handlers.NewSkillHandlerWithStore(stub)

	form := url.Values{"name": {"X"}, "category_id": {"not-a-uuid"}}
	req := httptest.NewRequest(http.MethodPost, "/api/v1/skills", strings.NewReader(form.Encode()))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req = req.WithContext(userCtx(uuid.New()))

	w := httptest.NewRecorder()
	h.HandlePostSkill(w, req)

	if w.Code != http.StatusUnprocessableEntity {
		t.Fatalf("expected 422, got %d: %s", w.Code, w.Body.String())
	}
}

func TestHandlePostSkill_CategoryNotFound(t *testing.T) {
	stub := &stubSkillStore{
		created:     &skills.Skill{ID: uuid.New(), Name: "X", Unit: "session"},
		validateErr: skills.ErrInvalidCategory,
	}
	h := handlers.NewSkillHandlerWithStore(stub)

	form := url.Values{"name": {"X"}, "category_id": {uuid.New().String()}}
	req := httptest.NewRequest(http.MethodPost, "/api/v1/skills", strings.NewReader(form.Encode()))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req = req.WithContext(userCtx(uuid.New()))

	w := httptest.NewRecorder()
	h.HandlePostSkill(w, req)

	if w.Code != http.StatusUnprocessableEntity {
		t.Fatalf("expected 422, got %d: %s", w.Code, w.Body.String())
	}
}

func TestHandlePostSkill_NoCategoryNoPreset(t *testing.T) {
	skillID := uuid.New()
	stub := &stubSkillStore{
		created: &skills.Skill{ID: skillID, Name: "Running", Unit: "km"},
	}
	h := handlers.NewSkillHandlerWithStore(stub)

	form := url.Values{"name": {"Running"}, "unit": {"km"}}
	req := httptest.NewRequest(http.MethodPost, "/api/v1/skills", strings.NewReader(form.Encode()))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req = req.WithContext(userCtx(uuid.New()))

	w := httptest.NewRecorder()
	h.HandlePostSkill(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", w.Code, w.Body.String())
	}
	if stub.lastCategoryID != nil {
		t.Fatalf("expected nil category_id, got %v", stub.lastCategoryID)
	}
}

// ─── AC-L2: Category update ───

func TestHandlePutSkill_WithCategoryID(t *testing.T) {
	skillID := uuid.New()
	catID := uuid.New()
	stub := &stubSkillStore{
		detail:  &skills.Skill{ID: skillID, Name: "Guitar", Unit: "session"},
		updated: &skills.Skill{ID: skillID, Name: "Guitar", Unit: "session"},
	}
	h := handlers.NewSkillHandlerWithStore(stub)

	form := url.Values{"name": {"Guitar"}, "category_id": {catID.String()}}
	req := httptest.NewRequest(http.MethodPut, "/api/v1/skills/"+skillID.String(), strings.NewReader(form.Encode()))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req = req.WithContext(userCtx(uuid.New()))
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", skillID.String())
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.HandlePutSkill(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
	if stub.lastCategoryID == nil || *stub.lastCategoryID != catID {
		t.Fatalf("expected category_id %s, got %v", catID, stub.lastCategoryID)
	}
}

func TestHandlePutSkill_EmptyCategoryID(t *testing.T) {
	skillID := uuid.New()
	stub := &stubSkillStore{
		updated: &skills.Skill{ID: skillID, Name: "Guitar", Unit: "session"},
	}
	h := handlers.NewSkillHandlerWithStore(stub)

	form := url.Values{"name": {"Guitar"}, "category_id": {""}}
	req := httptest.NewRequest(http.MethodPut, "/api/v1/skills/"+skillID.String(), strings.NewReader(form.Encode()))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req = req.WithContext(userCtx(uuid.New()))
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", skillID.String())
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.HandlePutSkill(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
	if stub.lastCategoryID != nil {
		t.Fatalf("expected nil category_id (removed), got %v", stub.lastCategoryID)
	}
}

// ─── AC-L3: Favourite toggle ───

func TestHandlePatchFavourite_Success(t *testing.T) {
	skillID := uuid.New()
	stub := &stubSkillStore{favouriteVal: false}
	h := handlers.NewSkillHandlerWithStore(stub)

	req := httptest.NewRequest(http.MethodPatch, "/api/v1/skills/"+skillID.String()+"/favourite", nil)
	req = req.WithContext(userCtx(uuid.New()))
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", skillID.String())
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.HandlePatchFavourite(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
	var resp map[string]bool
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatal(err)
	}
	if !resp["is_favourite"] {
		t.Fatal("expected is_favourite=true after toggle from false")
	}
}

func TestHandlePatchFavourite_ToggleTwice(t *testing.T) {
	skillID := uuid.New()
	stub := &stubSkillStore{favouriteVal: false}
	h := handlers.NewSkillHandlerWithStore(stub)

	// First toggle: false → true
	req := httptest.NewRequest(http.MethodPatch, "/api/v1/skills/"+skillID.String()+"/favourite", nil)
	req = req.WithContext(userCtx(uuid.New()))
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", skillID.String())
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))
	w := httptest.NewRecorder()
	h.HandlePatchFavourite(w, req)

	// Second toggle: true → false
	req2 := httptest.NewRequest(http.MethodPatch, "/api/v1/skills/"+skillID.String()+"/favourite", nil)
	req2 = req2.WithContext(userCtx(uuid.New()))
	rctx2 := chi.NewRouteContext()
	rctx2.URLParams.Add("id", skillID.String())
	req2 = req2.WithContext(context.WithValue(req2.Context(), chi.RouteCtxKey, rctx2))
	w2 := httptest.NewRecorder()
	h.HandlePatchFavourite(w2, req2)

	var resp map[string]bool
	if err := json.NewDecoder(w2.Body).Decode(&resp); err != nil {
		t.Fatal(err)
	}
	if resp["is_favourite"] {
		t.Fatal("expected is_favourite=false after toggling twice")
	}
}

func TestHandlePatchFavourite_NotFound(t *testing.T) {
	stub := &stubSkillStore{err: skills.ErrNotFound}
	h := handlers.NewSkillHandlerWithStore(stub)
	skillID := uuid.New()

	req := httptest.NewRequest(http.MethodPatch, "/api/v1/skills/"+skillID.String()+"/favourite", nil)
	req = req.WithContext(userCtx(uuid.New()))
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", skillID.String())
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.HandlePatchFavourite(w, req)

	if w.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d", w.Code)
	}
}

func TestHandlePatchFavourite_Unauthorized(t *testing.T) {
	h := handlers.NewSkillHandlerWithStore(&stubSkillStore{})
	req := httptest.NewRequest(http.MethodPatch, "/api/v1/skills/"+uuid.New().String()+"/favourite", nil)
	w := httptest.NewRecorder()
	h.HandlePatchFavourite(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", w.Code)
	}
}

// ─── AC-L4: Tag management ───

func TestHandlePutSkillTags_Success(t *testing.T) {
	skillID := uuid.New()
	tag1 := skills.Tag{ID: uuid.New(), Name: "piano"}
	tag2 := skills.Tag{ID: uuid.New(), Name: "jazz"}
	stub := &stubSkillStore{tags: []skills.Tag{tag1, tag2}}
	h := handlers.NewSkillHandlerWithStore(stub)

	form := url.Values{"tag_names": {"piano,jazz"}}
	req := httptest.NewRequest(http.MethodPut, "/api/v1/skills/"+skillID.String()+"/tags", strings.NewReader(form.Encode()))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req = req.WithContext(userCtx(uuid.New()))
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", skillID.String())
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.HandlePutSkillTags(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
	// Verify the handler parsed comma-separated tag names correctly
	if len(stub.lastTagNames) != 2 {
		t.Fatalf("expected 2 tag names, got %d: %v", len(stub.lastTagNames), stub.lastTagNames)
	}
	if stub.lastTagNames[0] != "piano" || stub.lastTagNames[1] != "jazz" {
		t.Fatalf("expected [piano jazz], got %v", stub.lastTagNames)
	}
	var resp []skills.Tag
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatal(err)
	}
	if len(resp) != 2 {
		t.Fatalf("expected 2 tags in response, got %d", len(resp))
	}
}

func TestHandlePutSkillTags_TooMany(t *testing.T) {
	stub := &stubSkillStore{err: skills.ErrTooManyTags}
	h := handlers.NewSkillHandlerWithStore(stub)
	skillID := uuid.New()

	form := url.Values{"tag_names": {"a,b,c,d,e,f"}}
	req := httptest.NewRequest(http.MethodPut, "/api/v1/skills/"+skillID.String()+"/tags", strings.NewReader(form.Encode()))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req = req.WithContext(userCtx(uuid.New()))
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", skillID.String())
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.HandlePutSkillTags(w, req)

	if w.Code != http.StatusUnprocessableEntity {
		t.Fatalf("expected 422, got %d: %s", w.Code, w.Body.String())
	}
}

func TestHandlePutSkillTags_Empty(t *testing.T) {
	stub := &stubSkillStore{tags: []skills.Tag{}}
	h := handlers.NewSkillHandlerWithStore(stub)
	skillID := uuid.New()

	form := url.Values{"tag_names": {""}}
	req := httptest.NewRequest(http.MethodPut, "/api/v1/skills/"+skillID.String()+"/tags", strings.NewReader(form.Encode()))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req = req.WithContext(userCtx(uuid.New()))
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", skillID.String())
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.HandlePutSkillTags(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
	// Empty tag_names should pass nil/empty slice to store
	if len(stub.lastTagNames) != 0 {
		t.Fatalf("expected 0 tag names for empty input, got %d: %v", len(stub.lastTagNames), stub.lastTagNames)
	}
}

func TestHandlePutSkillTags_NotFound(t *testing.T) {
	stub := &stubSkillStore{err: skills.ErrNotFound}
	h := handlers.NewSkillHandlerWithStore(stub)
	skillID := uuid.New()

	form := url.Values{"tag_names": {"piano"}}
	req := httptest.NewRequest(http.MethodPut, "/api/v1/skills/"+skillID.String()+"/tags", strings.NewReader(form.Encode()))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req = req.WithContext(userCtx(uuid.New()))
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", skillID.String())
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.HandlePutSkillTags(w, req)

	if w.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d: %s", w.Code, w.Body.String())
	}
}

func TestHandlePutSkillTags_Unauthorized(t *testing.T) {
	h := handlers.NewSkillHandlerWithStore(&stubSkillStore{})
	req := httptest.NewRequest(http.MethodPut, "/api/v1/skills/"+uuid.New().String()+"/tags", nil)
	w := httptest.NewRecorder()
	h.HandlePutSkillTags(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", w.Code)
	}
}

// ─── AC-L5: Tag listing ───

func TestHandleGetTags_Success(t *testing.T) {
	stub := &stubSkillStore{
		tagList: []skills.TagWithCount{
			{Tag: skills.Tag{ID: uuid.New(), Name: "piano"}, SkillCount: 3},
			{Tag: skills.Tag{ID: uuid.New(), Name: "jazz"}, SkillCount: 1},
		},
	}
	h := handlers.NewSkillHandlerWithStore(stub)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/tags", nil)
	req = req.WithContext(userCtx(uuid.New()))

	w := httptest.NewRecorder()
	h.HandleGetTags(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
	var resp []skills.TagWithCount
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatal(err)
	}
	if len(resp) != 2 {
		t.Fatalf("expected 2 tags, got %d", len(resp))
	}
	if resp[0].SkillCount != 3 {
		t.Errorf("expected skill_count=3, got %d", resp[0].SkillCount)
	}
}

func TestHandleGetTags_EmptyReturnsArray(t *testing.T) {
	stub := &stubSkillStore{tagList: nil}
	h := handlers.NewSkillHandlerWithStore(stub)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/tags", nil)
	req = req.WithContext(userCtx(uuid.New()))

	w := httptest.NewRecorder()
	h.HandleGetTags(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
	body := strings.TrimSpace(w.Body.String())
	if body == "null" {
		t.Fatal("want [] got null — handler must coalesce nil to empty array")
	}
}

func TestHandleGetTags_Unauthorized(t *testing.T) {
	h := handlers.NewSkillHandlerWithStore(&stubSkillStore{})
	req := httptest.NewRequest(http.MethodGet, "/api/v1/tags", nil)
	w := httptest.NewRecorder()
	h.HandleGetTags(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", w.Code)
	}
}

// ─── AC-L6: Category listing ───

func TestHandleGetCategories_Success(t *testing.T) {
	cats := []skills.Category{
		{ID: uuid.New(), Name: "Fitness & Movement", Slug: "fitness", Emoji: "🏃", SortOrder: 1},
		{ID: uuid.New(), Name: "Programming & Tech", Slug: "programming", Emoji: "💻", SortOrder: 2},
	}
	stub := &stubSkillStore{categories: cats}
	h := handlers.NewSkillHandlerWithStore(stub)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/categories", nil)
	req = req.WithContext(userCtx(uuid.New()))

	w := httptest.NewRecorder()
	h.HandleGetCategories(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
	var resp []skills.Category
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatal(err)
	}
	if len(resp) != 2 {
		t.Fatalf("expected 2 categories, got %d", len(resp))
	}
	if resp[0].Slug != "fitness" {
		t.Errorf("expected slug=fitness, got %s", resp[0].Slug)
	}
}

func TestHandleGetCategories_EmptyReturnsArray(t *testing.T) {
	stub := &stubSkillStore{categories: []skills.Category{}}
	h := handlers.NewSkillHandlerWithStore(stub)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/categories", nil)
	req = req.WithContext(userCtx(uuid.New()))

	w := httptest.NewRecorder()
	h.HandleGetCategories(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
}

// ─── AC-L7 / AC-L8: Skill list & detail enrichment ───

func TestHandleGetSkills_IncludesCategoryAndTags(t *testing.T) {
	catName := "Fitness & Movement"
	catSlug := "fitness"
	catEmoji := "🏃"
	catID := uuid.New()
	store := &stubSkillStore{
		list: []skills.Skill{
			{
				ID:            uuid.New(),
				Name:          "Running",
				CurrentLevel:  5,
				CategoryID:    &catID,
				CategoryName:  &catName,
				CategorySlug:  &catSlug,
				CategoryEmoji: &catEmoji,
				IsFavourite:   true,
				Tags:          []skills.Tag{{ID: uuid.New(), Name: "cardio"}},
			},
		},
	}
	h := handlers.NewSkillHandlerWithStore(store)
	req := httptest.NewRequest(http.MethodGet, "/api/v1/skills", nil)
	req = req.WithContext(userCtx(uuid.New()))

	w := httptest.NewRecorder()
	h.HandleGetSkills(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("got %d want 200: %s", w.Code, w.Body.String())
	}
	var resp []map[string]interface{}
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatal(err)
	}
	if len(resp) != 1 {
		t.Fatalf("expected 1 skill, got %d", len(resp))
	}
	skill := resp[0]
	if skill["category_name"] != "Fitness & Movement" {
		t.Errorf("category_name: got %v", skill["category_name"])
	}
	if skill["category_slug"] != "fitness" {
		t.Errorf("category_slug: got %v", skill["category_slug"])
	}
	if skill["is_favourite"] != true {
		t.Errorf("is_favourite: got %v", skill["is_favourite"])
	}
	tags, ok := skill["tags"].([]interface{})
	if !ok || len(tags) != 1 {
		t.Errorf("tags: expected 1-element array, got %v", skill["tags"])
	}
}

func TestHandleGetSkill_IncludesCategoryAndTags(t *testing.T) {
	skillID := uuid.New()
	catName := "Creative Arts"
	catSlug := "creative"
	catEmoji := "🎨"
	catID := uuid.New()
	store := &stubSkillStore{
		detail: &skills.Skill{
			ID:            skillID,
			Name:          "Drawing",
			CurrentLevel:  3,
			CategoryID:    &catID,
			CategoryName:  &catName,
			CategorySlug:  &catSlug,
			CategoryEmoji: &catEmoji,
			IsFavourite:   false,
			Tags:          []skills.Tag{{ID: uuid.New(), Name: "art"}, {ID: uuid.New(), Name: "hobby"}},
		},
		gates: []skills.BlockerGate{},
	}
	h := handlers.NewSkillHandlerWithStore(store)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/skills/"+skillID.String(), nil)
	req = req.WithContext(userCtx(uuid.New()))
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", skillID.String())
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()
	h.HandleGetSkill(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("got %d want 200: %s", w.Code, w.Body.String())
	}
	var resp map[string]interface{}
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatal(err)
	}
	if resp["category_name"] != "Creative Arts" {
		t.Errorf("category_name: got %v", resp["category_name"])
	}
	if resp["category_emoji"] != "🎨" {
		t.Errorf("category_emoji: got %v", resp["category_emoji"])
	}
	tags, ok := resp["tags"].([]interface{})
	if !ok || len(tags) != 2 {
		t.Errorf("tags: expected 2-element array, got %v", resp["tags"])
	}
}

func TestHandleGetSkills_NullCategoryFields(t *testing.T) {
	store := &stubSkillStore{
		list: []skills.Skill{
			{
				ID:           uuid.New(),
				Name:         "Custom Skill",
				CurrentLevel: 1,
				Tags:         []skills.Tag{},
			},
		},
	}
	h := handlers.NewSkillHandlerWithStore(store)
	req := httptest.NewRequest(http.MethodGet, "/api/v1/skills", nil)
	req = req.WithContext(userCtx(uuid.New()))

	w := httptest.NewRecorder()
	h.HandleGetSkills(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("got %d want 200", w.Code)
	}
	var resp []map[string]interface{}
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatal(err)
	}
	skill := resp[0]
	if skill["category_id"] != nil {
		t.Errorf("expected null category_id, got %v", skill["category_id"])
	}
	if skill["is_favourite"] != false {
		t.Errorf("expected is_favourite=false, got %v", skill["is_favourite"])
	}
}
