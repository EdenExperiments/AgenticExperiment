# Implementation Plan: Skill Organisation (Phase 3)

**Spec:** `docs/specs/2026-03-22-skill-organisation/spec.md`
**Gateway:** GO (2026-03-23)
**Work Type:** mixed (TDD gate for logic ACs, visual review for UI ACs)
**Feature Tracker:** F-032, F-033

---

## Task Overview

| Task | Owner | ACs Covered | Depends On | Parallel? |
|------|-------|-------------|------------|-----------|
| T1 | tester | AC-L1–L8 (Go tests) + AC-L1–L8 (UI tests) | — | First (TDD gate) |
| T2 | backend | AC-L1–L8 (implementation) | T1 (tests exist) |  |
| T3a | frontend | api-client types + functions | T2 (API contract stable) | With T3b |
| T3b | frontend | AC-V1–V4, AC-V5b (skills list page) | T3a (types) | With T3c |
| T3c | frontend | AC-V5, AC-V7, AC-V8 (skill detail page) | T3a (types) | With T3b |
| T3d | frontend | AC-V6 (skill create page) | T3a (types) | With T3b, T3c |
| T4 | reviewer | Visual review gate | T3a–T3d | Last |

---

## T1 — Tests (tester agent)

**Goal:** Write failing tests for all logic ACs before any implementation.

### T1a — Go tests (`apps/api/`)

Write tests in `apps/api/internal/handlers/` and `apps/api/internal/skills/`:

**AC-L1: Category at creation** — 4 test cases:
- `TestCreateSkill_WithCategoryID` — POST with valid category_id → skill.category_id set
- `TestCreateSkill_PresetInheritsCategory` — POST with preset_id, no category_id → inherits from preset
- `TestCreateSkill_InvalidCategoryID_Malformed` — POST with non-UUID → 422
- `TestCreateSkill_InvalidCategoryID_NotFound` — POST with UUID not in table → 422
- `TestCreateSkill_NoCategoryNoPreset` — POST with neither → category_id NULL

**AC-L2: Category update** — 2 test cases:
- `TestUpdateSkill_SetCategory` — PUT with valid category_id → updated
- `TestUpdateSkill_ClearCategory` — PUT with empty category_id → NULL

**AC-L3: Favourite toggle** — 2 test cases:
- `TestToggleFavourite` — PATCH → is_favourite flipped
- `TestToggleFavourite_Twice` — two PATCHes → returns to original

**AC-L4: Tag management** — 6 test cases:
- `TestSetSkillTags_CreatesAndLinks` — PUT with new tags → tags created and linked
- `TestSetSkillTags_CaseInsensitive` — "Piano" stored as "piano"
- `TestSetSkillTags_Dedup` — "piano,Piano" → single tag
- `TestSetSkillTags_Max5` — 6 tags → 422
- `TestSetSkillTags_Empty` — empty string → all tags removed
- `TestSetSkillTags_UserScoped` — tags are per-user, not shared

**AC-L5: Tag listing** — 2 test cases:
- `TestListTags_WithSkillCount` — returns tags with correct counts
- `TestListTags_UserScoped` — other users' tags not visible

**AC-L6: Category listing** — 1 test case:
- `TestListCategories` — returns 9 categories ordered by sort_order

**AC-L7–L8: Skill enrichment** — 2 test cases:
- `TestListSkills_IncludesCategoryAndTags` — list response has category_name/slug/emoji, is_favourite, tags
- `TestGetSkill_IncludesCategoryAndTags` — detail response same

### T1b — UI tests (`packages/ui/src/__tests__/`)

Write component tests for new filter/search behaviour:

- `SkillsFiltering.test.tsx` — tests for client-side filtering logic:
  - Category filter narrows list (AND)
  - Tag filter narrows list (AND)
  - Favourites filter shows only favourited
  - Search substring match, case-insensitive
  - Combined filters (category + search + favourites) all AND
  - "Clear filters" button resets all
  - Empty state messages for each filter type

**Total: ~23 Go test cases, ~8 UI test cases**

---

## T2 — Backend Implementation (backend agent)

**Goal:** Make T1 tests pass. All changes in `apps/api/`.

### T2a — Migration

