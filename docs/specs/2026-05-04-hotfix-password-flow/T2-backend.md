## Status: DONE

## Files Changed

- `apps/api/internal/server/server.go` — wired `POST /api/v1/account/password` route
- `apps/api/internal/auth/handler.go` — fixed `HandlePostPasswordChange` validation logic
- `apps/api/internal/auth/context.go` — added `WithEmail` test helper
- `apps/api/internal/auth/handler_test.go` — new file, 8 tests

## Route Contract

```
POST /api/v1/account/password
Content-Type: application/x-www-form-urlencoded

current_password      string  required
new_password          string  required (min 8 chars)
confirm_new_password  string  optional — validated only when non-empty, must equal new_password
```

Responses (all `{"error": "..."}` or `{"status": "..."}` JSON):
- `200` `{"status":"password_changed"}`
- `401` `{"error":"unauthorized"}` — no auth context
- `422` `{"error":"current_password is required"}`
- `422` `{"error":"new_password must be at least 8 characters"}`
- `422` `{"error":"new passwords do not match"}` — only fired when confirm_new_password is non-empty
- `422` `{"error":"current password is incorrect"}` — Supabase rejects the credential
- `500` `{"error":"unable to verify identity"}` — email missing from JWT context

## Notes

### Root causes fixed
1. The `HandlePostPasswordChange` handler existed but the route was never registered in `server.go`.
2. The old conditional `if newPassword != confirmNewPassword` always 422'd when `confirm_new_password`
   was omitted (empty string never matches a valid new password). Now the check only fires when
   `confirm_new_password` is explicitly provided.
3. No validation existed for empty `current_password` or minimum `new_password` length.

### Frontend URL discrepancy (out of scope, risk noted)
The frontend page (`app/(app)/account/password/page.tsx`) calls `/api/account/password` — missing
the `v1` segment. The Next.js catch-all proxy (`app/api/[...path]/route.ts`) forwards this as
`http://<go-api>/api/account/password`, which is not registered. The correct URL should be
`/api/v1/account/password`. This is a **separate frontend fix** outside the backend scope of this
hotfix; it must be addressed for the flow to work end-to-end in production.

### Pre-existing test failure
`TestXPChartZeroFill` in `internal/handlers` fails due to a date-boundary off-by-one (today is the
30th of the window); this failure exists on `main` and is unrelated to this PR.

## Test Results

```
=== RUN   TestHandlePostPasswordChange_Unauthorized         PASS
=== RUN   TestHandlePostPasswordChange_MissingCurrentPassword PASS
=== RUN   TestHandlePostPasswordChange_NewPasswordTooShort  PASS
=== RUN   TestHandlePostPasswordChange_MismatchedConfirmation PASS
=== RUN   TestHandlePostPasswordChange_BadCurrentPassword   PASS
=== RUN   TestHandlePostPasswordChange_Success              PASS
=== RUN   TestHandlePostPasswordChange_SuccessWithConfirmation PASS
=== RUN   TestHandlePostSignout_ClearsCookies               PASS
--- plus 7 existing JWT middleware tests ---
ok  github.com/meden/rpgtracker/internal/auth    (15/15 PASS)
ok  github.com/meden/rpgtracker/internal/server  (1/1 PASS)
```

## Branch / Commit

- Branch: `cursor/hotfix-password-flow-c6a8-0504`
- Commit: `2ae7622`
- PR URL: not created (gh CLI lacks createPullRequest permission — push URL:
  https://github.com/EdenExperiments/AgenticExperiment/pull/new/cursor/hotfix-password-flow-c6a8-0504)
