# Spec: Skill Organisation (Phase 3)

**Status:** DRAFT
**Date:** 2026-03-22
**Work Type:** mixed (logic: backend schema/API; visual: frontend filters/display)
**Feature Tracker:** F-032 (categories/tags), F-033 (favourites/pinning)

---

## Summary

Add categories, user-defined tags, favourites, and search to the skills system. Skills list scales to 100+ with filtering and organisation tools.

## Background

- `skill_categories` table already exists (migration 000003) with 9 preset categories seeded (migration 000004)
- `skill_presets` already has `category_id` FK — preset-based skills inherit category through `preset_id`
- **Custom skills have no category** — the `skills` table has no direct `category_id` FK
- No tags, favourites, or search exist
- Page guides (skills-list, skill-detail, skill-create) specify where these elements appear

## Scope

### In Scope

1. **Direct category assignment on skills** — `category_id` FK on `skills` table
2. **User-defined tags** — `tags` table + `skill_tags` join table
3. **Favourite/pin toggle** — `is_favourite` boolean on `skills`
4. **Category filter** on skills list
5. **Tag filter** on skills list
6. **Favourites quick-filter** on skills list
7. **Client-side search** on skills list
8. **Category + tags display** on skill detail hero
9. **Category selection** in skill create flow (step 1 "Identity")
10. **Tag management** on skill detail (add/remove tags)

### Out of Scope

- P3-9 (inline mini-form) — already implemented via `QuickLogSheet` (see `packages/ui/src/QuickLogSheet.tsx`; the "+ Log" button on `SkillCard` opens the bottom sheet without navigation; tested in `packages/ui/src/__tests__/QuickLogSheet.test.tsx`). The skills-list page guide element table still shows this as NEW — the page guide was written before implementation and has not been updated.
- Category management UI (preset categories are read-only, seeded in DB)
- Tag management page (tags created inline when adding to skills)
- Rewriting SkillCard layout (existing layout stays as-is; category emoji is added but **tags are NOT shown on list cards** — only on skill detail hero, to avoid card crowding on mobile)
- `user_category_interests` table (migration 000003) — remains inert scaffolding for future onboarding personalisation; not populated or used by this feature
- Edit-modal migration (page guide shows "Move from /skills/[id]/edit to modal") — already done as `SkillEditModal`; not in scope for this feature

### Preserved Unchanged

- **Tier filter** (existing dropdown on skills list) — carried over as-is, not restyled
- **Sort options** (Recent / Name / Level / Tier) — carried over as-is, not restyled

---

## Decisions

