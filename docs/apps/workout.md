# Workout

Not in the repo yet. Own prefix (`wo_`), own theme. Not a LifeQuest skill.

Web lives as `apps/rpg-tracker/app/(app)/workout` plus `apps/api/internal/workout` (`Routes()`, `/api/v1/workout`, `wo_*` tables). Do not create `apps/workout` as another Next origin. Do not log sets into `training_sessions`. Apple is a separate native app later, stack TBC. See `docs/architecture.md`.

## Rough loop (first slice)

Start session → add exercises → log sets (reps, optional load_kg, optional RPE) → finish → history + volume chart.

Later: yoga/cardio/mobility types, static guides, AI **draft** plans that always say confirm with a PT. GPS and watches need native/PWA — not the first web slice.

No `xp_events` writes until a later hub integration.
