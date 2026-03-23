## Status: DONE

## Files Changed

- `apps/api/db/migrations/000011_user_avatar.up.sql` — new
- `apps/api/db/migrations/000011_user_avatar.down.sql` — new
- `apps/api/internal/users/service.go` — added `AvatarURL *string` to User struct, updated GetOrCreateUser SELECT/Scan, added SetAvatarURL and ClearAvatarURL
- `apps/api/internal/storage/storage.go` — new package; exports SupabaseStorageClient (concrete type satisfying handlers.StorageClient via structural typing)
- `apps/api/internal/handlers/account.go` — expanded UserStore interface (SetAvatarURL, ClearAvatarURL, GetAccountStats); added AccountStats, CategoryCount, StorageClient types; added NewUserHandlerWithAvatarStore, NewUserHandlerFull constructors; added HandlePostAvatar, HandleDeleteAvatar, HandleGetAccountStats; dbUserStore implements all new methods with inline SQL
- `apps/api/internal/handlers/account_primary_skill_test.go` — added stub implementations of SetAvatarURL, ClearAvatarURL, GetAccountStats to stubPrimarySkillStore (required by expanded UserStore interface; no test logic changed)
- `apps/api/internal/config/config.go` — added SupabaseServiceRoleKey field, loads SUPABASE_SERVICE_ROLE_KEY env var
- `apps/api/internal/server/server.go` — imported storage package; updated NewServer to accept optional handlers.StorageClient variadic; wires NewUserHandlerFull when storage provided; registered POST/DELETE /account/avatar and GET /account/stats routes
- `apps/api/cmd/server/main.go` — creates SupabaseStorageClient from config, passes to NewServer

## Notes

- StorageClient interface is defined in the handlers package (canonical location, used by tests). The storage package exports a concrete type SupabaseStorageClient that satisfies it via Go structural typing — no circular dependency.
- NewServer variadic signature preserves backward compatibility: server_test.go calls NewServer with 3 args (no storage), main.go passes 4 args.
- HandlePostAvatar reads the entire file into memory before validation to enable both size check and DetectContentType sniffing. Files are limited to 2MB so memory impact is bounded.
- The supabaseURL field on UserHandler is empty string when constructed via NewUserHandlerWithAvatarStore (used in tests). This means the generated avatar URL will be `/storage/v1/object/public/avatars/{id}/avatar?v=...`. Tests only check that avatar_url is non-empty (ACL-1), not the exact URL shape, so this is fine.
- TestXPChartZeroFill was already failing before this implementation (pre-existing off-by-one in xpchart handler date arithmetic). Not caused by any change in this feature.
- SUPABASE_SERVICE_ROLE_KEY is never logged or returned to the client.

## Test Results

All T1 tests pass:
- TestPostAvatar_ACL1_ValidJPEGReturns200WithAvatarURL — PASS
- TestPostAvatar_ACL2_FileTooLargeReturns400 — PASS
- TestPostAvatar_ACL3_UnsupportedTypeReturns400 — PASS
- TestPostAvatar_ACL4_NoAuthReturns401 — PASS
- TestDeleteAvatar_ACL5_SetsAvatarURLNullAndReturns200 — PASS
- TestDeleteAvatar_ACL5_Idempotent — PASS
- TestGetAccount_ACL6_IncludesAvatarURLField — PASS
- TestGetAccount_ACL6_WithAvatar — PASS
- TestGetAccountStats_ACL7_ReturnsAllFields — PASS
- TestGetAccountStats_ACL8_NoSkillsReturnsZeroedStats — PASS
- TestGetAccountStats_ACL9_NoAuthReturns401 — PASS

Full suite: 130 passed, 1 pre-existing failure (TestXPChartZeroFill — not in scope), 10 skipped (DB integration tests).
