# Shared Style Guide

> System-wide rules that apply to **all three themes**. Theme-specific overrides live in `minimal.md`, `retro.md`, `modern.md`.

This guide is prescriptive — agents implementing UI must follow these rules unless a page guide explicitly overrides them.

---

## Three-Layer Architecture

All theme differentiation follows this layering (D-035):

| Layer | Mechanism | Scope | Examples |
|-------|-----------|-------|---------|
| **1. CSS Custom Properties** (~60%) | `data-theme` attribute swap | Colours, fonts, radii, shadows, motion budget | `--color-accent`, `--font-display`, `--motion-scale` |
| **2. Theme-scoped CSS** (~25%) | `[data-theme="retro"] .card { ... }` | Glassmorphism, scanlines, glows, texture overlays | Border treatments, background effects, shadow styles |
| **3. Component variants** (~15%) | Variant registry + `dynamic()` code splitting | Structural differences only | Pixel-art icons, narrative text formatting, timer displays |

**Rule:** Always try Layer 1 first. Only reach for Layer 2 if CSS properties alone can't express the difference. Layer 3 is a last resort for genuinely different component structures.

---

## Design Tokens (CSS Custom Properties)

All visual values come from CSS custom properties. **Never use hardcoded Tailwind colour classes** (`bg-gray-800`, `text-blue-500`, etc.) — always use `var(--color-*)`.

### Required Token Categories

These token families must exist in every theme file:

| Category | Token Pattern | Purpose |
|----------|--------------|---------|
| Colours | `--color-bg`, `--color-surface`, `--color-text`, `--color-muted`, `--color-accent`, `--color-accent-hover`, `--color-border`, `--color-error`, `--color-success` | Core palette |
| Typography | `--font-display`, `--font-body`, `--font-mono` | Font families |
| Motion | `--motion-scale` | Animation budget multiplier (0–1) |
| Spacing | Inherited from `base.css` | Never overridden per theme |
| Radii | `--radius-sm`, `--radius-md`, `--radius-lg` | Border radius |
| Shadows | `--shadow-sm`, `--shadow-md`, `--shadow-lg` | Elevation |

### Motion Scale

The `--motion-scale` variable gates all animation durations and distances:

```css
transition-duration: calc(200ms * var(--motion-scale));
```

The `useMotionPreference` hook in `packages/ui/src` reads this variable. Components should use it to conditionally enable/disable animations.

| Theme | `--motion-scale` | Behaviour |
|-------|-----------------|-----------|
| Minimal | `0.3` | Functional transitions only — fade, slide |
| Retro | `0.7` | Retro transitions — screen wipes, pixel dissolves |
| Modern | `1.0` | Full motion — glows, parallax, ambient pulsing |

---

## Typography System

| Theme | Display (Headings) | Body | Character |
|-------|-------------------|------|-----------|
| Minimal | **Inter** (Bold/Black weight) | Inter | Swiss precision, data-forward |
| Retro | **Press Start 2P** | **Space Grotesk** | Pixel headings for flavour, readable body |
| Modern | **Rajdhani** | **Space Grotesk** | Semi-condensed technical, sci-fi versatile |

**Rules:**
- Display font is for section headings, hero text, and stat labels only.
- Body font is for all running text, form labels, descriptions, buttons.
- Press Start 2P is small and wide — use it at limited sizes (h1, h2, stat values). Never for body text or long labels.
- All fonts loaded via `next/font` with `font-display: swap`.

---

## Responsive Layout

### CSS Priority
**Mobile-first.** Base styles target mobile. Media queries add desktop layout.

```css
/* Base: mobile */
.grid { grid-template-columns: 1fr; }

/* Desktop */
@media (min-width: 768px) {
  .grid { grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); }
}
```

### Container Strategy
- Main content wrapper: `max-w-[1500px] w-[90%] mx-auto`
- Applied in `(app)/layout.tsx`

### Breakpoints
- Mobile: < 768px
- Tablet: 768px–1024px
- Desktop: > 1024px

### Navigation
- **Desktop:** Sidebar (command-centre feel). Always visible.
- **Mobile:** Bottom tabs (tactile, thumb-friendly). Sticky.

---

## Density per Theme

| Theme | Density | Spacing Character |
|-------|---------|-------------------|
| Minimal | Data-dense | Tight spacing, compact cards, maximum info per viewport |
| Retro | Spacious/Tactile | Generous padding, chunky elements, room to breathe |
| Modern | Balanced/Immersive | Enough data for command centre, enough space for atmosphere |

Agents should reference the theme guide for specific spacing multipliers.

---

## Backgrounds

Every page has atmospheric depth, differentiated per theme:

| Theme | Background Treatment |
|-------|---------------------|
| Minimal | Stark whitespace. Clean, bright, no visual noise. Light backgrounds. |
| Retro | Grids, scanlines, subtle texture overlays. Dark with warm undertones. |
| Modern | Gradients, depth layers, glow zones. Dark navy with atmospheric light bleeds. |

---

## Cards

Cards are the current structural pattern but are **not a constraint**. Style guides and page guides may specify card-free sections where appropriate (e.g., stat readouts in Modern, inline data in Minimal).

When cards are used:
- Surface colour: `var(--color-surface)`
- Border: `var(--color-border)`
- Hover: lift effect gated by `@media(hover:hover)` and `--motion-scale`
- Radius: `var(--radius-md)`

---

## Accessibility

- All interactive elements must have visible focus states.
- Colour contrast must meet WCAG AA (4.5:1 for text, 3:1 for large text).
- Motion respects `prefers-reduced-motion` in addition to `--motion-scale`.
- All images have alt text. Decorative images use `alt=""`.

---

## New vs Existing Elements

Page guides mark elements as:

| Tag | Meaning |
|-----|---------|
| **EXISTING** | Already in the codebase — restyle only |
| **NEW** | Requires new component/feature — design + implement |
| **MODIFIED** | Exists but needs structural changes (new props, layout shift) |

Agents must check whether a component exists before creating a new one. New features (categories, avatar, Quick Session) require their own feature tickets and may need API/schema work before the frontend can consume them.

---

## Agent Rules

1. **Never hardcode colours.** Use `var(--color-*)` tokens.
2. **Never write visual tests.** Visual quality is reviewer-owned (D-036).
3. **Always check the page guide** for the page you're implementing.
4. **Always check the theme guide** for the theme you're targeting.
5. **Layer 1 first.** CSS custom properties before theme-scoped CSS before component variants.
6. **Mobile-first CSS.** Base styles are mobile; media queries add desktop.
7. **Mark new elements.** If a page guide says NEW, check whether the API/schema supports it before building the frontend.
