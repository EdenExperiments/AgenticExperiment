# UX Specification — Information Architecture, Navigation, and Core Journeys

Last updated: 2026-03-16 (user direction: 10-tier structure applied — tier color table expanded to 11 tiers; gates updated to 9–99 (10 total); chip amounts updated to tier-scaled presets; Legend replaces Master as top tier; Grandmaster is tier 10; level picker marks all 10 tier boundaries; prior: review fix /account/password; ux-agent initial pass)

---

## 0. Purpose and Scope

This document defines the UX specification for the release-1 unified app shell. It is the authoritative reference for:

- Information architecture: what sections exist and how they relate
- Navigation model: how users move within LifeQuest and how the shell accommodates NutriLog when it arrives
- Core user journeys: skill creation (both paths), quick XP logging, progress/level display, and blocker gate visibility
- Mobile-first expectations: what must work on a 375 px phone screen from day one
- UX decisions that affect scope or sequencing

This document does not design NutriLog screens. It reserves the correct shell slots and navigation affordances so NutriLog can be added without rework.

---

## 1. Information Architecture

### 1.1 Top-Level Shell Sections

The unified app shell has four top-level sections for release 1. NutriLog is represented as a placeholder section in the navigation — present but locked with a "Coming Soon" state — so the navigation structure does not change when NutriLog launches.

| Section | Route Pattern | Release 1 State | Notes |
|---|---|---|---|
| Dashboard | `/dashboard` | Active | Home screen; LifeQuest skills overview |
| LifeQuest | `/skills` and `/skills/*` | Active | Skill list, skill detail, log entry, progress |
| NutriLog | `/nutri` | Placeholder — locked | Navigation item visible; tapping shows "Coming Soon" state |
| Account | `/account` | Active | Claude API key, auth settings, display name |

The dashboard is the post-login landing screen. It shows the user's active skills in a summary card list. In release 1, the dashboard and the LifeQuest section cover the same data set from two angles: the dashboard is a quick-glance overview; the LifeQuest section is the full management area.

### 1.2 LifeQuest Sub-Sections

Within LifeQuest, the information hierarchy is:

```
/skills                         — Skill list (all skills, active)
  /skills/new                   — Skill creation flow (manual + AI paths)
  /skills/{id}                  — Skill detail: current level, XP bar, tier, recent logs, blockers
    /skills/{id}/log            — Quick XP log entry (can also be triggered from skill detail)
    /skills/{id}/edit           — Skill edit (name, description)
```

Skill deletion is handled via a destructive confirm action on the skill detail or edit screen, not a separate route.

### 1.3 Account Sub-Sections

```
/account                        — Account overview (display name, email)
  /account/api-key              — Claude API key management (add, update, delete)
  /account/password             — Password change form (GET renders form; POST handles submission)
```

Sign out is an action surfaced directly on the account view (no sub-route). Password change routes to `/account/password` because it requires a dedicated form with current-password confirmation — not suitable as an inline action on the account overview.

### 1.4 NutriLog Placeholder Section

The NutriLog nav item is visible in the navigation bar from release 1. Tapping it loads a single-screen placeholder that:

- States the feature is coming in a future update
- Does not expose any NutriLog data fields or forms
- Does not require any NutriLog schema or API routes

This preserves the shell IA so that when NutriLog launches, only the placeholder screen content is replaced with real screens. The nav item, route, and slot are already in place.

### 1.5 What Does Not Exist in the IA (Release 1)

The following areas are explicitly absent from the IA and must not appear in the navigation or URL structure in release 1:

- Blocker completion flow (deferred, D-010)
- Meta-skills management (deferred, A-003)
- Social or sharing pages (out of scope, D-008)
- NutriLog functional screens (deferred, D-004)
- Notifications or PWA install prompts (deferred, D-006)

---

## 2. Navigation Model

### 2.1 Mobile Navigation Pattern (confirmed: bottom tab bar)

On mobile (viewport width < 768 px), the primary navigation is a fixed bottom tab bar with four items:

```
[ Dashboard ]  [ LifeQuest ]  [ NutriLog ]  [ Account ]
     home          sword         leaf          person
```

The bottom tab bar is always visible except during the skill creation flow, where it is hidden to give the multi-step form the full viewport height. A back affordance (chevron left + section title) replaces it during flows.

**Rationale (D-017):** A fixed bottom tab bar is the lowest-friction navigation pattern on mobile because thumb reach to the bottom of the screen is natural. A hamburger menu requires an extra tap and is poor for an app with exactly four sections. A top tab bar competes with the status bar and forces the thumb to the top of the screen. Four tabs is within the standard guideline of five or fewer; the NutriLog placeholder occupies its slot from day one so the layout is stable at NutriLog launch.

