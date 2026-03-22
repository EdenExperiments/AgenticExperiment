# Minimal Theme Guide

> `data-theme="minimal"` — Clean, data-forward, productivity-tool aesthetic.

**Identity:** Light backgrounds, bold typography, flat surfaces, maximum information density. This theme says "I'm a serious tool that respects your time."

**Inspiration:** See `design-inspiration/img.png`, `img_1.png`, `img_18.png`, `img_2.png`–`img_5.png`, `img_21.png`.

---

## Colour Palette

| Token | Value (approximate) | Usage |
|-------|-------------------|-------|
| `--color-bg` | `#ffffff` or near-white | Page background |
| `--color-surface` | `#f8f9fa` | Card/panel backgrounds |
| `--color-text` | `#1a1a2e` | Primary text |
| `--color-muted` | `#6b7280` | Secondary text, timestamps |
| `--color-accent` | Bright blue/teal (from inspiration) | CTAs, active states, links |
| `--color-accent-hover` | Darker shade of accent | Hover states |
| `--color-border` | `#e5e7eb` | Card borders, dividers |
| `--color-error` | Red | Validation, destructive actions |
| `--color-success` | Green | Confirmations, positive states |

> Exact hex values to be extracted from inspiration images during implementation. The above are directional.

---

## Typography

- **Display:** Inter Bold/Black (700/900). Used for headings and stat values.
- **Body:** Inter Regular/Medium (400/500). Used everywhere else.
- No decorative fonts. The personality comes from weight contrast and whitespace, not typeface variety.

---

## Motion

`--motion-scale: 0.3`

- **Allowed:** Fade-in, slide transitions, subtle hover lifts.
- **Not allowed:** Decorative animations, parallax, ambient effects, pulsing, glowing.
- Transitions should feel instant and functional — the user shouldn't consciously notice them.

---

## Density & Spacing

**Data-dense.** Maximum information per viewport.

- Tight card padding (12–16px).
- Compact stat cards — value + label, no decorative borders.
- Skill cards in a tight grid with minimal gaps.
- Lists preferred over spacious cards where possible.
- Whitespace is structural (separating sections), not atmospheric.

---

## Backgrounds

Stark whitespace. No gradients, no textures, no patterns. The background is `--color-bg` and nothing else. Content creates the visual hierarchy, not the background.

---

## Component Treatment

### Cards
Flat. Subtle border (`--color-border`), no shadow or minimal shadow (`--shadow-sm`). No hover glow. Hover lift is a subtle 1–2px translateY, barely perceptible.

### Buttons
Solid fills for primary actions. Ghost/outline for secondary. No gradients. Clean, rectangular (small radius `--radius-sm`).

### Stat Values
Large, bold Inter Black numbers. Minimal labelling. The number speaks for itself.

### Gates
**Motivating.** Clean challenge card with clear requirements text and a progress bar toward unlocking. No dramatic language — straightforward: "Complete 3 submissions to unlock Level 4."

### Activity History
Simple chronological list. Clean date headers. No icons, no narrative — just timestamps and descriptions.

### Forms
Clean inputs with clear labels. No decorative borders or backgrounds. Focus states use accent colour outline.

### Navigation
Sidebar and bottom tabs use subtle backgrounds. Active state indicated by accent colour, not bold visual treatment.

---

## Copy Tone

Professional and direct. No RPG language, no narrative framing.

- Dashboard: "Overview", "Recent Activity"
- Gates: "Requirements", "Progress"
- Sessions: "Focus Timer", "Session Complete"
- Auth: "Sign in", "Create account" (not "Begin your quest")
- Empty states: "Add your first skill to get started"

---

## What Minimal is NOT

- Not boring — the data density and bold typography create visual interest.
- Not plain — the contrast between large stat numbers and quiet supporting text creates hierarchy.
- Not stripped-down Retro — it's a fundamentally different design language with its own character.
