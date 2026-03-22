# Page Guide: Skill Detail

> Route: `/skills/[id]`
> Mood: "The Deep Dive" — where the grind happens
> Users spend the most time here. This is the engine room.

---

## Hierarchy (top to bottom)

1. **Hero Section** — skill name, tier badge, level, streak, category/tags. The progress bar (XP) dominates as the page hero. Action buttons (Start Session, Log XP) integrated alongside the progress bar.
2. **XP Chart** — prominent 30-day bar chart with rolling average trend line. Framing: "look how often you've shown up." Celebrate active days; don't shame gaps.
3. **Gate Section** — visible only when a blocker gate is active. Feels challenging and significant — a milestone, not a speedbump.
4. **Activity History** — chronological record of the grind.

---

## Decisions

| Decision | Answer |
|----------|--------|
| Hero hierarchy | Progress bar dominates; action buttons alongside |
| Hero content | Name, tier, level, streak, **category/tags** |
| XP Chart | Bar chart + **rolling average trend line** |
| Chart framing | Celebrate consistency ("showing up"), don't shame gaps |
| Session entry | "Start Session" → `/skills/[id]/session` (skill-owned route) |
| Post-session return | Summary overlay on session route → return to skill detail (or Dashboard if Quick Session) |
| Skill edit | Modal on this page (not a separate route) |

---

## Gate Mood per Theme

### Minimal
**Motivating.** Clean challenge card. Clear requirements text. Progress bar toward unlocking. Straightforward: "Complete 3 submissions to unlock Level 4."

### Retro
**Ominous.** Dark borders, possibly double-bordered. Dramatic: "A barrier blocks your path..." Boss-fight energy. Purple/dark-red accents. Feels like a locked dungeon door.

### Modern
**High-tech lockdown.** Security-scan aesthetic with animated borders. "CLEARANCE REQUIRED." Pulsing cyan/magenta. Progress bars with scan animation. Feels like a facility checkpoint.

---

## Activity History per Theme

### Minimal
Simple chronological list. Clean date group headers. Timestamps and descriptions. No decoration.

### Retro
Visual log with pixel-art icons per activity type. Narrative entries: "You trained for 45 minutes", "A gate was breached", "Level achieved: 5." Reads like an RPG journal.

### Modern
Timeline layout. Vertical line (accent colour, subtle glow) with nodes. Time-stamped entries. Subtle fade-in animation on scroll. Nodes pulse when first visible.

---

## Elements

| Element | Status | Notes |
|---------|--------|-------|
| Hero section (name, tier, level, streak) | EXISTING | Add category/tags display |
| XP progress bar | EXISTING | Restyle as page hero |
| Action buttons (Start Session, Log XP) | EXISTING | Restyle + integrate with hero |
| XP bar chart (30 days) | EXISTING | Add rolling average trend line |
| Gate section | EXISTING | Restyle per gate mood above |
| Activity history | EXISTING | Restyle per theme variation above |
| Category/tags in hero | NEW | Needs category/tag data from API |
| Rolling average trend line | NEW | Chart enhancement |
| Edit modal | MODIFIED | Move from `/skills/[id]/edit` page to modal overlay |
| Session navigation | MODIFIED | Change from grind overlay to route navigation |
