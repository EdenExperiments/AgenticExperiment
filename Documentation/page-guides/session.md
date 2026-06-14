# Page Guide: Session

> Route: `/skills/[id]/session`
> Mood: Flow state — complete visual transformation, full immersion
> No nav, no distractions. Just timer, skill name, and session controls.

---

## Session Flow

1. **Enter** — navigate from skill detail (or Dashboard Quick Session)
2. **Timer running** — full-screen immersion, countdown or count-up
3. **Pause / Resume** — available at all times
4. **Complete** — timer ends (or user stops manually)
5. **Post-session summary** — overlay on session route showing XP earned, streak update
6. **Return** — context-aware: back to skill detail (if entered from there) or Dashboard (if Quick Session)

---

## Decisions

| Decision | Answer |
|----------|--------|
| Route structure | `/skills/[id]/session` (skill-owned) |
| Post-session | Summary overlay on session route, then context-aware return |
| Pomodoro | Full support for work/break intervals |
| Audio | Optional ambient soundtracks (theme-appropriate) |
| Background activity | Browser notifications when session completes |
| Quick Session | Dashboard button for pinned/algorithmic quest |
| Nav | Hidden — full-screen, no sidebar or bottom tabs |

---

## Visual Mode (Clean vs Stylish)

Session visuals respect the global `data-mode` attribute (`clean` | `stylish`). **Clean** is the restrained baseline — functional, readable, low motion. **Stylish** adds additive atmosphere on top of the active theme without changing layout or Pomodoro logic.

| Mode | Session character | Motion |
|------|-------------------|--------|
| **Clean** | Theme identity only; no decorative loops | Functional transitions; break phase dims via opacity |
| **Stylish** | Immersive flair per theme (see below) | Gated by `--motion-scale` and `prefers-reduced-motion` |

Class hooks: `.session-page`, `.session-page--work` / `--break`, `.session-page__timer`, `.session-page__timer-ring`, `.session-page__phase`, `.session-page__backdrop` (Retro Stylish battle loop), etc. Stylish treatments are scoped with `[data-theme][data-mode="stylish"]` in `packages/ui/tokens/pages.css`.

**Vision board:** `Documentation/design-inspiration/README.md` — especially `img_23.png` for Retro Stylish Pomodoro.

---

## Theme Transformations

### Minimal
**Meditation-app calm.** Clean countdown timer (large, bold Inter numbers). Muted background (soft white or very light gray). Pause/resume as clean outlined buttons.

- **Clean:** Static focus circle; no breathing loop.
- **Stylish:** Subtle pulsing circle synced to timer; soft card elevation on config/summary panels.

### Retro
**Battle screen.** Pixel-art timer in Press Start 2P. Gold/amber accents. Feels like a training montage screen in an RPG.

- **Clean:** Timer, round counter, progress bar; no XP pulse, scanline overlays, or battle backdrop.
- **Stylish:** XP counter pulse, chunky pixel progress, battle/rest phase labels, scanline overlay, and a **looping beat-em-up backdrop** (dojo / Streets of Rage–style parallax + fighter silhouettes). Vision reference: `Documentation/design-inspiration/img_23.png`.

### Modern
**Mission in progress.** Holographic timer ring with Rajdhani numbers. Progress ring filling as session progresses. "OPERATION ACTIVE" HUD aesthetic. Cyan/magenta accents. Dark navy with atmospheric light bleeds.

- **Clean:** Progress ring and phase label; no ambient glow or shimmer.
- **Stylish:** Pulsing ambient glow around the ring, holographic shimmer on the timer, lower-intensity break ("Standby") mode.

---

## Post-Session Summary

Overlay on the session route (not a new page). Shows:
- XP earned this session
- Streak status (maintained / extended / new streak started)
- Session duration
- "Return" button (context-aware destination)
- Optional: "Log additional notes" input

---

## Pomodoro Mode

When intervals are enabled:
- Work/break cycle displayed clearly
- Visual distinction between work and break phases (`.session-page--work` vs `.session-page--break`)
- Cycle counter (e.g., "Round 2 of 4")
- Break phase should feel like a genuine pause — reduced visual intensity in both modes; Stylish adds theme-specific rest treatments (dimmed ring, "Rest Phase" / "Standby" copy)

---

## Audio (Future)

Optional ambient soundtracks, theme-appropriate:
- **Minimal:** Lo-fi / ambient / silence
- **Retro:** Chiptune / 8-bit ambient
- **Modern:** Synthwave / ambient electronic

Audio controls: play/pause, volume, track skip. Placed unobtrusively — this enhances immersion but isn't the focus.

---

## Elements

| Element | Status | Notes |
|---------|--------|-------|
| Session timer | EXISTING | Currently grind overlay — extract to dedicated route |
| Pause/resume controls | EXISTING | Restyle per theme |
| Post-session screen | EXISTING | Move to overlay on session route |
| Full-screen layout (no nav) | NEW | Dedicated route layout without sidebar/tabs |
| Pomodoro intervals | NEW | Work/break cycle timer |
| Browser notifications | NEW | Notification API integration |
| Audio controls | NEW | Optional ambient soundtracks (big scope — can phase) |
| Quick Session entry | NEW | Dashboard button linking to session route |
| Context-aware return | NEW | Track entry point for return navigation |
