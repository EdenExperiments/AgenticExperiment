# Retro Theme Guide

> `data-theme="retro"` — Full RPG immersion. Dark, warm, narrative, tactile.

**Identity:** Dark backgrounds with warm amber/gold and deep purple. Pixel-art accents, scanline textures, narrative framing. This theme says "You are the hero of your own story."

**Inspiration:** See `design-inspiration/img_15.png`, `img_16.png`, `img_6.png`–`img_9.png`, `img_20.png`, `img_22.png`, `img_23.png`.

---

## Colour Palette

| Token | Value (approximate) | Usage |
|-------|-------------------|-------|
| `--color-bg` | `#0a0a12` or deep dark | Page background (behind scanlines/textures) |
| `--color-surface` | `#1a1a2e` or dark panel | Card/panel backgrounds |
| `--color-text` | `#e8e0d0` | Primary text (warm off-white) |
| `--color-muted` | `#8b7e6a` | Secondary text (warm gray) |
| `--color-accent` | `#d4a853` (amber/gold) | XP bars, highlights, active states |
| `--color-accent-hover` | Brighter gold | Hover states |
| `--color-border` | `#2a2a3e` with gold tint | Card borders |
| `--color-error` | Deep red | Validation, destructive |
| `--color-success` | Emerald green | Confirmations |
| `--color-secondary` | Deep purple (`#6b21a8`-ish) | Secondary accent, tier badges, gate borders |

> Exact hex values to be extracted from inspiration images during implementation.

---

## Typography

- **Display:** Press Start 2P. Pixel font for headings, stat values, and section titles only. Use at limited sizes — this font is wide and small.
- **Body:** Space Grotesk. Clean geometric sans-serif for all running text, labels, buttons, descriptions.
- **Sizing rule:** Press Start 2P headings should be noticeably smaller than you'd normally set headings — the pixel aesthetic reads larger than its actual size.

---

## Motion

`--motion-scale: 0.7`

- **Character:** "Crunchy." Retro 8-bit / PS1-era transitions.
- **Allowed:** Screen wipes, pixel dissolves, satisfying click/tap feedback, typewriter text reveals, XP counter tick-up animations.
- **Not allowed:** Smooth glassmorphic effects, parallax, ambient pulsing — those belong to Modern.
- Transitions should feel **snappy and tactile**, like pressing buttons on a game controller.

---

## Density & Spacing

**Spacious/Tactile.** Generous padding, room to breathe.

- Chunky interactive elements — buttons are large and inviting.
- Card padding: 20–28px.
- Grid gaps are wider than Minimal.
- Touch-friendly: minimum 44px tap targets on all interactive elements.
- The spaciousness gives the atmospheric textures (scanlines, grids) room to be visible.

---

## Backgrounds

Dark with atmospheric depth:
- **Page background:** Dark base with subtle scanline overlay (CSS repeating-linear-gradient or pseudo-element).
- **Grid texture:** Optional subtle grid lines at very low opacity.
- **Warm undertones:** Background isn't pure black — it has a slight warm/purple hue.
- Background textures are purely CSS (no image assets) for performance.

---

## Component Treatment

### Cards
Dark surface with warm border. Borders may have a subtle gold/amber tint. Consider pixel-art corner decorations (Layer 2 CSS). No glassmorphism — that's Modern.

### Buttons
Chunky, high-contrast. Primary buttons: gold/amber fill with dark text. Secondary: dark fill with gold border. Large border-radius is fine — think arcade buttons. Satisfying hover state (slight scale + colour shift).

### Stat Values
Large Press Start 2P numbers with a subtle glow or text-shadow in accent colour. Feel like a game HUD counter.

### Gates
**Ominous.** Dark borders, possibly double-bordered. Dramatic language: "A barrier blocks your path...", "Defeat this challenge to advance." Boss-fight energy. Purple/dark red colour accents. The gate should feel like a locked door in a dungeon, not a progress checklist.

### Activity History
**Visual log.** Pixel-art icons for different activity types (training, gate submission, level up). Narrative entries: "You trained for 45 minutes", "A gate was breached", "Level achieved: 5". Each entry feels like a journal entry in an RPG save file.

### Forms
Dark input fields with warm borders. Focus state: gold accent glow. Labels in Space Grotesk. Placeholder text in muted warm gray.

### Navigation
Sidebar feels like a game menu. Active state: gold accent with possible pixel-art indicator. Bottom tabs: chunky, high-contrast, tactile.

---

## Copy Tone

Narrative and RPG-flavoured. The user is on a quest.

- Dashboard: "Quest Log", "Your Journey"
- Gates: "A barrier blocks your path", "Challenge Requirements"
- Sessions: "Enter the Grind", "Battle Complete" / "Training Complete"
- Auth: "Begin Your Quest", "Return, Adventurer"
- Empty states: "Your quest log is empty. Choose your first skill to begin."
- Skill create step names: "Identity", "Appraisal", "The Arbiter"
- XP: Always "XP" or "Experience Points", never "points"

---

## The Arbiter (AI Calibration)

Visual avatar: **Sage character.** Wise, mysterious, possibly hooded figure. Presented as a dialogue — speech bubbles or typewriter text reveal. The Arbiter speaks in character: "Tell me of your experience..." This is a centrepiece interaction, not a utility form.

---

## What Retro is NOT

- Not pixel-art everywhere — Press Start 2P is for headings only, not body text.
- Not dark-mode Minimal — it has atmosphere, texture, and narrative.
- Not chaotic — the warm colour palette and generous spacing keep it inviting despite the dark background.
- Not a joke — the RPG framing is genuine motivation design, not parody.
