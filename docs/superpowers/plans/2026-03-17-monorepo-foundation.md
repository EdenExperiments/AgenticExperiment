# Monorepo Foundation Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the existing Go + HTMX + Templ repo into a Turborepo monorepo with three Next.js app shells, a shared component/auth/API-client package layer, and a Go API that serves JSON instead of HTML.

**Architecture:** pnpm workspaces + Turborepo at the repo root. Go backend moves into `apps/api/` and all Templ/HTMX rendering is removed — handlers return JSON via `encoding/json`. Three Next.js apps (`apps/rpg-tracker`, `apps/nutri-log`, `apps/mental-health`) share packages from `packages/ui`, `packages/auth`, and `packages/api-client`. Browser never calls Go directly — Next.js Route Handlers proxy all requests (BFF pattern). Auth is handled by Supabase JS SDK in the Next.js layer; Go only validates JWTs.

**Tech Stack:** Go 1.25 + chi, Next.js 14 App Router, TypeScript, Tailwind CSS v4, Vitest, React Testing Library, Playwright, pnpm workspaces, Turborepo

---

## File Map

### New at repo root
- `pnpm-workspace.yaml` — declares `apps/*` and `packages/*` as workspace members
- `turbo.json` — Turborepo pipeline (build, test, lint, dev)
- `package.json` — workspace root (replaces current Tailwind-only package.json)

### packages/tsconfig/
- `package.json`
- `base.json` — shared strict TS config
- `nextjs.json` — extends base, adds Next.js-specific settings

### packages/ui/
- `package.json`
- `tokens/base.css` — spacing, radii, font sizes (never overridden per app)
- `tokens/rpg-game.css` — dark, dramatic, gold accents
- `tokens/rpg-clean.css` — neutral palette, minimal animation
- `tokens/nutri-saas.css` — light, professional, clinical greens
- `tokens/mental-calm.css` — soft neutrals, muted, low contrast
- `src/ThemeProvider.tsx` — applies theme class to `<html>` from cookie/prop
- `src/index.ts` — package exports
- `src/__tests__/ThemeProvider.test.tsx`

### packages/auth/
- `package.json`
- `src/client.ts` — Supabase browser client (singleton)
- `src/server.ts` — Supabase server client (for Route Handlers / middleware)
- `src/middleware.ts` — Next.js middleware: auth redirect + theme cookie
- `src/hooks.ts` — `useSession()`, `useSubscription()` React hooks
- `src/index.ts` — package exports
- `src/__tests__/hooks.test.tsx`

### packages/api-client/
- `package.json`
- `src/types.ts` — shared API response types (Skill, Preset, Account, etc.)
- `src/client.ts` — typed fetch functions calling Next.js Route Handlers
- `src/index.ts` — exports
- `src/__tests__/client.test.ts`

### apps/api/ (Go backend — moved from repo root)
- All existing Go files move here with paths adjusted
- `internal/api/response.go` — NEW: `RespondJSON`, `RespondError` helpers
- `internal/handlers/skill.go` — MODIFIED: returns JSON, removes Templ imports
- `internal/handlers/preset.go` — MODIFIED: returns JSON
- `internal/handlers/account.go` — MODIFIED: returns JSON
- `internal/handlers/api_key.go` — MODIFIED: returns JSON
- `internal/server/server.go` — MODIFIED: removes auth page routes, adds `/api/v1/` prefix
- `internal/templates/` — DELETED entirely
- `internal/auth/handler.go` — DELETED (login/register/signout now handled by Supabase JS SDK)

### apps/rpg-tracker/
- `package.json`, `next.config.ts`, `tsconfig.json`
- `middleware.ts` — auth check (redirects to /login if no session)
- `app/layout.tsx` — root layout: ThemeProvider, fonts
- `app/page.tsx` — redirects authenticated → /dashboard, unauthenticated → /login
- `app/(auth)/login/page.tsx` — login form
- `app/(auth)/register/page.tsx` — register form
- `app/(app)/layout.tsx` — authenticated layout with bottom tab bar placeholder
- `app/(app)/dashboard/page.tsx` — placeholder dashboard
- `app/api/[...path]/route.ts` — BFF proxy to Go API
- `app/__tests__/login.test.tsx`
- `app/__tests__/dashboard.test.tsx`
- `e2e/auth.spec.ts` — Playwright: login → dashboard flow

### apps/nutri-log/ and apps/mental-health/
- Same scaffold as rpg-tracker (minimal — shell + routing + theme only)
- No feature pages beyond dashboard placeholder

---

## Chunk 1: Monorepo Scaffold

### Task 1: Convert root package.json to pnpm workspace root

**Files:**
- Modify: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `turbo.json`

- [ ] **Step 1: Check current package.json**

```bash
cat package.json
```

- [ ] **Step 2: Replace package.json with workspace root**

```json
{
  "name": "rpgtracker-platform",
  "private": true,
  "scripts": {
    "build": "turbo build",
    "dev": "turbo dev",
    "test": "turbo test",
    "lint": "turbo lint",
    "format": "turbo format"
  },
  "devDependencies": {
    "turbo": "^2.0.0"
  },
  "engines": {
    "node": ">=20",
    "pnpm": ">=9"
  },
  "packageManager": "pnpm@9.0.0"
}
```

- [ ] **Step 3: Create pnpm-workspace.yaml**

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