| ID | Decision | Rationale |
|----|----------|-----------|
| D-038 | **Resolved:** Keep existing 9 preset categories (Fitness & Movement, Programming & Tech, Creative Arts, Wellness & Mind, Learning & Knowledge, Social & Communication, Finance & Career, Nutrition & Health, Productivity & Focus) | User confirmed — no changes needed |
| P3-D1 | Tags are user-scoped (each user has their own tags) | Users organise their own skills; no sharing/social in release scope |
| P3-D2 | Category is optional on skills (nullable FK) | Custom skills may not fit a category; don't force classification |
| P3-D3 | Tags are created inline (type-to-create in tag input) | No separate tag management page — too heavy for this feature |
| P3-D4 | Max 5 tags per skill | Prevents tag spam; keeps cards clean |
| P3-D5 | Preset skills auto-inherit category from their preset at creation time | Set `category_id` from `skill_presets.category_id` when `preset_id` is non-null |
| P3-D6 | Categories endpoint (`GET /api/v1/categories`) requires auth like all other `/api/v1/` routes | Keeps middleware consistent; categories are fetched after login; no public access needed |
| P3-D7 | Category picker in skill create is a new element not in the page guide's element table | Page guide predates this spec; will be updated when the feature ships |
| P3-D8 | All filters combine with AND logic. A skill must match ALL active filters simultaneously (tier AND category AND tag AND favourites AND search). Selecting a second category replaces the first (single-select, not multi-select). Same for tags. | AND is simplest to reason about. Multi-select filters add complexity without clear benefit at this scale. |
| P3-D9 | Toolbar layout: two rows on mobile. Row 1: search input (flex-1) + favourites icon button. Row 2: scrollable pills (sort, tier, category, tag). | Six controls in one row doesn't fit 375px. Search + favourites are the most used controls and must be always visible. |
| P3-D10 | Tags are NOT shown on SkillCard in list view — only on skill detail hero. Category emoji is shown on list cards (small, next to skill name). | Card already has name, tier badge, level, XP bar, streak, gate icon, +Log button. Adding tags would crowd single-column mobile layout. |
| P3-D11 | Tag save gesture: Enter key or comma commits a tag. Blur (clicking away) also commits. Tags are saved to server via PUT on a "Save" button press, not on each keystroke. The tag input is a local edit buffer until explicitly saved. | Prevents accidental tag creation. Consistent with form-save patterns elsewhere in the app. |
| P3-D12 | Favourite toggle uses optimistic update with rollback on API failure. If favourites filter is active and user un-favourites a skill, the card stays visible (dimmed) until the next explicit filter action — it does not disappear immediately. | Immediate disappearance is disorienting. Dimming signals "this will leave the list" without surprise. |
| P3-D13 | Tag/category text uses `--font-body` (not `--font-display`) in all themes. Press Start 2P is too wide for small pill/chip text. | Shared style guide: Press Start 2P reserved for h1/h2 and stat values only. |
| P3-D14 | Favourite icon uses `--color-accent` when active. Retro: warm amber. Modern: cyan. Minimal: accent colour. | Per page guide theme variations for favourites. |

---

## Schema Changes

### Migration 000009: skill_organisation

```sql
-- Add category_id directly to skills (nullable FK)
ALTER TABLE public.skills
  ADD COLUMN category_id UUID REFERENCES public.skill_categories(id) ON DELETE SET NULL;

-- Add is_favourite flag
ALTER TABLE public.skills
  ADD COLUMN is_favourite BOOLEAN NOT NULL DEFAULT false;

-- User-scoped tags
CREATE TABLE public.tags (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name       TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, name)
);

-- Join table
CREATE TABLE public.skill_tags (
    skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
    tag_id   UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
    PRIMARY KEY (skill_id, tag_id)
);

-- RLS scaffolding (same pattern as other tables)
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY tags_self_rw ON public.tags
    USING (user_id = current_setting('app.current_user_id', TRUE)::UUID);

-- RLS for skill_tags: access controlled via Go layer (WHERE user_id = $userID on skills).
-- Same pattern as skills table: enable RLS + permissive policy referencing app.current_user_id.
ALTER TABLE public.skill_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY skill_tags_self_rw ON public.skill_tags
    USING (EXISTS (
        SELECT 1 FROM public.skills
        WHERE skills.id = skill_tags.skill_id
          AND skills.user_id = current_setting('app.current_user_id', TRUE)::UUID
    ));

-- Backfill: set category_id for existing preset-based skills
UPDATE public.skills s
SET category_id = sp.category_id
FROM public.skill_presets sp
WHERE s.preset_id = sp.id
  AND s.category_id IS NULL;

-- Index for tag lookups
CREATE INDEX idx_skill_tags_skill_id ON public.skill_tags(skill_id);
CREATE INDEX idx_skill_tags_tag_id ON public.skill_tags(tag_id);
CREATE INDEX idx_tags_user_id ON public.tags(user_id);
CREATE INDEX idx_skills_category_id ON public.skills(category_id);
CREATE INDEX idx_skills_is_favourite ON public.skills(user_id, is_favourite) WHERE is_favourite = true;
```

---

## API Changes

### Modified Endpoints

**POST /api/v1/skills** — accept optional `category_id` form field
- If `preset_id` is provided and `category_id` is not, auto-set from preset
- If `category_id` is provided, validate it exists in `skill_categories`

**PUT /api/v1/skills/{id}** — accept optional `category_id` form field
- Allows changing/removing category on existing skills

