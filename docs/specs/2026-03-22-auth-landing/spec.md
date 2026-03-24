# Spec: Phase 7 — Auth & Landing Restyle

Status: SHIPPED
Type: mixed (logic: social auth; visual: landing restyle + auth restyle)
Date: 2026-03-22
Roadmap: P7-1 through P7-8

---

## Summary

Full landing page restyle for all three themes (Minimal, Retro, Modern), theme switcher integration on hero, suite app section, social proof section, and auth page improvements (social auth, free trial messaging, feature preview on registration).

The landing page currently has a partial token migration (6 overlapping tokens replaced, bespoke landing tokens retained). This phase does the full per-theme treatment, replacing the current single-aesthetic landing with a theme-adaptive page.

---

## Decision: D-039 — Free Trial Implementation

**Resolved: UI-only for now.** The 14-day free trial messaging appears on the registration page but is NOT enforced server-side. No subscription table, no RLS changes. The messaging establishes the intent and builds trust. Server-side enforcement is deferred to a future phase when the subscription model is built.

Rationale: Enforcing server-side requires a subscription table, payment integration, and expiry logic — all out of scope for a landing/auth restyle phase. The messaging alone achieves the trust-building goal.

---

## Zones Touched

| Zone | Agent | Files |
|------|-------|-------|
| Landing app | frontend | `apps/landing/app/` (page.tsx, globals.css, layout.tsx, components/) |
| Auth pages | frontend | `apps/rpg-tracker/app/(auth)/login/page.tsx`, `apps/rpg-tracker/app/(auth)/register/page.tsx` |
| Shared UI | frontend (coordinate) | `packages/ui/src/ThemeSwitcher.tsx` (may need visual enhancements for landing hero context) |
| Auth package | backend (coordinate) | `packages/auth/` (social auth helper functions) |
| Supabase config | infra | Supabase dashboard (Google, GitHub, Apple provider setup — manual, not code) |

---

## Acceptance Criteria

### Landing — Theme Switcher (P7-7)

- AC-L1: ThemeSwitcher component renders in the hero section alongside the CTA buttons.
- AC-L2: Clicking a theme button switches the entire landing page to that theme (colours, fonts, backgrounds, animations).
- AC-L3: Theme choice persists via cookie so returning visitors see their chosen theme.
- AC-L4: Default theme for first-time visitors is Minimal (per page guide decision).

### Landing — Per-Theme Hero (P7-8)

- AC-L5: Minimal hero: clean white/light background, Inter Bold heading, no atmospheric orbs, subtle fade-in animation only. Copy: "Track your skills. See your progress."
- AC-L6: Retro hero: dark atmospheric background with scanline overlay, Press Start 2P title, warm amber/gold accent orbs, pixel-dissolve reveal animation. Copy: "Forge your Legend" (existing).
- AC-L7: Modern hero: dark navy background with gradient depth, Rajdhani heading, cyan/magenta glow orbs, smooth holographic fade-in animation. Copy: "Command Your Growth."
- AC-L8: Hero animations respect `--motion-scale` per theme and `prefers-reduced-motion`.

### Landing — Suite Apps Section (P7-5)

- AC-L9: Suite Apps section renders below the hero with LifeQuest (featured, large card), NutriLog, and MindTrack preview cards.
- AC-L10: LifeQuest card shows: key stats (11 tiers, 100+ presets, 10 gates), feature bullets, "Live" badge, and CTA to enter the app.
- AC-L11: NutriLog and MindTrack cards show "Coming Soon" badges with brief feature teasers.
- AC-L12: Card styling adapts per theme (flat cards for Minimal, warm-border cards for Retro, glass-effect cards for Modern).

### Landing — Social Proof Section (P7-6)

- AC-L13: Social proof section renders between features and CTA with mission statement expansion and beta feature highlights.
- AC-L14: Content adapts per theme in copy tone (professional for Minimal, narrative for Retro, command-centre for Modern).

### Landing — Section Animations (P7-8)

- AC-L15: Minimal sections use clean fade-in on scroll.
- AC-L16: Retro sections use pixel dissolve / screen-wipe transitions on scroll.
- AC-L17: Modern sections use upward-slide with glass-effect fade on scroll.
- AC-L18: All section animations are gated by `--motion-scale` and `prefers-reduced-motion`.

### Landing — Full Token Migration

