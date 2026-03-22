# Page Guide: Auth Pages

> Routes: `/login`, `/register`
> Mood: The beginning of the journey — trust-first, visually continuous from landing
> First contact (register) or return point (login).

---

## Visual Continuity

Auth pages follow the landing page's visual identity. The transition from landing → auth should feel like progression, not a context switch. Theme-responsive — if the user chose a theme on the landing page, auth pages reflect it.

---

## Trust-First Approach

- No immediate subscription upsell on registration.
- **14-day free period.** Messaging on registration makes this clear.
- Subscription info is visible but not aggressive.
- Goal: let users experience the product and build trust before asking for money.

---

## Registration Page Extras

- Brief **feature preview / "what you'll get"** alongside the form.
- **Social auth:** Google, GitHub, Apple — planned for launch. Affects form layout (social buttons above or below email/password).

---

## Decisions

| Decision | Answer |
|----------|--------|
| Visual identity | Follows landing page, theme-responsive |
| Free period | 14 days |
| Feature preview on register | Yes |
| Social auth | Google, GitHub, Apple at launch |
| Copy tone | RPG for Retro/Modern, professional for Minimal |

---

## Theme Variations

### Minimal
Clean centred form card on white/light background. Professional copy: "Sign in", "Create account." Feature preview as a clean sidebar or below-form list. Social auth buttons as clean outlined buttons.

### Retro
Dark atmospheric background continuing from landing. Form card with warm borders. RPG copy: "Begin Your Quest", "Return, Adventurer." Feature preview framed as "What awaits you..." Social buttons with pixel-art provider icons.

### Modern
Dark navy with atmospheric glow behind form. Glass-effect form card. RPG-adjacent copy: "Begin Your Quest" (works in sci-fi context too). Feature preview as holographic cards. Social buttons with neon accent outlines.

---

## Elements

| Element | Status | Notes |
|---------|--------|-------|
| Form card (email/password) | EXISTING | Restyle per theme |
| Submit button | EXISTING | Restyle |
| Alternate page link | EXISTING | Restyle |
| Social auth buttons | NEW | Google, GitHub, Apple — requires Supabase social auth setup |
| Feature preview | NEW | "What you'll get" — alongside registration form |
| Free trial messaging | NEW | 14-day period callout |
| Background treatment | MODIFIED | Add atmospheric depth matching landing page |
