# Page Guide: Landing Page

> Route: `/` (landing app)
> Mood: "A Call to Adventure"
> The quality bar — everything else should feel like it belongs in the same product.

---

## Section Flow

1. **Hero** — mission statement, primary CTA, theme switcher alongside
2. **Key Features** — suite capabilities with custom SVG icons (XP, gates, presets, AI)
3. **Suite Apps** — LifeQuest, NutriLog, MindTrack previews
4. **Social Proof** — initially: mission statement expansion + beta feature highlights
5. **CTA** — sign up / get started

---

## Decisions

| Decision | Answer |
|----------|--------|
| Default theme for first visitors | **Minimal** |
| Theme switcher location | Hero section — lets visitors try before signup |
| One page or three | One page that adapts per theme |
| Social proof (pre-launch) | Mission statement expansion + beta feature highlights |
| Section animations | **Theme-specific** (pixel reveals for Retro, holographic for Modern, clean fades for Minimal) |

---

## Theme Variations

### Minimal
Clean, bright hero with bold Inter heading. Sections fade in on scroll. Flat feature cards. Professional, understated.

### Retro
Dark atmospheric hero with Press Start 2P title. Sections reveal with pixel dissolve / screen-wipe transitions. Feature cards with warm amber borders. RPG flavour: "Your Quest Awaits."

### Modern
Dark navy hero with Rajdhani heading and ambient glow behind text. Sections fade-in with upward slide and glass-effect cards. Holographic shimmer on feature icons. "Command Your Growth."

---

## Elements

| Element | Status | Notes |
|---------|--------|-------|
| Hero section | EXISTING | Restyle per theme |
| Feature sections (4) | EXISTING | Restyle + add theme-specific animations |
| Theme switcher | NEW | Interactive preview on hero — lets visitors switch themes |
| Suite Apps section | NEW | Previews of LifeQuest, NutriLog, MindTrack |
| Social proof section | NEW | Temporary content: mission expansion + beta highlights |
| Navbar | EXISTING | Restyle per theme |
| CTA button | EXISTING | Restyle per theme |
