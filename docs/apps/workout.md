# Workout

Workout is a product. Tables `wo_*`, package `internal/workout`, mount `/api/v1/workout`, web `/workout` with nested layout and `workout-strength`. Apple binary later.

First slice is session, sets (reps, optional load_kg, optional RPE), history and volume. Not a LifeQuest skill. Do not log into `training_sessions`. No `xp_events` until later hub integration. GPS and watches wait for native.

Web lives as `apps/rpg-tracker/app/(app)/workout` plus `apps/api/internal/workout` (`Routes()`, `/api/v1/workout`, `wo_*` tables). Do not create `apps/workout` as another Next origin. Do not collapse four origins as a prerequisite for this slice. Strength Training in `skill_presets` is not this product. See `docs/architecture.md`.

## Rough loop (first slice)

Start session → add exercises → log sets (reps, optional load_kg, optional RPE) → finish → history + volume chart.

Volume is a query of `SUM(reps * load_kg)` for sets that have load, not a cached column. The chart is daily totals. RPE is an optional integer 1–10. JSON on `/api/v1/workout`.

Later work includes yoga, cardio, and mobility types, static guides, and AI **draft** plans that always say confirm with a PT. GPS and watches need native or PWA support. Those are not the first web slice.

No `xp_events` writes until a later hub integration. Do not reuse `training_sessions`, `skill_presets`, or LifeQuest chrome as the Workout tab bar.
