## Status: DONE

## Branch

`cursor/backend-http-logging-hardening-c6a8-0504`

## Commit

`aeb3a40` — security: add HTTP timeouts, harden auth logging, add input validation

## PR URL

[https://github.com/EdenExperiments/AgenticExperiment/pull/new/cursor/backend-http-logging-hardening-c6a8-0504](https://github.com/EdenExperiments/AgenticExperiment/pull/new/cursor/backend-http-logging-hardening-c6a8-0504)
(draft PR creation requires manual action — `gh` CLI is read-only in this environment)

## Files Changed

- `apps/api/internal/auth/context.go` — added `WithEmail` test helper
- `apps/api/internal/auth/handler.go` — removed sensitive body logging from signup error path; added `current_password` required check and `new_password` min-8-chars validation; removed unused `io` import
- `apps/api/internal/auth/middleware.go` — added `jwksFetchTimeout = 10s` constant; added `httpClient` field to `jwksCache`; `fetch()` uses `c.httpClient` instead of bare `http.Get`; both `NewJWTMiddleware` and `NewSessionMiddleware` initialise with timeout
- `apps/api/internal/auth/middleware_test.go` — added `serveSlowJWKS` helper; added `TestFetch_Timeout`, `TestFetch_NonOKStatus`, `TestFetch_MalformedJSON`
- `apps/api/internal/auth/handler_test.go` — new file; 8 tests for `HandlePostPasswordChange` and `HandlePostSignout`
- `apps/api/internal/storage/storage.go` — added `storageClientTimeout = 30s`; `NewSupabaseStorageClient` uses it (was `&http.Client{}` with no timeout)
- `apps/api/internal/storage/storage_test.go` — new file; 6 tests: timeout, context cancellation, non-200 status, 404-is-success

## Notes

- All changes are backwards-compatible; no public interface signatures changed
- `WithEmail` was absent from context.go but required by pre-existing `handler_test.go` that was not yet committed on main
- `confirm_new_password` is treated as optional in `HandlePostPasswordChange` — only validated when non-empty (matches test expectations)
- Storage client already uses `context`-aware `http.NewRequestWithContext`; the missing timeout was the only gap
- JWKS `fetch()` nil-guard on `c.httpClient` added for backwards-compatibility with test code that builds `jwksCache` directly without the field

## Test Results

- `internal/auth`: 18 tests — all PASS (includes 8 handler tests + 7 middleware tests + 3 new fetch tests)
- `internal/storage`: 6 tests — all PASS (timeout, context cancel, status codes, idempotent delete)
- `internal/handlers`: `TestXPChartZeroFill` FAIL — **pre-existing date-boundary flake**, confirmed failing on main before this branch
- All other packages: PASS