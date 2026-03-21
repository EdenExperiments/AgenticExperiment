## Status: DONE

## Files Changed

### New files created
- `packages/ui/src/GrindAnimation.tsx` — phase="work"/"break" with tier colour ring and --color-break CSS var
- `packages/ui/src/GrindOverlay.tsx` — controlled `phase` prop: config/work/break/end-early; popstate intercept during work phase
- `packages/ui/src/PostSessionScreen.tsx` — XP chip selector, reflection textareas, sticky footer with data-sticky="true"
- `packages/ui/src/XPBarChart.tsx` — empty state motivational copy when all-zero; bars with data-testid="xp-bar"
- `packages/ui/src/SkillStreakBadge.tsx` — hidden when current=0; data-testid="streak-badge"
- `packages/ui/src/PersonalBests.tsx` — highestSession, longestStreak, totalXP display
- `packages/ui/src/MonthlySummary.tsx` — monthlyXP, trackedMinutes, daysActive display
- `packages/ui/src/GateSubmissionForm.tsx` — char counters with green at 50-char threshold; rejected state hides form; AI loading disables submit; ai_unavailable keeps path selector visible
- `packages/ui/src/GateVerdictCard.tsx` — verdict display for pending/approved/rejected/self_reported

### Modified existing files
- `packages/api-client/src/types.ts` — added SkillStreak, GateSubmission, TrainingSession, XPChartEntry, XPChartResponse; extended SkillDetail and Account
- `packages/api-client/src/client.ts` — added createSession, listSessions, getXPChart, submitGate, updateAccount
- `packages/ui/src/index.ts` — exported all 9 new components
- `packages/ui/src/SkillCard.tsx` — added current_streak prop; streak badge (data-testid="streak-badge") shown only when >= 2
- `packages/ui/src/BlockerGateSection.tsx` — added firstNotifiedAt, isCleared, activeGateSubmission, hasApiKey props; "Submit for Assessment" button conditional on firstNotifiedAt set + !isCleared; "Attempt N of ∞" label
- `packages/ui/src/QuickLogSheet.tsx` — added optional time-spent field (data-testid="time-spent-input")
- `packages/ui/vitest.config.ts` — added @rpgtracker/api-client alias so PostSessionScreen.test.tsx dynamic import resolves
- `apps/rpg-tracker/app/(app)/skills/[id]/page.tsx` — Start Session (btn-primary, data-variant="primary") + Log XP (btn-secondary, data-variant="secondary") button row; streak-badge when current>0; streak-zero-prompt ("Log today to start your streak today") when current=0; getXPChart query wired

## Notes

- GrindOverlay uses a controlled `phase` prop (the tests drive phase directly rather than through internal state transitions). Internal state syncs from prop via useEffect. popstate handler sets internal state to 'end-early' when in work phase.
- PostSessionScreen sticky footer uses both `className="sticky bottom-0"` Tailwind class AND `data-sticky="true"` attribute — the test checks for either `sticky` class or `data-sticky="true"`, so the data attribute is the reliable check in jsdom.
- GateSubmissionForm always renders both AI and Self-report radio buttons (path selector always visible per AC-G3 ai_unavailable requirement). The rejected state early-returns without the form, so form fields are absent when verdict=rejected.
- SkillCard streak badge wraps the count number in a `<span>` element so `getByText('2')` finds an element with exact text '2' rather than '🔥 2'.
- The @rpgtracker/api-client alias was added to packages/ui/vitest.config.ts because PostSessionScreen.test.tsx does `vi.mock('@rpgtracker/api-client')` + dynamic `await import()`. Without the alias, vite cannot resolve the package path during test transform.

## Test Results

All T1 frontend tests pass.

- `pnpm --filter @rpgtracker/ui run test -- --run`: **16 test files, 68 tests — all passed**
- `pnpm --filter rpg-tracker run test -- --run`: **10 test files, 34 tests — all passed**
- `pnpm turbo test`: **7 tasks successful** (0 failures across all packages)
