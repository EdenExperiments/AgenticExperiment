# Theme mockup prompts

Use in Claude Code (or any visual model) in this order.

1. Paste **Prompt 0** once at the start of the chat. That is the suite bible.
2. Run **Prompt A** for a first look of the whole suite. Optionally run B–E if you want a deeper first look per product.
3. Then run the five atmosphere prompts (1–5) against those frames. Compare to token-only atmospheres in `packages/ui/tokens/atmospheres.css`.

Do not treat mockups as a new information architecture. Product routes keep their own `data-theme`. `pages.css` must not gain new `[data-atmosphere]` copies.

## Shared constraints for every prompt

You are restyling existing screens. Do not invent a new information architecture.

Axes:

- `data-theme` is `minimal` | `retro` | `modern` for LifeQuest.
- `data-atmosphere` is `none` | `cinematic` | `horror` | `kawaii`. Token remints only.
- `data-mode` stylish already exists.
- Product identity is `nutri-saas`, `workout-forge`, or `mental-calm` on the nested layout. Never write those into `rpgt-theme`.

Keep 44px targets, focus rings, warning meaning, and text contrast. Honour `prefers-reduced-motion`. No gore, flashing, audio, jump scares, or threatening copy. Horror and kawaii never appear on `/mind`.

Return annotated desktop and mobile frames plus the CSS custom properties you would change.

---

## Prompt 0. Suite bible (paste first)

```
You are designing UI mockups for an existing web suite. Do not invent a new product. Do not add screens that are not listed. Do not copy a competitor’s IA.

MISSION
One account. Several focused products. One inexpensive suite subscription. AI is BYOK and/or a small included quota, not unlimited tokens inside a cheap plan.

Job: help someone practise skills, eat, train, and look after mood, without four other subscriptions, and without pretending the app is a clinician, dietitian, or PT.

The suite is not the differentiator. These bets are:

1. Proof, not streaks. A cleared gate with evidence, a closed fast, a finished session, a dated journal line. New products do not have streak counters. A missed Tuesday is absence, not a broken chain.
2. Rest is a non-event. No shame state, no rest-day XP, no “you should train today.”
3. Cook what you have. Recipes start from the pantry. Empty pantry does not call Claude. We do not scrape a stock recipe library.
4. One clock you close. Fasting is one open fast per person. Workout is one in-progress session. Opening is idempotent. Closing produces a receipt.
5. Mood never becomes points. MindTrack writes private records only. No chatbot. No mood score. UK crisis resources on every MindTrack screen.
6. Unknown stays unknown. Missing macros and unloaded sets are labelled, not invented.
7. Atmosphere is play. Cinematic, horror, and kawaii dress LifeQuest only. Each other product keeps its own identity. Horror never touches MindTrack.

Web shape: one authenticated Next app. LifeQuest is the hub. Other products are route groups with their own chrome. They are not LifeQuest tabs. Apple later is several apps, not one tabbed binary.

THEME SYSTEM (three axes, do not collapse them)
- LifeQuest skin on <html>: minimal (clean light productivity), retro (dark warm RPG), modern (dark sci-fi cyan). Cookie rpgt-theme. Optional stylish mode on top (rpgt-mode).
- Atmosphere overlay on LifeQuest only: none | cinematic (gold light, slow shadow) | horror (crushed blacks, crimson, LifeQuest only) | kawaii (softer radius, candy accent, data stays serious). Cookie rpgt-atmosphere. Token remints only. Do not duplicate page CSS per vibe.
- Product identity on the nested layout, never written into rpgt-theme:
  - NutriLog: nutri-saas (light clinical greens)
  - Workout: workout-forge (dark iron, tabular numbers)
  - MindTrack: mental-calm (soft neutrals, low motion). No cinematic, horror, or kawaii.

Chrome
- LifeQuest tabs: Dashboard, Skills, Goals, Account.
- NutriLog tabs: Today, Fast, Cook, Weight.
- Workout tabs: Today, History.
- MindTrack tabs: Check-in, Journal.
- Hub cards on /dashboard enter a product. Metrics are receipts (None, a live clock, a last title), never streaks.

PRODUCTS AND FUNCTIONALITY (what exists today)

LifeQuest (hub) — /dashboard, /skills, /goals, /account
Practise real skills (sport, art, career). Optional private XP and levels. Shareable claims need evidence.
Loop: create skill → optional AI calibration → log time (quick) or run a session (simple or pomodoro) → XP/level → blocker gate at tier boundaries → submit evidence to clear → keep levelling.
Gates sit at levels 9, 19, … 99. An active gate replaces the XP bar. Self-report evidence can clear an owned gate. AI assessment needs a stored key and is not required for the first visual pass.
Quick log is time chips, not XP chips. Rest is not failure. Do not award hub XP from other products.
Presets such as Strength Training, Calorie Track, Intermittent Fast, Meditation, Sleep Hygiene, and Therapy are LifeQuest skill presets, not the other products.

NutriLog — /nutri
Eat from what you have. Weight, fasting, pantry, manual recipes, cook-to-diary.
Today board: open fast elapsed or None, pantry count, last meal, weight log.
Fast: one open clock. Targets 12, 14, 16, 18, 20, 24, 36 hours. Progress toward target. Complete or stop early. Closed fasts list duration. Fasting is not a diet identity.
Cook: add pantry items → write a manual recipe from what is in the house → Cook and log writes a diary receipt. Nutrition missing stays “not entered.” Empty pantry refuses cooking and does not invent a meal. Cook does not deplete pantry amounts yet.
Weight: kg, chart, notes. Calorie goals are later and would be NutriLog’s own, not LifeQuest goals.
Do not show Open Food Facts, plate photos, restaurant lookup, or a scraped recipe library in these mockups.

Workout — /workout
Sets, optional load kg, optional RPE. No XP. Not a LifeQuest skill.
Loop: start one session (named, e.g. Lower body) → log free-text exercise sets → finish → history shows the receipt. Unloaded sets say bodyweight and are excluded from kg volume. Last finished session can show on Today.
No exercise library, GPS, watches, volume charts, or “you should train today.”

MindTrack — /mind
Private record for generally well adults 18+, including people already working with a professional between sessions. Not therapy, not a diagnosis, not a crisis service, not for acute distress.
First screen: 18+ acknowledgement. Then mood check-in (valence 1–5, energy 1–3, optional 280-character note), recent rows with no score, local 60/120 second sit timer that saves nothing. Journal is private pages, not sent to AI, not scored.
Every screen: UK footer. Immediate danger 999 or A&E. Urgent help NHS 111. Someone to talk to Samaritans 116 123. The app does not scan notes for risk.
No chatbot, no mood XP, no streaks, no horror or kawaii skin.

WHAT NOT TO DRAW
Leaderboards, streak flames, shame empty states, “missed a day,” therapy chat, calorie fire, invented macros, recipe-site grids, Apple watch complications, a fifth Next app, NutriLog/Workout/MindTrack inside LifeQuest tabs, gore, jump scares, flashing, threatening copy.

OUTPUT FOR THIS MESSAGE
Restate the mission in five sentences. Then a one-screen map of the suite (hub plus four products, nav for each). Ask no product questions that the bible already answered. Wait for the next prompt to draw.
```

