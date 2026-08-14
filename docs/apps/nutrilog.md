# NutriLog

NutriLog is a product on `nl_*` and `internal/nutrilog` at grandfathered `/api/v1/nutrilog`. Target web is `/nutri` with NutriLog chrome and `nutri-saas` imported by the shell, not written into `rpgt-theme`. Apple binary later.

First slice is weight (`nl_weight_logs`) on the NutriLog origin. Next is goals, OFF diary, pantry, and recipes on `nl_*`. Calorie and weight goals stay `nl_*`, not `public.goals`. Empty pantry must not call Claude. Do not scrape recipe sites. Do not reuse `training_sessions`, `skill_presets`, or `xp_events`.

Web today is `apps/nutri-log` (:3002). `/nutri` is a Coming Soon stub under LifeQuest chrome. Weight UI lives at `apps/nutri-log/app/(app)/dashboard/page.tsx`. The NutriLog BFF forwards `${GO_API_URL}/api/v1/${path}` while the shared client already requests `/api/v1/nutrilog/weight-logs`, so the live origin double-prefixes. There is no NutriLog BFF test. Fix that BFF or move pages into the shell when NutriLog is next touched. See `docs/architecture.md`.

## NutriLog features

Fasting, plate-photo confirm, restaurant lookup, and household pantry are NutriLog features on `nl_*`, not products, with NutriLog chrome when `/nutri` ships and no Apple binaries of their own. Do not invent them inside a diary PR, and do not give them their own prefixes or Next apps.

## Rough loop

Set calorie/macro/weight goals → search or custom food (Open Food Facts, degrade to cache if down) → log a serving with **snapshot** macros → see remaining vs goal. Pantry holds on-hand items. AI recipes must use them (drop ungrounded). Empty pantry does not call Claude. Cook writes diary rows.

## Truth in code

- Weight API/UI: `apps/api/internal/nutrilog`, `apps/nutri-log/app/(app)/dashboard`
- HTTP is still `handlers.NewNutrilogWeightHandler` at `/api/v1/nutrilog/...`
- Theme: `nutri-saas` in `apps/nutri-log/tokens.css`. Shell `apps/rpg-tracker/tokens.css` does not import it.

## Constraints

Per-user food cache (no global OFF table in v1). kg storage. No scraping recipe websites.
