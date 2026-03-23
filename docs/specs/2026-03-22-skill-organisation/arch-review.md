# Arch Review: Skill Organisation (Phase 3)

**Spec:** `docs/specs/2026-03-22-skill-organisation/spec.md`
**Reviewer:** architect agent
**Date:** 2026-03-22
**Decision:** APPROVED (with implementation notes below)

---

## Schema Impact

### New tables and columns

Migration 000009 adds:

| Object | Type | Notes |
|--------|------|-------|
| `skills.category_id` | nullable UUID FK → `skill_categories(id)` ON DELETE SET NULL | Correct — nullable per P3-D2 |
| `skills.is_favourite` | BOOLEAN NOT NULL DEFAULT false | Correct — safe backfill, no existing rows need manual data |
| `public.tags` | new table | `UNIQUE(user_id, name)` is correct for P3-D1 user-scoped uniqueness |
| `public.skill_tags` | new join table | Composite PK `(skill_id, tag_id)` is correct |

### Migration safety

**Backfill statement is safe.** The `UPDATE … WHERE category_id IS NULL` guard makes it idempotent. It correctly uses `preset_id` as the join key and only touches rows with a non-null `preset_id`. Skills created from scratch are left with `NULL`, which is the specified behaviour (P3-D2). No risk of incorrect overwrites.

**ADD COLUMN statements are non-blocking** in PostgreSQL for nullable columns and columns with a constant default. Both new skill columns qualify — no table rewrite occurs.

**RLS on `skill_tags`** uses an EXISTS subquery referencing `skills`. The pattern is consistent with the existing `skills_self_rw` policy and the architecture's "aspirational RLS" approach (see migration 000003 comments). No concern.

### Index coverage

All four proposed indexes are appropriate:
- `idx_skills_category_id` — covers category filter JOIN/lookup
- `idx_skills_is_favourite` — partial index `WHERE is_favourite = true` is efficient; the `user_id` prefix allows index-only scans for the favourites quick-filter
- `idx_skill_tags_skill_id` — essential for the per-skill tag aggregation in ListSkills
- `idx_tags_user_id` — covers GET /api/v1/tags scoped lookup

### One gap to note (non-blocking)

There is no index on `skill_tags(tag_id)`. The `PUT /api/v1/skills/{id}/tags` replace-all operation will DELETE existing links by `skill_id` (covered), but `GET /api/v1/tags` with `skill_count` requires a COUNT grouped by `tag_id`. At current scale (100+ skills, max 5 tags each = ~500 rows) this is negligible. Add `idx_skill_tags_tag_id` if `GET /api/v1/tags` latency becomes a concern.

---

## Service Boundaries

### SkillStore interface extension

The existing `SkillStore` interface in `apps/api/internal/handlers/skill.go` must grow. New methods required:

```go
// New entries for SkillStore interface
CreateSkillWithCategory(ctx context.Context, userID uuid.UUID, name, description, unit string, presetID *uuid.UUID, categoryID *uuid.UUID, startingLevel int, gateDescs [10]string) (*skills.Skill, error)
UpdateSkillCategory(ctx context.Context, userID, skillID uuid.UUID, categoryID *uuid.UUID) (*skills.Skill, error)
ToggleFavourite(ctx context.Context, userID, skillID uuid.UUID) (bool, error)
SetSkillTags(ctx context.Context, userID, skillID uuid.UUID, tagNames []string) ([]Tag, error)
ListTags(ctx context.Context, userID uuid.UUID) ([]TagWithCount, error)
ListCategories(ctx context.Context) ([]Category, error)
```

**Preferred approach:** Rather than adding a `categoryID` parameter to the existing `CreateSkill` signature (which would change the function signature and break the current handler and all tests), add it as an extension: either a new `CreateSkillWithCategory` function in the `skills` package that calls `CreateSkill` internally, or extend `CreateSkill` with a `categoryID *uuid.UUID` parameter and update all call sites. The spec does not prescribe the internal split — the backend agent should choose. Extending the existing signature is simpler and avoids duplication; the tester agent must update test call sites accordingly.

### Skill struct extension

