# Workout

Workout is a product on `wo_*`, package `internal/workout`, mount `/api/v1/workout`, web `/workout` with nested layout and `workout-forge`. Apple binary later.

First slice is session, then sets (reps, optional load_kg, optional RPE), then history. `/workout` shows the open session or a start form, plus the last finished receipt. Not a LifeQuest skill. Do not log into `training_sessions`. No `xp_events`. GPS and watches wait for native.

Web lives as `apps/rpg-tracker/app/(app)/workout` plus `apps/api/internal/workout` (`Routes()`, `/api/v1/workout`, `wo_*` tables). Do not create `apps/workout` as another Next origin. Strength Training in `skill_presets` is not this product. See `docs/architecture.md`.

## Rough loop (first slice)

Start session (idempotent, one open) → name an exercise → log sets → finish (idempotent) → history shows the finished receipt. Unloaded sets are excluded from kg volume. Free-text exercise names. No library.

Later work includes yoga, cardio, and mobility types, static guides, and AI **draft** plans that always say confirm with a PT. Those are not the first web slice.

No `xp_events` writes until a later hub integration. Do not reuse `training_sessions`, `skill_presets`, or LifeQuest chrome as the Workout tab bar.
