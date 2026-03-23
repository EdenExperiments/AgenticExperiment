# Architecture Review: Phase 7 — Auth & Landing Restyle

Status: APPROVED
Reviewer: orchestrator (architect role)
Date: 2026-03-22

---

## Schema Impact

None. No database changes.

Social auth users are created by Supabase Auth when they complete the OAuth flow. The existing `profiles` table trigger (`handle_new_user`) fires on `auth.users` insert regardless of auth method. The Go API validates Supabase JWTs without caring about the auth provider — the JWT payload is identical.

---

## API Impact

None. No new endpoints.

The Go API is unaffected. Social auth is purely a Supabase + client-side concern.

---

## Shared Package Impact

### `packages/auth/` — ADDITIVE

New export: `signInWithProvider(provider, options)` helper function.

- Wraps `supabase.auth.signInWithOAuth()`
- Constructs redirect URL from `NEXT_PUBLIC_APP_URL`
- Returns the Supabase response (URL to redirect to, or error)
- No breaking changes to existing exports

### `packages/ui/src/ThemeSwitcher.tsx` — MINOR MODIFICATION

The existing component is functional but needs visual enhancement for the landing hero context:

- Consider adding a `size` or `variant` prop (`'default' | 'hero'`) for the larger landing hero presentation
- The hero variant may show mini theme preview swatches (colour dots or gradient bars)
- This is optional — the existing component may be sufficient with CSS overrides in the landing globals.css

### `packages/ui/tokens/` — NO CHANGES

Theme CSS files already define all required tokens. The landing page just needs to USE them instead of its bespoke tokens.

---

## Parallelisation Map

```
T1: tester — write failing tests for social auth helper (AC-A7-logic, AC-A8-logic)
    |
    v
T2: backend — implement signInWithProvider() in packages/auth/ (against T1 tests)
    |
    +---> T3a: frontend — landing page restyle (AC-L1 through AC-L23) [visual]
    |         (no dependency on T2 — landing restyle is purely visual)
    |
    +---> T3b: frontend — auth pages restyle (AC-A1 through AC-A17) [visual + uses T2 helper]
              (depends on T2 for social auth button onClick handlers)
    |
    v
T4: reviewer — visual review (landing) + visual review (auth) + code gate (auth helper)
```

T3a and T3b can start in parallel after T2 completes.
T3a has NO dependency on T2 (landing restyle is purely visual — no auth logic).
T3a CAN start immediately (no logic dependency).

**Revised parallel map:**

```
T1: tester — social auth helper tests
T3a: frontend — landing restyle (CAN START IMMEDIATELY — visual only)
    |
    v (T1 completes)
T2: backend — signInWithProvider() implementation
    |
    v (T2 completes)
T3b: frontend — auth pages restyle (needs T2 for social auth buttons)
    |
    v (all complete)
T4: reviewer — visual review + code gate
```

---

## Risk Assessment

- **LOW:** Social auth provider setup in Supabase is manual and outside code scope. If providers aren't configured, the buttons will show but OAuth will fail. This is acceptable — the code is correct, the infra setup is a deployment concern.
- **LOW:** ThemeSwitcher on landing hero — the component already works. Visual enhancement is optional.
- **NONE:** No database migration, no API changes, no breaking changes to shared packages.

---

## Verdict: APPROVED

No architectural concerns. Proceed to UX review.
