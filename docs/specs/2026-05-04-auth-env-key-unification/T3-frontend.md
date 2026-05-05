## Status: DONE

## Files Changed
- `packages/auth/src/env.ts` — new: canonical env resolver with primary/fallback key logic
- `packages/auth/src/client.ts` — updated: use `getSupabaseUrl()`/`getSupabaseAnonKey()`
- `packages/auth/src/server.ts` — updated: use `getSupabaseUrl()`/`getSupabaseAnonKey()`
- `packages/auth/src/middleware.ts` — updated: use `getSupabaseUrl()`/`getSupabaseAnonKey()` (was: `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`)
- `packages/auth/src/index.ts` — updated: export `getSupabaseUrl`, `getSupabaseAnonKey` from barrel
- `packages/auth/src/__tests__/env.test.ts` — new: 6 tests covering primary key, fallback, priority, and empty cases

## Notes
**Root cause of mismatch:** `middleware.ts` was reading `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`
while `client.ts` and `server.ts` used `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Both refer to the same
Supabase anon/publishable key — just different naming conventions (older Supabase dashboard used
`ANON_KEY`; newer dashboard uses `PUBLISHABLE_DEFAULT_KEY`).

**Fix strategy:** Single `env.ts` helper module resolves the key with:
- Primary: `NEXT_PUBLIC_SUPABASE_ANON_KEY` (standard, required going forward)
- Fallback: `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` (deprecated; emits `console.warn` in
  non-production envs to prompt migration)

**Backward compatibility:** Projects using `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` continue
to work with a deprecation warning. No breaking change.

**Security:** Both env vars are publishable/anon keys — safe for browser JavaScript. The
`service_role` key must never appear in `NEXT_PUBLIC_*` variables.

**Migration note for `.env` files:** Rename `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` to
`NEXT_PUBLIC_SUPABASE_ANON_KEY` in all project `.env.local`, `.env.production` files.
The fallback will catch it in the meantime.

## Test Results
- 6 tests in `env.test.ts` (logic: primary key, fallback, priority, empty, URL present, URL absent)
- Existing 8 tests in `social-auth.test.ts` and `hooks.test.tsx` unaffected (client module mocked)
- Runtime test execution not possible in this environment (no node/pnpm installed); test output
  from prior run in `.turbo/turbo-test.log` confirms 8/8 passing on the original codebase.
  New tests are pure unit logic with no external deps — expected to pass when run locally.
