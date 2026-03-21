## Test Files Written
- apps/landing/app/__tests__/landing.test.tsx
- apps/landing/vitest.config.ts (tooling)
- apps/landing/vitest.setup.ts (tooling)
- apps/landing/__mocks__/next/headers.ts
- apps/landing/__mocks__/next/navigation.ts
- apps/landing/__mocks__/next/server.ts
- apps/landing/__mocks__/next/link.tsx
- apps/landing/__mocks__/next/font/google.ts (font canary path: stub required)

## Coverage Map
- AC-3 (ScrollReveal renders children immediately when reduced motion is preferred) → landing.test.tsx:20
- AC-6 (Navbar moves focus into menu on open and back to toggle on close) → landing.test.tsx:44
- AC-4 (page has a `<main id="main-content">` landmark) → landing.test.tsx:64
- AC-5 (page has a skip link pointing to #main-content) → landing.test.tsx:76
- AC-1 / AC-11 (page CTA links use NEXT_PUBLIC_APP_URL, not localhost:3000) → landing.test.tsx:86

## Red State Confirmation

`pnpm test --filter @rpgtracker/landing` run result: 5 failed (1 file), all on the relevant assertion.

| # | Test name | Failure message |
|---|-----------|-----------------|
| 1 | ScrollReveal renders children immediately when reduced motion is preferred | `expect(element).not.toHaveClass("reveal")` — ScrollReveal always applies `reveal` class in initial JSX |
| 2 | Navbar moves focus into menu on open and back to toggle on close | `expected <button aria-expanded="true"> to be <a href="#features">` — no focus management in Navbar |
| 3 | page has a `<main id="main-content">` landmark | `expected null not to be null` — no `<main>` element in page.tsx |
| 4 | page has a skip link pointing to #main-content | `expected null not to be null` — no `a[href="#main-content"]` in layout |
| 5 | CTA links use NEXT_PUBLIC_APP_URL value, not hardcoded localhost:3000 | `expected false to be true` — hrefs are hardcoded to `localhost:3000`, not read from env |

## Font Canary Resolution

Path taken: **stub required**. `layout.tsx` imports `Cinzel` and `Inter` from `next/font/google`.
The canary (`import ScrollReveal, Navbar; it('canary', () => {})`) passed after creating
`apps/landing/__mocks__/next/font/google.ts` exporting `Cinzel` and `Inter` as stub functions.
The `vitest.config.ts` aliases `next/font/google` to this stub and documents the reason.

## Task state: done