**GET /api/v1/skills** — response includes `category_name`, `category_slug`, `category_emoji`, `is_favourite`, `tags[]`
- Tags returned as `[{id, name}]` array per skill

**GET /api/v1/skills/{id}** — same additions as list

### New Endpoints

**PATCH /api/v1/skills/{id}/favourite** — toggle `is_favourite`
- Request: empty body (toggles current value)
- Response: `{ is_favourite: boolean }`

**GET /api/v1/tags** — list user's tags
- Response: `[{id, name, skill_count}]` ordered by name
- `skill_count` = number of skills using this tag

**PUT /api/v1/skills/{id}/tags** — set tags for a skill (replaces all)
- Request: `tag_names=foo,bar,baz` (form-encoded, comma-separated)
- Creates tags that don't exist yet (type-to-create)
- Enforces max 5 tags per skill (422 if exceeded)
- Response: `[{id, name}]` — the skill's current tags

**GET /api/v1/categories** — list preset categories
- Response: `[{id, name, slug, emoji, sort_order}]`
- Requires auth (behind existing auth middleware, consistent with all `/api/v1/` routes — P3-D6)

---

## Acceptance Criteria

### Logic ACs (TDD gate)

**AC-L1: Category assignment at creation**
- POST /api/v1/skills with `category_id=<valid-uuid>` → skill has `category_id` set
- POST /api/v1/skills with `preset_id=<preset>` and no `category_id` → skill inherits category from preset
- POST /api/v1/skills with `category_id=<malformed-string>` → 422 "invalid category" (not a valid UUID)
- POST /api/v1/skills with `category_id=<well-formed-uuid-not-in-table>` → 422 "invalid category" (UUID valid but not found)
- POST /api/v1/skills with no `category_id` and no `preset_id` → skill has `category_id` NULL

**AC-L2: Category update**
- PUT /api/v1/skills/{id} with `category_id=<valid-uuid>` → category updated
- PUT /api/v1/skills/{id} with `category_id=` (empty) → category removed (set NULL)

**AC-L3: Favourite toggle**
- PATCH /api/v1/skills/{id}/favourite → toggles `is_favourite`, returns new value
- Toggling twice returns to original value

**AC-L4: Tag management**
- PUT /api/v1/skills/{id}/tags with `tag_names=piano,jazz` → creates tags if needed, links to skill
- Tags are case-insensitive (stored lowercase, trimmed of whitespace)
- Duplicate tag names silently deduplicated
- Max 5 tags → 422 if more than 5 provided
- PUT with `tag_names=` (empty) → removes all tags from skill
- Tags not linked to any skill are NOT auto-deleted (user may want to re-use)
- Tag lookup is scoped to `user_id` — if another user has a tag named "piano", this user gets their own separate tag row (P3-D1)

**AC-L5: Tag listing**
- GET /api/v1/tags → returns user's tags with `skill_count`
- Tags from other users are not visible

**AC-L6: Category listing**
- GET /api/v1/categories → returns all 9 preset categories ordered by `sort_order`
- Requires auth (consistent with all `/api/v1/` routes — P3-D6)

**AC-L7: Skill list enrichment**
- GET /api/v1/skills → each skill includes `category_name`, `category_slug`, `category_emoji`, `is_favourite`, `tags`
- Skills with no category have null category fields

**AC-L8: Skill detail enrichment**
- GET /api/v1/skills/{id} → same enrichment as list

### Visual ACs (reviewer gate)

**AC-V1: Category filter on skills list**
- Category pill in toolbar row 2 (scrollable pills row — P3-D9)
- Lists categories from GET /api/v1/categories; "All" is the default
- Selecting a category filters skills list client-side (AND with other filters — P3-D8)
- Single-select: selecting a different category replaces the previous one