---

## Prompt A. Initial suite look

```
Using the suite bible already in this chat, produce an INITIAL design pass. Atmosphere is none. Stylish is off.

Frames (desktop 1440 and mobile 390 for each):

1. /dashboard hub. LifeQuest chrome (Dashboard, Skills, Goals, Account). Focus skill, quick log, activity. Three product doors: NutriLog “Eat from what you have,” Workout “Sets, load, and RPE,” MindTrack “Private check-ins.” Door metrics are receipts (e.g. Fast 2h 0m, Session None, Mood 4) or None. No Coming Soon. No streak counts.

2. LifeQuest skill detail with an active blocker gate and a self-report evidence form. XP bar hidden behind the gate.

3. NutriLog /nutri today. nutri-saas identity. Open fast card, pantry count, last meal, weight panel. NutriLog chrome, not LifeQuest tabs.

4. Workout in-progress session. workout-forge identity. Free-text set row (exercise, reps, kg, RPE), set list, Finish session. Tabular numbers.

5. MindTrack check-in after 18+ ack. mental-calm identity. Mood 1–5, energy 1–3, optional note, recent rows, sit timer, UK crisis footer always visible.

Show the same LifeQuest frames (1 and 2) in all three skins: minimal, retro, modern. Product frames stay on their identity theme. Annotate type, colour tokens, radius, and what must not change (44px targets, contrast, warning meaning).

Do not design atmospheres yet. Do not add screens. Return a short token table per frame.
```

---

## Prompt B. LifeQuest first look (optional)

```
Using the suite bible, design LifeQuest only. Atmosphere none.

Screens: /dashboard, /skills list with cards, /skills/[id] with an active gate plus evidence form, /skills/[id]/session in timer phase (simple or pomodoro), /goals list, /account theme picker (minimal / retro / modern, plus atmosphere row that you will not apply yet).

Chrome is Dashboard, Skills, Goals, Account. Same component tree in minimal, retro, and modern. XP is private. Proof is the cleared gate. Quick log is minutes. Rest has no shame treatment.

Return desktop and mobile, token diffs, and notes on how atmosphere could later remint colour and shadow without new layout.
```

---

## Prompt C. NutriLog first look (optional)

```
Using the suite bible, design NutriLog only on nutri-saas. Atmosphere unset. Never horror or kawaii.

Screens: /nutri today board, /nutri/fast (idle start with 12–36h targets, and an open clock with progress toward target plus Complete / Stop early), /nutri/cook (empty pantry refusal copy, pantry list, manual recipe, cook receipt with “Nutrition not entered”), /nutri/weight (kg log + chart).

Chrome: Today, Fast, Cook, Weight. A Suite link back to /dashboard. Rest days still count as showing up. Fasting is a clock, not a lifestyle badge.

Return desktop and mobile plus a token table (clinical greens, light surfaces, Inter-like sans).
```

---

## Prompt D. Workout first look (optional)

```
Using the suite bible, design Workout only on workout-forge. Atmosphere unset.

Screens: /workout today (start form or continue open session, last finished receipt), /workout/session/[id] (log set grid, set list, bodyweight vs loaded kg, Finish), /workout/history (finished receipts only, gaps are not red squares).

Chrome: Today, History. No XP. No library. Free-text exercise names. Tabular numbers, dark iron, warm accent.

Return desktop and mobile plus a token table.
```

---

## Prompt E. MindTrack first look (optional)

```
Using the suite bible, design MindTrack only on mental-calm. Atmosphere none. Never cinematic, horror, or kawaii.

Screens: 18+ acknowledgement, /mind check-in (mood, energy, note, recent, sit 60/120s), /mind/journal (write a page, private list, delete). UK crisis footer on every frame (999 / A&E, NHS 111, Samaritans 116 123).

Quiet, private, low motion. No score, no streak, no chatbot, no decorative characters. Copy stays adult and non-clinical.

Return desktop and mobile plus a token table (soft neutrals, muted accent, large radius, reduced motion).
```

---

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