### 2.2 Desktop Navigation Pattern

On desktop (viewport width >= 768 px), the primary navigation is a left sidebar:

```
[App logo / name]

• Dashboard
• LifeQuest          (expanded to show sub-items when active)
    Skills
    + Add Skill
• NutriLog            (Coming Soon label)
• Account

[Sign Out]
```

The left sidebar is collapsible on medium-width viewports (768–1024 px) to a narrow icon-only rail. On wide viewports (> 1024 px) it is permanently expanded.

### 2.3 Moving Between Product Areas

Users move between LifeQuest and NutriLog by tapping the respective tab or sidebar item. There is no workflow that forces the user between areas in release 1. Cross-area mechanics (such as calorie deficit feeding XP) are deferred to the cross-app layer (F-020).

### 2.4 In-Section Navigation

Within LifeQuest, navigation uses the following patterns:

- Skill list → skill detail: tap the skill card
- Skill detail → quick log: tap the primary "Log XP" button (see Section 4)
- Skill detail → edit: tap the edit icon (kebab menu or pencil icon, top right)
- Any sub-screen → back to list: breadcrumb trail or back chevron in the page header
- Skill creation: forward-only multi-step flow with a back affordance

### 2.5 HTMX Navigation Approach

Because the stack uses HTMX with server-rendered fragments:

- Tab bar links use `hx-get` with `hx-target="#main-content"` to swap the main content area without reloading the shell
- The URL is updated via `hx-push-url` so browser back/forward works correctly
- The active tab highlight is set server-side by the Go handler including a CSS class in the rendered fragment
- Full-page reloads are acceptable for auth flows (login, register, sign out)

---

## 3. Skill Creation Journey

### 3.1 Overview

Skill creation has two explicit paths:

- **Manual path**: always present, requires no Claude API key. This is the required fallback.
- **AI-assisted path**: optional, only available if the user has a stored Claude API key. Degrades gracefully if the key is absent or the Claude call fails.

The entry point is the "+ Add Skill" action on the skill list or sidebar. On mobile, this is a floating action button (FAB) in the bottom-right corner of the skill list screen.

### 3.2 Step Sequence: Manual Path

The manual path is a three-step flow:

```
Step 1: Skill Basics
  - Skill name (required, text input, max 60 characters)
  - Skill description (optional, textarea, max 400 characters)
  - AI calibration offer: "Want AI to help set your starting level?" [Yes, use AI] [No, I'll set it manually]
    — This offer is only shown if a Claude API key is present.
    — If no key is present, step 1 goes directly to step 2 (no offer shown).

Step 2: Starting Level
  - Prompt: "Where are you starting? Be honest — this is for you, not a leaderboard."
  - Level picker: a scrollable list or segmented selector showing levels 1 through 30
    (the range covers Novice through early Expert; advanced levels available via "Show more")
  - Each level shows: the level number, the tier name, and a one-line tier description
    Novice (1–9): "Just starting out or returning after a long break"
    Apprentice (10–19): "Comfortable with the basics, building consistency"
    Journeyman (20–29): "Solid competence, tackling harder challenges"
    Expert (30–59): "Advanced practitioner with deep experience"
    Veteran (60–99): "Years of dedicated practice, rare expertise"
    — Master (100+) is not available in the starting-level picker.
      Rationale: Master requires years of daily use to reach through normal play (D-016).
      Allowing a self-reported Master start would undermine the tier's aspirational meaning.
      A user who is genuinely Master-caliber starts at Veteran (99) and advances quickly.
      This is confirmed as D-018.
  - Default selection: Level 1 (Novice)
  - Tier boundary callouts: at level 10, 20, and 30, a subtle visual marker and label
    remind the user that crossing this boundary means entering a new tier.

Step 3: Confirm and Create
  - Summary card: skill name, description (if provided), selected starting level, tier name
  - Blocker gates: informational display of the first three default gates at levels 9, 19, 29
    with a note "…and 7 more gates at levels 39–99" (10 gates total, one per tier)
    — Shown as a collapsed "What are Blocker Gates?" section; not mandatory reading
    — Gate descriptions at this point are the default placeholder values set by the system
    — Users cannot edit gate descriptions during creation in release 1
      (editing gates is a Phase 3 feature; placeholder descriptions are set automatically)
  - [Create Skill] primary action button
  - [Back] secondary action

On success: user is taken to the newly created skill's detail screen.
```

### 3.3 Step Sequence: AI-Assisted Path

The AI-assisted path branches from Step 1 if the user selects "Yes, use AI" and a valid Claude API key is present.

