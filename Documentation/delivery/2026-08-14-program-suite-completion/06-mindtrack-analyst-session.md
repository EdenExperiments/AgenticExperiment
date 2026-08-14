# MindTrack — Analyst session brief

**Purpose:** A structured requirements session for the mental health app **before any implementation**.  
**Decision:** D-074 — do not dispatch MindTrack coding agents until this session produces a signed `requirements.md` of its own.  
**Related:** `apps/mental-health/` is a scaffold only (layout, BFF, `mental-calm` theme). No `mh_` schema is reserved yet.

This is not therapy design. It is product-risk design: supportive enough to be useful, honest enough that nobody thinks the app is their clinician.

---

## Stance to lock in the room (propose, then confirm)

1. MindTrack is **one tool among many** (sleep, friends, exercise, therapy, medication from a doctor). It does not replace any of those.
2. The product **never diagnoses**, never claims to treat depression/anxiety/trauma, never says “I am your therapist.”
3. In distress, the UI and any model **route to human help** (UK: 999, 111, Samaritans, local emergency). The model does not do crisis counselling.
4. Logging a bad week **must not** cost a streak, XP, or public status. Rest and low mood are valid states (aligns with D-075).
5. Data is **private by default**. Social features from LifeQuest do not apply here unless the user creates an explicit, separate share.

If any of those five fail the session, stop. Do not “ship a chatbot and add a disclaimer footer.”

---

## Session agenda (90–120 minutes)

### Block A — Who it is for (20 min)

| # | Question | Why it matters |
|---|---------|----------------|
| A1 | Primary user: generally well people who want a mood log, people in therapy who want a between-session journal, people in acute distress, or all three? | Acute distress needs a different product (and probably not this one). |
| A2 | Age: 18+ only? 16+? | Safeguarding, social, crisis copy. |
| A3 | UK-first copy and resources, or also US/EU from day one? | Emergency numbers, tone, regulators. |

**Default if skipped:** 18+, UK-first resources, “generally well + in-therapy adjunct,” **not** a crisis product.

### Block B — Jobs to be done (25 min)

Pick at most **three** v1 jobs. Everything else is horizon.

Candidates:

- Daily mood + energy + sleep-hours check-in (30 seconds).
- Private journal (text only).
- Grounding / box-breathing timer (no clinical protocol names you cannot source).
- “What helped last time” personal list.
- Weekly pattern chart (private).
- Therapy homework tracker (user-authored tasks, not AI-invented treatment).
- AI reflection that **summarises the user’s own words** and asks a question — never advice like “you should stop your medication.”

**Out of v1 unless you explicitly pull them in:** couples mode, clinician dashboard, CBT course licensing, medication adherence with dosing, community forums, AI that roleplays a named therapy modality.

### Block C — AI red lines (20 min)

Write “must refuse / must escalate” as a table. Minimum rows:

| User says / does | Product does |
|------------------|--------------|
| Active plan to harm self or others | Immediate crisis panel; no continuing chat; no XP |
| Asks “do I have depression?” | Refuse diagnosis; suggest talking to a GP/qualified professional |
| Asks to change prescribed meds | Refuse; GP/pharmacist |
| Wants a friend to see their journal | Default no; if ever, explicit per-entry share |
| Wants the coach to be available at 3am as their only support | Copy that the app is not that; show human resources |

Model: same BYOK/entitlement as the rest of the suite, with a **stricter** system prompt and logging ban on journal text in CI.

### Block D — Relationship to the rest of the suite (15 min)

| # | Question | Default |
|---|---------|---------|
| D1 | Does a MindTrack check-in ever award LifeQuest XP? | **No** in v1 (F-020 still later; mood XP is ethically loaded) |
| D2 | Can the skills coach mention “you logged low energy, maybe a shorter practice”? | Opt-in only, after v1 |
| D3 | Same three LifeQuest themes, or `mental-calm` only? | `mental-calm` only for v1 (calmer surface) |

### Block E — Safety operations (15 min)

- Who reviews reported content if social is ever added? (Default: no social.)
- Retention: can the user wipe journal + mood in one action?
- Export: include MindTrack in F-022 later.
- App store / web copy: who signs off the medical-adjacent wording?

---

## Suggested v1 slice (hypothesis for after sign-off)

Only if Blocks A–E agree:

1. Reserve `mh_` schema: `mh_mood_logs`, `mh_journal_entries`.
2. Auth-gated `apps/mental-health` dashboard: today’s check-in, 14-day sparkline, journal list.
3. Persistent disclaimer + crisis footer on every screen.
4. **No** AI in the first MindTrack PR. Add summariser later behind the red-line table.

That is the NutriLog-weight equivalent: one honest loop, no chatbot theatre.

---

## Outputs of this session

1. Signed `Documentation/delivery/<date>-epic-mindtrack-v1/requirements.md`
2. Tracker: F-092 session `done`; first MindTrack feature IDs `ready-for-planning`
3. Architecture: `mh_` prefix paragraph (mirror `nl_`)
4. Decision-log entries for whatever you locked (diagnosis ban, no XP, theme)

Until those exist, `apps/mental-health/` stays scaffold.
