# Preset Skills Library — Design Spec

**Date:** 2026-03-16
**Status:** Approved
**Feature IDs:** F-004 (Preset Skills Library)

---

## Overview

Add a curated library of preset skills so new users can get started immediately without needing to invent skill definitions from scratch. When a user taps "New Skill", they first land on a browse screen (search + category chips + grouped list). Selecting a preset pre-fills the creation form. A custom-from-scratch path remains accessible as an escape hatch.

---

## Goals

- Reduce friction at the most common drop-off point: the blank skill creation form
- Seed the app with meaningful, relatable skill examples across diverse life domains
- Lay groundwork for future personalisation (interest-based filtering at onboarding)

---

## Out of Scope (This Iteration)

- Onboarding interest survey (table exists in schema; UX deferred)
- AI-generated preset suggestions
- User-submitted presets
- Starting level caps/XP curve guidelines (deferred to planning team)
- Preset ratings or popularity sorting

---

## Database Schema

### `skill_categories`

| Column        | Type        | Notes                               |
|---------------|-------------|-------------------------------------|
| `id`          | `uuid` PK   | default `gen_random_uuid()`         |
| `name`        | `text`      | e.g. "Fitness & Movement"           |
| `slug`        | `text`      | e.g. "fitness", unique              |
| `emoji`       | `text`      | display icon e.g. "🏃"              |
| `sort_order`  | `int`       | controls chip/list order            |
| `created_at`  | `timestamptz` | default `now()`                   |

### `skill_presets`

| Column          | Type        | Notes                                        |
|-----------------|-------------|----------------------------------------------|
| `id`            | `uuid` PK   | default `gen_random_uuid()`                  |
| `category_id`   | `uuid` FK`→ skill_categories.id` | ON DELETE CASCADE         |
| `name`          | `text`      | e.g. "Running"                               |
| `description`   | `text`      | short tagline shown in browse list           |
| `default_unit`  | `text`      | e.g. "km", "session", "minutes"              |
| `sort_order`    | `int`       | order within category                        |
| `created_at`    | `timestamptz` | default `now()`                            |

### `user_category_interests` (scaffolded for future use)

| Column        | Type        | Notes                                        |
|---------------|-------------|----------------------------------------------|
| `user_id`     | `uuid` FK`→ users.id` | ON DELETE CASCADE                  |
| `category_id` | `uuid` FK`→ skill_categories.id` | ON DELETE CASCADE         |
| `created_at`  | `timestamptz` | default `now()`                            |
| PK: (`user_id`, `category_id`)                                              |

> **RLS:** Follow the project's established RLS scaffold pattern (as in `000001_create_users.up.sql` and `000002_create_user_ai_keys.up.sql`): `ALTER TABLE user_category_interests ENABLE ROW LEVEL SECURITY` and a placeholder `CREATE POLICY` block, even though this table is only scaffolded for future use.

### Changes to `skills`

Add nullable `preset_id uuid REFERENCES skill_presets(id) ON DELETE SET NULL`.
Null = created from scratch. Non-null = spawned from a preset (for analytics/future use).

---

## Seed Data

**9 meta categories**, minimum 10 presets each (~90+ total rows).

| # | Category            | Slug          | Emoji |
|---|---------------------|---------------|-------|
| 1 | Fitness & Movement  | fitness       | 🏃    |
| 2 | Programming & Tech  | programming   | 💻    |
| 3 | Creative Arts       | creative      | 🎨    |
| 4 | Wellness & Mind     | wellness      | 🧘    |
| 5 | Learning & Knowledge| learning      | 📚    |
| 6 | Social & Communication | social     | 🗣    |
| 7 | Finance & Career    | finance       | 💰    |
| 8 | Nutrition & Health  | nutrition     | 🥗    |
| 9 | Productivity & Focus| productivity  | ⚡    |

Seed delivered via a SQL migration file (`db/migrations/NNNNNN+1_seed_skill_presets.up.sql`).

> **Migration naming:** The project uses golang-migrate with the `NNNNNN_name.up.sql` / `NNNNNN_name.down.sql` convention (e.g. `000001_create_users.up.sql`). Sequence numbers must be determined at implementation time based on the highest existing migration. The schema migration must carry a lower sequence number than the seed migration.

---

## Routes & Handlers

| Method | Path                      | Handler                    | Notes                                              |
|--------|---------------------------|----------------------------|----------------------------------------------------|
| GET    | `/skills/new`             | `HandleGetPresetBrowse`    | Browse screen (replaces old entry point)           |
| GET    | `/skills/new/custom`      | `HandleGetNewSkill`        | Existing scratch-creation flow (unchanged)         |
| GET    | `/skills/new/from-preset/{id}` | `HandleGetFromPreset` | Redirect to custom form with pre-filled params    |
| GET    | `/skills/new/preset/{id}` | `HandleGetPresetDetail`    | (Phase 2+) detail/confirm step — not in this MVP  |

**All existing template links and HTMX actions that previously targeted `/skills/new` for direct scratch creation must be updated to `/skills/new/custom`. The FAB and sidebar "+ Add Skill" action should continue to target `/skills/new` (the browse screen) as the new primary entry point.**

`HandleGetPresetBrowse` accepts optional query params:
- `?q=` — search filter (server-side, case-insensitive substring match on name + description)
- `?category=` — slug filter (e.g. `?category=fitness`); omitting the param (not an empty string) means "All"

The `All` category chip sends `hx-get="/skills/new"` with no `?category=` param. A missing `category` param and an empty `category` param are both treated by the handler as "show all categories". Individual category chips send `hx-get="/skills/new?category={slug}"`.

