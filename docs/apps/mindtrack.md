# MindTrack

MindTrack is a product for generally well adults 18+ who want a private record, including people already working with a professional between sessions. It is not for acute distress. Not therapy, not a diagnosis, not a crisis service. No mood XP. UK crisis resources on every screen. Theme is `mental-calm` only.

Overnight jobs are a 30-second mood check-in, a private journal, and a local grounding timer. There is no chatbot. `mh_*` data enters no AI prompt. Age is stated in copy. Date of birth is not stored.

When it ships on web it is `/mind` with MindTrack chrome, not a LifeQuest tab and not a second Next origin. Meditation that outgrows the LifeQuest preset becomes `/mind/meditate` on `mh_*`, not `apps/meditation`. See `docs/architecture.md`.

## Stance

Bad weeks must not cost streaks or XP. Private by default. Immediate danger: 999 or A&E. Urgent mental health help: NHS 111. Someone to talk to: Samaritans 116 123. The app does not scan notes for risk.

## Overnight defaults (reversible)

1. Who: generally well adults, plus an in-therapy adjunct who brings their own record. Acute distress is out.
2. Age floor: 18, stated on `/mind`. No date of birth.
3. Jobs: mood (valence 1–5, energy 1–3, optional 280-char note), journal, local 60/120s sit.
4. AI: none in v1. `internal/mindtrack` must not import an AI client.
5. Theme: `mental-calm` pinned. No cinematic, horror, or kawaii overlay.

First slice: `mh_mood_logs` plus `mh_journal_entries`, disclaimer footer, **no** chatbot. Do not reuse `xp_events` or the Therapy preset.