`skills.Skill` in `apps/api/internal/skills/skill_repository.go` needs new fields:

```go
CategoryID    *uuid.UUID `json:"category_id"`
CategoryName  *string    `json:"category_name"`
CategorySlug  *string    `json:"category_slug"`
CategoryEmoji *string    `json:"category_emoji"`
IsFavourite   bool       `json:"is_favourite"`
Tags          []Tag      `json:"tags"`
```

`CategoryName/Slug/Emoji` are populated by JOIN — they are not stored on `skills` but hydrated at query time. Returning them on the `Skill` struct (rather than only on `SkillDetail`) is correct because `SkillDetail` embeds `skills.Skill`, so both list and detail responses will carry them automatically.

`Tags` as `[]Tag` (not `[]skills.Tag`) must be defined in the `skills` package. The zero value `nil` slice must be serialised as `[]` not `null` in JSON — use `json:",omitempty"` carefully, or initialise to empty slice in the repository.

### New route handlers

Four new handlers are needed:

| Handler | Method + Path | New or modified |
|---------|--------------|-----------------|
| `HandlePatchFavourite` | PATCH /api/v1/skills/{id}/favourite | New |
| `HandleGetTags` | GET /api/v1/tags | New |
| `HandlePutSkillTags` | PUT /api/v1/skills/{id}/tags | New |
| `HandleGetCategories` | GET /api/v1/categories | New |

These should live in `apps/api/internal/handlers/skill.go` for categories/tags/favourites (all skill-adjacent), or a new `apps/api/internal/handlers/tag.go` / `category.go` if the handler file grows large. The spec does not prescribe this split — backend agent's call.

### PUT /api/v1/skills/{id} signature change

The existing `UpdateSkill` store method signature is `(userID, skillID uuid.UUID, name, description string)`. Adding `categoryID *uuid.UUID` to this signature will break the existing handler call and test mocks. The backend agent must update:
1. `skills.UpdateSkill` function signature
2. `SkillStore.UpdateSkill` interface method
3. `dbSkillStore.UpdateSkill` wrapper
4. `HandlePutSkill` handler
5. Any existing test mocks for `UpdateSkill`

This is the highest-risk internal change in the feature. It is contained within `apps/api/` only.

### Tag normalisation

AC-L4 states tags are stored lowercase and trimmed. This normalisation must occur in the Go layer (repository or handler), not rely on DB constraints. The `UNIQUE(user_id, name)` constraint only deduplicates exact-match; case folding must happen before the INSERT. `strings.ToLower(strings.TrimSpace(name))` is sufficient.

---

## ADR

### ADR-P3-001: Tag replace-all vs. diff strategy for PUT /api/v1/skills/{id}/tags

**Context:** When a user updates tags on a skill, the spec specifies a replace-all approach: DELETE all existing `skill_tags` rows for the skill, then INSERT the new set. An alternative is a diff strategy (insert new, delete removed).

**Decision:** Replace-all is correct for this feature. The max 5 tags constraint keeps the set small. Replace-all is simpler, transactionally clean, and avoids concurrency edge cases. Orphaned tags (tags with no linked skills) are intentionally preserved per AC-L4.

**Consequence:** The `PUT /api/v1/skills/{id}/tags` handler must run DELETE + INSERT in a single transaction to avoid a window where the skill has no tags.

---

## Shared Package Changes

### `packages/api-client/src/types.ts`

The following additions are required:

```typescript
// Extend Skill interface — add to existing fields
category_id: string | null
category_name: string | null
category_slug: string | null
category_emoji: string | null
is_favourite: boolean

// New Tag type
export interface Tag {
  id: string
  name: string
}

// New TagWithCount type (for GET /api/v1/tags)
export interface TagWithCount {
  id: string
  name: string
  skill_count: number
}

// New Category type (for GET /api/v1/categories)
export interface Category {
  id: string
  name: string
  slug: string
  emoji: string
  sort_order: number
}
```

`SkillDetail extends Skill`, so the fields added to `Skill` are automatically inherited. No change to `SkillDetail` is needed for the category/favourite/tags fields.

### `packages/api-client/src/client.ts`

New and modified functions required:

