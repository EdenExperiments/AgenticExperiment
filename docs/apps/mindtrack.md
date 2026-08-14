# MindTrack

Human answers are written below. **No `mh_*` migrations or `/mind` feature UI in the current suite PR.** First code PR: `mh_mood_logs` + journal + disclaimer footer, **no** chatbot. Grounding timer is a v1 job and may be that PR or the next.

When it ships on web it is `/mind` with MindTrack chrome, not a LifeQuest tab and not a second Next origin. Tables `mh_*`. API `/api/v1/mindtrack`. Apple would be its own app. See `docs/architecture.md`.

## Stance

MindTrack is for people 13+ who want private, therapy-adjacent tools (mood over time, journalling, CBT-style check-ins), not a diagnosis, crisis service, or chatbot. v1 is a 30-second mood check-in, a private journal, and a grounding timer, with UK crisis resources (999 / 111 / Samaritans) on every screen.

When AI exists it must refuse diagnosis, medication changes, self-harm or harm-to-others help, and being steered into situational advice, escalating self-harm to a crisis panel and stopping the chat. Ship `mental-calm` first. Suite skins (minimal, retro, modern, calm) can come later and must not be written into `rpgt-theme`.

Bad weeks must not cost LifeQuest streaks or write `xp_events`. Private by default. Scaffold origin `apps/mental-health` is not the product; build `/mind` in the shell.
