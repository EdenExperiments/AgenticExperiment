# Page Guide: Account

> Route: `/account`
> Mood: Utilitarian with character — a sense of identity
> Settings hub with personality. Not just a form dump.

---

## Layout

1. **Player Card / Operator Card** — top of page. Display name, avatar, and account stats. Reflects the chosen theme's identity.
2. **Theme Picker** — high-visibility visual previews of each theme. The moment users discover they can transform their experience.
3. **Settings Grid** — 2-col on desktop. Display name, email, links to sub-pages (password, API key).
4. **Sign Out**

---

## Decisions

| Decision | Answer |
|----------|--------|
| Theme picker format | Visual previews (screenshots or live mini-previews), not a dropdown |
| Profile feel | "Player Card" / "Operator Card" — identity card |
| Avatar | Yes — crucial to app feel. Theme-dependent defaults; user upload as a feature |
| Account stats | Total XP, Longest Streak, Skill Distribution across categories |
| Sub-pages | Lightly themed — not pure utility, but less affected by theme variance |

---

## Theme Variations

### Minimal
Clean settings page. Player card as a compact info block with bold stat numbers. Theme picker as a clean side-by-side comparison. Functional layout, no atmospheric effects.

### Retro
Player card as a game character sheet — gold border, pixel-art default avatar, stat block with Press Start 2P numbers. Theme picker framed as "Choose Your Skin." Settings as a game menu.

### Modern
Operator card with glass-effect background, holographic avatar frame, glowing stat readouts. Theme picker as holographic preview panels. Settings grid with glass cards.

---

## Elements

| Element | Status | Notes |
|---------|--------|-------|
| Settings grid (2-col) | EXISTING | Restyle per theme |
| Display name | EXISTING | Part of Player Card |
| Email | EXISTING | Part of settings grid |
| Sign out button | EXISTING | Restyle |
| Sub-page links | EXISTING | Restyle (lightly themed) |
| Player Card / Operator Card | NEW | Identity card component with stats |
| Avatar system | NEW | Theme-dependent defaults + user upload (requires storage) |
| Account stats | NEW | Total XP, streak, skill distribution (API aggregation needed) |
| Theme picker with previews | NEW | Visual preview of each theme |