- [ ] **Step 4: Create turbo.json**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "ui": "tui",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "inputs": ["$TURBO_DEFAULT$", ".env*"],
      "outputs": [".next/**", "!.next/cache/**"]
    },
    "test": {
      "dependsOn": ["^build"]
    },
    "lint": {
      "dependsOn": ["^lint"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

- [ ] **Step 5: Install Turborepo**

```bash
cd /home/meden/GolandProjects/RpgTracker
pnpm install
```

Expected: `node_modules/.pnpm/turbo@...` appears, lockfile updated.

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-workspace.yaml turbo.json pnpm-lock.yaml
git commit -m "chore: init pnpm workspace + Turborepo"
```

---

### Task 2: packages/tsconfig

**Files:**
- Create: `packages/tsconfig/package.json`
- Create: `packages/tsconfig/base.json`
- Create: `packages/tsconfig/nextjs.json`

- [ ] **Step 1: Create directory and package.json**

```bash
mkdir -p packages/tsconfig
```

```json
{
  "name": "@rpgtracker/tsconfig",
  "version": "0.0.1",
  "private": true,
  "license": "MIT",
  "exports": {
    "./base.json": "./base.json",
    "./nextjs.json": "./nextjs.json"
  }
}
```

- [ ] **Step 2: Create base.json**

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "display": "Default",
  "compilerOptions": {
    "strict": true,
    "strictNullChecks": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "incremental": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "isolatedModules": true
  }
}
```

- [ ] **Step 3: Create nextjs.json**

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "display": "Next.js",
  "extends": "./base.json",
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "moduleDetection": "force",
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "jsx": "preserve",
    "plugins": [{ "name": "next" }]
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add packages/tsconfig/
git commit -m "feat: add packages/tsconfig shared TypeScript config"
```

---

## Chunk 2: Go API Migration

### Task 3: Move Go code into apps/api/

**Files:**
- Create: `apps/api/` (move all existing Go files here)
- Create: `apps/api/internal/api/response.go`
- Delete: `internal/templates/` directory

- [ ] **Step 1: Create apps/api and move Go source**

> **Note on Go version:** The existing `go.mod` declares `go 1.25.0`. Ensure your local Go toolchain is ≥ 1.25 before proceeding (`go version`).

```bash
mkdir -p apps/api
# Move Go source directories
mv cmd apps/api/cmd
mv internal apps/api/internal
mv db apps/api/db
mv go.mod apps/api/go.mod
mv go.sum apps/api/go.sum
mv Makefile apps/api/Makefile
# Copy environment config to new location
cp .env apps/api/.env 2>/dev/null || true
cp .env.example apps/api/.env.example 2>/dev/null || true
```

- [ ] **Step 2: Delete the templates package (Templ/HTMX no longer needed)**

```bash
rm -rf apps/api/internal/templates
```

- [ ] **Step 3: Verify Go module still compiles (will fail — handler imports need fixing next)**

```bash
cd apps/api && go build ./... 2>&1 | head -30
```

Expected: compile errors referencing `internal/templates` — this is expected and will be fixed in Tasks 4–6.

- [ ] **Step 4: Write failing test for response helpers first (TDD)**

Create `apps/api/internal/api/response_test.go`:

```go
package api_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/meden/rpgtracker/internal/api"
)

func TestRespondJSON(t *testing.T) {
	w := httptest.NewRecorder()
	api.RespondJSON(w, http.StatusOK, map[string]string{"hello": "world"})

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
	if ct := w.Header().Get("Content-Type"); ct != "application/json" {
		t.Fatalf("expected application/json, got %s", ct)
	}
	var body map[string]string
	if err := json.NewDecoder(w.Body).Decode(&body); err != nil {
		t.Fatal(err)
	}
	if body["hello"] != "world" {
		t.Fatalf("unexpected body: %v", body)
	}
}

func TestRespondError(t *testing.T) {
	w := httptest.NewRecorder()
	api.RespondError(w, http.StatusBadRequest, "bad input")

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", w.Code)
	}
	var body map[string]string
	json.NewDecoder(w.Body).Decode(&body)
	if body["error"] != "bad input" {
		t.Fatalf("unexpected body: %v", body)
	}
}
```

- [ ] **Step 5: Run test to confirm it fails**

```bash
cd apps/api && go test ./internal/api/...
```

Expected: FAIL — `api` package not defined

- [ ] **Step 6: Implement response helpers**

Create `apps/api/internal/api/response.go`:

```go
package api

import (
	"encoding/json"
	"net/http"
)

// RespondJSON writes a JSON response with the given status code.
func RespondJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(data); err != nil {
		// At this point headers are sent; log only.
		_ = err
	}
}

// RespondError writes a JSON error response.
func RespondError(w http.ResponseWriter, status int, msg string) {
	RespondJSON(w, status, map[string]string{"error": msg})
}
```

- [ ] **Step 7: Run test to confirm it passes**

```bash
cd apps/api && go test ./internal/api/...
```

Expected: PASS

---

### Task 4: Update skill handler to return JSON

**Files:**
- Modify: `apps/api/internal/handlers/skill.go`

- [ ] **Step 1: Rewrite skill handler**

Replace `apps/api/internal/handlers/skill.go`:

```go
package handlers

import (
	"context"
	"net/http"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/meden/rpgtracker/internal/api"
	"github.com/meden/rpgtracker/internal/auth"
	"github.com/meden/rpgtracker/internal/skills"
)

// SkillStore is the write interface the handler needs from the DB layer.
type SkillStore interface {
	CreateSkill(ctx context.Context, userID uuid.UUID, name, description, unit string, presetID *uuid.UUID) (*skills.Skill, error)
}

// SkillHandler handles skill endpoints.
type SkillHandler struct {
	store SkillStore
}

// NewSkillHandler constructs a SkillHandler backed by the given DB pool.
func NewSkillHandler(db *pgxpool.Pool) *SkillHandler {
	return &SkillHandler{store: &dbSkillStore{db: db}}
}

// NewSkillHandlerWithStore constructs a SkillHandler with an injected store (for tests).
func NewSkillHandlerWithStore(s SkillStore) *SkillHandler {
	return &SkillHandler{store: s}
}

type dbSkillStore struct{ db *pgxpool.Pool }

func (s *dbSkillStore) CreateSkill(ctx context.Context, userID uuid.UUID, name, description, unit string, presetID *uuid.UUID) (*skills.Skill, error) {
	return skills.CreateSkill(ctx, s.db, userID, name, description, unit, presetID)
}

// HandlePostSkill processes POST /api/v1/skills.
// Expects application/x-www-form-urlencoded body: name, description, unit, preset_id (optional).
// Returns the created skill as JSON.
func (h *SkillHandler) HandlePostSkill(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		api.RespondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	if err := r.ParseForm(); err != nil {
		api.RespondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	name := strings.TrimSpace(r.FormValue("name"))
	if name == "" {
		api.RespondError(w, http.StatusUnprocessableEntity, "skill name is required")
		return
	}

	description := strings.TrimSpace(r.FormValue("description"))
	unit := strings.TrimSpace(r.FormValue("unit"))
	if unit == "" {
		unit = "session"
	}

	var presetID *uuid.UUID
	if rawID := r.FormValue("preset_id"); rawID != "" {
		if id, err := uuid.Parse(rawID); err == nil {
			presetID = &id
		}
	}

	skill, err := h.store.CreateSkill(r.Context(), userID, name, description, unit, presetID)
	if err != nil {
		api.RespondError(w, http.StatusInternalServerError, "failed to create skill")
		return
	}

	api.RespondJSON(w, http.StatusCreated, skill)
}
```

- [ ] **Step 2: Write handler test**

Create `apps/api/internal/handlers/skill_test.go`:

```go
package handlers_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"

	"github.com/google/uuid"
	"github.com/meden/rpgtracker/internal/auth"
	"github.com/meden/rpgtracker/internal/handlers"
	"github.com/meden/rpgtracker/internal/skills"
)

// stubSkillStore implements SkillStore for tests.
type stubSkillStore struct {
	created *skills.Skill
	err     error
}

