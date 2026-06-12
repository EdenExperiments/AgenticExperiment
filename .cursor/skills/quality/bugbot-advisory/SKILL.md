---
name: bugbot-advisory
description: Consume Bugbot review and Autofix output as advisory context without duplicating review or requiring retired schema markers. Use when enriching SDK remediation or IDE fix workflows.
metadata:
  domain: quality
  pillar: B
---

# Bugbot Advisory

## When to use

When SDK remediation or an IDE agent needs Bugbot context, or when explaining how Bugbot fits
the three-lane model (D-060).

Do not use to run a parallel custom PR reviewer or parse `cursor-pr-review-schema:v1` (retired).

## Inputs

- Bugbot PR review comments and Autofix proposals
- `BUGBOT.md` repo rules
- Optional: `findAdvisoryReviewContext()` output from `fix-attempt.ts`

## Outputs

- Summarized advisory findings tagged `[ADVISORY]`
- Clear separation: advisory context vs merge gates (CI + Sonar + Bugbot severity check)
- Recommendation: accept Autofix, manual fix, or defer

## Procedure

1. **Merge gate stays Bugbot-native** — severity status check is authoritative; SDK does not block merge via its own comments.
2. **Ingest prose only** — treat Bugbot markdown as human-readable signal; no mandatory JSON schema.
3. **Autofix proposals** — prefer Autofix loop for review-driven fixes; SDK remediation is for Sonar/check-driven fixes with explicit operator gates.
4. **Do not duplicate** — if Bugbot already filed a finding, SDK comments should add scanner-specific context, not repeat the same issue verbatim.

## Examples

### Positive

- `fix-attempt` merges Sonar BLOCKER list with a one-paragraph Bugbot summary for planner context; comment on PR is labeled `[ADVISORY]`.

### Negative

- Re-enable `CURSOR_REQUIRE_REVIEW_SCHEMA=true` expecting pipeline reviewer output.
