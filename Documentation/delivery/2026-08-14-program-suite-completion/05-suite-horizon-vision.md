# Suite Horizon Vision

**Status:** Product vision (not a dispatch pack). Does **not** change Wave 1 sessions in this folder.  
**Wave 1 (executable):** `requirements.md` + `01`–`04` workstreams.  
**This file:** the overall app you described — one purchase, several practices, one suite.

Agents implementing LQ/NL/RP/WO sessions must not pull items from this file into those PRs (D-069).

---

## What this product is

A **self-improvement operating system**: one account, one cheap suite subscription (or BYOK for AI), several focused apps that share identity, design language, and eventually progression.

It is not a generic habit tracker. It is not a medical device. It is not “Duolingo for everything” with empty streaks. The bet is:

1. People want **one place** instead of MyFitnessPal + Strong + Headspace + a notes app + a Pomodoro timer + a coach.
2. AI is useful as a **pace-aware coach**, not as a slot machine.
3. Pride needs **proof** (milestones you actually did), not a number you can grind with the screen off.
4. Health tools must **push people toward professionals** when the problem is bigger than an app.

That matches the existing mission (“levelling up as a person” without toxic hustle) and D-037 (LifeQuest as hub, other apps as domains).

---

## Commercial model (D-070)

Two honest options; they can coexist:

| Lane | What the user pays | What they get |
|------|--------------------|---------------|
| **Suite** | ~£4.99/month (or annual equivalent) | All apps, sync, themes, logging, timers, guides, social/proof features |
| **AI** | User’s own Claude key (BYOK, already built: D-003/D-015) **and/or** a small included quota on the suite plan | Coach, recipe suggest, meal photo estimate, plan drafts |

£4.99/month **cannot** include unlimited vision + coaching for every user. Token cost would eat the plan. The viable product is:

- Software suite is cheap on purpose (replace four subscriptions).
- Heavy AI is BYOK (you already store encrypted keys) or metered (“N coach turns / photo estimates per month”).
- Never pretend a takeaway photo estimate is a lab measurement.

Do not build a second billing system in Wave 1. F-075 entitlement (`pro` + stored key) is the hook; this decision only sets the destination.

---

## Pillar 1 — Skills, practice, proof, coaching (LifeQuest)

**Job:** help someone pick up or improve a real skill (sport, art, career, craft), at a pace that does not burn them out, with a coach that uses *their* logs.

**Already shipped:** skill CRUD, optional AI calibration, time-primary quick log, XP/levels/gates (visibility), Pomodoro/session timer, goals + AI goal planner, three themes.

**Wave 1 (still the hole):** actually complete a gate with evidence; optional natural-language log; ceremony; on-demand coaching.

### Proof, not brag (D-071)

XP and level can stay as the **private differentiating gimmick**. They should not be the thing you screenshot to claim “I’m level 80 guitar.”

Public or social claims should attach **proof**:

- Gate cleared with evidence (what / how / feeling, optional photo/video later).
- Goal milestones checked in.
- Session time that was actually in the timer (pause on background; optional “I stepped away”).
- “Showcase” profile shows **cleared milestones**, not raw XP.

Anti-cheat will always be incomplete (faked photos, faked chats). The product stance is: make honest proof the default social object, make empty grind look empty, and never call someone a professional because a number went up.

### Coach cadence

Not only on-demand (F-012). Horizon:

- Daily: one small next action, using last logs and the active gate.
- Weekly: F-019 review (after diary + skills both have history).
- Comfortable pace: coach may recommend **rest** (D-075). Rest is not failure.

### Focus sessions + five vibes (F-082)

Pomodoro already exists (F-024). Horizon: **at most five** licensed or user-linked audio beds (e.g. lo-fi, quiet piano, nature, brown noise, synth). Pick once per session. No infinite playlist. Licensing is the real work (F-042 was deferred for that reason). Options: royalty-free bundle you own, or “play my Spotify” via their account — do not scrape YouTube.

### Social (D-072, horizon; D-008 still blocks Wave 1)

Proud, not ranked:

- Opt-in share of a milestone card (gate clear, first 5k, first week of logging).
- Accountability pair / small party (existing F-026 idea).
- No default global “who has the highest guitar level” board. Optional, separate, clearly a game.

---

## Pillar 2 — Nutrition and food (NutriLog ± recipes)

**Job:** enough nutrition tooling to replace a basic tracker, plus **waste-aware cooking**.

Wave 1 already covers: weight (shipped), goals, calorie/macro diary, OFF search, barcode, pantry, grounded AI recipes, cook-to-diary.

If diary + recipes + fasting + photos cannot stay usable on one phone screen, split **Recipes/Cook** as a NutriLog area with its own nav first; only extract `apps/recipes` if that IA fails in use (D-066 still prefers one app).

### Horizon nutrition (not Wave 1 unless pulled later)

| Idea | Why | Care |
|------|-----|------|
| Fasting timer | Common, simple, pairs with diary | Electrolyte/medical disclaimer; no “water fast for 7 days” coaching |
| Recipe macros from ingredients | You asked; cook-from-pantry already points here | Estimates, not lab values |
| AI plate photo / “eating out” | High delight | Vision is expensive; accuracy is poor; always editable; never auto-log without confirm |
| Restaurant lookup (e.g. McDonald’s item) | Faster than photo | Use OFF + chain databases; cache; user confirm |
| Barcode | Already NL-06 | Camera fallback to typing |
| User-added recipes | RP-04 | |
| Recipe **library** | You asked for scraped sites | **Do not scrape** (D-073). Use licensed/CC datasets, partner APIs, or “paste a URL I have the right to use.” |
| Grocery list from meal plan | Natural next step after recipes | Household share later |
| Water / caffeine / alcohol | Tiny logs, big daily use | Optional modules, not the homepage |
| Progress photos | Already in original NutriLog PRD | Private by default |
| Week meal plan | Ties pantry + remaining calories | After diary exists |

