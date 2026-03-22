# Page Guide: Skills List

> Route: `/skills`
> Mood: Inventory of potential — the world is the user's oyster
> Browse, sort, filter, and pick a skill to work on.

---

## Layout

Flexible grid of cards. Each card shows: **Name, Level, XP bar, Streak, Last Active**.

The "+ Log" button on each card opens an **inline mini-form** (not navigation to skill detail).

---

## Controls

**Prominent toolbar** — needs to scale to 100+ skills.

- Tier filter
- Sort options (Recent / Name / Level / Tier)
- Category filter (preset categories + user tags)
- "Favourites" filter — always accessible as a quick toggle
- Search (for 50+ skills)

**Categories** become the main organisational pillar at 50+ skills. Hybrid system: preset categories (Physical, Mental, Creative, Professional, etc.) with user-defined tags for custom skills.

---

## Decisions

| Decision | Answer |
|----------|--------|
| Card layout | Flexible grid |
| Card info | Name, Level, XP, Streak, Last Active |
| "+ Log" behaviour | Inline mini-form (not navigation) |
| Categories | Hybrid — preset categories + user-defined tags |
| Scale threshold | 50+ skills = categories become primary organiser |
| Favourites | Always-accessible quick filter |
| Empty state | Same as dashboard — "let's get you into your first skill" |

---

## Theme Variations

### Minimal
List-heavy, high density. Compact rows or tight grid. Maximum info per viewport. Toolbar is clean and prominent. Cards are flat with subtle borders.

### Retro
Icons-first presentation. Chunky tactile buttons. Card borders with pixel-art flair. Category headers in Press Start 2P. Warm amber accents on active/favourite indicators.

### Modern
Animated cards with glowing status indicators. Hover reveals additional info. Subtle motion on scroll (staggered fade-in). Glass-effect cards with cyan highlights on favourites.

---

## Elements

| Element | Status | Notes |
|---------|--------|-------|
| Skill card grid | EXISTING | Restyle per theme |
| Tier filter | EXISTING | Restyle |
| Sort options | EXISTING | Restyle |
| Quick log button per card | EXISTING | Change to inline mini-form |
| Category filter | NEW | Needs category data model (API/schema) |
| User-defined tags | NEW | Needs tag data model (API/schema) |
| Favourites filter | NEW | Needs favourite/pin field on skill (API/schema) |
| Search | NEW | For 50+ skills scale |
| Inline mini-form | NEW | Quick XP log without leaving the list |