**HTMX partial detection:** `HandleGetPresetBrowse` inspects the `HX-Request: true` header. When present, it renders and returns only `preset_results.templ` (the results list partial). When absent (full-page navigation), it renders the complete `preset_browse.templ` page. This matches the existing pattern in the codebase (e.g. the 404 handler's `HX-Request` check).

HTMX: category chips and search bar both fire `hx-get="/skills/new"` (with appropriate params), swapping only the results list (`hx-target="#preset-results"`).

---

## Browse Screen UI

**Layout B: Search-first with category chips**

```
┌──────────────────────────────────────┐
│  ← Back     Choose a Skill           │
├──────────────────────────────────────┤
│  🔍 Search skills…                    │
│                                      │
│  [All] [🏃 Fitness] [💻 Programming]  │
│        [🎨 Creative] [🧘 Wellness]…   │
│                                      │
│  FITNESS & MOVEMENT                  │
│  ┌─────────────────────────────────┐ │
│  │ Running                       › │ │
│  │ Build aerobic endurance…        │ │
│  └─────────────────────────────────┘ │
│  ...                                 │
│  ──────────────────────────────────  │
│     + Create a custom skill instead  │
└──────────────────────────────────────┘
```

- Dark theme matching existing app (`#111827` shell, `#1f2937` cards)
- Active chip: indigo (`#4338ca` bg, `#e0e7ff` text)
- Inactive chips: `#1f2937` bg, `#9ca3af` text
- Section headers: `#6b7280`, 11px, uppercase, letter-spaced
- Chevron: `#818cf8`
- Escape hatch pinned at bottom, separated by a hairline rule

---

## Component / File Structure

```
internal/
  skills/
    preset_handler.go      # HandleGetPresetBrowse, HandleGetFromPreset
    preset_repository.go   # DB queries: ListCategories, ListPresets(filter), GetPreset(id)
  templates/
    skills/
      preset_browse.templ  # Full browse page
      preset_results.templ # HTMX partial: just the results list (for live search/filter)
db/migrations/
  NNNNNN_add_skill_presets.up.sql    # schema: skill_categories, skill_presets, user_category_interests, alter skills
  NNNNNN_add_skill_presets.down.sql  # rollback: drop tables, drop preset_id column
  NNNNNN+1_seed_skill_presets.up.sql   # seed: 9 categories + 90+ presets
  NNNNNN+1_seed_skill_presets.down.sql # rollback: truncate seed data
```

---

## Data Flow

1. User navigates to `/skills/new` → `HandleGetPresetBrowse` queries all categories + presets (grouped), renders `preset_browse.templ` (full page, no `HX-Request` header).
2. User types in search or taps a chip → HTMX `hx-get="/skills/new?q=run&category=fitness"` (`HX-Request: true`) → handler returns only `preset_results.templ` partial → swapped into `#preset-results`. No full-page reload.
3. User taps a preset row → each row renders as an `<a href="/skills/new/from-preset/{id}">` anchor tag (standard GET navigation, not an HTMX action). `HandleGetFromPreset` looks up the preset by `{id}` and issues a `303 See Other` redirect to `/skills/new/custom?preset_id={id}&name={url-encoded name}&description={url-encoded description}&unit={url-encoded default_unit}`.
4. `HandleGetNewSkill` at `/skills/new/custom` reads the optional query params (`preset_id`, `name`, `description`, `unit`) and pre-fills Step 1 of the creation wizard. If the params are absent (scratch flow), the form is blank. **Note on `unit`:** if the current skill creation wizard does not have a unit field, adding one is new scope introduced by this spec. The implementation team must confirm whether `skills.unit` exists or needs to be added. `default_unit` is passed through regardless; it is silently ignored if the form has no unit field.
5. `preset_id` carry-forward through the multi-step wizard: Step 1 of the creation form renders a hidden `<input type="hidden" name="preset_id" value="{id}">` when the query param is present. This hidden input is included in every subsequent HTMX step-transition POST so the value survives through to the final submission. On the final submit, `preset_id` is stored on the `skills` record (null if scratch flow, the preset's UUID if from-preset flow).
6. "Create a custom skill instead" → plain `<a href="/skills/new/custom">` link (no HTMX), existing flow unchanged, form starts blank.

---

## Open Questions (Deferred)

| Question | Owner | Notes |
|---|---|---|
| Starting level caps / XP curve for preset-seeded skills | Planning team | Needs dedicated planning pass |
| Onboarding interest survey UX (using `user_category_interests`) | UX planning | Table exists; flow deferred |
| Preset detail/confirm screen (`/skills/new/preset/{id}`) | Phase 2+ | MVP goes direct-to-form via GET redirect; detail screen is Phase 2 |
| Confirm whether `skills.unit` field exists in current schema | Implementer | `default_unit` pre-fill depends on this; may introduce new wizard step |

---

## Acceptance Criteria

- [ ] `/skills/new` shows browse screen with search + category chips + grouped preset list
- [ ] Typing in search filters presets server-side (HTMX partial swap, no full reload)
- [ ] Tapping a category chip filters to that category
- [ ] Tapping a preset row navigates (via GET anchor) through `/skills/new/from-preset/{id}` → 303 redirect → `/skills/new/custom` with name, description, unit, and preset_id as query params
- [ ] Skill creation form at `/skills/new/custom` pre-fills Step 1 fields from query params when present
- [ ] `preset_id` is carried through all wizard steps via hidden input and stored on the created skill record
- [ ] "Create a custom skill instead" navigates to `/skills/new/custom` (existing form, blank)
- [ ] 9 categories and ≥ 90 preset rows present in seeded DB
- [ ] Existing skill creation flow at `/skills/new/custom` is unbroken
