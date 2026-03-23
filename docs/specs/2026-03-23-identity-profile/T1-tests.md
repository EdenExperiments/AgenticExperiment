## Test Files Written
- apps/api/internal/handlers/account_avatar_test.go
- apps/api/internal/handlers/account_stats_test.go

## Coverage Map
- ACL-1 (POST /api/v1/account/avatar with valid JPEG returns 200 and avatar_url non-empty) → account_avatar_test.go:107 (TestPostAvatar_ACL1_ValidJPEGReturns200WithAvatarURL)
- ACL-2 (POST /api/v1/account/avatar with file >2MB returns 400) → account_avatar_test.go:135 (TestPostAvatar_ACL2_FileTooLargeReturns400)
- ACL-3 (POST /api/v1/account/avatar with unsupported type GIF returns 400) → account_avatar_test.go:157 (TestPostAvatar_ACL3_UnsupportedTypeReturns400)
- ACL-4 (POST /api/v1/account/avatar without auth returns 401) → account_avatar_test.go:179 (TestPostAvatar_ACL4_NoAuthReturns401)
- ACL-5 (DELETE /api/v1/account/avatar sets avatar_url to NULL and returns 200) → account_avatar_test.go:196 (TestDeleteAvatar_ACL5_SetsAvatarURLNullAndReturns200)
- ACL-5 idempotent variant (already-null avatar still returns 200) → account_avatar_test.go:229 (TestDeleteAvatar_ACL5_Idempotent)
- ACL-6 (GET /api/v1/account includes avatar_url field null when no avatar) → account_avatar_test.go:250 (TestGetAccount_ACL6_IncludesAvatarURLField)
- ACL-6 with avatar variant (avatar_url is present and non-null when set) → account_avatar_test.go:285 (TestGetAccount_ACL6_WithAvatar)
- ACL-7 (GET /api/v1/account/stats returns total_xp, longest_streak, skill_count, category_distribution) → account_stats_test.go:70 (TestGetAccountStats_ACL7_ReturnsAllFields)
- ACL-8 (GET /api/v1/account/stats with no skills returns zeroed stats and empty distribution) → account_stats_test.go:117 (TestGetAccountStats_ACL8_NoSkillsReturnsZeroedStats)
- ACL-9 (GET /api/v1/account/stats without auth returns 401) → account_stats_test.go:152 (TestGetAccountStats_ACL9_NoAuthReturns401)
- ACL-10 (API client uploadAvatar calls POST with multipart/form-data) → excluded (API client TypeScript — out of Go test scope; covered by frontend agent)
- ACL-11 (API client getAccountStats returns typed AccountStats) → excluded (API client TypeScript — out of Go test scope; covered by frontend agent)
- ACV-1 through ACV-14 → excluded (visual, D-036)

## Red State Confirmation

```
handlers [build failed]
  account_stats_test.go:21: undefined: handlers.AccountStats
  account_avatar_test.go:38: unknown field AvatarURL in struct literal of type users.User
  account_avatar_test.go:114: undefined: handlers.NewUserHandlerWithAvatarStore
  ... (10 undefined symbol errors total)
```

All failures are undefined implementation symbols — not test syntax errors.