func (s *stubSkillStore) CreateSkill(_ context.Context, userID uuid.UUID, name, description, unit string, presetID *uuid.UUID) (*skills.Skill, error) {
	if s.err != nil {
		return nil, s.err
	}
	return s.created, nil
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
```

- [ ] **Step 3: Run tests**

```bash
cd apps/api && go test ./internal/handlers/...
```

Expected: PASS (some other handler tests may still fail — fix in next tasks)

---

### Task 5: Update preset, account, and api_key handlers to return JSON

**Files:**
- Modify: `apps/api/internal/handlers/preset.go`
- Modify: `apps/api/internal/handlers/account.go`
- Modify: `apps/api/internal/handlers/api_key.go`

- [ ] **Step 1: Add ListPresets to the skills repository**

The existing `preset_repository.go` has `ListCategoriesWithPresets`. Add a flat `ListPresets` function that the new JSON handler can use:

Add to `apps/api/internal/skills/preset_repository.go`:

```go
// ListPresets returns all presets, optionally filtered by category slug and/or search query.
func ListPresets(ctx context.Context, db *pgxpool.Pool, category, query string) ([]Preset, error) {
	sql := `SELECT p.id, p.name, p.description, p.unit, p.category_id,
	               c.name AS category_name, c.slug AS category_slug
	        FROM preset_skills p
	        JOIN preset_categories c ON c.id = p.category_id
	        WHERE ($1 = '' OR c.slug = $1)
	          AND ($2 = '' OR p.name ILIKE '%' || $2 || '%')
	        ORDER BY c.name, p.name`
	rows, err := db.Query(ctx, sql, category, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var presets []Preset
	for rows.Next() {
		var p Preset
		if err := rows.Scan(&p.ID, &p.Name, &p.Description, &p.Unit,
			&p.CategoryID, &p.CategoryName, &p.CategorySlug); err != nil {
			return nil, err
		}
		presets = append(presets, p)
	}
	return presets, rows.Err()
}
```

Also ensure `Preset` struct has `CategoryName` and `CategorySlug` fields (add if missing):

```go
type Preset struct {
	ID           uuid.UUID `json:"id"`
	Name         string    `json:"name"`
	Description  string    `json:"description"`
	Unit         string    `json:"unit"`
	CategoryID   uuid.UUID `json:"category_id"`
	CategoryName string    `json:"category_name"`
	CategorySlug string    `json:"category_slug"`
}
```

- [ ] **Step 2: Update preset handler with JSON responses**

In `apps/api/internal/handlers/preset.go`, replace all Templ rendering with JSON responses. The preset browse handler becomes a search/filter API endpoint:

```go
// HandleGetPresets handles GET /api/v1/presets
// Query params: ?category=<slug>&q=<search>
// Returns JSON array of presets.
func (h *PresetHandler) HandleGetPresets(w http.ResponseWriter, r *http.Request) {
	category := r.URL.Query().Get("category")
	query := r.URL.Query().Get("q")

	presets, err := h.store.ListPresets(r.Context(), category, query)
	if err != nil {
		api.RespondError(w, http.StatusInternalServerError, "failed to list presets")
		return
	}
	api.RespondJSON(w, http.StatusOK, presets)
}

// HandleGetPreset handles GET /api/v1/presets/{id}
// Returns a single preset as JSON.
func (h *PresetHandler) HandleGetPreset(w http.ResponseWriter, r *http.Request) {
	rawID := chi.URLParam(r, "id")
	id, err := uuid.Parse(rawID)
	if err != nil {
		api.RespondError(w, http.StatusBadRequest, "invalid preset id")
		return
	}
	preset, err := h.store.GetPreset(r.Context(), id)
	if err != nil {
		api.RespondError(w, http.StatusNotFound, "preset not found")
		return
	}
	api.RespondJSON(w, http.StatusOK, preset)
}
```

Remove all `templates.RenderPage`, `templates.Render`, and `pages.*` references from the file.

- [ ] **Step 3: Update account handler**

In `apps/api/internal/handlers/account.go`, remove Templ imports and the `http.Redirect` call. Replace all renders:
- `HandleGetAccount` → `api.RespondJSON(w, http.StatusOK, accountData)`
- `HandlePostAccount` (now serves `PUT /account`) → remove the `http.Redirect` at the end; replace with `api.RespondJSON(w, http.StatusOK, map[string]string{"status": "updated"})`

- [ ] **Step 4: Update api_key handler**

In `apps/api/internal/handlers/api_key.go`, remove Templ imports:
- `HandleGetAPIKey` → return `{"has_key": true/false}` — never return the key itself
- `HandlePostAPIKey` → return `{"status": "saved"}` on success
- `HandleDeleteAPIKey` → return `{"status": "deleted"}` on success

- [ ] **Step 5: Verify full Go build succeeds**

```bash
cd apps/api && go build ./...
```

Expected: no errors

- [ ] **Step 6: Run all Go tests**

```bash
cd apps/api && go test ./...
```

Expected: all existing tests pass (xpcurve, crypto, auth middleware)

- [ ] **Step 7: Update server.go to use /api/v1/ prefix and remove page routes**

In `apps/api/internal/server/server.go`:
- Remove all page route handlers (`GET /`, `/login`, `/register`, `/dashboard`, `/nutri`)
- Remove `internal/templates` imports
- Remove HTMX panic recovery template rendering (replace with plain JSON 500)
- Update all protected routes to `/api/v1/` prefix
- Keep auth middleware (`sessionMiddleware`)

New route structure in server.go:
```go
// Public
r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
    api.RespondJSON(w, http.StatusOK, map[string]string{"status": "ok"})
})