```
Step 1: Skill Basics
  (same as manual path)
  User selects [Yes, use AI]

Step 1b: AI Calibration
  - Prompt to Claude (server-side): the skill name and description are sent to Claude
    with a prompt asking it to:
    a. Suggest a starting level with reasoning
    b. Generate tier-appropriate milestone descriptions for gates at 9, 19, 29, 39, 49, 59, 69, 79, 89, 99
    c. Generate a mastery description for what "Legend" looks like in this skill
  - UI during generation: the calibration step shows a loading indicator:
    "Calibrating your skill with AI..." with a spinner or skeleton
  - Response display (streamed): Claude's suggestion appears as:
    "Based on your description, I'd suggest starting at Level [N] ([Tier]).
    [2–3 sentence rationale]"
    — The user sees the reasoning, not just a number
  - Level acceptance: [Accept this level] [Choose a different level]
    — If user accepts: pre-selects the AI-suggested level in step 2 but user can still
      change it (the AI suggestion is a starting point, not a forced value)
    — If user declines: goes to manual step 2 (standard level picker, no pre-selection)
  - AI gate descriptions: streamed below the level suggestion as:
    "I've drafted blocker gate descriptions for your skill:"
    Gate 1 (Level 9): [AI-generated description]
    Gate 2 (Level 19): [AI-generated description]
    Gate 3 (Level 29): [AI-generated description]
    — These are used as the gate description values when the skill is created
    — User cannot edit them inline at this step (editing deferred to skill edit, Phase 3)

Step 2: Starting Level (AI pre-selected, still editable)
  (same as manual step 2, with AI-suggested level pre-highlighted)

Step 3: Confirm and Create
  (same as manual step 3)
  If AI generated gate descriptions: they appear in the blocker gate summary instead of
  the system default placeholders.

On success: user is taken to the newly created skill's detail screen.
```

### 3.4 AI Path Degradation

If the Claude key is absent the AI calibration step is skipped and the flow continues directly to manual Step 2. If the key is present but the API call fails mid-flow, the AI calibration step is replaced with one of the following inline notices, depending on the HTTP status returned:

- **401 (invalid key):** "Your Claude API key appears to be invalid. Check your key in Account settings. You can set a starting level manually below."
- **429 (rate limit):** "Claude API rate limit reached. Try again shortly, or set a starting level manually below."
- **All other failures (network error, 5xx, timeout):** "AI calibration is unavailable right now. You can set a starting level manually below."

In all three cases the outcome is identical: the manual level picker is shown immediately below the notice and the user proceeds from there. No data entered in Step 1 is lost. The user never sees a hard error or dead end — the manual path is always available.

### 3.5 Mobile Skill Creation Expectations

- Each step occupies the full viewport (no persistent bottom tab bar during the flow)
- Step indicator (1 of 3 / 2 of 3 / 3 of 3) visible at the top of each step
- The level picker on mobile uses a touch-scrollable list, not a dropdown — dropdowns are poor on mobile for a range of 1–99
- Text inputs use appropriate keyboard types (`type="text"` for skill name, `inputmode="none"` for level picker)
- Primary action button is full-width, placed at the bottom of the viewport, above the safe area
- The [Back] action is a text link or small button at the top left — not a second full-width button

---

## 4. Quick XP Logging Journey

### 4.1 The Two-Tap Primary Path and Three-Tap Secondary Path

The hard acceptance criterion from planning (Phase 2 exit criterion 3) is: a user can log a quick XP entry against a skill in three taps or fewer on mobile. Both paths below satisfy this criterion (D-019).

**Primary fast-log path (2 taps from the skill list) — canonical for mobile:**

```
Tap 1: Tap the `+ Log` icon on a skill card (skill list or dashboard card)
         → Opens the quick-log bottom sheet directly; no skill detail navigation

Tap 2: Tap an XP amount chip (preset XP values scale by tier; Tier 1 Novice: 50, 100, 250, 500)
         → Selects the XP amount

Tap 3: Tap [Log XP] confirm button
         → Submits the log entry; XP and level update immediately
```

Tapping the `+ Log` icon is the primary path optimised for mobile. It opens the bottom sheet in one tap from the skill list, making the full sequence two taps to chip selection and three taps total to submission. This is the interaction that satisfies the "3 taps or fewer" criterion most efficiently.

**Secondary path (3 taps via skill detail) — acceptable, not the fast-log path:**

```
Tap 1: Tap the skill card body
         → Opens the skill detail screen

Tap 2: Tap the [Log XP] button on the skill detail screen
         → Opens the quick-log bottom sheet

Tap 3: Tap an XP amount chip
         → Selects the XP amount

Tap 4: Tap [Log XP] confirm button
         → Submits the log entry
```

The secondary path is 4 taps end-to-end (still within an acceptable range for users who want to review their skill detail first), but it is not the primary fast-log path. The acceptance criterion is met by the primary path.

