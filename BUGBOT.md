# Bugbot Review Rules

Repo-level standards for Bugbot reviews and Autofix (Pillar B, D-056). All code — human, IDE
agent, cloud agent, maintenance bot — converges through this review loop; findings gate merges via
the "no open medium+ findings" required status check.

## Repo context

Monorepo: Go API (`apps/api`, chi + pgx), Next.js 15 / React 19 frontends (`apps/rpg-tracker`,
`apps/nutri-log`, `apps/mental-health`), shared TS packages (`packages/*`). Constraints:
`docs/architecture.md` and `docs/practices.md`. Tests are the behaviour spec.

## Severity calibration

Flag as HIGH (blocking):

- Secrets, tokens, or API keys in code, logs, comments, or test fixtures. The user's Claude API
  key must never appear in HTML, cookies, logs, or client responses (D-015).
- Auth/user-isolation violations: any handler or repository path that can read or write another
  user's data; missing auth middleware on a new route.
- XP-write transaction violations: `xp_events` insert, `skills.current_xp`, and
  `skills.current_level` must update in a single transaction (R-003).
- Level computation client-side or uncapped: effective-level capping belongs in the Go handler
  (R-004); `starting_level > 99` must be rejected server-side (D-018).
- AES-GCM nonce reuse or non-random nonces (R-002).
- Edits to `.github/workflows/**` authored by agent accounts.
- Tests weakened, skipped, or deleted to make a change pass.

Flag as MEDIUM (blocking via the severity status check):

- Missing tests for new business logic, API contracts, or component behavior (D-036 — pure visual
  composition is exempt).
- Unhandled error paths in Go handlers; swallowed promise rejections in TS.
- Migrations that are not forward/backward compatible without a stated reason.
- Hardcoded visual values where design tokens exist (three-theme system, D-035).
- N+1 query patterns or missing transaction boundaries in repositories.

Flag as LOW (advisory, do not block):

- Style and naming inconsistencies the linters don't catch.
- Missing `docs/` updates when a lasting platform rule changed — mention, don't block.

## Do not flag

- Generated files and lockfiles.
- Test-only "insecure" fixtures clearly marked as canary/example material
  (`packages/cursor-agents/src/canary-insecure-example.ts`).
- Theme CSS differences between Clean/Stylish modes — these are intentional (D-043).
- TODO comments that reference a tracked feature ID.

## Autofix policy

- Propose mode only (fix-as-comment); direct push to branches is not enabled (D-056).
- Fix only allowlisted categories: the HIGH/MEDIUM items above with a clear mechanical fix and
  test coverage. Do not attempt architectural rewrites, dependency upgrades, or workflow edits.
- Every fix must keep the full test suite green (`pnpm test:ci` + `go test ./...` for touched
  areas) and must not modify test expectations to pass.
- Iteration cap: after 3 review→fix cycles without convergence, stop and escalate to a human.