---

## Pillar 3 — Fitness / workout

**Job:** log what you did (lift, yoga, cardio, stretch), give **basic** public-domain-style guides, let AI draft a plan that **always** says confirm with a PT, and later talk to watches and GPS.

Wave 1 first slice (if D-067 signed): strength sets + history + volume chart. That is still the right first vertical.

### Horizon fitness

| Idea | Notes |
|------|--------|
| Modalities | Strength, yoga, cardio (time/distance), mobility/stretching as session types on the same `wo_sessions` |
| Guide library | Short, static, sourced guides: PPL, bro split, starting strength-shaped templates, “desk hip openers.” Not a content farm. Cite sources. |
| AI plan draft | Output is a **draft**. Persistent UI: not medical advice; confirm with a qualified professional. Refuse injury-specific rehab. |
| Wearables | Calories/HR from HealthKit / Health Connect. **Web cannot do this well.** Needs PWA+native wrapper or Capacitor later (F-021 related). |
| GPS runs | Watch position, distance estimate, pause. Browser geolocation is messy in background; treat as mobile-app wave. |
| Suite link | A “Running” LifeQuest skill can receive **opt-in** XP from completed workout sessions when F-020 is designed — not before. |
| Safety | Pain flags, rest days, no “cut to 800 kcal + two-a-days” from combined nutri+workout AI. |

---

## Pillar 4 — Mental health (MindTrack)

**Job:** a supportive **tool among many**, never a therapist, never a crisis service.

**Do not implement from this paragraph.** Run the analyst session in `06-mindtrack-analyst-session.md` first (D-074).

Non-negotiables to bake into that session:

- Persistent “not therapy / not a diagnosis / seek professional help” framing.
- Crisis: UK-oriented resources (e.g. 999, 111, Samaritans) shown in-app; the model must not roleplay a clinician in an emergency.
- No gamifying self-harm, no streaks that punish a bad week.
- Data: extra sensitivity; export/delete; no social by default.

Likely first slice *after* the session (hypothesis, not a spec): mood check-in, private journal, optional breath/grounding timers, weekly pattern view, “talk to a human” directory — not an AI that claims it can treat depression.

---

## Extra suite ideas (requested; all horizon)

These are additive, not Wave 1. Grouped so they can become apps or modules later.

| Candidate | Fits because | Risk |
|-----------|--------------|------|
| **Sleep / recovery** | Completes the health triangle with nutri + training | Medical overclaim; wearable dependency |
| **Household pantry / family** | Food waste is often a household problem | Permissions, kids, shared calories |
| **Public proof profile** | Showcase without fake levels | Moderation, doxxing, teens |
| **Intel / learning paths** (F-027) | Coach + curated books/classes per skill | Content cost |
| **Location-aware classes** (F-030) | “Do the thing IRL” | Maps APIs, stale listings |
| **Weekly OS review** (F-019) | One email/screen across skills + food + training + mood | Needs all pillars to have data |
| **Rest-as-progress** | Anti-hustle, matches vision | Users who want Duolingo guilt |
| **ADHD-friendly logging** | Huge overlap with “I never open four apps” | Don’t claim treatment |
| **Creative portfolio** | Art/music skills need artifacts, not minutes | Storage cost |
| **Language / career skills packs** | Presets + coach prompts | Thin content if generic |
| **Breathwork in MH or Focus** | Tiny, high value | Don’t invent clinical protocols |
| **Grocery + meal plan calendar** | Nutrition completeness | Scope creep inside NutriLog |
| **Injury-aware “skip/swap”** | Workout safety | Liability; always defer to PT |
| **Data export** (F-022) | Trust, GDPR, “not a trap” | Do after schema settles |
| **PWA / install / push** (F-021) | Daily tools need to live on the home screen | After core loops |

Things that are **probably not** this product: dating, full EHR, physiotherapy, dietetics, banking, meditation-content licensing wars, a social network that is the product.

---

## How the pieces share a spine

```text
Account (Supabase) + encrypted BYOK + £4.99 suite flag
        │
        ▼
   LifeQuest hub  ←—— opt-in XP / showcase (F-020, later)
        │
        ├── Skills, gates, proof, coach, focus+5 vibes, social cards
        ├── NutriLog (diary, fasting, pantry, recipes)
        ├── Workout (sessions, guides, later GPS/watch)
        ├── MindTrack (after analyst session)
        └── later: Sleep, Household, Intel, Profile
```

Shared rules that never go away:

- Low-friction logging (D-019 spirit).
- AI grounded in *this user’s* data (D-066 pattern).
- Keys never in the client (D-015).
- No hub XP until the source app’s loop is real (F-020).
- Disclaimers on health, training, and mental health surfaces.

---

## Recommended sequencing (ambition vs what to smash next)

You can generate a lot of code. The constraint is **product coherence**, not typing speed.

1. **Wave 1 (this folder, signed):** LifeQuest sufficient loop + NutriLog diary/goals + pantry recipes. Optionally workout strength MVP.
2. **Wave 2:** Proof profile + proud-share social; five focus vibes; fasting timer; plate-photo *confirm* flow; restaurant lookup.
3. **Wave 3:** Workout modalities + static guides + AI plan *draft* with PT disclaimer; start native/PWA for GPS/watch.
4. **Wave 4:** MindTrack — only after `06-mindtrack-analyst-session.md` is answered.
5. **Wave 5+:** Sleep, household pantry, intel, location, weekly OS review, export.

Wave 1 is still the right next agent work. This file exists so later agents inherit the north star instead of inventing a new product each run.