// Protected API routes
r.Route("/api/v1", func(r chi.Router) {
    r.Use(sessionMiddleware)

    presetHandler := handlers.NewPresetHandler(db)
    r.Get("/presets", presetHandler.HandleGetPresets)
    r.Get("/presets/{id}", presetHandler.HandleGetPreset)

    skillHandler := handlers.NewSkillHandler(db)
    r.Post("/skills", skillHandler.HandlePostSkill)

    userHandler := handlers.NewUserHandler(db)
    r.Get("/account", userHandler.HandleGetAccount)
    r.Put("/account", userHandler.HandlePostAccount)

    keyHandler := handlers.NewKeyHandler(db, []byte(cfg.MasterKey))
    r.Get("/account/api-key", keyHandler.HandleGetAPIKey)
    r.Put("/account/api-key", keyHandler.HandlePostAPIKey)
    r.Delete("/account/api-key", keyHandler.HandleDeleteAPIKey)
})
```

- [ ] **Step 8: Final Go build and test**

```bash
cd apps/api && go build ./... && go test ./...
```

Expected: clean build, all tests pass

- [ ] **Step 9: Commit**

```bash
cd /home/meden/GolandProjects/RpgTracker
git add apps/api/
git commit -m "feat: migrate Go backend to apps/api/ with JSON API endpoints"
```

---

## Chunk 3: packages/ui — Design Tokens + ThemeProvider

### Task 6: Create design token CSS files

**Files:**
- Create: `packages/ui/package.json`
- Create: `packages/ui/tokens/base.css`
- Create: `packages/ui/tokens/rpg-game.css`
- Create: `packages/ui/tokens/rpg-clean.css`
- Create: `packages/ui/tokens/nutri-saas.css`
- Create: `packages/ui/tokens/mental-calm.css`

- [ ] **Step 1: Create packages/ui/package.json**

```bash
mkdir -p packages/ui/src packages/ui/tokens packages/ui/src/__tests__
```

```json
{
  "name": "@rpgtracker/ui",
  "version": "0.0.1",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "exports": {
    ".": "./src/index.ts",
    "./tokens/*": "./tokens/*"
  },
  "devDependencies": {
    "@rpgtracker/tsconfig": "workspace:*",
    "@testing-library/react": "^16.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "@testing-library/user-event": "^14.0.0",
    "@types/react": "^18.0.0",
    "vitest": "^2.0.0",
    "@vitejs/plugin-react": "^4.0.0",
    "jsdom": "^25.0.0"
  },
  "peerDependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  }
}
```

- [ ] **Step 2: Create base.css (shared across all apps)**

```css
/* packages/ui/tokens/base.css */
/* Spacing, radii, and typographic scale — never overridden per-app */
:root {
  /* Spacing scale (4px base grid) */
  --space-1: 0.25rem;   /* 4px */
  --space-2: 0.5rem;    /* 8px */
  --space-3: 0.75rem;   /* 12px */
  --space-4: 1rem;      /* 16px */
  --space-6: 1.5rem;    /* 24px */
  --space-8: 2rem;      /* 32px */
  --space-12: 3rem;     /* 48px */
  --space-16: 4rem;     /* 64px */

  /* Border radius */
  --radius-sm: 0.25rem;
  --radius-md: 0.5rem;
  --radius-lg: 1rem;
  --radius-full: 9999px;

  /* Typography scale */
  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.125rem;
  --text-xl: 1.25rem;
  --text-2xl: 1.5rem;
  --text-3xl: 1.875rem;
  --text-4xl: 2.25rem;

  /* Min tap target size (D-006) */
  --tap-target-min: 2.75rem; /* 44px */

  /* Animation */
  --duration-fast: 150ms;
  --duration-normal: 300ms;
  --duration-slow: 500ms;
  --ease-out: cubic-bezier(0, 0, 0.2, 1);
  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
}
```

- [ ] **Step 3: Create rpg-game.css**

```css
/* packages/ui/tokens/rpg-game.css */
/* Dark, dramatic, gold accents — cinematic RPG experience */
:root[data-theme="rpg-game"] {
  /* Backgrounds */
  --color-bg: #0a0a0f;
  --color-bg-surface: #12121c;
  --color-bg-elevated: #1a1a2e;
  --color-bg-overlay: rgba(10, 10, 15, 0.9);

  /* Text */
  --color-text-primary: #f0e6d3;
  --color-text-secondary: #a89880;
  --color-text-muted: #6b5e4e;
  --color-text-inverse: #0a0a0f;

  /* Accent — gold */
  --color-accent: #d4a853;
  --color-accent-hover: #e8bb66;
  --color-accent-muted: rgba(212, 168, 83, 0.15);

  /* Border */
  --color-border: rgba(212, 168, 83, 0.2);
  --color-border-strong: rgba(212, 168, 83, 0.5);

  /* Semantic */
  --color-success: #4ade80;
  --color-warning: #facc15;
  --color-error: #f87171;
  --color-info: #60a5fa;

  /* Typography */
  --font-display: 'Cinzel', 'Georgia', serif;
  --font-body: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;

  /* XP bar */
  --color-xp-fill: linear-gradient(90deg, #b8860b, #d4a853, #f0c060);
  --color-xp-bg: rgba(212, 168, 83, 0.1);

  /* Animation budget — full */
  --motion-scale: 1;
}
```

- [ ] **Step 4: Create rpg-clean.css**

```css
/* packages/ui/tokens/rpg-clean.css */
/* Same structure as rpg-game, neutral palette, minimal animation */
:root[data-theme="rpg-clean"] {
  --color-bg: #111827;
  --color-bg-surface: #1f2937;
  --color-bg-elevated: #374151;
  --color-bg-overlay: rgba(17, 24, 39, 0.9);

  --color-text-primary: #f9fafb;
  --color-text-secondary: #9ca3af;
  --color-text-muted: #6b7280;
  --color-text-inverse: #111827;

  --color-accent: #6366f1;
  --color-accent-hover: #818cf8;
  --color-accent-muted: rgba(99, 102, 241, 0.15);

  --color-border: rgba(75, 85, 99, 0.5);
  --color-border-strong: rgba(107, 114, 128, 0.8);

  --color-success: #4ade80;
  --color-warning: #facc15;
  --color-error: #f87171;
  --color-info: #60a5fa;

  --font-display: 'Inter', system-ui, sans-serif;
  --font-body: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;

  --color-xp-fill: linear-gradient(90deg, #4f46e5, #6366f1);
  --color-xp-bg: rgba(99, 102, 241, 0.1);

  /* Animation budget — minimal */
  --motion-scale: 0;
}
```

- [ ] **Step 5: Create nutri-saas.css**

```css
/* packages/ui/tokens/nutri-saas.css */
/* Light, professional, clinical greens */
:root[data-theme="nutri-saas"] {
  --color-bg: #f8fafc;
  --color-bg-surface: #ffffff;
  --color-bg-elevated: #f1f5f9;
  --color-bg-overlay: rgba(248, 250, 252, 0.95);

  --color-text-primary: #0f172a;
  --color-text-secondary: #475569;
  --color-text-muted: #94a3b8;
  --color-text-inverse: #f8fafc;

  --color-accent: #059669;
  --color-accent-hover: #047857;
  --color-accent-muted: rgba(5, 150, 105, 0.1);

  --color-border: #e2e8f0;
  --color-border-strong: #cbd5e1;

  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-error: #ef4444;
  --color-info: #3b82f6;

  --font-display: 'Inter', system-ui, sans-serif;
  --font-body: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;

  --color-xp-fill: linear-gradient(90deg, #047857, #059669);
  --color-xp-bg: rgba(5, 150, 105, 0.08);

  --motion-scale: 1;
}
```

- [ ] **Step 6: Create mental-calm.css**

```css
/* packages/ui/tokens/mental-calm.css */
/* Soft neutrals, muted palette, low contrast — provisional scaffold */
:root[data-theme="mental-calm"] {
  --color-bg: #faf9f7;
  --color-bg-surface: #ffffff;
  --color-bg-elevated: #f5f3ef;
  --color-bg-overlay: rgba(250, 249, 247, 0.95);

  --color-text-primary: #2d2926;
  --color-text-secondary: #6b6560;
  --color-text-muted: #a09890;
  --color-text-inverse: #faf9f7;

  --color-accent: #7c6f64;
  --color-accent-hover: #6b5e54;
  --color-accent-muted: rgba(124, 111, 100, 0.1);

  --color-border: #e8e4df;
  --color-border-strong: #d5cfc8;

  --color-success: #6a9e7f;
  --color-warning: #c9976a;
  --color-error: #c27070;
  --color-info: #6a8fa9;

  --font-display: 'Inter', system-ui, sans-serif;
  --font-body: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;

  --color-xp-fill: linear-gradient(90deg, #6b7e74, #7c9186);
  --color-xp-bg: rgba(124, 111, 100, 0.08);

  --motion-scale: 1;
}
```

- [ ] **Step 7: Commit token files**

```bash
git add packages/ui/
git commit -m "feat: add packages/ui design token CSS files (5 themes)"
```

---

### Task 7: ThemeProvider component + tests

**Files:**
- Create: `packages/ui/src/ThemeProvider.tsx`
- Create: `packages/ui/src/index.ts`
- Create: `packages/ui/src/__tests__/ThemeProvider.test.tsx`
- Create: `packages/ui/vitest.config.ts`

- [ ] **Step 1: Create vitest config**

```typescript
// packages/ui/vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
  },
})
```

Create `packages/ui/src/__tests__/setup.ts`:

```typescript
import '@testing-library/jest-dom'
```

- [ ] **Step 2: Write the failing test first**

```typescript
// packages/ui/src/__tests__/ThemeProvider.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { ThemeProvider } from '../ThemeProvider'

describe('ThemeProvider', () => {
  beforeEach(() => {
    // Reset data-theme attribute between tests
    document.documentElement.removeAttribute('data-theme')
  })

  it('applies the given theme as data-theme on <html>', () => {
    render(
      <ThemeProvider theme="rpg-game">
        <div>content</div>
      </ThemeProvider>
    )
    expect(document.documentElement.getAttribute('data-theme')).toBe('rpg-game')
  })

  it('renders children', () => {
    render(
      <ThemeProvider theme="nutri-saas">
        <p>hello</p>
      </ThemeProvider>
    )
    expect(screen.getByText('hello')).toBeInTheDocument()
  })

  it('updates data-theme when theme prop changes', () => {
    const { rerender } = render(
      <ThemeProvider theme="rpg-game"><div /></ThemeProvider>
    )
    expect(document.documentElement.getAttribute('data-theme')).toBe('rpg-game')

    rerender(<ThemeProvider theme="rpg-clean"><div /></ThemeProvider>)
    expect(document.documentElement.getAttribute('data-theme')).toBe('rpg-clean')
  })
})
```

- [ ] **Step 3: Run test to confirm it fails**

```bash
cd packages/ui && pnpm install && pnpm exec vitest run
```

Expected: FAIL — `ThemeProvider` not found

- [ ] **Step 4: Implement ThemeProvider**

```typescript
// packages/ui/src/ThemeProvider.tsx
'use client'

import { useEffect, type ReactNode } from 'react'

export type Theme =
  | 'rpg-game'
  | 'rpg-clean'
  | 'nutri-saas'
  | 'mental-calm'

interface ThemeProviderProps {
  theme: Theme
  children: ReactNode
}

/**
 * Applies `data-theme="<theme>"` to the `<html>` element.
 * Must be rendered in a Client Component so useEffect runs in the browser.
 * In SSR (Next.js), the initial theme class is applied by middleware via cookie
 * before this component hydrates — no flash of wrong theme.
 */
export function ThemeProvider({ theme, children }: ThemeProviderProps) {
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  return <>{children}</>
}
```

- [ ] **Step 5: Create index.ts exports**

```typescript
// packages/ui/src/index.ts
export { ThemeProvider } from './ThemeProvider'
export type { Theme } from './ThemeProvider'
```

- [ ] **Step 6: Run test to confirm it passes**

```bash
cd packages/ui && pnpm exec vitest run
```

Expected: PASS (3 tests)

- [ ] **Step 7: Commit**

```bash
cd /home/meden/GolandProjects/RpgTracker
git add packages/ui/src/
git commit -m "feat: add ThemeProvider component with tests"
```

---

## Chunk 4: packages/auth

### Task 8: Supabase client + session hooks

**Files:**
- Create: `packages/auth/package.json`
- Create: `packages/auth/src/client.ts`
- Create: `packages/auth/src/server.ts`
- Create: `packages/auth/src/hooks.ts`
- Create: `packages/auth/src/middleware.ts`
- Create: `packages/auth/src/index.ts`
- Create: `packages/auth/src/__tests__/hooks.test.tsx`
- Create: `packages/auth/vitest.config.ts`

- [ ] **Step 1: Create directory structure and package.json**

```bash
mkdir -p packages/auth/src/__tests__
```

```json
{
  "name": "@rpgtracker/auth",
  "version": "0.0.1",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "@rpgtracker/tsconfig": "workspace:*",
    "@testing-library/react": "^16.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "@types/react": "^18.0.0",
    "vitest": "^2.0.0",
    "@vitejs/plugin-react": "^4.0.0",
    "jsdom": "^25.0.0"
  },
  "dependencies": {
    "@rpgtracker/ui": "workspace:*",
    "@supabase/ssr": "^0.5.0",
    "@supabase/supabase-js": "^2.0.0"
  },
  "peerDependencies": {
    "react": "^18.0.0"
  }
}
```

- [ ] **Step 1a: Create vitest config for packages/auth**

```typescript
// packages/auth/vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
  },
})
```

Create `packages/auth/src/__tests__/setup.ts`:

```typescript
import '@testing-library/jest-dom'
```

- [ ] **Step 2: Write failing hook test**

```typescript
// packages/auth/src/__tests__/hooks.test.tsx
import { renderHook } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { useSession } from '../hooks'

