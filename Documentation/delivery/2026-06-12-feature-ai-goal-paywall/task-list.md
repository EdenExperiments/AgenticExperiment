# Task List — AI Goal Paywall UX (F-049 Lane B)

Ordered execution table. Tasks touching overlapping files are serialised.

| ID | Summary | Stack | Target paths | Depends on | Parallel? | Verification command |
| --- | --- | --- | --- | --- | --- | --- |
| task-01 | Composite AI entitlement read endpoint | Go | `apps/api/internal/handlers/`, `apps/api/internal/server/server.go` | — | **Y** (solo API slice) | `cd apps/api && go test ./internal/handlers/... -run AIEntitlement -count=1` |
| task-02 | API client entitlement types + client | TS (package) | `packages/api-client/src/` | task-01 | N | `pnpm --filter @rpgtracker/api-client test` |
| task-03 | PaywallCTA variants + `paywall_viewed` analytics | TS (frontend) | `apps/rpg-tracker/components/PaywallCTA.tsx`, `apps/rpg-tracker/lib/analytics.ts`, related tests | task-02 | N | `cd apps/rpg-tracker && pnpm exec vitest run app/__tests__/paywall-gating.test.tsx -t "PaywallCTA"` |
| task-04 | AI wizard + goals list paywall integration | TS (frontend) | `apps/rpg-tracker/app/(app)/goals/`, `apps/rpg-tracker/lib/useAIEntitlement.ts`, paywall + wizard tests | task-03 | N | `cd apps/rpg-tracker && pnpm exec vitest run app/__tests__/paywall-gating.test.tsx app/__tests__/ai-goal-wizard.test.tsx` |
| task-05 | Account subscription section + forecast paywall cleanup | TS (frontend) | `apps/rpg-tracker/app/(app)/account/page.tsx`, `apps/rpg-tracker/app/(app)/goals/[id]/page.tsx`, tests | task-02 | **Partial** — can start after task-02 in parallel with task-03/04 if files do not overlap; **recommended after task-04** to avoid account test churn | `cd apps/rpg-tracker && pnpm exec vitest run app/__tests__/paywall-gating.test.tsx` |

## Parallelism summary

```
task-01 ──► task-02 ──┬──► task-03 ──► task-04 ──► task-05 (recommended)
                       └──► task-05 (possible early start on account-only files after task-02)
```

- **Maximum parallel after sign-off:** task-01 only (no other tasks until API contract exists).
- **After task-02:** task-03 and the account-only portion of task-05 could overlap; prefer serial task-03 → task-04 → task-05 to minimise merge conflicts in shared test files.

## Subagent routing

| Task | Test writer | Implementer |
| --- | --- | --- |
| task-01 | `test-writer-go` | `implementer-go` |
| task-02 | `test-writer-ts` | `implementer-ts` |
| task-03 | `test-writer-ts` | `implementer-ts` |
| task-04 | `test-writer-ts` | `implementer-ts` |
| task-05 | `test-writer-ts` | `implementer-ts` |

Each task ends with `verifier` before merge.