This interaction requires no text entry on either path. The user never needs to navigate to a separate logging screen.

**Decision (D-019):** The quick-log interaction is a bottom sheet (modal drawer from the bottom of the screen) that appears over the current screen without a full navigation change. On desktop, this is a modal dialog. The bottom sheet pattern avoids a page transition and keeps the user oriented on the skill list — they can quickly log XP for multiple skills in sequence without navigating back each time.

### 4.2 Quick-Log Bottom Sheet Contents

```
Bottom sheet (mobile) / Modal dialog (desktop):

Header: [Skill Name] — Quick Log
Close: × (top right of sheet header)

XP Amount (required):
  [ X XP ]  [ X XP ]  [ X XP ]  [ X XP ]  [ Custom ]
  — Four tier-scaled preset amounts computed by QuickLogChips(skill.current_level)
  — Tier 1 (Novice, L1–9) example: [50] [100] [250] [500]
  — Tier 10 (Grandmaster, L90–99) example: [225] [450] [1150] [2300]
  — Tap-selectable chip buttons; one must be selected before submitting
  — Default selection on every open: the second chip (100 XP equivalent for Tier 1)
  — Custom amount: a "Custom" chip opens a number input field inline

Note (optional):
  [                                        ]
  — Single-line text input, placeholder: "What did you do? (optional)"
  — Keyboard appears below the note field
  — Note field is below the XP chips; it does not appear by default in the minimal flow
    Actually: the note field IS visible but clearly marked "(optional)" and can be ignored
    — This keeps Tap 1 → Tap 2 → Tap 3 clean even if the field is visible

[Log XP]  ← Full-width primary button at the bottom of the sheet
```

XP amounts visible without any interaction: four tier-scaled presets. A user who wants an XP amount not in this list taps "Custom" (a fifth chip) and enters a number.

### 4.3 Where the Log XP Entry Point Lives

The "Log XP" entry point is present in three places:

1. **Skill card on skill list** — a `+ Log` icon in the card's bottom-right corner triggers the bottom sheet directly from the list. This is the primary fast-log entry point (see Section 4.1).
2. **Skill detail screen** — a prominent "Log XP" button at the top of the action area; this is the entry point for users who navigate to skill detail first (secondary path).
3. **Dashboard skill card** — same `+ Log` icon as the skill list card; same primary fast-log behaviour.

This redundancy ensures the minimum tap path is achievable from wherever the user is.

### 4.4 Post-Log Feedback

After a successful XP log:

- The bottom sheet / modal closes
- The skill card on the list and skill detail (if visible) update in-place via HTMX partial swap
- A brief toast notification appears: "[Skill Name] +[N] XP — Level [current]" with the tier name
- If the log causes a level-up (that is not blocked by a gate), the toast highlights the new level: "Level up! Now Level [N] [Tier]"
- If the log causes the user to reach a blocker gate for the first time, a different toast/modal appears — see Section 6 for blocker gate UX

### 4.5 Mobile Quick-Log Expectations

- The bottom sheet must be reachable in three taps from any screen in the LifeQuest section
- XP chip buttons must be at minimum 44 × 44 pt touch targets
- The [Log XP] button must be at minimum 48 px tall and full-width
- The keyboard must not cover the [Log XP] button when the note field is focused (the sheet scrolls up or the button is pinned above the keyboard)
- Idempotency: if the user double-taps [Log XP], only one entry is submitted (HTMX `hx-disabled-elt` on button + server-side dedup per architecture spec)

---

## 5. Progress and Level Display Journey

### 5.1 Skill Detail Screen Layout

The skill detail screen is the primary progression display surface. It is designed to make the user's tier, level, and XP progress immediately legible on a mobile screen.

```
Skill Detail Screen Layout (mobile, top to bottom):

─────────────────────────────────
[ ← Skills ]            [ ⋮ Edit ]
─────────────────────────────────
Skill Name                        ← large heading
Tier name — Level N               ← e.g. "Journeyman — Level 23"
─────────────────────────────────

[XP Progress Bar]
  NNN XP / NNNN XP to level N+1   ← below bar, small text

─────────────────────────────────
[ Log XP ]                        ← primary action, full-width
─────────────────────────────────

Skill description (if set)
  [collapsed if > 3 lines, "Show more"]

─────────────────────────────────
Blocker Gate (if active)
  See Section 6
─────────────────────────────────

Recent Logs
  [compact log entry list, last 5–10 entries]
  [Show all logs — deferred to Phase 3]
─────────────────────────────────
```

### 5.2 Tier Name Display Rules

Tier names are surfaced prominently at all progression display points. The tier name is never hidden or reduced to a subtitle — it is part of the core identity of the skill's progression state.