// Mock Supabase client
vi.mock('../client', () => ({
  createBrowserClient: vi.fn(() => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { user: { id: 'user-123', email: 'test@example.com' } } },
        error: null,
      }),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
  })),
}))

describe('useSession', () => {
  it('returns null session initially then resolves to user', async () => {
    const { result } = renderHook(() => useSession())
    // Initially loading
    expect(result.current.loading).toBe(true)
  })
})
```

- [ ] **Step 3: Run test to confirm it fails**

```bash
cd packages/auth && pnpm install && pnpm exec vitest run
```

Expected: FAIL — module not found

- [ ] **Step 4: Create Supabase browser client**

```typescript
// packages/auth/src/client.ts
import { createBrowserClient as _createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

let client: ReturnType<typeof _createBrowserClient> | null = null

/** Singleton Supabase browser client. Call from Client Components only. */
export function createBrowserClient() {
  if (!client) {
    client = _createBrowserClient(supabaseUrl, supabaseAnonKey)
  }
  return client
}
```

- [ ] **Step 5: Create Supabase server client (for Route Handlers)**

```typescript
// packages/auth/src/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/** Supabase server client for use in Route Handlers and Server Components.
 *  Note: `cookies()` is synchronous in Next.js 14; `await cookies()` is Next.js 15+ only. */
export async function createSupabaseServerClient() {
  const cookieStore = cookies()  // synchronous in Next.js 14

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    }
  )
}
```

- [ ] **Step 6: Create useSession and useSubscription hooks**

```typescript
// packages/auth/src/hooks.ts
'use client'

import { useEffect, useState } from 'react'
import { type Session, type User } from '@supabase/supabase-js'
import { createBrowserClient } from './client'

export interface SessionState {
  session: Session | null
  user: User | null
  loading: boolean
}

