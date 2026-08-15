# UI

LifeQuest skins are user preference. Minimal, Retro, Modern via `data-theme` on `<html>`, stored in `rpgt-theme`. Stylish is `data-mode="stylish"` on top. Atmosphere is a third axis (`data-atmosphere`, cookie `rpgt-atmosphere`) with `none`, `cinematic`, `horror`, and `kawaii`. Atmosphere remints tokens only. Do not copy `pages.css` per vibe.

Product identity is a different `data-theme` (`nutri-saas`, `workout-forge`, `mental-calm`) set by that product's nested layout. Do not write a product theme into `rpgt-theme`. Import the product token file in the shell `tokens.css` when the route group ships. Product files pin `--radius-*` and `--shadow-*` so a LifeQuest atmosphere on `<html>` cannot leak into `/nutri`, `/workout`, or `/mind`.

LifeQuest chrome stays on LifeQuest routes. It must not hardcode other products. Pass nav items as props. Target chrome is dashboard, skills, goals, and account only. Do not put a product catalog in `@rpgtracker/ui`.

Product layouts own their own chrome. Tokens live in `packages/ui/tokens/`. Use `var(--color-*)`. Same behaviour in every LifeQuest skin. Apple apps keep their own chrome.

Horror and kawaii are LifeQuest play. They never apply to `/mind`. NutriLog stays `nutri-saas` with atmosphere unset. Workout stays `workout-forge`.

In-depth mockups wait for the prompts in `docs/themes-mockup-prompts.md`. Run the suite bible and initial-look prompts first, then the five atmosphere prompts.

Read the CSS and components.