**Tier name placement:**
- Skill detail: tier name appears on the same line as the level number — "Journeyman — Level 23"
- Skill card (list / dashboard): tier name appears as a badge or subtitle below the skill name
- Quick-log post-log toast: tier name included — "Now Level 23 Journeyman"
- Level-up notification: tier name is the first word in the message
- Tier transition notification: special variant (see 5.3)

**Display format:** [Tier Name] — Level [N]. Use an em dash as separator. Tier name is title-cased.

### 5.3 XP Progress Bar

The XP progress bar shows progress from the current level to the next level. It does NOT show cumulative XP — it shows only the XP within the current level band.

```
Level 23 (Journeyman)
XP in current level: 2,400 / 7,950 XP to level 24
[███████████░░░░░░░░░░░░░░░░░░░] 30%
```

**Bar design:**
- Height: 12 px (mobile), 8 px (desktop compact card)
- Fill color: differs by tier (see color system below)
- Background: gray-100 or similar low-contrast background
- Rounded ends

**Tier color system (D-020):**

| Tier | Level Range | Bar Color | Background | Meaning |
|---|---|---|---|---|
| Novice | 1–9 | Gray-400 | Gray-100 | Starting out |
| Apprentice | 10–19 | Blue-500 | Blue-50 | Building |
| Adept | 20–29 | Teal-500 | Teal-50 | Developing |
| Journeyman | 30–39 | Green-500 | Green-50 | Consistent |
| Practitioner | 40–49 | Lime-500 | Lime-50 | Focused |
| Expert | 50–59 | Purple-600 | Purple-50 | Advanced |
| Veteran | 60–69 | Fuchsia-600 | Fuchsia-50 | Skilled |
| Elite | 70–79 | Amber-600 | Amber-50 | Elite |
| Master | 80–89 | Orange-600 | Orange-50 | Mastering |
| Grandmaster | 90–99 | Red-600 | Red-50 | Near-peak |
| Legend | 100–200 | Gold / Yellow-500 | Yellow-50 | Exceptional |

The color arc moves cold (gray → blue → teal → green) through neutral (lime → purple) to warm (fuchsia → amber → orange → red) and culminates in gold for Legend. Legend uses a gold/yellow palette with gradient fill to visually distinguish it from all other tiers. The tier color is applied to the progress bar fill, the tier badge, and the skill card accent element.

### 5.4 Tier Boundary Visual Affordance (XP Jump Design)

The known UX risk from the architecture pass: the XP gap at tier boundaries is noticeably larger than gaps within a tier. The most significant jumps are at levels 10, 20, 30, 60, and 100. The jump into Master tier at level 100 (~951,740 XP above level 99) is by far the largest.

**Design response:**

1. **Tier transition notification:** When a user levels up and crosses a tier boundary (e.g., Novice → Apprentice at level 10), a full-screen modal overlay replaces the standard level-up toast. This overlay is large, celebratory (but not excessive), and includes:
   - "You've reached [New Tier Name]!" headline
   - A one-line description of the new tier: e.g., "Apprentice: You've mastered the basics and are building real consistency."
   - The new tier badge in full size with tier color
   - A dismissable "Continue" button

2. **Upcoming tier preview:** When a user is within the last 10% of XP for the current tier's final level (for example, within 10% of the XP needed to reach level 10 from level 9), a callout appears below the progress bar:
   "Next tier: Apprentice. The XP cost will increase when you cross this boundary — this is intentional. Tier transitions represent a meaningful step up in mastery."
   This callout persists until the tier is crossed.

3. **Tier boundary level picker marker:** In the skill creation level picker (Step 2), each tier boundary (levels 10, 20, 30, 40, 50, 60, 70, 80, 90) is visually marked with a thin divider and a tier label: "— Apprentice tier starts here —", etc. The picker caps at level 99 (D-018); level 100+ is not selectable.

4. **Legend tier aspirational treatment:** When a user is in the Grandmaster tier (levels 90–99), the skill detail screen shows an aspirational callout in the tier section:
   "Legend tier begins at Level 100. Only the most dedicated practitioners ever reach it. Keep going."
   This callout is styled as an inspirational pull-quote, not a warning or error. It uses the Legend tier gold color as an accent.

5. **XP jump explainer on tier transition screen:** The tier transition overlay (item 1 above) includes a secondary note: "The next tier requires more XP per level. This reflects the reality that advanced mastery takes greater effort." Shown in small text below the tier description.

### 5.5 Master Tier Treatment

Legend tier (levels 100–200) receives distinct UI treatment to reinforce its elite status (D-016):