```typescript
// Modified: createSkill — add category_id field
// Modified: updateSkill — add category_id field (empty string = clear)

// New functions
export function toggleFavourite(skillId: string): Promise<{ is_favourite: boolean }>
export function setSkillTags(skillId: string, tagNames: string[]): Promise<Tag[]>
export function listTags(): Promise<TagWithCount[]>
export function listCategories(): Promise<Category[]>
```

`toggleFavourite` sends an empty body with PATCH — consistent with the spec. The `request()` helper must handle PATCH with no body; currently it only sets `Content-Type: application/json` as a default header, which is fine for an empty-body PATCH.

**Barrel export risk:** `packages/api-client/src/index.ts` (or equivalent barrel) will need to re-export the new types. Check that adding `Tag`, `TagWithCount`, `Category` does not clash with any existing export names. None of these names appear in the current `types.ts`, so no conflict is expected.

---

## Parallelisation Map

### Tasks that CAN run in parallel

- **Backend: migration + repository layer** (`apps/api/db/migrations/000009_skill_organisation.up.sql`, `apps/api/internal/skills/skill_repository.go` struct and new query functions) — purely additive until the `UpdateSkill` signature change
- **Backend: new route handlers** (`HandlePatchFavourite`, `HandleGetTags`, `HandlePutSkillTags`, `HandleGetCategories`) — can be written against the new SkillStore interface additions without blocking the old handlers
- **Tester: logic AC tests** (AC-L1 through AC-L8) — can be written against the interface before implementation; this is the TDD gate task
- **Frontend: `packages/api-client` types + client functions** — can be written once the API contract is stable (spec is the contract; no need to wait for Go implementation)
- **Frontend: new UI components** (category filter, tag filter, favourites toggle, tag input, search input) — can be built against mock data or the api-client types before the Go API is deployed

### Tasks that MUST be sequenced (and why)

1. **Migration 000009 runs first** — the `skills.category_id`, `skills.is_favourite`, `tags`, and `skill_tags` objects must exist before any Go code that references them can be deployed. All repository functions are gated on this.

2. **`skills.Skill` struct extended before `SkillDetail` response changes** — `SkillDetail` embeds `skills.Skill`; the handler response shape depends on the struct fields being present. The struct change is a prerequisite for the enriched list/detail responses (AC-L7, AC-L8).

3. **`UpdateSkill` signature change must land atomically** — the function signature in the `skills` package, the `SkillStore` interface method, the `dbSkillStore` wrapper, the handler call site, and any test mocks must all be updated in the same commit. Partial updates will not compile. This change must be sequenced after the tester agent has updated mock signatures but before any PR merge.

4. **`packages/api-client` types before Next.js page changes** — the frontend pages import from `@rpgtracker/api-client`; TypeScript will fail to compile if the new types (`Tag`, `Category`, `TagWithCount`) or new client functions are not present when the pages reference them. The api-client change must be merged (or available in the monorepo workspace) before the page changes compile cleanly.

5. **Logic TDD gate passes before frontend integration** — per the project pipeline, logic ACs (AC-L1 through AC-L8) must have passing tests before the feature is considered backend-complete. Frontend can develop against mock data in parallel, but integration testing (AC-V1 through AC-V9 wired to live API) is gated on the backend being green.

---

## Approval

APPROVED

The spec is technically sound. Schema changes are non-breaking and backfill-safe. The API contract is consistent with existing patterns (form-encoded mutations, URLSearchParams for reads). The SkillStore interface extension is well-scoped. The main implementation risk is the `UpdateSkill` signature change — this is manageable but must be treated as an atomic refactor across all call sites.

Implementation notes for the backend agent (not blockers, but note before coding):
- Initialise `Tags` field to `[]Tag{}` (not nil) in repository scan so JSON serialises as `[]` not `null`
- Add `idx_skill_tags_tag_id` index if `GET /api/v1/tags` is called frequently from the filter toolbar (it will be — every page load of the skills list)
- The `PUT /api/v1/skills/{id}/tags` replace-all must be wrapped in a transaction (see ADR-P3-001)
- Tag normalisation (lowercase + trim) happens in Go before the DB UNIQUE constraint is tested
