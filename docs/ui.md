# UI

LifeQuest skins are user preference. Minimal, Retro, Modern via `data-theme` on `<html>`, stored in `rpgt-theme`. Stylish is `data-mode="stylish"` on top. Atmosphere only, not a new layout.

Product identity is a different `data-theme` (`nutri-saas`, `mental-calm`, later Workout) set by that product's nested layout. Do not write a product theme into `rpgt-theme`. Today NutriLog and MindTrack `proxy.ts` seed that cookie with `defaultTheme: 'nutri-saas'` and `'mental-calm'`. Import the product token file in the shell `tokens.css` when the route group ships.

LifeQuest chrome stays on LifeQuest routes. It must not hardcode other products. Pass nav items as props. Today `Sidebar` hardcodes `NAV_ITEMS` plus a NutriLog Soon row. `BottomTabBar` hardcodes NutriLog Coming soon with `href: null`. Goals is missing from both even though Goals routes exist. Target chrome is dashboard, skills, goals, and account only. Do not put a product catalog in `@rpgtracker/ui`.

Product layouts own their own chrome. Tokens live in `packages/ui/tokens/`. Use `var(--color-*)`. Same behaviour in every LifeQuest skin. Apple apps keep their own chrome.

Read the CSS and components.