File: `apps/api/db/migrations/000009_skill_organisation.up.sql` (and `.down.sql`)

Per spec schema section. Include `idx_skill_tags_tag_id` per arch-review recommendation.

### T2b — Skill struct extension

File: `apps/api/internal/skills/skill_repository.go`

Add to `Skill` struct:
```go
CategoryID    *uuid.UUID `json:"category_id"`
CategoryName  *string    `json:"category_name"`
CategorySlug  *string    `json:"category_slug"`
CategoryEmoji *string    `json:"category_emoji"`
IsFavourite   bool       `json:"is_favourite"`
Tags          []Tag      `json:"tags"`
```

New `Tag` type:
```go
type Tag struct {
    ID   uuid.UUID `json:"id"`
    Name string    `json:"name"`
}
```

New `TagWithCount` type:
```go
type TagWithCount struct {
    Tag
    SkillCount int `json:"skill_count"`
}
```

New `Category` type:
```go
type Category struct {
    ID        uuid.UUID `json:"id"`
    Name      string    `json:"name"`
    Slug      string    `json:"slug"`
    Emoji     string    `json:"emoji"`
    SortOrder int       `json:"sort_order"`
}
```

### T2c — Repository functions

New/modified functions in `apps/api/internal/skills/`:

- `CreateSkill` — extend signature with `categoryID *uuid.UUID`; if nil and presetID non-nil, look up `skill_presets.category_id`
- `UpdateSkill` — extend signature with `categoryID *uuid.UUID`; update SQL to SET category_id
- `ListSkills` — LEFT JOIN `skill_categories` for category fields; subquery for tags; include `is_favourite`; initialise `Tags` to `[]Tag{}` not nil
- `GetSkill` — same enrichment as ListSkills
- `ToggleFavourite(ctx, db, userID, skillID) (bool, error)` — UPDATE ... SET is_favourite = NOT is_favourite RETURNING is_favourite
- `SetSkillTags(ctx, db, userID, skillID, tagNames []string) ([]Tag, error)` — in one transaction: normalise names (lowercase+trim), upsert tags, DELETE old skill_tags, INSERT new skill_tags. Enforce max 5.
- `ListTags(ctx, db, userID) ([]TagWithCount, error)` — SELECT with LEFT JOIN skill_tags GROUP BY tag_id
- `ListCategories(ctx, db) ([]Category, error)` — SELECT from skill_categories ORDER BY sort_order
- `ValidateCategoryID(ctx, db, categoryID uuid.UUID) error` — SELECT EXISTS

### T2d — Handlers + routes

Extend `SkillStore` interface in `apps/api/internal/handlers/skill.go`:
```go
ToggleFavourite(ctx context.Context, userID, skillID uuid.UUID) (bool, error)
SetSkillTags(ctx context.Context, userID, skillID uuid.UUID, tagNames []string) ([]skills.Tag, error)
ListTags(ctx context.Context, userID uuid.UUID) ([]skills.TagWithCount, error)
ListCategories(ctx context.Context) ([]skills.Category, error)
ValidateCategoryID(ctx context.Context, categoryID uuid.UUID) error
```

**Critical: `UpdateSkill` signature change is atomic.** Update function, interface, wrapper, handler, and test mocks in one pass. (arch-review note)

New handlers:
- `HandlePatchFavourite` — PATCH /api/v1/skills/{id}/favourite
- `HandleGetTags` — GET /api/v1/tags
- `HandlePutSkillTags` — PUT /api/v1/skills/{id}/tags
- `HandleGetCategories` — GET /api/v1/categories

Register routes in `apps/api/internal/server/server.go`.

### T2e — Update existing handler tests

Update `stubSkillStore` in `apps/api/internal/handlers/skill_test.go`:
- `CreateSkill` — add `categoryID` param
- `UpdateSkill` — add `categoryID` param
- Add stub methods for new interface entries

---

## T3a — API Client (frontend agent)

**Goal:** Update `packages/api-client/` with new types and functions.

### Types (`packages/api-client/src/types.ts`)

Add to `Skill` interface:
```typescript
category_id: string | null
category_name: string | null
category_slug: string | null
category_emoji: string | null
is_favourite: boolean
tags: Tag[]
```