**AC-V2: Tag filter on skills list**
- Tag pill in toolbar row 2 (scrollable pills row)
- Populated from GET /api/v1/tags (user's tags)
- Selecting a tag filters to skills with that tag (AND with other filters)
- Single-select: selecting a different tag replaces the previous one
- **Empty state:** if user has no tags, the tag filter pill is hidden (not shown as an empty dropdown)

**AC-V3: Favourites toggle on skills list**
- Star icon button in toolbar row 1, next to search input (P3-D9)
- Minimum 44px tap target
- When active: shows only favourited skills; icon uses `--color-accent` (P3-D14)
- Favourite icon on each skill card (clickable to toggle via PATCH)
- Minimum 44px tap target on card favourite icon
- **Optimistic update with rollback:** icon state toggles immediately; reverts if API fails (P3-D12)
- **If favourites filter is active and user un-favourites a skill:** card stays visible but dimmed; does not disappear until next filter action
- **Empty state:** "No favourited skills yet — star a skill to add it here"

**AC-V4: Search on skills list**
- Search input in toolbar row 1, takes remaining width (flex-1) (P3-D9)
- Filters skills by name — substring match, case-insensitive (e.g. "run" matches "Running")
- Client-side filtering (no API call)
- Debounced input (200ms delay before filtering)
- Clears with X button; clearing restores full list
- **Combined empty state:** when multiple filters are active and no results match, show "No skills match your filters" with a "Clear filters" button that resets all filters to default

**AC-V5: Category + tags on skill detail hero**
- Category emoji + name displayed below skill name (uses `--font-body`, not `--font-display` — P3-D13)
- **If category is null:** section is not rendered (no "No category" placeholder — keeps hero clean)
- Tags displayed as removable pills/chips below category (uses `--font-body` — P3-D13)
- Tags only shown on detail hero, NOT on SkillCard in list view (P3-D10)

**AC-V5b: Category emoji on SkillCard**
- Category emoji shown next to skill name on list cards (small, inline)
- If category is null, no emoji shown (no placeholder)

**AC-V6: Category picker in skill create (step 1)**
- Category dropdown or pill selector in the "Identity" step
- Pre-selected when choosing a preset (from preset's category)
- Optional for custom skills (can be left unset)
- Lists all 9 categories from GET /api/v1/categories

**AC-V7: Tag input on skill detail**
- Tag input section below tags display on skill detail
- Type-to-create: Enter key or comma commits tag to local buffer (P3-D11)
- Autocomplete dropdown from existing user tags (GET /api/v1/tags)
- Explicit "Save" button commits buffer to server via PUT /api/v1/skills/{id}/tags
- Removing a tag: X button on each tag pill (removes from local buffer; saved on "Save")
- **Max tags:** when 5 tags are present, input is disabled with inline message "Maximum 5 tags reached"
- **Save failure:** inline error message below tag input; tags revert to server state

**AC-V8: Favourite toggle on skill detail**
- Star/heart button in hero section, minimum 44px tap target
- Uses `--color-accent` when active (P3-D14)
- Clicking toggles via PATCH endpoint with optimistic update (P3-D12)

**AC-V9: All three themes render correctly**
- All new UI elements use design tokens (no hardcoded colours)
- Category pills, tag chips, search input, favourite icon all theme-aware
- Tag/category text uses `--font-body` in all themes (P3-D13)
- Favourite active state uses `--color-accent` (P3-D14)

---

## Zones Touched

| Zone | Files | Agent |
|------|-------|-------|
| Go API | `apps/api/db/migrations/`, `apps/api/internal/skills/`, `apps/api/internal/handlers/` | backend |
| API client | `packages/api-client/src/types.ts`, `packages/api-client/src/client.ts` | backend/frontend (shared) |
| Shared UI | `packages/ui/src/SkillCard.tsx`, new filter components | frontend |
| Next.js pages | `apps/rpg-tracker/app/(app)/skills/page.tsx`, `.../[id]/page.tsx`, `.../new/page.tsx` | frontend |

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| ListSkills query complexity — JOINing categories + tags per skill | Performance at 100+ skills | Category is a simple LEFT JOIN; tags use a subquery or lateral join. Both indexed. |
| Tag input UX — autocomplete + create in one control | UX friction | Use a simple comma-separated input initially; autocomplete can be enhanced later |
| Backfill migration — setting category_id for existing preset skills | Data integrity | Single UPDATE with JOIN; idempotent (WHERE category_id IS NULL) |
