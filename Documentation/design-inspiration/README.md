# Design Inspiration — Clean vs Stylish Vision

Reference images for the three themes and the **Clean** (classic, restrained) vs **Stylish** (immersive, animated) fidelity layer (D-043). Implementation targets live in `Documentation/style-guide/` and `Documentation/page-guides/`.

## How to read these images

| Mode | What to look for |
|------|------------------|
| **Clean** | Functional layout, readable data, low decoration, no looping backgrounds |
| **Stylish** | Atmospheric depth, motion, scanlines/glows, cinematic session backdrops, HUD flair |

---

## Session / Pomodoro (priority reference)

| Mode | Theme | Image | Vision |
|------|-------|-------|--------|
| **Stylish** | Retro | [`img_23.png`](./img_23.png) | **Primary session target.** Beat-em-up / Streets of Rage–style dojo loop behind the timer — pixel fighters, training dummy, glowing countdown, chunky arcade buttons. |
| Clean | Retro | [`img_22.png`](./img_22.png) | RPG dialogue / calibration — ornate borders, character portrait, no action loop. |
| Stylish | Retro | [`img_20.png`](./img_20.png), [`img_6.png`](./img_6.png) | Cyberpunk RPG dashboard — scanlines, neon gold/purple, chunky panels. |
| Clean | Minimal | [`img.png`](./img.png), [`img_2.png`](./img_2.png) | Data-forward productivity UI — flat cards, no atmosphere. |
| Stylish | Minimal | [`img_4.png`](./img_4.png) | Elevated minimal — subtle depth and polish while staying data-dense. |
| Stylish | Modern | [`img_12.png`](./img_12.png), [`img_19.png`](./img_19.png) | HUD / command centre — glass, cyan glow, holographic readouts. |
| Clean | Modern | [`img_14.png`](./img_14.png) | Dark sci-fi UI without heavy ambient motion. |

---

## Per-theme galleries

### Minimal (Clean baseline)
`img.png`, `img_1.png`, `img_2.png`–`img_5.png`, `img_18.png`, `img_21.png`

### Retro (RPG / arcade)
`img_6.png`–`img_9.png`, `img_15.png`, `img_16.png`, `img_20.png`, `img_22.png`, `img_23.png`

### Modern (command centre)
`img_10.png`–`img_14.png`, `img_17.png`, `img_19.png`

---

## Implementation notes

- **Retro Stylish session** should evoke `img_23.png`: parallax dojo/street layer, looping fighter silhouettes, vignette so the timer stays readable. CSS-first; video/sprites only if a future task adds assets.
- **Clean** session surfaces must not show the battle backdrop — gate with `[data-mode="stylish"]`.
- All Stylish motion honours `--motion-scale` and `prefers-reduced-motion`.

Canonical prose: `Documentation/page-guides/session.md` · `Documentation/style-guide/retro.md`.
