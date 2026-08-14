# NutriLog

Nutrition product. Weight logging is shipped (`nl_weight_logs`). Next: goals, food diary, pantry, recipes here, not in LifeQuest.

Web today is `apps/nutri-log`. Target is `/nutri` in the LifeQuest shell with NutriLog chrome, not a LifeQuest tab. Apple is a separate app later, stack TBC. See `docs/architecture.md`.

Calorie and weight goals are `nl_*` routes. Do not reuse LifeQuest `public.goals`.

## Rough loop

Set calorie/macro/weight goals → search or custom food (Open Food Facts, degrade to cache if down) → log a serving with **snapshot** macros → see remaining vs goal. Pantry holds on-hand items; AI recipes must use them (drop ungrounded; empty pantry does not call Claude). Cook writes diary rows.

## Truth in code

- Weight API/UI: `apps/api/internal/nutrilog`, target page `apps/rpg-tracker/app/(app)/nutri`. Origin `apps/nutri-log` is leftover until origins collapse.
- Theme: nested layout sets `data-theme="nutri-saas"`. Do not write it into `rpgt-theme`.
- BFF join is `/api/` plus the client path, same as LifeQuest. A `v1/v1` join is a bug.

## Constraints

Per-user food cache (no global OFF table in v1). kg storage. No scraping recipe websites. Fasting / plate photos / restaurant lookup are later; do not invent them in a diary PR.
