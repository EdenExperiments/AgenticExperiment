# NutriLog

NutriLog is a product on `nl_*` and `internal/nutrilog` at grandfathered `/api/v1/nutrilog`. Web is `/nutri` with NutriLog chrome and `nutri-saas` imported by the shell, not written into `rpgt-theme`. Apple binary later.

First loops are weight (`nl_weight_logs`), one open fast (`nl_fasts`), pantry (`nl_pantry_items`), manual recipes (`nl_recipes`), and cook-to-diary (`nl_diary_entries`). Calorie and weight goals stay `nl_*`, not `public.goals`. Empty pantry must not call Claude. Do not scrape recipe sites. Do not reuse `training_sessions`, `skill_presets`, or `xp_events`.

Weight, fasting, and cook live in `apps/rpg-tracker/app/(app)/nutri`. `/nutri` is a today board (open fast, pantry count, last meal, weight). The NutriLog origin at `:3002` is leftover and is not required for these loops. LifeQuest BFF forwards a single `/api/v1` prefix.

## NutriLog features

Fasting, plate-photo confirm, restaurant lookup, and household pantry are NutriLog features on `nl_*`, not products, with NutriLog chrome when `/nutri` ships and no Apple binaries of their own.

Overnight fasting is one open clock with a target in `{12,14,16,18,20,24,36}` hours. Start is idempotent. Close writes a duration. Fasting is not a diet identity.

Overnight cooking is pantry → manual recipe → cook receipt. Nutrition missing stays “not entered.” Cook does not deplete pantry amounts. Open Food Facts, restaurant lookup, and plate-photo wait.

## Rough loop

Weigh in → start or close a fast → add what is in the house → write a recipe → cook it into the diary. Empty pantry returns `empty_pantry` and does not open a network connection to Claude.

## Truth in code

- Weight API: `apps/api/internal/nutrilog` + `handlers.NewNutrilogWeightHandler`
- Kitchen HTTP: `internal/nutrilog.Routes()` mounted at `/api/v1/nutrilog`
- Theme: `nutri-saas` on the `/nutri` layout

## Constraints

Per-user food cache (no global OFF table in v1). kg storage. No scraping recipe websites. Fast targets cannot exceed 36 hours.