New interfaces:
```typescript
export interface Tag { id: string; name: string }
export interface TagWithCount { id: string; name: string; skill_count: number }
export interface Category { id: string; name: string; slug: string; emoji: string; sort_order: number }
```

### Client functions (`packages/api-client/src/client.ts`)

Modified:
- `createSkill` — add optional `category_id` field
- `updateSkill` — add optional `category_id` field

New:
```typescript
export function toggleFavourite(skillId: string): Promise<{ is_favourite: boolean }>
export function setSkillTags(skillId: string, tagNames: string[]): Promise<Tag[]>
export function listTags(): Promise<TagWithCount[]>
export function listCategories(): Promise<Category[]>
```

Export all new types and functions from barrel (`src/index.ts`).

---

## T3b — Skills List Page (frontend agent)

**Goal:** AC-V1, AC-V2, AC-V3, AC-V4, AC-V5b, AC-V9

File: `apps/rpg-tracker/app/(app)/skills/page.tsx`

Changes:
1. **Two-row toolbar** (P3-D9):
   - Row 1: search input (flex-1) + favourites icon button (44px)
   - Row 2: scrollable pills — sort options (existing), tier filter (existing), category filter (new), tag filter (new)

2. **Category filter pill** — fetches from `listCategories()`, single-select, "All" default

3. **Tag filter pill** — fetches from `listTags()`, single-select, hidden when user has no tags

4. **Favourites toggle** — icon button, `--color-accent` when active, calls `toggleFavourite()` on card icon

5. **Search** — substring match, case-insensitive, 200ms debounce, X clear button

6. **AND filter combination** (P3-D8) — all filters compose with AND

7. **Empty states** — per AC-V3, AC-V4

8. **"Clear filters" button** — shown when >1 filter active

9. **SkillCard updates** — add category emoji next to name (AC-V5b), add favourite icon (AC-V3)

File: `packages/ui/src/SkillCard.tsx`
- Add `categoryEmoji` prop (optional)
- Add `isFavourite` prop + `onToggleFavourite` callback
- Favourite icon: 44px tap target, `--color-accent` when active

---

## T3c — Skill Detail Page (frontend agent)

**Goal:** AC-V5, AC-V7, AC-V8

File: `apps/rpg-tracker/app/(app)/skills/[id]/page.tsx`

Changes:
1. **Hero section** — add category emoji + name below skill name (hidden if null). Add tags as pills below category. Use `--font-body`.

2. **Tag input section** — below tags display:
   - Input with autocomplete (from `listTags()`)
   - Enter/comma commits to local buffer
   - X button on pills removes from buffer
   - "Save" button calls `setSkillTags()`
   - Disabled + message at 5 tags
   - Error display on save failure

3. **Favourite button** — in hero, 44px, optimistic toggle via `toggleFavourite()`

---

## T3d — Skill Create Page (frontend agent)

**Goal:** AC-V6

File: `apps/rpg-tracker/app/(app)/skills/new/page.tsx`

Changes:
1. **Category picker** in step 1 ("Identity"):
   - Pill selector or dropdown listing all categories from `listCategories()`
   - Pre-selected when preset is chosen (from preset's category)
   - Optional for custom path
   - Sends `category_id` in `createSkill()` call

---

## T4 — Review (reviewer agent)

**Mode:** Code gate (logic) + Visual review (UI)

Logic gate:
- All T1 Go tests pass
- All T1 UI tests pass

Visual review:
- Token usage (no hardcoded colours)
- Three-theme rendering (minimal, retro, modern)
- Mobile viability at 375px
- Accessibility (tap targets, aria labels, keyboard navigation)
- Empty states render correctly

---

## Sequencing Summary

```
T1 (tester — write failing tests)
 ↓
T2 (backend — make tests pass)
 ↓
T3a (api-client types + functions)
 ↓
T3b + T3c + T3d (frontend pages — parallel)
 ↓
T4 (reviewer — code + visual gate)
```

T3b, T3c, T3d can run in parallel once T3a is complete.
T3a can start as soon as T2 is feature-complete (API contract stable).
T1 must complete before T2 starts (TDD gate).
