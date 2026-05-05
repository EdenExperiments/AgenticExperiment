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
confirm_new_password  string  optional — validated only when non-empty
```

Responses: all JSON `{"error":"..."}` or `{"status":"..."}`
- 200 `{"status":"password_changed"}`
- 401 `{"error":"unauthorized"}`
- 422 `{"error":"current_password is required"}`
- 422 `{"error":"new_password must be at least 8 characters"}`
- 422 `{"error":"new passwords do not match"}` — only when confirm_new_password non-empty
- 422 `{"error":"current password is incorrect"}` — Supabase rejects credential

## Notes

1. Route was missing from server.go — handler existed but was unreachable.
2. Old confirmation check always 422'd when confirm_new_password omitted.
3. Frontend URL uses /api/account/password (missing v1) — separate frontend fix needed.
4. TestXPChartZeroFill pre-existing failure on main, unrelated.

## Test Results

15/15 PASS in internal/auth (8 new + 7 existing middleware tests)
1/1 PASS in internal/server