- AC-L19: All bespoke landing tokens (`--gold`, `--gold-*`, `--emerald-*`, `--sage-*`) are replaced with theme-aware tokens from the design system.
- AC-L20: `font-family: var(--font-cinzel)` references are replaced with `var(--font-display)` (which resolves per-theme: Inter for Minimal, Press Start 2P for Retro, Rajdhani for Modern).
- AC-L21: Landing navbar restyled per theme (clean for Minimal, warm borders for Retro, glass-effect for Modern).
- AC-L22: Landing footer restyled per theme.
- AC-L23: Landing CTA section restyled per theme.

### Auth — Social Auth Buttons (P7-1, P7-2)

- AC-A1: Login page shows social auth buttons for Google, GitHub, and Apple above the email/password form.
- AC-A2: Register page shows the same social auth buttons above the email/password form.
- AC-A3: Clicking a social auth button initiates the Supabase OAuth flow for that provider and redirects back to `/dashboard` on success.
- AC-A4: Social auth buttons are styled per theme (clean outlined for Minimal, pixel-art provider icons for Retro, neon accent outlines for Modern).
- AC-A5: Social auth errors display in the same error area as email/password errors.
- AC-A6: Provider SVG icons (Google, GitHub, Apple) render correctly at all sizes and themes.
- AC-A7-logic: A `signInWithProvider(provider: 'google' | 'github' | 'apple')` helper exists in `packages/auth/` that wraps `supabase.auth.signInWithOAuth({ provider, options: { redirectTo } })` with correct redirect URL construction.
- AC-A8-logic: The helper handles the redirect URL correctly for both development (localhost) and production environments using `NEXT_PUBLIC_APP_URL`.

### Auth — Free Trial Messaging (P7-3)

- AC-A9: Register page shows a "14-day free trial" callout below the heading and above the form.
- AC-A10: The callout is non-aggressive — informational, not pushy (per auth page guide trust-first approach).
- AC-A11: Copy tone adapts per theme (professional for Minimal, narrative for Retro, command-centre for Modern).

### Auth — Feature Preview (P7-4)

- AC-A12: Register page shows a "What you'll get" section alongside (desktop) or below (mobile) the registration form.
- AC-A13: Feature preview lists 3-4 key features with brief descriptions (XP & levels, blocker gates, AI calibration, skill presets).
- AC-A14: Feature preview is styled per theme.

### Auth — Visual Continuity

- AC-A15: Auth pages have background atmospheric treatment matching the landing page per theme.
- AC-A16: Auth form card is styled per theme (flat for Minimal, warm-border for Retro, glass-effect for Modern).
- AC-A17: Auth page heading and copy tone adapt per theme (per page guide: "Sign in" / "Create account" for Minimal; "Return, Adventurer" / "Begin Your Quest" for Retro; "Begin Your Quest" for Modern).

### Cross-Cutting

- AC-X1: All new and modified elements use design tokens (`var(--color-*)`, `var(--font-*)`) — zero hardcoded values.
- AC-X2: All interactive elements have visible focus states meeting WCAG AA.
- AC-X3: Mobile-first responsive design — all sections work on mobile, tablet, and desktop.
- AC-X4: No regressions in existing landing page tests.

---

## Out of Scope

- Server-side free trial enforcement (subscription table, RLS) — deferred
- Payment integration — deferred
- Social auth provider logos as pixel-art assets — use standard SVGs with theme-aware colouring
- Landing page content management — content is hardcoded for now
- Auth page password reset flow — existing flow unchanged

---

## User Feedback Context

- Modern theme already looks "very nice" on landing — preserve its DNA, enhance with glass effects and cyan/magenta accents.
- Retro needs work on the title — Press Start 2P needs careful sizing (it reads larger than actual size).
- Minimal needs significant rewriting — the current dark fantasy aesthetic is wrong for Minimal; needs clean light treatment.
- User has a high bar for dark fantasy visual quality on the landing page (Retro + Modern).

---

## Dependencies

- Phase 0 ThemeSwitcher (P0-4): EXISTS in `packages/ui/src/ThemeSwitcher.tsx`
- Phase 0 Theme CSS files: EXISTS in `packages/ui/tokens/` (minimal.css, retro.css, modern.css)
- Phase 0 ThemeProvider: EXISTS in `packages/ui/src/ThemeProvider.tsx`
- Landing app already imports shared tokens via `landing-tokens.css`
- Supabase social auth providers: MANUAL SETUP required in Supabase dashboard (not code)
