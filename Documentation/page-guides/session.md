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

## Theme Transformations

### Minimal
**Meditation-app calm.** Clean countdown timer (large, bold Inter numbers). Muted background (soft white or very light gray). Breathing animation — subtle pulsing circle synced to timer. Pause/resume as clean outlined buttons. No decoration.

### Retro
**Battle screen.** Pixel-art timer in Press Start 2P. "Grinding" visual effects — subtle XP counter ticking up in real-time. Background may have animated pixel textures. Chiptune-ready layout (space for audio controls). Gold/amber accents. Feels like a training montage screen in an RPG.

### Modern
**Mission in progress.** Holographic timer ring with Rajdhani numbers. Pulsing ambient glow around the timer. Progress ring filling as session progresses. "OPERATION ACTIVE" HUD aesthetic. Cyan/magenta accents. Dark navy with atmospheric light bleeds. Feels like a mission control countdown.

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
- Visual distinction between work and break phases
- Cycle counter (e.g., "Round 2 of 4")
- Break phase should feel like a genuine pause — reduced visual intensity

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
