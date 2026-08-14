# NutriLog

NutriLog is a product on `nl_*` and `internal/nutrilog` at grandfathered `/api/v1/nutrilog`. Web is `/nutri` with NutriLog chrome and `nutri-saas` imported by the shell, not written into `rpgt-theme`. Apple binary later.

Weight, goals, and diary are in the shell. Calorie and weight goals stay `nl_*`, not `public.goals`. Do not scrape recipe sites. Do not reuse `training_sessions`, `skill_presets`, or `xp_events`. Origin `apps/nutri-log` is leftover until origins collapse. See `docs/architecture.md`.

## NutriLog features

Fasting, plate-photo confirm, restaurant lookup, and household pantry are NutriLog features on `nl_*`, not products, with NutriLog chrome and no Apple binaries of their own. Do not invent them inside a diary PR, and do not give them their own prefixes or Next apps.

## Rough loop

Set calorie/macro/weight goals → search or custom food (Open Food Facts, degrade to cache if down) → log a serving with **snapshot** macros → see remaining vs goal.

Two meal loops (when built), same `nl_*` and `/nutri` chrome. **Use what I have:** pantry is the ground; drop ungrounded ingredients; do not claim a kitchen-use recipe from an empty pantry. **What should I cook:** follow `nl_goals`, a diet flag, and household servings (A adults at 1.0, C children at 0.5, round to pack sizes); prefer pantry when it has rows; if it is empty, still return a plan and a shopping list. Draft, not a dietitian. Cook writes diary rows. Do not scrape recipe sites or buy a recipe API for v1.

## Truth in code

- Weight and calorie goals HTTP live in `apps/api/internal/nutrilog` `Routes()`, mounted at `/api/v1/nutrilog`. UI is `apps/rpg-tracker/app/(app)/nutri` and `/nutri/goals`. Origin `apps/nutri-log` is leftover until origins collapse.
- Theme: nested layout sets `data-theme="nutri-saas"`. Do not write it into `rpgt-theme`.
- BFF join is `/api/` plus the client path, same as LifeQuest. A `v1/v1` join is a bug.

## Constraints

Per-user food cache (no global OFF table in v1). kg storage. Diary rows snapshot macros at log time. No scraping recipe websites. Fasting / plate photos / restaurant lookup are later; do not invent them in a diary PR.
