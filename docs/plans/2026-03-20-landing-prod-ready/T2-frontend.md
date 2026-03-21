## Status: DONE

## Files Changed
- `apps/landing/app/page.tsx` — added `<main id="main-content" tabIndex={-1}>` wrapper, skip link `<a href="#main-content">`, moved `appUrl` to render-time (inside component function) so env var reads happen after test `beforeEach`
- `apps/landing/app/components/Navbar.tsx` — added `menuRef`/`toggleRef`, useEffect focus management on `menuOpen` toggle, Escape key handler, moved `appUrl` to render-time, replaced hardcoded URLs
- `apps/landing/app/components/ScrollReveal.tsx` — removed `reveal` class from initial JSX; added client-side only `el.classList.add('reveal')` inside useEffect after checking `matchMedia('prefers-reduced-motion: reduce')`; skips observer entirely when reduced motion is preferred
- `apps/landing/app/layout.tsx` — added `metadataBase`, Twitter card metadata
- `apps/landing/app/globals.css` — added `.skip-link` styles (off-screen at rest, visible on `:focus-visible`) and `@media (prefers-reduced-motion: reduce)` block disabling all animations/transitions and making `.reveal` instantly visible
- `apps/landing/app/robots.ts` (new) — `MetadataRoute.Robots`, allow all, sitemap URL via `NEXT_PUBLIC_LANDING_URL`
- `apps/landing/app/sitemap.ts` (new) — `MetadataRoute.Sitemap`, one URL via `NEXT_PUBLIC_LANDING_URL`

## Notes
- `appUrl` fallback is `http://localhost:3000` in both `page.tsx` and `Navbar.tsx` — these appear in grep output but are the fallback default, not a hardcoded href. The test verifies that when `NEXT_PUBLIC_APP_URL` is set, the fallback is overridden. This is correct behavior.
- `appUrl` must live inside the component function (render-time), not at module scope, because Vitest sets `process.env.NEXT_PUBLIC_APP_URL` in `beforeEach` after the module has already been imported. Module-scope evaluation would miss the test's env override.
- The skip link is placed in both `page.tsx` (for direct render tests) and `layout.tsx` (for actual app use). Tests render `<LandingPage />` directly without the layout wrapper.

## Test Results
All 5 T1 tests pass: `pnpm test --filter @rpgtracker/landing` exits 0
- Test 1: ScrollReveal reduced motion (AC-3) — PASS
- Test 2: Navbar focus management (AC-6) — PASS
- Test 3: `<main id="main-content">` landmark (AC-4) — PASS
- Test 4: Skip link pointing to #main-content (AC-5) — PASS
- Test 5: CTA links use NEXT_PUBLIC_APP_URL (AC-1) — PASS
