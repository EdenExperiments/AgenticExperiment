# NutriLog

Nutrition product. Weight logging is shipped (`nl_weight_logs`). Next: goals, food diary, pantry, recipes here, not in LifeQuest.

Web today is `apps/nutri-log`. Target is `/nutri` in the LifeQuest shell with NutriLog chrome, not a LifeQuest tab. Apple is a separate app later, stack TBC. See `docs/architecture.md`.

Calorie and weight goals are `nl_*` routes. Do not reuse LifeQuest `public.goals`.

## Rough loop

Set calorie/macro/weight goals → search or custom food (Open Food Facts, degrade to cache if down) → log a serving with **snapshot** macros → see remaining vs goal.

Two meal loops (when built), same `nl_*` and `/nutri` chrome. **Use what I have:** pantry is the ground; drop ungrounded ingredients; do not claim a kitchen-use recipe from an empty pantry. **What should I cook:** follow `nl_goals`, a diet flag, and household servings (A adults at 1.0, C children at 0.5, round to pack sizes); prefer pantry when it has rows; if it is empty, still return a plan and a shopping list. Draft, not a dietitian. Cook writes diary rows. Do not scrape recipe sites or buy a recipe API for v1.

## Truth in code

- Weight and calorie goals HTTP live in `apps/api/internal/nutrilog` `Routes()`, mounted at `/api/v1/nutrilog`. UI is `apps/rpg-tracker/app/(app)/nutri` and `/nutri/goals`. Origin `apps/nutri-log` is leftover until origins collapse.
- Theme: nested layout sets `data-theme="nutri-saas"`. Do not write it into `rpgt-theme`.
- BFF join is `/api/` plus the client path, same as LifeQuest. A `v1/v1` join is a bug.

## Constraints

Per-user food cache (no global OFF table in v1). kg storage. Diary rows snapshot macros at log time. No scraping recipe websites. Fasting / plate photos / restaurant lookup are later; do not invent them in a diary PR.
