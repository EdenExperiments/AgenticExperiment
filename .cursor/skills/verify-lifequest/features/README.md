# LifeQuest verification map

This directory is the maintained source for verifying user-facing LifeQuest behavior (`apps/rpg-tracker`). Read this index before driving the app, then use the matching feature file as the recipe.

## Baseline preconditions

- Prefer an instance started by `node .cursor/skills/verify-lifequest/scripts/launch.mjs` (or `--frontend-only` for auth-only recipes).
- Default URL: `http://localhost:3000` (`LIFEQUEST_URL` to override). Do not use `http://127.0.0.1:3000` against the stock Next dev server — hydration breaks (cross-origin `/_next` block).
- Run `node .cursor/skills/verify-lifequest/scripts/doctor.mjs` before driving; use `--full` when the recipe needs the Go API.
- Authenticated recipes need `VERIFY_EMAIL` and `VERIFY_PASSWORD` in the environment (never commit these).
- Never drive an instance that was not started for this verification run.
- Concurrent side-by-side LifeQuest instances on the default ports are unsupported.

## Driving conventions

- Start every recipe from the baseline state unless its preconditions say otherwise.
- Prefer ARIA roles and accessible names (and the listed `data-testid` values) over CSS selectors or coordinates.
- Treat helper commands as literal.
- Browser automation: `node .cursor/skills/verify-lifequest/scripts/drive.mjs <feature-id>` when a recipe is implemented, otherwise Playwright/`cursor-ide-browser` using the handles in the feature file.
- After mutations, restore disposable verify data when the feature file says so. Do not remove proof artifacts during cleanup.

## Proof and skip reporting

- Capture the user action and the resulting state, not only the final screen.
- UI proof includes an ARIA snapshot and a screenshot with brand identity visible (`RPG Tracker` on auth; `LifeQuest` in the signed-in sidebar).
- Mutation proof includes a second user-facing view of the stored value.
- Record the feature ID and entry point with every artifact (`meta.json` from `drive.mjs`).
- Report an unreachable path with the attempted command and the unmet precondition.
- Do not report a skipped entry point as verified through a different path.

## Feature entry contract

Each feature file starts with an H1 title and one paragraph describing the user-visible behavior. It then uses exactly four H2 sections in this order.

1. `Sub-features`
2. `How to get to it (user POV)`
3. `Driving it with verify-lifequest`
4. `Gotchas`

## Features

- [Sign in and auth gate](./auth-login.md) — login/register forms, invalid credentials, unauthenticated redirect.
- [Dashboard](./dashboard.md) — signed-in home, empty quest state, stats/activity when skills exist.
- [Skills](./skills.md) — list, search, add skill entry points.
- [Goals](./goals.md) — list, status tabs, manual and AI plan entry points.
- [Account](./account.md) — profile, theme/mode, API key links, sign out.