/** Returns the current Supabase session and user. Subscribes to auth state changes. */
export function useSession(): SessionState {
  const [state, setState] = useState<SessionState>({
    session: null,
    user: null,
    loading: true,
  })

  useEffect(() => {
    const supabase = createBrowserClient()

    supabase.auth.getSession().then(({ data: { session } }) => {
      setState({ session, user: session?.user ?? null, loading: false })
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setState({ session, user: session?.user ?? null, loading: false })
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return state
}

export type SubscriptionTier = 'free' | 'per-app' | 'bundle' | 'ai-addon' | 'power-user'

export interface SubscriptionState {
  tier: SubscriptionTier
  apps: string[]
  hasAI: boolean
  loading: boolean
}

/**
 * Returns the user's subscription state.
 * In this scaffold, returns a free-tier default.
 * Wired to the API in the LifeQuest port phase.
 */
export function useSubscription(): SubscriptionState {
  return { tier: 'free', apps: [], hasAI: false, loading: false }
}
```

- [ ] **Step 7: Create Next.js middleware**

```typescript
// packages/auth/src/middleware.ts
import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'
import { type Theme } from '@rpgtracker/ui'

interface MiddlewareOptions {
  /** Routes that are public (no auth redirect). Default: /login, /register */
  publicRoutes?: string[]
  /** Default theme for unauthenticated users */
  defaultTheme: Theme
}

/**
 * Creates a Next.js middleware function that:
 * 1. Validates Supabase session and redirects unauthenticated users to /login
 * 2. Reads theme preference from cookie and sets it on the response
 */
export function createAuthMiddleware(options: MiddlewareOptions) {
  const publicRoutes = options.publicRoutes ?? ['/login', '/register']

  return async function middleware(request: NextRequest) {
    const response = NextResponse.next({ request })

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return request.cookies.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options)
            })
          },
        },
      }
    )

    const { data: { session } } = await supabase.auth.getSession()

    const pathname = request.nextUrl.pathname
    const isPublic = publicRoutes.some(r => pathname.startsWith(r))

    // Redirect unauthenticated users away from protected routes
    if (!session && !isPublic) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Redirect authenticated users away from auth pages
    if (session && isPublic) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    // Apply theme: if no theme cookie yet, set it so SSR layout can read it without a DB call
    const themeCookie = request.cookies.get('rpgt-theme')?.value as Theme | undefined
    if (!themeCookie) {
      response.cookies.set('rpgt-theme', options.defaultTheme, {
        httpOnly: false,  // must be readable by JS for client-side ThemeProvider sync
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 365,  // 1 year
      })
    }

    return response
  }
}
```

- [ ] **Step 8: Create index.ts**

```typescript
// packages/auth/src/index.ts
export { createBrowserClient } from './client'
export { createSupabaseServerClient } from './server'
export { createAuthMiddleware } from './middleware'
export { useSession, useSubscription } from './hooks'
export type { SessionState, SubscriptionState, SubscriptionTier } from './hooks'
```

- [ ] **Step 9: Run tests**

```bash
cd packages/auth && pnpm exec vitest run
```

Expected: PASS

- [ ] **Step 10: Commit**

```bash
cd /home/meden/GolandProjects/RpgTracker
git add packages/auth/
git commit -m "feat: add packages/auth with Supabase client, session hooks, and middleware"
```

---

## Chunk 5: packages/api-client

### Task 9: Typed API client

**Files:**
- Create: `packages/api-client/package.json`
- Create: `packages/api-client/src/types.ts`
- Create: `packages/api-client/src/client.ts`
- Create: `packages/api-client/src/index.ts`
- Create: `packages/api-client/src/__tests__/client.test.ts`

- [ ] **Step 1: Create package.json**

```bash
mkdir -p packages/api-client/src/__tests__
```

```json
{
  "name": "@rpgtracker/api-client",
  "version": "0.0.1",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "@rpgtracker/tsconfig": "workspace:*",
    "vitest": "^2.0.0"
  }
}
```

- [ ] **Step 2: Create shared API types**

```typescript
// packages/api-client/src/types.ts

export interface Skill {
  id: string
  user_id: string
  name: string
  description: string
  unit: string
  preset_id: string | null
  current_xp: number
  current_level: number
  created_at: string
}

export interface Preset {
  id: string
  name: string
  description: string
  unit: string
  category_id: string
  category_name: string
  category_slug: string
}

export interface Account {
  id: string
  email: string
  display_name: string | null
}

export interface APIKeyStatus {
  has_key: boolean
}

export interface APIError {
  error: string
}
```

- [ ] **Step 3: Write failing test**

```typescript
// packages/api-client/src/__tests__/client.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createSkill, getPresets } from '../client'

const mockFetch = vi.fn()
global.fetch = mockFetch

beforeEach(() => {
  mockFetch.mockReset()
})

describe('createSkill', () => {
  it('POST to /api/skills with correct body and returns skill', async () => {
    const skill = { id: 'abc', name: 'Piano', unit: 'session', current_xp: 0, current_level: 1 }
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => skill,
    })

    const result = await createSkill({ name: 'Piano', unit: 'session' })

    expect(mockFetch).toHaveBeenCalledWith('/api/skills', expect.objectContaining({
      method: 'POST',
    }))
    expect(result).toEqual(skill)
  })

  it('throws on API error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'unauthorized' }),
    })

    await expect(createSkill({ name: 'Piano', unit: 'session' })).rejects.toThrow('unauthorized')
  })
})

describe('getPresets', () => {
  it('GET /api/presets and returns array', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [{ id: '1', name: 'Piano' }],
    })

    const result = await getPresets({})
    expect(result).toHaveLength(1)
  })
})
```

- [ ] **Step 4: Run test to confirm it fails**

```bash
cd packages/api-client && pnpm install && pnpm exec vitest run
```

Expected: FAIL — functions not found

- [ ] **Step 5: Implement client**

```typescript
// packages/api-client/src/client.ts
import type { Skill, Preset, Account, APIKeyStatus, APIError } from './types'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error((data as APIError).error ?? 'request failed')
  }
  return data as T
}

// Skills
export function createSkill(body: { name: string; description?: string; unit: string; preset_id?: string }): Promise<Skill> {
  // Filter undefined values — URLSearchParams would stringify them as the literal string "undefined"
  const entries = Object.entries(body).filter(([, v]) => v !== undefined) as [string, string][]
  const form = new URLSearchParams(entries)
  return request<Skill>('/api/skills', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  })
}

// Presets
export function getPresets(params: { category?: string; q?: string }): Promise<Preset[]> {
  const qs = new URLSearchParams(params as Record<string, string>).toString()
  return request<Preset[]>(`/api/presets${qs ? `?${qs}` : ''}`)
}

// Account
export function getAccount(): Promise<Account> {
  return request<Account>('/api/account')
}

// API Key
export function getAPIKeyStatus(): Promise<APIKeyStatus> {
  return request<APIKeyStatus>('/api/account/api-key')
}

export function saveAPIKey(key: string): Promise<void> {
  return request('/api/account/api-key', {
    method: 'PUT',
    body: JSON.stringify({ api_key: key }),
  })
}

