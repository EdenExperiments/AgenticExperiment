# UI

LifeQuest skins are user preference. Minimal, Retro, Modern via `data-theme` on `<html>`, stored in `rpgt-theme`. Stylish is `data-mode="stylish"` on top. Atmosphere only, not a new layout.

Product identity is a different `data-theme` (`nutri-saas`, `workout-strength`, `mental-calm`) set by that product's nested layout. Do not write a product theme into `rpgt-theme`. Leftover NutriLog and MindTrack origins still seed `rpgt-theme` from `proxy.ts`. Import the product token file in the shell `tokens.css` when the route group ships.

LifeQuest chrome stays on LifeQuest routes. Pass nav items as props. Target chrome is dashboard, skills, goals, and account only. Do not put a product catalog in `@rpgtracker/ui`.

Product layouts own their own chrome. Tokens live in `packages/ui/tokens/`. Use `var(--color-*)`. Same behaviour in every LifeQuest skin. Apple apps keep their own chrome.

Read the CSS and components.
