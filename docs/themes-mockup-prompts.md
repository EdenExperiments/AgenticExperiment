# Theme mockup prompts

Use these tomorrow in Claude Code to generate mockups. Compare them to the token-only atmospheres already in `packages/ui/tokens/atmospheres.css`. Do not treat the mockups as a new layout. Product routes keep their own `data-theme`.

## Shared constraints for every prompt

You are restyling existing screens. Do not invent a new information architecture.

Axes:

- `data-theme` is `minimal` | `retro` | `modern` for LifeQuest.
- `data-atmosphere` is `none` | `cinematic` | `horror` | `kawaii`. Token remints only.
- `data-mode` stylish already exists.
- Product identity is `nutri-saas`, `workout-forge`, or `mental-calm` on the nested layout. Never write those into `rpgt-theme`.

`pages.css` must not gain new `[data-atmosphere]` copies. If a component looks wrong, point it at variables.

Keep 44px targets, focus rings, warning meaning, and text contrast. Honour `prefers-reduced-motion`. No gore, flashing, audio, jump scares, or threatening copy. Horror and kawaii never appear on `/mind`.

Return annotated desktop and mobile frames plus the CSS custom properties you would change.

## Prompt 1. Cinematic LifeQuest and Workout

Redesign the active LifeQuest skill gate and the in-progress Workout session using the existing semantic layout and controls. Apply a cinematic atmosphere through backdrop, vignette, glow, depth, and slow reduced-motion-safe effects. Show minimal, retro, and modern LifeQuest skins using the same component tree. Then one Workout frame on `workout-forge` with atmosphere unset. Keep focus rings, warning meaning, text contrast, and 44px targets unchanged.

## Prompt 2. Horror LifeQuest only

Explore a restrained horror atmosphere for LifeQuest only. Use shadow, grain, angular decoration, dim crimson accents, and suspenseful negative space without gore, flashing, audio, jump scares, threatening copy, or reduced legibility. Apply it to the dashboard and a blocker gate with one shared component structure across minimal, retro, and modern. Identify every effect as a CSS custom property. Do not include MindTrack, body-weight, food, or mood screens.

## Prompt 3. Kawaii LifeQuest only

Explore a kawaii atmosphere for LifeQuest only using soft decorative shapes, small character accents, rounded highlights, and gentle motion. Keep skill evidence, warnings, and progress data serious and readable. Show the same dashboard and skill-detail component tree in minimal, retro, and modern, with the atmosphere expressed only as effect tokens and optional decorative assets. Include mobile, high-contrast, and reduced-motion states. Do not rewrite copy or add collectible mechanics.

## Prompt 4. Product identities

One pass of `/nutri` (weight + open fast + pantry) on `nutri-saas` with atmosphere unset. Then `/workout` in-progress session on `workout-forge`. Then `/mind` mood + journal + crisis footer on `mental-calm`. Never apply horror or kawaii to `/mind`. Write token diffs only under `packages/ui/tokens/`. No new Next origin.

## Prompt 5. Hub doors

Second pass: product cards on `/dashboard` (title, tagline, href, no streak metrics). LifeQuest chrome is dashboard, skills, goals, and account passed as props. Check that `/nutri` does not show LifeQuest tabs.