export function deleteAPIKey(): Promise<void> {
  return request('/api/account/api-key', { method: 'DELETE' })
}
```

- [ ] **Step 6: Create index.ts**

```typescript
// packages/api-client/src/index.ts
export * from './types'
export * from './client'
```

- [ ] **Step 7: Run test to confirm it passes**

```bash
cd packages/api-client && pnpm exec vitest run
```

Expected: PASS

- [ ] **Step 8: Commit**

```bash
cd /home/meden/GolandProjects/RpgTracker
git add packages/api-client/
git commit -m "feat: add packages/api-client with typed API functions and tests"
```

---

## Chunk 6: Next.js App Scaffolds

### Task 10: Scaffold apps/rpg-tracker

**Files:**
- Create: `apps/rpg-tracker/package.json`
- Create: `apps/rpg-tracker/next.config.ts`
- Create: `apps/rpg-tracker/tsconfig.json`
- Create: `apps/rpg-tracker/middleware.ts`
- Create: `apps/rpg-tracker/app/layout.tsx`
- Create: `apps/rpg-tracker/app/page.tsx`
- Create: `apps/rpg-tracker/app/(auth)/login/page.tsx`
- Create: `apps/rpg-tracker/app/(auth)/register/page.tsx`
- Create: `apps/rpg-tracker/app/(app)/layout.tsx`
- Create: `apps/rpg-tracker/app/(app)/dashboard/page.tsx`
- Create: `apps/rpg-tracker/app/api/[...path]/route.ts`
- Create: `apps/rpg-tracker/vitest.config.ts`
- Create: `apps/rpg-tracker/app/__tests__/login.test.tsx`
- Create: `apps/rpg-tracker/app/__tests__/dashboard.test.tsx`

- [ ] **Step 1: Create Next.js app with pnpm**

```bash
cd /home/meden/GolandProjects/RpgTracker
pnpm create next-app apps/rpg-tracker --typescript --tailwind --app --no-eslint --no-src-dir --import-alias "@/*" --yes
```

- [ ] **Step 2: Update package.json to use workspace packages**

Add to `apps/rpg-tracker/package.json` dependencies:

```json
{
  "dependencies": {
    "@rpgtracker/ui": "workspace:*",
    "@rpgtracker/auth": "workspace:*",
    "@rpgtracker/api-client": "workspace:*"
  },
  "devDependencies": {
    "@rpgtracker/tsconfig": "workspace:*",
    "@testing-library/react": "^16.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "vitest": "^2.0.0",
    "@vitejs/plugin-react": "^4.0.0",
    "jsdom": "^25.0.0"
  }
}
```

- [ ] **Step 3: Install deps**

```bash
cd /home/meden/GolandProjects/RpgTracker && pnpm install
```

- [ ] **Step 4: Create vitest.config.ts**

```typescript
// apps/rpg-tracker/vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
})
```

Create `apps/rpg-tracker/vitest.setup.ts`:

```typescript
import '@testing-library/jest-dom'
```

- [ ] **Step 5: Add environment variables file**

```bash
cat > apps/rpg-tracker/.env.local << 'EOF'
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
GO_API_URL=http://localhost:8080
EOF
```

- [ ] **Step 6: Write failing login page test**

```typescript
// apps/rpg-tracker/app/__tests__/login.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import LoginPage from '../(auth)/login/page'

describe('Login page', () => {
  it('renders email and password fields', () => {
    render(<LoginPage />)
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('renders link to register page', () => {
    render(<LoginPage />)
    expect(screen.getByRole('link', { name: /create account/i })).toHaveAttribute('href', '/register')
  })
})
```

- [ ] **Step 7: Run test to confirm it fails**

```bash
cd apps/rpg-tracker && pnpm exec vitest run
```

Expected: FAIL — LoginPage not found

- [ ] **Step 8: Create root layout**

```typescript
// apps/rpg-tracker/app/layout.tsx
import type { Metadata } from 'next'
import { ThemeProvider } from '@rpgtracker/ui'
import { cookies } from 'next/headers'
import type { Theme } from '@rpgtracker/ui'
import '../tokens.css'

export const metadata: Metadata = {
  title: 'LifeQuest',
  description: 'Gamified skill progression',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const theme = (cookieStore.get('rpgt-theme')?.value ?? 'rpg-game') as Theme

  return (
    <html lang="en" data-theme={theme} suppressHydrationWarning>
      <body>
        <ThemeProvider theme={theme}>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
```

Create `apps/rpg-tracker/tokens.css` (imports shared tokens):

```css
@import '@rpgtracker/ui/tokens/base.css';
@import '@rpgtracker/ui/tokens/rpg-game.css';
@import '@rpgtracker/ui/tokens/rpg-clean.css';
@import "tailwindcss";
```

- [ ] **Step 9: Create root page (redirect)**

```typescript
// apps/rpg-tracker/app/page.tsx
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@rpgtracker/auth'

export default async function RootPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  redirect(session ? '/dashboard' : '/login')
}
```

- [ ] **Step 10: Create login page**

```typescript
// apps/rpg-tracker/app/(auth)/login/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@rpgtracker/auth'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createBrowserClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <main>
      <form onSubmit={handleSubmit}>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />

        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />

        {error && <p role="alert">{error}</p>}

        <button type="submit" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <Link href="/register">Create account</Link>
    </main>
  )
}
```

- [ ] **Step 11: Create register page**

```typescript
// apps/rpg-tracker/app/(auth)/register/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@rpgtracker/auth'

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createBrowserClient()
    const { error } = await supabase.auth.signUp({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <main>
      <form onSubmit={handleSubmit}>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />

        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />

        {error && <p role="alert">{error}</p>}

        <button type="submit" disabled={loading}>
          {loading ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <Link href="/login">Already have an account? Sign in</Link>
    </main>
  )
}
```

- [ ] **Step 12: Create authenticated layout**

```typescript
// apps/rpg-tracker/app/(app)/layout.tsx
import { createSupabaseServerClient } from '@rpgtracker/auth'
import { redirect } from 'next/navigation'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) redirect('/login')

  return (
    <div>
      {/* Nav placeholder — implemented in Plan B (LifeQuest React Port) */}
      <main>{children}</main>
    </div>
  )
}
```

- [ ] **Step 13: Write failing dashboard test first (TDD)**

```typescript
// apps/rpg-tracker/app/__tests__/dashboard.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import DashboardPage from '../(app)/dashboard/page'

describe('Dashboard page', () => {
  it('renders the dashboard heading', () => {
    render(<DashboardPage />)
    expect(screen.getByRole('heading', { name: /lifequest dashboard/i })).toBeInTheDocument()
  })
})
```

Run to confirm failure: `pnpm exec vitest run` — Expected: FAIL (module not found)

- [ ] **Step 14: Create dashboard placeholder**

```typescript
// apps/rpg-tracker/app/(app)/dashboard/page.tsx
export default function DashboardPage() {
  return (
    <div>
      <h1>LifeQuest Dashboard</h1>
      <p>Scaffold complete. Features coming in Plan B.</p>
    </div>
  )
}
```

- [ ] **Step 15: Run all rpg-tracker tests**

```bash
cd apps/rpg-tracker && pnpm exec vitest run
```

Expected: PASS (login + dashboard tests)

- [ ] **Step 16: Create middleware**

```typescript
// apps/rpg-tracker/middleware.ts
import { createAuthMiddleware } from '@rpgtracker/auth'
import { type NextRequest } from 'next/server'

const middleware = createAuthMiddleware({ defaultTheme: 'rpg-game' })

