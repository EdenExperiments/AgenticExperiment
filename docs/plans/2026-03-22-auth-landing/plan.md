# Plan: Phase 7 — Auth & Landing Restyle

Spec: `docs/specs/2026-03-22-auth-landing/spec.md`
Gateway: GO
Type: mixed (logic: social auth helper; visual: landing + auth restyle)
Date: 2026-03-22

---

## Task Sequence

### T1 — Tester: Social Auth Helper Tests (type: logic)

Owner: tester
ACs: AC-A7-logic, AC-A8-logic
Files:
- `packages/auth/src/__tests__/social-auth.test.ts` (NEW)

- [ ] T1.1: Test `signInWithProvider('google')` calls `supabase.auth.signInWithOAuth` with provider='google' and correct redirectTo URL
- [ ] T1.2: Test `signInWithProvider('github')` calls `supabase.auth.signInWithOAuth` with provider='github' and correct redirectTo URL
- [ ] T1.3: Test `signInWithProvider('apple')` calls `supabase.auth.signInWithOAuth` with provider='apple' and correct redirectTo URL
- [ ] T1.4: Test redirect URL construction uses `NEXT_PUBLIC_APP_URL` when available
- [ ] T1.5: Test redirect URL falls back to localhost when `NEXT_PUBLIC_APP_URL` is not set
- [ ] T1.6: Test error case — function returns error from Supabase OAuth response

### T2 — Backend: Social Auth Helper Implementation (type: logic)

Owner: backend (or frontend — shared package)
ACs: AC-A7-logic, AC-A8-logic
Depends on: T1
Files:
- `packages/auth/src/social.ts` (NEW)
- `packages/auth/src/index.ts` (MODIFY — add export)

- [ ] T2.1: Create `signInWithProvider(provider: 'google' | 'github' | 'apple', options?: { redirectTo?: string })` function
- [ ] T2.2: Function wraps `supabase.auth.signInWithOAuth({ provider, options: { redirectTo } })`
- [ ] T2.3: Default `redirectTo` constructed from `NEXT_PUBLIC_APP_URL` + `/dashboard`
- [ ] T2.4: Export from `packages/auth/src/index.ts` (or appropriate client barrel)
- [ ] T2.5: All T1 tests pass

### T3a — Frontend: Landing Page Restyle (type: visual)

Owner: frontend
ACs: AC-L1 through AC-L23
Depends on: NONE (can start immediately)
Files:
- `apps/landing/app/page.tsx` (MODIFY)
- `apps/landing/app/globals.css` (MODIFY — major rewrite)
- `apps/landing/app/layout.tsx` (MODIFY — ThemeProvider setup)
- `apps/landing/app/components/Navbar.tsx` (MODIFY)
- `apps/landing/app/components/ScrollReveal.tsx` (MODIFY — theme-aware animations)
- `apps/landing/app/components/SocialProofSection.tsx` (NEW)
- `apps/landing/app/components/HeroSection.tsx` (NEW — extract from page.tsx)
- `apps/landing/app/components/SuiteAppsSection.tsx` (NEW — extract from page.tsx)
- `apps/landing/app/components/FeaturesSection.tsx` (NEW — extract from page.tsx)
- `apps/landing/app/components/HowItWorksSection.tsx` (NEW — extract from page.tsx)
- `apps/landing/app/components/CTASection.tsx` (NEW — extract from page.tsx)

Subtasks (visual — no TDD gate):
- [ ] T3a.1: Extract page.tsx into section components for maintainability
- [ ] T3a.2: Replace all bespoke tokens (`--gold`, `--gold-*`, `--emerald-*`, `--sage-*`, `--font-cinzel`) with design system tokens (`--color-accent`, `--color-border`, `--font-display`, etc.)
- [ ] T3a.3: Restyle hero section per-theme — Minimal (light, clean, no orbs), Retro (dark, scanlines, amber orbs), Modern (dark navy, gradient depth, cyan/magenta glows)
- [ ] T3a.4: Add ThemeSwitcher to hero section alongside CTA buttons
- [ ] T3a.5: Implement theme-specific hero copy (Minimal: "Track your skills. See your progress." / Retro: "Forge your Legend" / Modern: "Command Your Growth")
- [ ] T3a.6: Restyle Suite Apps section cards per-theme (flat for Minimal, warm-border for Retro, glass-effect for Modern)
- [ ] T3a.7: Create Social Proof section with mission statement expansion and beta highlights
- [ ] T3a.8: Restyle Features section per-theme
- [ ] T3a.9: Restyle How It Works section per-theme
- [ ] T3a.10: Restyle CTA section per-theme
- [ ] T3a.11: Restyle Navbar per-theme (clean for Minimal, warm borders for Retro, glass for Modern)
- [ ] T3a.12: Restyle Footer per-theme
- [ ] T3a.13: Implement theme-specific section animations (fade for Minimal, pixel dissolve for Retro, holographic for Modern)
- [ ] T3a.14: Gate all animations with `--motion-scale` and `prefers-reduced-motion`
- [ ] T3a.15: Verify existing landing tests still pass (AC-X4)

