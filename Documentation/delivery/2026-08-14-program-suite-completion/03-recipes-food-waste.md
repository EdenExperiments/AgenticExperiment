# Workstream 3 — Recipes and Food-Waste AI

**Program:** `2026-08-14-program-suite-completion`  
**Features:** F-076 pantry, F-017 AI recipes (expanded), F-077 save recipe + cook-to-diary  
**Decision:** D-066 — lives in `apps/nutri-log`, not a new Next.js app  
**Depends on:** NL-03 and NL-04 (foods exist and can be logged)

## Why this workstream exists

PRD already asked for Claude meal suggestions using remaining calories, macros, preferences, and recent meals. The product intent for this program is sharper: **use what is already chosen / already in the house** so food is not thrown away. Generic “chicken bowl under 600 kcal” is a fallback, not the headline.

Ingredient sources, in priority order for the model:

1. Pantry items with `expires_on` within 3 days (if set).
2. Other pantry items.
3. Foods the user already logged in the last 7 days (repeat produce).
4. Optional extra ingredients the user ticks for this request (“I also have eggs”).

The model must **prefer recipes that consume on-hand items** and must list which pantry items would be used vs missing.

## Current-state audit

Nothing exists. Do not create `apps/recipes`.

## Out of scope

- Grocery delivery, shopping-list vendors, affiliate links.
- Nutritionix, scraped recipe sites as a corpus (Claude generates; we do not ingest Allrecipes).
- Automatic inventory decrement without user confirm (cook flow confirms).
- Hub XP.
- Platform-billed models (D-003). Entitlement = F-075 (`pro` + stored key) per Q7 default.

---

## User cases

### Pantry (F-076)

#### C-RP-P1 Add from food catalog

**Given** a `nl_foods` row (custom or cached)  
**When** the user adds it to pantry with quantity + unit  
**Then** `nl_pantry_items` row. Duplicate food_id updates quantity (upsert), does not create twins.

#### C-RP-P2 Add free-text ingredient

**Given** “half a cabbage” with no catalog match  
**When** add as `name` only (`food_id` null)  
**Then** stored. AI may still use the name. Optional later link to a food.

#### C-RP-P3 Expiry

**Given** `expires_on` = tomorrow  
**When** pantry list loads  
**Then** item sorted to “Use soon”. AI prompt includes this list first.

#### C-RP-P4 Remove / adjust qty

Delete own item 204; other user 404. Quantity cannot be ≤ 0 (delete instead).

#### C-RP-P5 Isolation

GET pantry returns only the authenticated user’s items.

### Suggest (F-017)

#### C-RP-S1 Happy path

**Given** pantry has ≥1 item, optional remaining calories from today’s diary + goals, user AI-entitled  
**When** POST `/nutrilog/recipes/suggest` with `{ "servings": 2, "extra_ingredient_ids": [], "extra_names": [] }`  
**Then** 200 with 2–4 recipes: title, minutes, ingredient lines tagged `from_pantry: true|false`, steps, estimated kcal/macros per serving, `waste_score` (how many soon-to-expire items used), `missing_ingredients` [].

#### C-RP-S2 Empty pantry

**Given** no pantry rows and no extras  
**When** suggest  
**Then** 422 `pantry_empty` with message to add ingredients. Do not spend Claude tokens.

#### C-RP-S3 Not entitled

**Then** same shape as goal planner: 403 or payload with paywall reason. UI uses existing PaywallCTA patterns if they exist in nutri-log; otherwise a link to LifeQuest account/api-key + upgrade copy. Do not invent a second billing system.

#### C-RP-S4 Grounding / anti-hallucination

**Given** pantry `[oats, banana, milk]`  
**When** suggest  
**Then** each recipe uses **at least two** of those names (case-insensitive). If the model returns a recipe that uses none, the API **drops** that recipe. If all dropped, 502 `ungrounded_recipes` and UI “Could not ground a recipe in your pantry — try adding 2+ items.”

#### C-RP-S5 Calorie constraint

**Given** remaining calories 450  
**When** suggest  
**Then** prompt includes remaining kcal and macro targets. Per-serving kcal above remaining is allowed but flagged `over_remaining: true` so the UI can warn. Do not silently exceed without a flag.

#### C-RP-S6 Provider failure

Claude 5xx / timeout → 502 `ai_unavailable`. Do not write a recipe row.

#### C-RP-S7 Key safety

API key never in response, logs, or recipe JSON.

### Save and cook (F-077)

#### C-RP-C1 Save suggestion

**When** user saves one suggested recipe  
**Then** `nl_recipes` + `nl_recipe_ingredients` persist the JSON (user-owned). No Claude call.

#### C-RP-C2 Cook / log

**Given** a saved recipe  
**When** “Log as meal” with slot + servings  
**Then** write `nl_food_logs` using snapshot kcal (recipe kcal × servings). Optionally decrement pantry quantities for ingredients tagged `from_pantry` **only after confirm checkbox**. If decrement would go negative, set to 0 and warn.

#### C-RP-C3 Manual recipe

User can create a recipe without AI (title + ingredients + optional kcal). Still loggable.

---

## Confirmed requirements

1. Tables: `nl_pantry_items`, `nl_recipes`, `nl_recipe_ingredients`. FK users; RLS.
2. Suggest handler: assemble pantry + diary remaining + goals + extras; call Claude; validate grounding; return. Store nothing until save.
3. Claude prompt must say: reduce waste; prefer expiring items; do not introduce specialty ingredients as required unless listed in `missing`; JSON schema only.
4. NutriLog nav adds Pantry and Recipes after these sessions.
5. Page guides: `nutri-pantry.md`, `nutri-recipes.md`.

## Schema sketch

