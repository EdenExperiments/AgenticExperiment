# Wave 1 Regression Tests — T6 Manifest

## Test Files Written

- `apps/api/internal/auth/handler_test.go` — Go handler tests for POST /api/v1/account/password (T1)
- `apps/api/internal/auth/timeout_test.go` — Go timeout/context regression tests (T4)
- `apps/rpg-tracker/app/__tests__/password.test.tsx` — Frontend password page tests (T2)
- `apps/rpg-tracker/app/__tests__/proxy.test.ts` — Proxy behavior regression tests (T3)
- `packages/api-client/src/__tests__/changePassword.test.ts` — api-client changePassword() tests (T2)
- `packages/auth/src/__tests__/env-consistency.test.ts` — Auth env ANON_KEY fallback tests (T5)

## Supporting Changes (Test Harness Only — No Logic Changes)

- `apps/api/internal/auth/context.go` — Added `WithEmail()` test helper (mirrors existing `WithUserID()`)
- `apps/api/internal/auth/handler.go` — Added `SetHTTPClientTimeout()` testability method

## Coverage Map

### T1 — POST /api/v1/account/password (Go handler)

- AC-1 (unauthorized → 401) → `handler_test.go:TestHandlePostPasswordChange_Unauthorized` — **PASS on main**
- AC-2 (wrong current_password → 422) → `handler_test.go:TestHandlePostPasswordChange_MissingCurrentPassword` — **PASS on main**
- AC-3 (new_password < 8 chars → 422) → `handler_test.go:TestHandlePostPasswordChange_NewPasswordTooShort` — **INTENTIONAL RED on main**
- AC-4 (confirm mismatch → 422) → `handler_test.go:TestHandlePostPasswordChange_ConfirmPasswordMismatch` — **PASS on main**
- AC-5 (confirm absent → success) → `handler_test.go:TestHandlePostPasswordChange_NoConfirmPassword_Succeeds` — **INTENTIONAL RED on main**
- AC-6 (success → {status:"password_changed"}) → `handler_test.go:TestHandlePostPasswordChange_Success` — **PASS on main**
- AC-7 (wrong current password → 422) → `handler_test.go:TestHandlePostPasswordChange_WrongCurrentPassword` — **PASS on main**
- AC-8 (form-urlencoded accepted) → `handler_test.go:TestHandlePostPasswordChange_AcceptsFormURLEncoded` — **INTENTIONAL RED on main**
- AC-9 (error body is JSON {error}) → `handler_test.go:TestHandlePostPasswordChange_ErrorBodyIsJSON` — **PASS on main**

### T2 — Frontend password page

- AC-1 (renders heading) → `password.test.tsx:renders Change Password heading` — **PASS on main**
- AC-2 (has current_password field) → `password.test.tsx:renders current password input` — **PASS on main**
- AC-3 (has new_password field) → `password.test.tsx:renders new password input` — **PASS on main**
- AC-4 (has confirm_new_password field) → `password.test.tsx:[INTENTIONAL RED] renders confirm password input` — **INTENTIONAL RED on main**
- AC-5 (on success → router.push('/account')) → `password.test.tsx:on success navigates to /account` — **PASS on main**
- AC-6 (API error displayed) → `password.test.tsx:displays API error message on failure` — **PASS on main**
- AC-7 (button disabled while saving) → `password.test.tsx:submit button is disabled while saving` — **PASS on main**
- AC-8 (calls changePassword() from api-client) → `password.test.tsx:[INTENTIONAL RED] submit calls changePassword()` — **INTENTIONAL RED on main**
- AC-9 (no wrong /api/account/password endpoint) → `password.test.tsx:[INTENTIONAL RED] does not POST to wrong endpoint` — **INTENTIONAL RED on main**

### T2 — api-client changePassword()

- (exported) → `changePassword.test.ts:[INTENTIONAL RED] is exported from @rpgtracker/api-client` — **INTENTIONAL RED on main**
- (POST form-urlencoded to /api/v1/account/password) → `changePassword.test.ts` — **INTENTIONAL RED on main**
- (omits confirm when absent) → `changePassword.test.ts` — **INTENTIONAL RED on main**
- (sends confirm when present) → `changePassword.test.ts` — **INTENTIONAL RED on main**
- (returns {status:"password_changed"}) → `changePassword.test.ts` — **INTENTIONAL RED on main**
- (throws on API error) → `changePassword.test.ts` — **INTENTIONAL RED on main**

