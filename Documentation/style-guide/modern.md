# Modern Theme Guide

> `data-theme="modern"` — Sci-fi command centre. Dark, sharp, atmospheric, fluid.

**Identity:** Dark navy backgrounds with cyan and magenta neon accents. Glassmorphism, atmospheric glows, fluid motion. This theme says "You are running mission control for your personal development."

**Inspiration:** See `design-inspiration/img_14.png`, `img_17.png`, `img_10.png`–`img_13.png`, `img_19.png`.

---

## Colour Palette

| Token | Value (approximate) | Usage |
|-------|-------------------|-------|
| `--color-bg` | `#0a0e1a` | Dark navy page background |
| `--color-surface` | `rgba(15, 23, 42, 0.8)` | Glass-effect card backgrounds (semi-transparent) |
| `--color-text` | `#e2e8f0` | Primary text (cool white) |
| `--color-muted` | `#64748b` | Secondary text (cool gray) |
| `--color-accent` | `#00d4ff` (cyan) | Primary highlights, active states, CTAs |
| `--color-accent-hover` | Brighter/lighter cyan | Hover states |
| `--color-border` | `rgba(0, 212, 255, 0.15)` | Subtle glass borders with cyan tint |
| `--color-error` | Neon red/magenta | Validation, destructive |
| `--color-success` | Neon green | Confirmations |
| `--color-secondary` | `#e040fb` or magenta/pink | Secondary accent, highlights, gate indicators |

> Exact hex values to be extracted from inspiration images during implementation.

---

## Typography

- **Display:** Rajdhani (Semi-Bold/Bold). Semi-condensed, technical feel. Works at all sizes from h1 down to stat labels.
- **Body:** Space Grotesk. Clean geometric sans-serif shared with Retro but feels completely different in this colour/motion context.
- **Character:** Rajdhani gives Modern its own display identity — distinct from Retro's pixel headings and Minimal's Inter weight play.

---

## Motion

`--motion-scale: 1.0`

- **Character:** Fluid, continuous, atmospheric. The UI feels alive.
- **Allowed:** Glassmorphic glows, smooth fade transitions, parallax depth on scroll, ambient pulsing on active elements, progress ring animations, holographic shimmer effects, smooth hover reveals.
- **Signature effects:** Glow on accent-coloured elements, pulsing border on active/focused items, fade-in with slight upward slide on content load.
- Transitions should feel **smooth and continuous** — never jerky or stepped.

---

## Density & Spacing

**Balanced/Immersive.** The middle ground.

- Enough data to feel like a command centre.
- Enough space for atmospheric effects (glows, gradients) to land without crowding content.
- Card padding: 16–24px.
- Moderate grid gaps.
- Content is readable and spacious, but not as sparse as Retro.

---

## Backgrounds

Dark navy with atmospheric depth:
- **Page background:** Dark navy gradient (not flat). Subtle directional gradient from one corner.
- **Depth layers:** Overlapping gradient zones at very low opacity to create a sense of spatial depth.
- **Glow zones:** Subtle radial gradient light bleeds behind key content areas (hero sections, active cards).
- **No textures:** Unlike Retro, Modern uses smooth gradients, not grid/scanline overlays.

---

## Glassmorphism

The defining visual treatment for Modern. Cards and panels use glass-effect backgrounds:

```css
[data-theme="modern"] .card {
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(0, 212, 255, 0.1);
}
```

**Rules:**
- Glass effect on cards, modals, dropdowns, and nav panels.
- Backdrop blur: 8–16px depending on element importance.
- Never stack more than 2 glass layers (performance + readability).
- Glass borders have a subtle accent-coloured tint.
- Fallback for browsers without `backdrop-filter`: solid `--color-surface` background.

---

## Component Treatment

### Cards
Glass-effect backgrounds with subtle cyan-tinted borders. Hover state: border brightens, subtle outer glow. Active/selected: stronger glow ring.

### Buttons
Primary: Cyan accent fill with dark text, subtle glow on hover. Secondary: Glass background with accent-coloured border. Both have smooth transition on hover (not snappy like Retro).

### Stat Values
Rajdhani Bold numbers, possibly with a subtle text-shadow glow in accent colour. Feel like HUD readouts. Labels in Space Grotesk at smaller size.

### Gates
**High-tech lockdown.** Security-scan aesthetic — progress bars with scanning animations, "CLEARANCE REQUIRED" language, possibly animated border (pulsing cyan). The gate should feel like a security checkpoint in a sci-fi facility. Magenta/red accent for locked state, cyan/green for progress.

### Activity History
**Timeline.** Vertical line (accent colour, subtle glow) with nodes at each entry. Time-stamped entries with subtle fade-in animation as they enter the viewport. Nodes pulse briefly when first visible.

### Forms
Glass-effect input fields. Focus state: cyan glow border, expanding outward. Placeholder text in cool muted gray. Labels in Space Grotesk.

### Navigation
Sidebar: glass-effect panel. Active state: cyan accent bar or glow indicator. Bottom tabs: glass background, active tab has glow underline. The nav should feel like part of a HUD.

---

## Copy Tone

Command-centre / mission-control language. Professional but atmospheric.

- Dashboard: "Mission Control", "Status Report", "Activity Log"
- Gates: "Clearance Required", "Security Level", "Access Granted"
- Sessions: "Mission Active", "Operation Complete", "Debrief"
- Auth: "Begin Your Quest" (shared with Retro — the RPG language works in a sci-fi context too)
- Empty states: "No operations logged. Initiate your first mission."
- Skill create: "Identity", "Appraisal", "The Arbiter" (shared step names)

---

## The Arbiter (AI Calibration)

Visual avatar: **AI assistant.** Holographic or digital entity — glowing wireframe face, abstract geometric avatar, or a sleek AI icon with pulsing animation. The dialogue feels like consulting a ship's AI: clinical but helpful. Text could have a subtle typewriter or scan-line reveal effect.

---

## What Modern is NOT

- Not Retro-with-different-colours — Modern has smooth gradients where Retro has textures, fluid motion where Retro has crunchy snaps, glassmorphism where Retro has opaque surfaces.
- Not just "dark mode" — the atmospheric depth, glows, and glass effects create a genuinely different spatial experience.
- Not overwhelming — the high motion budget means effects are present but refined, not a particle-effect explosion.
- Not fragile — glassmorphism has solid fallbacks for every effect.
