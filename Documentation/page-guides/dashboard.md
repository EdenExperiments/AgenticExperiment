# Page Guide: Dashboard

> Route: `/dashboard`
> Mood: Home base — sets the tone for the session
> First page after login. The user's command centre / quest log / clean overview.

---

## Hierarchy (top to bottom)

1. **Primary Skill Focus / "Next Quest"** — centre stage. User pins their "Main Quest" or system algorithmically suggests based on goals, streaks, recency.
2. **Stats** — 4 stat cards: Total Skills, Active Gates, XP Today, Highest Tier.
3. **Quick Log** — collapsible panel between stats and skill grid. Non-disruptive.
4. **Skill Card Grid** — overview of all skills with quick-log inline mini-form.
5. **Activity Feed** — glanceable sidebar (desktop) or below-fold section (mobile).
6. **Hub Stats (future)** — placeholder cards for NutriLog/MindTrack with "coming soon" teaser + metric previews.

---

## Decisions

| Decision | Answer |
|----------|--------|
| Primary Skill selection | Hybrid — user pin + algorithmic suggestion |
| Quick Log placement | Collapsible panel between stats and skill grid |
| Activity Feed prominence | Sidebar (glanceable), not primary |
| Hub stats (other apps) | Placeholder teasers with metric previews |
| Empty state | "Tutorial Quest" / "Choose Your First Skill" invitation per theme |
| Quick Session | Button for pinned/algorithmic quest — navigates to session route |

---

## Theme Variations

### Minimal
Clean overview. Compact stat cards with bold numbers. Skill list as tight grid. Quick Log as a subtle collapsible. Whitespace between sections. No atmospheric effects.

### Retro
Quest log / save-state feel. Primary skill framed as "Main Quest" with narrative language. Stat blocks are chunky with gold accents. Activity feed reads like a game journal. Empty state: "Your quest log is empty. Choose your first skill to begin your journey."

### Modern
Command centre / HUD. Stats as holographic readouts. Primary skill as "Active Mission" briefing card with subtle glow. Activity feed as a scrolling data log. Quick Session button with pulsing accent border.

---

## Elements

| Element | Status | Notes |
|---------|--------|-------|
| Stat cards (4) | EXISTING | Restyle per theme |
| Skill card grid | EXISTING | Restyle + add inline mini-form for quick log |
| Activity feed | EXISTING | Restyle per theme, reposition as sidebar |
| Quick Log | MODIFIED | Change from bottom sheet to collapsible panel |
| Primary Skill Focus | NEW | Pinned/algorithmic "Next Quest" — needs API support for pinning |
| Quick Session button | NEW | Navigates to `/skills/[id]/session` for pinned quest |
| Hub stat placeholders | NEW | "Coming soon" teasers for NutriLog/MindTrack |
| Empty state | MODIFIED | Theme-specific invitation, not just a button |
| Tier transition modal | EXISTING | Restyle per theme |