- The tier name badge uses gold/amber coloring, not the standard tier color for any other tier
- The skill detail screen header for a Legend-tier skill shows the tier name first, prominently: "LEGEND — Level 147"
- The XP progress bar uses a gradient fill (gold to amber) instead of a flat color, to signal ongoing achievement within the highest tier
- Reaching level 100 (entering Legend tier) triggers the tier transition overlay with enhanced copy:
  "You've reached Legend. This is exceptional. Fewer than a fraction of practitioners ever reach this level. The journey continues — there are 100 more levels ahead."
- There is no "Max Level approaching" UI until level 200; at level 200, the progress bar is shown as full and a "Maximum Level Reached" indicator replaces the XP-to-next-level text

### 5.6 Skill List and Dashboard Card Design

Each skill card on the list / dashboard shows:

```
[Tier color accent bar — left edge or top edge]

Skill Name                      [Tier badge: Journeyman]
Level 23

[XP progress bar — compact, 8px]
2,400 / 7,950 XP to next level

[Blocker gate indicator if active — lock icon + "Gate at Level 9"]

                                            [ + Log ]
```

On mobile, the card is full-width. On desktop, cards are displayed in a grid (2–3 columns).

The skill list is sorted by most recently logged, by default.

---

## 6. Blocker Gate Visibility Screen

### 6.1 When the Blocker Gate UI Appears

The blocker gate UI surfaces in two contexts:

1. **Inline on skill detail:** when the user's effective level equals the gate level (progression is locked), a blocker gate section appears on the skill detail screen in place of the standard XP bar forward progress
2. **First-hit notification:** the first time a user's XP reaches a gate threshold, a modal notification appears immediately after the XP log (replacing the standard level-up toast)

### 6.2 Blocker Gate Section on Skill Detail

When a blocker gate is active, the skill detail screen shows the following gate section where the XP progress bar normally appears:

```
─────────────────────────────────
[🔒 GATE LOCKED]
Level [gate_level] — Progression Paused

"[title from blocker_gates.title]"
[description from blocker_gates.description]

─────────────────────────────────
XP Accruing: [current_xp shown as a number]
Level shown: [gate_level] (actual level: [raw_level based on XP])
─────────────────────────────────
Your XP keeps growing. You'll advance to Level [gate_level + 1]
when this challenge is complete.
─────────────────────────────────
```

The lock icon and "GATE LOCKED" header use the Amber/Warning color palette to signal that something requires attention without being a destructive error state. It is not red — blockers are challenges, not failures.

**Information displayed (maps to schema fields):**

| UI Element | Source |
|---|---|
| Gate level | `blocker_gates.gate_level` |
| Gate title | `blocker_gates.title` |
| Gate description | `blocker_gates.description` |
| Current XP (accruing) | `skills.current_xp` |
| Effective/display level | `effective_level()` — capped at gate_level |
| Raw XP-computed level | `LevelForXP(current_xp)` — shown as "(actual level: N)" |

**What is not shown (release 1):**
- No completion action (no "Submit Evidence" or "Mark Complete" button) — D-010
- No timer or deadline
- No hint about what evidence would be acceptable — the gate is informational

**What is shown but minimal:**
- The gate title and description are the only guidance the user has in release 1
- A brief explanatory line: "Gate completion is coming in a future update. Keep logging to stay ready."

### 6.3 First-Hit Gate Notification

When a user's XP first reaches a gate threshold (detected after an XP log), a modal overlay replaces the standard post-log toast:

```
[🔒 You've hit a gate!]

Level [gate_level] Gate: "[title]"

[description]

Your XP keeps growing, but your level display is paused here until
you complete this challenge.

[Got it — see gate details]
```

The [Got it] action takes the user to the skill detail screen with the gate section visible. There is no dismissal without acknowledgement — the user must tap the button. This ensures they understand the progression lock is intentional.

**Server-side first-hit tracking:** This notification must only appear once per gate per user. Whether the notification has been shown is tracked by the `blocker_gates.first_notified_at` column (see architecture.md, `blocker_gates` entity). The Go handler that processes an XP log event checks `first_notified_at IS NULL` on any gate that has just become active. If null, the handler returns the full-screen gate notification fragment and sets `first_notified_at = NOW()` in the same transaction. If `first_notified_at` is already set, the standard post-log toast is returned instead. No client-side state is used to track this — the check is authoritative on the server.

### 6.4 Mobile Blocker Gate Expectations

- The gate section on skill detail must be visible without scrolling on a 375 px screen when the gate is active — it replaces the progress bar at the same vertical position
- Lock icon must be recognizable at 24 × 24 px
- The "XP Accruing" number must update in real-time after each log (same HTMX partial swap as regular XP display)
- The gate title and description must be legible at mobile body text size (minimum 16 px)

---

## 7. Account Screen

### 7.1 Account Screen Layout