export default function (request: NextRequest) {
  return middleware(request)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

- [ ] **Step 17: Create BFF proxy Route Handler**

```typescript
// apps/rpg-tracker/app/api/[...path]/route.ts
import { type NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@rpgtracker/auth'
import { cookies } from 'next/headers'

const GO_API_URL = process.env.GO_API_URL ?? 'http://localhost:8080'

async function proxy(request: NextRequest, path: string): Promise<Response> {
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()

  const url = `${GO_API_URL}/api/v1/${path}${request.nextUrl.search}`
  const isReadRequest = request.method === 'GET' || request.method === 'HEAD'

  const response = await fetch(url, {
    method: request.method,
    headers: {
      'Content-Type': request.headers.get('Content-Type') ?? 'application/json',
      ...(session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : {}),
    },
    body: isReadRequest ? undefined : await request.text(),
  })

  const data = await response.text()
  return new Response(data, {
    status: response.status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params
  return proxy(request, path.join('/'))
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params
  return proxy(request, path.join('/'))
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params
  return proxy(request, path.join('/'))
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params
  return proxy(request, path.join('/'))
}
```

- [ ] **Step 18: Verify rpg-tracker builds**

```bash
cd apps/rpg-tracker && pnpm build 2>&1 | tail -20
```

Expected: build succeeds

- [ ] **Step 19: Commit**

```bash
cd /home/meden/GolandProjects/RpgTracker
git add apps/rpg-tracker/
git commit -m "feat: scaffold apps/rpg-tracker with auth, BFF proxy, and theme"
```

---

### Task 11: Scaffold apps/nutri-log and apps/mental-health

Apply the same scaffold pattern. These are minimal shells — no feature pages.

- [ ] **Step 1: Scaffold nutri-log**

```bash
pnpm create next-app apps/nutri-log --typescript --tailwind --app --no-eslint --no-src-dir --import-alias "@/*" --yes
```

- [ ] **Step 2: Create nutri-log tokens.css**

```css
@import '@rpgtracker/ui/tokens/base.css';
@import '@rpgtracker/ui/tokens/nutri-saas.css';
@import "tailwindcss";
```

- [ ] **Step 3: Update nutri-log middleware with default theme**

```typescript
// apps/nutri-log/middleware.ts
import { createAuthMiddleware } from '@rpgtracker/auth'
const middleware = createAuthMiddleware({ defaultTheme: 'nutri-saas' })
export default middleware
export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] }
```

- [ ] **Step 4: Scaffold mental-health**

```bash
pnpm create next-app apps/mental-health --typescript --tailwind --app --no-eslint --no-src-dir --import-alias "@/*" --yes
```

- [ ] **Step 5: Update mental-health middleware with default theme**

```typescript
// apps/mental-health/middleware.ts
import { createAuthMiddleware } from '@rpgtracker/auth'
const middleware = createAuthMiddleware({ defaultTheme: 'mental-calm' })
export default middleware
export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] }
```

- [ ] **Step 6: Add workspace packages and BFF proxy to both apps**

Repeat Tasks 10 steps 2, 3, and 17 for each app. Both apps get the same BFF proxy Route Handler pointing to the same Go API.

- [ ] **Step 7: Verify both build**

```bash
cd apps/nutri-log && pnpm build && cd ../mental-health && pnpm build
```

Expected: both succeed

- [ ] **Step 8: Commit**

```bash
cd /home/meden/GolandProjects/RpgTracker
git add apps/nutri-log/ apps/mental-health/
git commit -m "feat: scaffold apps/nutri-log and apps/mental-health with auth and theme"
```

---

## Chunk 7: End-to-End Validation

### Task 12: Playwright E2E — auth flow

**Files:**
- Create: `apps/rpg-tracker/e2e/auth.spec.ts`
- Create: `apps/rpg-tracker/playwright.config.ts`

- [ ] **Step 1: Install Playwright**

```bash
cd apps/rpg-tracker && pnpm add -D @playwright/test && pnpm exec playwright install chromium
```

- [ ] **Step 2: Create playwright.config.ts**

```typescript
// apps/rpg-tracker/playwright.config.ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'iPhone 14', use: { ...devices['iPhone 14'] } },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
})
```

- [ ] **Step 3: Write E2E auth spec**

```typescript
// apps/rpg-tracker/e2e/auth.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test('unauthenticated user is redirected to /login', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/)
  })

  test('login page renders sign-in form', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByLabel(/password/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
  })

  test('login page has link to register', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('link', { name: /create account/i })).toBeVisible()
  })

  test('register page renders create account form', async ({ page }) => {
    await page.goto('/register')
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByLabel(/password/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /create account/i })).toBeVisible()
  })
})
```

- [ ] **Step 4: Run E2E tests (requires dev server running)**

Start Go API and Next.js dev server first:

```bash
# Terminal 1
cd apps/api && go run cmd/server/main.go

# Terminal 2
cd apps/rpg-tracker && pnpm dev

# Terminal 3
cd apps/rpg-tracker && pnpm exec playwright test --project=chromium
```

Expected: all 4 tests pass

- [ ] **Step 5: Run full Turborepo test suite**

```bash
cd /home/meden/GolandProjects/RpgTracker
pnpm turbo test
```

Expected: all packages and apps pass

- [ ] **Step 6: Final commit**

```bash
git add apps/rpg-tracker/e2e/ apps/rpg-tracker/playwright.config.ts
git commit -m "feat: add Playwright E2E auth flow tests for rpg-tracker"
```

---

### Task 13: Go API health check smoke test

**Files:**
- Create: `apps/api/internal/server/server_test.go`

- [ ] **Step 1: Add ServeHTTP method to Server struct**

The existing `Server` struct only exposes `Start()`. Add a testable `ServeHTTP` method in `apps/api/internal/server/server.go`:

```go
// ServeHTTP allows Server to be used as an http.Handler in tests.
func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	s.httpServer.Handler.ServeHTTP(w, r)
}
```

- [ ] **Step 2: Write failing server smoke test**

```go
// apps/api/internal/server/server_test.go
package server_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/meden/rpgtracker/internal/config"
	"github.com/meden/rpgtracker/internal/server"
)

func TestHealthEndpoint(t *testing.T) {
	cfg := &config.Config{Port: "8080"}
	s := server.NewServer(cfg, noopMiddleware, nil)

	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	w := httptest.NewRecorder()
	s.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
}

func noopMiddleware(next http.Handler) http.Handler { return next }
```

- [ ] **Step 3: Run test to confirm it fails**

```bash
cd apps/api && go test ./internal/server/...
```

Expected: FAIL — compile error (ServeHTTP not defined yet if Step 1 not done, or test fails logic)

- [ ] **Step 4: Run test to confirm it passes**

```bash
cd apps/api && go test ./internal/server/...
```

Expected: PASS

- [ ] **Step 5: Final Go commit**

```bash
cd /home/meden/GolandProjects/RpgTracker
git add apps/api/internal/server/server_test.go
git commit -m "test: add Go API server smoke test for /health endpoint"
```

---

## Done

**Plan A complete when:**
- [ ] `pnpm turbo test` passes across all packages and apps
- [ ] `cd apps/api && go test ./...` passes
- [ ] `cd apps/rpg-tracker && pnpm exec playwright test` passes all 4 E2E tests
- [ ] All three Next.js apps build cleanly (`pnpm turbo build`)
- [ ] `apps/rpg-tracker` — unauthenticated `/dashboard` redirects to `/login`
- [ ] `apps/rpg-tracker` — login and register pages render correctly
- [ ] Go API `/health` returns 200 JSON
- [ ] Go API `/api/v1/presets` returns JSON (with valid JWT)

**Next:** Plan B (LifeQuest React Port) — port F-001 through F-006, F-008, F-009 to React components with Vitest + Playwright coverage.
