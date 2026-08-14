# NutriLog

Nutrition product. Weight logging is shipped (`nl_weight_logs`). Next: goals, food diary, pantry, recipes here, not in LifeQuest.

Web today is `apps/nutri-log`. Target is `/nutri` in the LifeQuest shell with NutriLog chrome, not a LifeQuest tab. Apple is a separate app later, stack TBC. See `docs/architecture.md`.

Calorie and weight goals are `nl_*` routes. Do not reuse LifeQuest `public.goals`.

## Rough loop

Set calorie/macro/weight goals → search or custom food (Open Food Facts, degrade to cache if down) → log a serving with **snapshot** macros → see remaining vs goal. Pantry holds on-hand items; AI recipes must use them (drop ungrounded; empty pantry does not call Claude). Cook writes diary rows.

## Truth in code

- Weight API/UI: `apps/api/internal/nutrilog`, `apps/nutri-log/app/(app)/dashboard`
- Theme: `nutri-saas`, not LifeQuest’s three themes.

## Constraints

Per-user food cache (no global OFF table in v1). kg storage. No scraping recipe websites. Fasting / plate photos / restaurant lookup are later; do not invent them in a diary PR.