### T3b — Frontend: Auth Pages Restyle (type: visual + logic integration)

Owner: frontend
ACs: AC-A1 through AC-A6, AC-A9 through AC-A17
Depends on: T2 (for social auth button handlers)
Files:
- `apps/rpg-tracker/app/(auth)/login/page.tsx` (MODIFY)
- `apps/rpg-tracker/app/(auth)/register/page.tsx` (MODIFY)
- `apps/rpg-tracker/app/(auth)/components/SocialAuthButtons.tsx` (NEW)
- `apps/rpg-tracker/app/(auth)/components/FeaturePreview.tsx` (NEW)
- `apps/rpg-tracker/app/(auth)/components/FreeTrial.tsx` (NEW)

Subtasks:
- [ ] T3b.1: Create SocialAuthButtons component with Google, GitHub, Apple buttons and provider SVG icons
- [ ] T3b.2: Wire SocialAuthButtons to `signInWithProvider()` from `packages/auth/`
- [ ] T3b.3: Add "or" divider between social auth and email/password sections
- [ ] T3b.4: Style social auth buttons per theme (clean outlined for Minimal, warm borders for Retro, neon accent for Modern)
- [ ] T3b.5: Create FreeTrial callout component (non-aggressive, trust-first)
- [ ] T3b.6: Add FreeTrial to register page below heading, above form
- [ ] T3b.7: Create FeaturePreview component ("What you'll get" — 3-4 key features)
- [ ] T3b.8: Add FeaturePreview alongside (desktop) / below (mobile) registration form
- [ ] T3b.9: Restyle auth form card per theme (flat for Minimal, warm-border for Retro, glass-effect for Modern)
- [ ] T3b.10: Add background atmospheric treatment matching landing per theme
- [ ] T3b.11: Update heading and copy tone per theme
- [ ] T3b.12: Ensure all social auth buttons have `aria-label="Sign in with {provider}"`
- [ ] T3b.13: Handle social auth errors in existing error display area

### T4 — Reviewer: Visual Review + Code Gate

Owner: reviewer
Depends on: T3a, T3b

Code Gate (logic portions — T2):
- [ ] T4.1: Review `packages/auth/src/social.ts` — correct Supabase OAuth wrapping, error handling, redirect URL construction
- [ ] T4.2: Verify T1 tests are meaningful and cover edge cases

Visual Review (UI portions — T3a, T3b):
- [ ] T4.3: Landing page — all three themes render correctly with distinct visual identity
- [ ] T4.4: Landing page — no hardcoded colour/font values (all design tokens)
- [ ] T4.5: Landing page — animations gated by motion-scale and prefers-reduced-motion
- [ ] T4.6: Landing page — mobile responsive (all sections stack correctly)
- [ ] T4.7: Auth pages — all three themes render correctly
- [ ] T4.8: Auth pages — social auth buttons styled per theme with accessible labels
- [ ] T4.9: Auth pages — visual continuity with landing (background treatment, card style)
- [ ] T4.10: Auth pages — feature preview and free trial messaging are non-aggressive
- [ ] T4.11: Cross-cutting — WCAG AA colour contrast on all themes
- [ ] T4.12: No regressions in existing test suite

---

## Parallel Execution Map

```
START
  |
  +---> T1 (tester: social auth tests) -----> T2 (backend: social auth helper)
  |                                                     |
  +---> T3a (frontend: landing restyle) [IMMEDIATE]     |
  |                                                     v
  |                                              T3b (frontend: auth restyle)
  |                                                     |
  v                                                     v
  T3a completes --------------------------------> T4 (reviewer)
                                                  T3b completes --^
```

T1 and T3a start simultaneously.
T2 starts when T1 completes.
T3b starts when T2 completes.
T4 starts when T3a and T3b both complete.

---

## Estimated Scope

- T1: ~6 test assertions, 1 new test file
- T2: ~1 new file, ~30 lines, 1 barrel export update
- T3a: ~15 subtasks, major CSS rewrite, 6+ new component files (extractions), significant page.tsx refactor
- T3b: ~13 subtasks, 3 new components, 2 page modifications
- T4: ~12 review checks

T3a is the largest task by far — the landing page restyle across three themes is the bulk of the work.