```
Account

Display name: [editable field]
Email: user@example.com (read-only)

─────────────────────────────────
Claude API Key
  Status: [Key ending in ****xxxx] [Saved]
  or
  Status: No key saved
  [Add / Update API Key] button
  [Remove Key] link (only if a key is saved)

─────────────────────────────────
Session
  [Sign Out]

─────────────────────────────────
[Change Password] (email/password only in release 1)
```

### 7.2 API Key Entry

The API key entry is a focused single-field form:

```
Add Claude API Key

[sk-ant-...                           ] — text input, type="password" so it's masked
[Verify and Save]

Your key is encrypted and stored securely.
It is never visible in the browser or sent to the client.

[Cancel]
```

On save: the Go handler validates the key format and test-decrypts. If valid, the key hint (last 4 chars) is stored and the UI shows the "Saved" state with the hint. If invalid, an inline error message: "This doesn't look like a valid Claude API key. Check your key and try again."

---

## 8. Mobile-First Expectations Summary

This section lists the hard mobile requirements for all release-1 screens. These are the minimum acceptability bar for Phase 2 exit criteria.

| Journey | Mobile Requirement |
|---|---|
| Shell navigation | Bottom tab bar on all screens except active multi-step flows |
| Skill list | Full-width cards; "+" FAB for new skill; no horizontal scrolling |
| Skill creation | Step-by-step flow; full viewport per step; level picker is scrollable list (not dropdown) |
| Skill creation — AI path | Loading state is legible at mobile size; streamed text does not cause layout jump |
| Quick XP log | Three taps maximum from skill list or dashboard; bottom sheet covers ≤70% viewport height; XP chips are ≥44px touch targets; Log XP button is full-width, ≥48px tall; keyboard does not cover Log XP button |
| Progress display | Tier name and level visible without scrolling on 375px; XP bar visible in skill card without scroll |
| Tier transition | Modal overlay is full-screen on mobile; dismiss button is full-width, bottom of screen |
| Blocker gate | Gate section is above the fold on skill detail; lock icon is recognizable; "XP Accruing" number updates live |
| Account | API key entry field is full-width; Verify and Save button is full-width, bottom of form |
| First-hit gate notification | Modal is full-screen on mobile; "Got it" button is full-width, bottom of screen |

---

## 9. UX Decisions That Affect Scope or Sequencing

The following UX decisions introduced or confirmed in this pass are logged in decision-log.md.

### D-017: Mobile navigation confirmed as bottom tab bar

A fixed bottom tab bar with four items (Dashboard, LifeQuest, NutriLog, Account) is the mobile navigation pattern. The NutriLog item is present from release 1 as a "Coming Soon" placeholder. Hamburger menus and top tab bars are rejected for this use case. See Section 2.1.

### D-018: Master tier (100+) is excluded from the starting-level picker

A user cannot self-report a starting level in the Master tier during skill creation. The maximum self-reported starting level is Veteran (level 99, effectively the top of the Expert-to-Veteran range). This protects the aspirational meaning of Master tier. A user who is genuinely Master-caliber advances from a high Veteran starting point quickly. See Section 3.2.

### D-019: Quick XP log uses a bottom sheet (mobile) / modal dialog (desktop)

The quick-log interaction is a bottom sheet that appears over the current screen. It does not navigate to a new route. The primary fast-log path is: tap `+ Log` icon on skill card → tap XP chip → tap Log XP (3 taps total from the skill list). A secondary path via skill detail is also acceptable. Both satisfy the "3 taps or fewer" acceptance criterion. Default chip selection on every open is the middle preset (100 XP). Last-used XP pre-selection is deferred to a later phase. See Section 4.1 and 4.2.

### D-020: Tier color system defined

Eleven tiers each have a distinct color applied to XP progress bars, tier badges, and skill card accents. Colors arc cold → warm → gold. Legend tier uses gold/amber with gradient to distinguish it as exceptional. The tier color system is defined in Section 5.3. This is a confirmed visual language decision binding for all implementation.

### D-021: Blocker gate section replaces XP bar (not appended below it)

When a blocker gate is active, the gate section replaces the XP progress bar in the skill detail layout. The gate section is not appended below the bar — it appears in the same position. This keeps the gate state above the fold on mobile and prevents the most important state information from being hidden below less-important content.

### D-022: Tier transition uses a full-screen overlay modal (not a toast)

Tier transitions (Novice → Apprentice, Apprentice → Journeyman, etc.) are surfaced as a full-screen overlay modal, not a toast notification. A toast is appropriate for routine level-ups. A tier transition is a milestone event and deserves a dedicated moment. This modal includes the XP jump explainer to address the known UX risk from the architecture pass. See Section 5.4.