```sql
CREATE TABLE public.nl_pantry_items (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    food_id     UUID REFERENCES public.nl_foods(id) ON DELETE SET NULL,
    name        TEXT NOT NULL,
    quantity    NUMERIC(8,2) NOT NULL CHECK (quantity > 0),
    unit        TEXT NOT NULL DEFAULT 'item',
    expires_on  DATE,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, food_id) -- food_id null: no unique; free-text can repeat
);

CREATE TABLE public.nl_recipes (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title         TEXT NOT NULL,
    minutes       INTEGER,
    servings      NUMERIC(6,2) NOT NULL DEFAULT 1,
    kcal          NUMERIC(8,1),
    protein_g     NUMERIC(8,1),
    carbs_g       NUMERIC(8,1),
    fat_g         NUMERIC(8,1),
    steps         TEXT NOT NULL DEFAULT '',
    source        TEXT NOT NULL CHECK (source IN ('ai','user')),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Ingredients: `recipe_id`, `name`, `from_pantry` bool, `pantry_item_id` nullable, `quantity`, `unit`.

## HTTP sketch

| Method | Path |
|--------|------|
| GET/POST/PATCH/DELETE | `/nutrilog/pantry` / `/nutrilog/pantry/{id}` |
| POST | `/nutrilog/recipes/suggest` |
| POST/GET | `/nutrilog/recipes` |
| POST | `/nutrilog/recipes/{id}/cook` |

Suggest request:

```json
{
  "servings": 2,
  "extra_ingredient_ids": [],
  "extra_names": ["eggs"],
  "date": "2026-08-14"
}
```

`date` selects which diary remaining-calories to use (default today).

---

## Acceptance criteria

| ID | Criterion | Verify |
|----|-----------|--------|
| AC-RP-01 | Pantry CRUD, upsert on (user, food_id), isolation | Go |
| AC-RP-02 | Suggest 422 on empty pantry; 403 not entitled | Go |
| AC-RP-03 | Grounding filter drops recipes that use zero pantry/extra names | Go unit on validator (no live Claude) |
| AC-RP-04 | Remaining calories passed into prompt; over_remaining flag | Go with fake Claude |
| AC-RP-05 | Key never logged; CallRaw receives decrypted key | Go |
| AC-RP-06 | Save recipe; cook writes food_logs snapshots | Go |
| AC-RP-07 | Optional pantry decrement on cook confirm | Go |
| AC-RP-08 | api-client | package test |
| AC-RP-09 | Pantry UI add/remove/expiry sort | nutri-log test |
| AC-RP-10 | Suggest UI lists from_pantry vs missing; cannot suggest when empty | nutri-log test |
| AC-RP-11 | Cook logs to selected meal slot | nutri-log test |
| AC-RP-12 | No new Next.js app; no xp_events | diff |

---

## Sessions

### RP-01 — Pantry API (Go)

**Depends on:** NL-03 (`nl_foods`). **Blocks:** RP-02, RP-03.

**Prompt**

```text
Implement session RP-01 from Documentation/delivery/2026-08-14-program-suite-completion/03-recipes-food-waste.md.

Migration nl_pantry_items (RLS, FK users, optional food_id). Authenticated CRUD under /api/v1/nutrilog/pantry. Upsert quantity when the same user_id+food_id is added again. Free-text name required even when food_id set (denormalised display). expires_on optional. Tests AC-RP-01. No Claude, no recipes table. Stop when go test nutrilog+handlers pass. Tracker F-076 in-progress (API).
```

### RP-02 — Pantry UI

**Depends on:** RP-01.

**Prompt**

```text
Implement session RP-02 from 03-recipes-food-waste.md.

Client + Pantry page in apps/nutri-log. Add from food search (reuse NL-04 search) or free-text. Use-soon grouping by expires_on. Page guide nutri-pantry.md first. Nav link. AC-RP-08/09. Tracker F-076 done.
```

### RP-03 — AI suggest (Go + client + UI)

**Depends on:** RP-02, NL-04, F-075 entitlement endpoints.

**Size:** this is the longest session; still one PR. If time-boxed, split Go (RP-03a) then UI (RP-03b) at the operator’s instruction.

**Prompt**

```text
Implement session RP-03 from 03-recipes-food-waste.md (F-017).

POST /api/v1/nutrilog/recipes/suggest. Build prompt from pantry (expiring first), extra names, remaining calories/macros for the date (diary + goals). Reuse Claude caller + key decryption from goal_plan. Entitlement same as AI goals. Validate recipes with a pure grounding function (tested without HTTP): each recipe must reference ≥2 on-hand names. Drop ungrounded; 502 if none remain. 422 pantry_empty. Fake Claude in tests. UI: Recipes page, PaywallCTA when not entitled, show from_pantry vs missing, waste/expiry emphasis. Page guide nutri-recipes.md. AC-RP-02–05, AC-RP-10. Do not persist recipes until RP-04 unless save is trivial. Tracker F-017 in-progress.
```

### RP-04 — Save + cook

**Depends on:** RP-03.

**Prompt**

```text
Implement session RP-04 from 03-recipes-food-waste.md (F-077).

nl_recipes + ingredients. Save suggestion or manual recipe. POST cook → food_logs for the slot with snapshot kcal; optional pantry decrement with confirm flag. AC-RP-06, 07, 11. Tracker F-017 and F-077 done.
```

---

## Combined recipes run

RP-01+RP-03a (Go) then RP-02+RP-03b+RP-04 (TS). Never start before NL-04 is on the branch or main.

## Done when

User adds leftover ingredients to pantry, gets recipes that actually use them, saves one, logs it as lunch, sees diary totals move, and optionally pantry counts drop. Empty pantry cannot call Claude.
