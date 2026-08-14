# UI

LifeQuest skins are user preference. Minimal, Retro, Modern via `data-theme` on `<html>`, stored in `rpgt-theme`. Stylish is `data-mode="stylish"` on top. Atmosphere only, not a new layout.

Product identity is a different `data-theme` (`nutri-saas`, `mental-calm`, later Workout) set by that product's nested layout. Do not write a product theme into `rpgt-theme`. Import the product token file in the shell `tokens.css` when the route group ships.

LifeQuest chrome stays on LifeQuest routes. Product layouts own their own chrome. Tokens live in `packages/ui/tokens/`. Use `var(--color-*)`. Same behaviour in every LifeQuest skin.

Apple apps keep their own chrome. Do not put a product catalog in `@rpgtracker/ui`. Pass nav items as props.

Read the CSS and components.