### Scope note: no new features added

None of the UX decisions above add any new features to release 1 scope. They refine how the confirmed release-1 features (F-001, F-004, F-005, F-006, F-008, F-009) are built and what implementation choices the delivery-agent must make. The only potential scope implication is the tier transition modal (D-022), which requires a small amount of additional server-side logic to detect tier-boundary level-ups and return a different HTMX fragment (a modal instead of a toast). This is minor and does not change the Phase 2 feature list.

---

## 10. Open Items and Deferred UX Questions

The following items are not designed in this document. They are noted here so the planning-agent and future UX passes can pick them up when appropriate.

| Item | Phase | Notes |
|---|---|---|
| Skill edit screen — field-level design | Phase 2 | Skill name + description editing; straightforward; no UX decisions needed before build |
| Skill deletion confirmation dialog | Phase 2 | Standard destructive confirm pattern; no unique UX decisions needed |
| Empty-state screen for skill list (zero skills) | Phase 2 | New user onboarding moment; should direct to skill creation prominently |
| Login and register screens | Phase 1 | Standard email/password forms; no unique UX decisions needed |
| Password change screen | Phase 1 | Standard; no unique UX decisions |
| Error state screens (500, 404, auth failure) | Phase 1 | Standard patterns; implement during scaffold |
| Blocker gate completion flow UI | Phase 3 (deferred) | F-009b; design when Phase 3 begins |
| Reward moments and tier-completion ceremonies | Phase 3 (deferred) | F-010; design when Phase 3 begins |
| NutriLog functional screens | Phase 4 (deferred) | Full NutriLog UX deferred; shell slot reserved |
| PWA install prompt and push notification permissions | Phase 6 (deferred) | F-021; deferred per D-006 |
| Detailed log entry UI (F-007) | Phase 3 (deferred) | Extended log note flow deferred |
| AI coaching feedback UI (F-012) | Phase 3 (deferred) | Requires log history to be meaningful |

---

## 11. Handoff

### What changed in this pass

- Defined the four-section information architecture for the unified app shell: Dashboard, LifeQuest, NutriLog (placeholder), Account
- Confirmed bottom tab bar as mobile navigation pattern; left sidebar for desktop
- Defined the NutriLog placeholder slot — present from release 1, no functional content
- Specified the three-step skill creation flow for both manual path and AI-assisted path, including level picker interaction and AI degradation behavior
- Defined the exact three-tap quick-log sequence and bottom sheet contents
- Defined the skill detail screen layout with tier name, XP bar, and Log XP button
- Defined the tier color system (D-020) across eleven tiers (cold→warm→gold arc)
- Defined tier boundary affordances: upcoming-tier preview callout, tier transition modal overlay, XP jump explainer
- Defined Legend tier special visual treatment (gold palette, aspirational copy, enhanced tier-transition modal)
- Defined the blocker gate section layout mapping to schema fields (title, description, gate_level, current_xp, current_level capped at gate)
- Defined the first-hit gate notification modal
- Established mobile minimum requirements for all release-1 journeys
- Added D-017 through D-022 to decision-log.md
- Updated feature-tracker.md: F-001, F-005, F-009 status advanced to ready-for-build

### What remains open

- Empty-state screen design for new users (zero skills) — no UX decisions needed, can be implemented by delivery-agent using standard patterns
- Login / register / error screen design — standard patterns; no unique UX decisions blocking build
- Blocker gate completion flow (F-009b) — deferred; no design needed until Phase 3

### What the planning-agent should do next (Step 5)

The ux-agent has completed Step 4. All three blocked items in the dependency table are now resolved:

1. **F-001: Shell navigation IA and mobile pattern** — Defined in Sections 1 and 2 above. Delivery-agent can build the shell.
2. **F-005: Manual starting-level selection UX** — Defined in Section 3. Delivery-agent can build skill creation.
3. **F-009: Blocker gate visibility screen design** — Defined in Section 6. Delivery-agent can build gate visibility UI.

The planning-agent should now:
- Break Phase 1 and Phase 2 into specific implementation tasks with acceptance criteria
- Use this ux-spec.md as the UX contract for all Phase 1 and Phase 2 UI tasks
- Verify that the tier color system (D-020) is noted as a dependency for any UI tasks that render tier state
- Confirm that the three-tap quick-log requirement (D-019) is an explicit acceptance criterion on the F-006 task
- Confirm that the tier transition modal (D-022) is accounted for in the F-008 level display task
- Update feature-tracker.md ownership to delivery-agent for F-001, F-005, F-009 (ux-agent dependency is cleared)
- Note that D-018 (Master excluded from starting-level picker) must be enforced in the F-005 skill creation handler — level values above 99 must not be accepted as starting level inputs