### T3 — Proxy behavior

- AC-1 (preserves upstream text/plain Content-Type) → `proxy.test.ts:[INTENTIONAL RED] preserves text/plain` — **INTENTIONAL RED on main**
- AC-2 (preserves application/json) → `proxy.test.ts:preserves application/json from upstream` — **PASS on main**
- AC-3 (forwards Authorization from session) → `proxy.test.ts:forwards Authorization header` — **PASS on main**
- AC-4 (no auth when no session) → `proxy.test.ts:does not send Authorization when no session` — **PASS on main**
- AC-5 (GET body is undefined) → `proxy.test.ts:GET request passes undefined body` — **PASS on main**
- AC-6 (strips hop-by-hop headers) → `proxy.test.ts:strips Transfer-Encoding` — **PASS on main** (see note*)
- AC-7 (forwards client Content-Type) → `proxy.test.ts:POST request forwards Content-Type` — **PASS on main**
- AC-8 (DELETE proxied correctly) → `proxy.test.ts:DELETE forwards to upstream` — **PASS on main**

*Note: T3-AC-6 (hop-by-hop stripping) passes on main because WHATWG fetch forbids setting Transfer-Encoding on mock responses; the proxy already doesn't forward this header in practice. The core regression (Content-Type hardcoded) is captured by AC-1.

### T4 — Timeout/logging

- AC-1 (bounded timeout) → `timeout_test.go:TestHandlePostPasswordChange_TimesOutOnSlowSupabase` — **PASS on main**
- AC-2 (pre-cancelled context) → `timeout_test.go:TestHandlePostPasswordChange_PreCancelledContext` — **PASS on main**
- AC-3 (SetHTTPClientTimeout works) → `timeout_test.go:TestNewAuthHandler_HasBoundedTimeout` — **PASS on main**

### T5 — Auth env consistency

- AC-1 (ANON_KEY takes precedence) → `env-consistency.test.ts:[INTENTIONAL RED]` — **INTENTIONAL RED on main**
- AC-2 (fallback to PUBLISHABLE_DEFAULT_KEY) → `env-consistency.test.ts:[INTENTIONAL RED]` — **INTENTIONAL RED on main**
- AC-3 (client.ts and server.ts consistent) → `env-consistency.test.ts:[INTENTIONAL RED]` — **INTENTIONAL RED on main**
- AC-4 (graceful undefined when neither set) → `env-consistency.test.ts:[INTENTIONAL RED]` — **INTENTIONAL RED on main**
- AC-5 (env var name audit) → `env-consistency.test.ts:auth package references ANON_KEY` — **PASS on main**

## Intentional-Red Summary (Tests That Fail on main Until Wave 1 Merges)

| Test | Wave 1 Track | Reason Fails on main |
|------|-------------|---------------------|
| `TestHandlePostPasswordChange_NewPasswordTooShort` | T1 | No handler-level min-8 check |
| `TestHandlePostPasswordChange_NoConfirmPassword_Succeeds` | T1 | Empty confirm treated as mismatch |
| `TestHandlePostPasswordChange_AcceptsFormURLEncoded` | T1 | Same confirm bug |
| `password.test.tsx: renders confirm password input` | T2 | No confirm field on page |
| `password.test.tsx: submit calls changePassword()` | T2 | Page uses raw fetch, not api-client |
| `password.test.tsx: does not POST to wrong endpoint` | T2 | Page uses /api/account/password (missing /v1/) |
| `changePassword.test.ts` (all 6) | T2 | changePassword() not in api-client |
| `proxy.test.ts: preserves text/plain Content-Type` | T3 | Proxy hardcodes application/json |
| `env-consistency.test.ts` (4 of 5) | T5 | resolveSupabaseAnonKey not exported |

## Pre-Existing Failures (Not Introduced by This Branch)

- `TestXPChartZeroFill` in `apps/api/internal/handlers` — pre-existing on main
- 22 frontend tests in 9 files across `apps/rpg-tracker` — pre-existing on main

## Coverage Gaps

- T3: No runtime test for hop-by-hop header stripping (WHATWG fetch API limitation in jsdom)
- T4: No test for "does not log sensitive Supabase response body" (would require log capture infrastructure)
- T5: No integration test verifying the actual Supabase client receives the resolved key
