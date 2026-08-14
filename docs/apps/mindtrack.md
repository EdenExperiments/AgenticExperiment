# MindTrack

Scaffold only (`apps/mental-health`, `mental-calm` theme). **No feature code until the questions below are answered in a human session** and a two-sentence outcome is written here.

When it ships on web it is `/mind` with MindTrack chrome, not a LifeQuest tab and not a second Next origin. Tables `mh_*`. Apple would be its own app. See `docs/architecture.md`.

## Stance

Not therapy, not a diagnosis, not a crisis service. Bad weeks must not cost streaks or XP. Private by default. UK-first human resources on every screen (999 / 111 / Samaritans). Mood must not award LifeQuest XP in v1.

## Answer before build

1. Who is it for (generally well vs in-therapy adjunct vs acute distress)? Acute distress is probably out.
2. Age floor?
3. At most three v1 jobs (e.g. 30s mood check-in, private journal, grounding timer).
4. AI red lines (refuse diagnosis, refuse med changes, escalate self-harm to a crisis panel and stop the chat).
5. Theme: keep `mental-calm` only?

First slice after that, if you still want one: `mh_mood_logs` + journal, disclaimer footer, **no** chatbot in the first PR.
