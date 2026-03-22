# Page Guide: Skill Create

> Route: `/skills/new`
> Mood: Character creation — engaging, narrative, aspirational
> The user is defining a new dimension of their growth.

---

## Two Paths

Clearly separated at the start:

1. **Preset Path** — gallery/discovery experience. Shows expected gate descriptions and progression paths as preview. Inspires users to think about what they want to learn.
2. **Custom Skill Path** — full user control. Name, description, manual level setting. For users who want to define their own journey.

Both paths converge at the AI calibration step.

---

## Step Indicator

Narrative-driven labels:

| Step | Label | Content |
|------|-------|---------|
| 1 | **"Identity"** | Name and description. Description is user-facing (shown on cards) — keep prominent. |
| 2 | **"Appraisal"** | Starting level. Preset path shows expected progression preview. Custom path has manual picker. |
| 3 | **"The Arbiter"** | AI calibration dialogue. High-value selling point. |

---

## The Arbiter

This is a **core selling point**, not a tucked-away feature. Present as a dialogue — the AI assesses the user's level and designs their progression path.

**Visual avatar per theme:**
- **Minimal:** Clean dialog interface. Professional assistant. No character — just a well-designed conversation UI.
- **Retro:** Sage character. Wise, possibly hooded figure. Speech bubbles or typewriter text reveal. Speaks in character: "Tell me of your experience..."
- **Modern:** AI entity. Holographic/digital avatar — glowing wireframe, geometric icon, pulsing animation. Clinical but helpful. Ship's-AI feel.

---

## Decisions

| Decision | Answer |
|----------|--------|
| Two paths | Preset gallery + Custom Skill, clearly separated |
| Preset preview | Shows expected gates / progression paths |
| Description field | User-facing (on cards), prominent |
| Arbiter | Visual avatar, theme-dependent, core feature |
| Step labels | "Identity" → "Appraisal" → "The Arbiter" |

---

## Theme Variations

### Minimal
Clean stepper UI. Professional form design. Preset gallery as a searchable grid. The Arbiter step is a clean chat-like interface. No atmospheric effects.

### Retro
Character creation screen aesthetic. Step indicator as narrative chapters. Preset gallery as a scroll of skill icons. The Arbiter interaction has typewriter text, sage avatar, RPG dialogue: "Tell me of your experience with this art..."

### Modern
Mission configuration aesthetic. Step indicator as a progress pipeline. Preset gallery as holographic cards with hover previews. The Arbiter interaction has scan/analysis feel, AI avatar with ambient glow.

---

## Elements

| Element | Status | Notes |
|---------|--------|-------|
| Step indicator | EXISTING | Restyle with narrative labels |
| Name input | EXISTING | Restyle |
| Description input | EXISTING | Ensure prominent placement |
| Preset search | EXISTING | Restyle as gallery/discovery experience |
| Starting level picker | EXISTING | Restyle |
| AI calibration | EXISTING | Major restyle — add avatar, dialogue treatment |
| Path selector (Preset vs Custom) | NEW | Entry point splitting the two paths |
| Preset progression preview | NEW | Show expected gates/paths |
| Arbiter avatar | NEW | Theme-dependent visual character (Layer 3 component variant) |
