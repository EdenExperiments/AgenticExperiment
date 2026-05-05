## Status: DONE

## Files Changed
- `apps/rpg-tracker/app/(app)/account/password/page.tsx` — updated route, added confirm field, client-side validation, uses API client
- `packages/api-client/src/client.ts` — added `changePassword()` function
- `apps/rpg-tracker/app/__tests__/password.test.tsx` — new test file (8 tests)

## Notes
- API path fixed: `/api/account/password` → `/api/v1/account/password` (via `changePassword()` in shared API client)
- Added `confirm_new_password` field; sent only when non-empty (backend treats it as optional)
- Client-side validation: min-8 char guard + confirm-match guard fires before API call to avoid unnecessary round-trips; backend still enforces both server-side
- Error `<p>` now has `role="alert"` for accessibility
- Pre-existing test failures in `skills-list`, `skill-detail`, `skill-detail-sessions`, `skill-create` are unrelated — they existed on `main` before this branch (mock registry out of date with newer api-client exports)

## Test Results
8/8 password tests pass (`npx vitest run app/__tests__/password.test.tsx`):
- renders all form fields
- renders heading
- shows validation error when new password is too short
- shows validation error when confirm does not match new password
- calls changePassword with correct fields on success
- calls changePassword without confirm when confirm field is empty
- shows API error message on failure
- cancel button calls router.back
