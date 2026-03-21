## Test Files Written

- `apps/api/internal/skills/bonus_xp_test.go`
- `apps/api/internal/skills/streak_test.go`
- `apps/api/internal/handlers/session_test.go`
- `apps/api/internal/handlers/gate_test.go`
- `apps/api/internal/handlers/xpchart_test.go`
- `packages/ui/src/GrindOverlay.test.tsx`
- `packages/ui/src/PostSessionScreen.test.tsx`
- `packages/ui/src/SkillCard.test.tsx` (additions — existing tests preserved)
- `packages/ui/src/BlockerGateSection.test.tsx` (additions — existing tests preserved)
- `packages/ui/src/GateSubmissionForm.test.tsx`
- `packages/ui/src/XPBarChart.test.tsx`
- `apps/rpg-tracker/app/__tests__/skill-detail-sessions.test.tsx`

## Coverage Map

### Backend — Pure function tests

- AC-C1 (full bonus: standard +25%, active-use +10% at ratio>=0.95) → bonus_xp_test.go:14 `TestBonusXPFullCompletion`
- AC-C2 (partial bonus: 0.50<=ratio<0.95, formula: full_pct * ratio rounded) → bonus_xp_test.go:62 `TestBonusXPPartialCompletion`
- AC-C2 (boundary: exactly 0.95=full, 0.94=partial, 0.499=none) → bonus_xp_test.go:111 `TestBonusXPBoundary`
- AC-C3 (abandoned: always 0% bonus) → bonus_xp_test.go:162 `TestBonusXPAbandoned`
- AC-E1 (first log → streak=1) → streak_test.go:13 `TestStreakNewSkill`
- AC-E1 (consecutive days → streak increments) → streak_test.go:28 `TestStreakConsecutiveDays`
- AC-E2 (gap resets streak to 1) → streak_test.go:43 `TestStreakGapResets`
- AC-E3 (longest_streak never decreases) → streak_test.go:58 `TestStreakLongestNeverDecreases`
- D-029 (timezone-aware streak: log near midnight in user's timezone) → streak_test.go:71 `TestStreakTimezone`

### Backend — Handler tests

- AC-C3 (POST sessions status=abandoned: 200, no xp_events row, bonus_xp=0, xp_result=null) → session_test.go:76 `TestCreateSessionAbandoned`
- AC-C4/C5 (POST sessions status=completed: xp_delta=base+bonus, xp_result non-null) → session_test.go:133 `TestCreateSessionCompleted`
- API validation (POST sessions missing xp_delta for non-abandoned → 422) → session_test.go:186 `TestCreateSessionValidation`
- AC-G2 (POST gate submit short evidence_what → 422 with fields map) → gate_test.go:117 `TestGateSubmitValidation`
- AC-G7 (POST gate submit within cooldown → 429) → gate_test.go:157 `TestGateSubmitCooldown`
- AC-G4 (POST gate submit self_report → verdict=self_reported, is_cleared=true) → gate_test.go:183 `TestGateSubmitSelfReport`
- AC-G3 (POST gate submit AI failure → 502, no row inserted) → gate_test.go:234 `TestGateSubmitAIFailure`
- D-029 (PATCH /account invalid timezone → 422) → gate_test.go:260 `TestAccountTimezoneInvalid`
- AC-F5 (GET xp-chart?days=30 → 30 entries ascending) → xpchart_test.go:68 `TestXPChartReturns30Days`
- AC-F1 (GET xp-chart zero-fill: missing days appear with xp_total=0) → xpchart_test.go:118 `TestXPChartZeroFill`

### Frontend — GrindOverlay

- AC-B2 (session config overlay has Cancel button) → GrindOverlay.test.tsx:23
- AC-B2 (Cancel closes overlay, does not call onBegin) → GrindOverlay.test.tsx:32
- AC-C3 (end-session-early sheet: Keep Going / Claim Session / Abandon) → GrindOverlay.test.tsx:44
- AC-B3 (popstate during work phase → end-session-early sheet, not navigation) → GrindOverlay.test.tsx:52

### Frontend — PostSessionScreen

- AC-D4 (action buttons in sticky footer at 375px viewport) → PostSessionScreen.test.tsx:28
- AC-D8 ("Dismiss / Log Later" does not call createSession API) → PostSessionScreen.test.tsx:46

### Frontend — SkillCard

- AC-E6 (streak badge hidden when current_streak=0) → SkillCard.test.tsx:78
- AC-E6 (streak badge shown when current_streak=2) → SkillCard.test.tsx:87

### Frontend — BlockerGateSection

- AC-G1 ("Submit for Assessment" shown when first_notified_at set and is_cleared=false) → BlockerGateSection.test.tsx:40
- AC-G1 (button absent when is_cleared=true) → BlockerGateSection.test.tsx:53
- AC-G1 (button absent when first_notified_at=null) → BlockerGateSection.test.tsx:64
- AC-G8 ("Attempt 2 of ∞" with attempt_number=2) → BlockerGateSection.test.tsx:75

### Frontend — GateSubmissionForm

- AC-G2 (character counter updates on keystroke) → GateSubmissionForm.test.tsx:27
- AC-G2 (counter becomes green at minimum threshold) → GateSubmissionForm.test.tsx:36
- AC-G3 (AI loading: "Assessing your evidence...", submit disabled) → GateSubmissionForm.test.tsx:53
- AC-G3 (rejected: form hidden, feedback shown, retry disabled, date-based message) → GateSubmissionForm.test.tsx:63
- AC-G3 (AI-unavailable: path selector remains visible) → GateSubmissionForm.test.tsx:86

### Frontend — XPBarChart / GrindAnimation

- AC-F1 (empty state all-zero → motivational copy, not empty bars) → XPBarChart.test.tsx:43
- AC-B6 (GrindAnimation phase="work" applies tier colour ring) → XPBarChart.test.tsx:70
- AC-B6 (GrindAnimation phase="break" applies --color-break CSS variable) → XPBarChart.test.tsx:90

### Frontend — SkillDetail page

- AC-B1 ("Start Session" primary, "Log XP" secondary button row) → skill-detail-sessions.test.tsx:56
- AC-E5 (current_streak=0: badge hidden, motivational prompt shown) → skill-detail-sessions.test.tsx:91
- AC-E5 (current_streak>0: badge shown, prompt hidden) → skill-detail-sessions.test.tsx:108

## Red State Confirmed

Go: `go test ./internal/skills/...` and `go test ./internal/handlers/...` both fail with
`undefined: skills.ComputeBonus`, `undefined: skills.ComputeStreak`, `undefined: skills.TrainingSession`,
`undefined: handlers.NewSessionHandlerWithStore`, `undefined: handlers.NewGateHandlerWithStore`,
`undefined: handlers.NewXPChartHandlerWithStore` — missing implementation, not syntax errors.

Frontend: 6 test files fail — 4 fail at import resolution (GateSubmissionForm, GrindOverlay,
PostSessionScreen, XPBarChart — components don't exist yet), 2 fail on missing testId/prop
(SkillCard streak badge, BlockerGateSection new props). All for missing implementation.
