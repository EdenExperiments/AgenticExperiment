# Decision Log

Last updated: 2026-03-15 (updated by architecture-agent: D-014 and D-015 added; A-001 retired and superseded by D-015; D-013 resolved by D-014)

## Confirmed Decisions

| Date | ID | Decision | Reason |
| --- | --- | --- | --- |
| 2026-03-15 | D-001 | Use Go, Templ, HTMX, and Tailwind as the baseline stack. | Matches the intended server-rendered interaction model and project goals. |
| 2026-03-15 | D-002 | Use PostgreSQL with Supabase and Supabase Auth as the initial backend platform choice. | Reduces setup burden while preserving relational modeling and hosted auth. |
| 2026-03-15 | D-003 | Use a user-supplied Claude API key stored server-side. | AI capability is central to the concept and must remain tied to the user's own access. |
| 2026-03-15 | D-004 | Use a LifeQuest-first MVP for release 1 and defer NutriLog feature delivery until after the core LifeQuest loop is stable. | This creates a tighter first release and reduces cross-domain scope risk. |
| 2026-03-15 | D-005 | Use one unified application shell for release 1 rather than two isolated product shells. | This keeps navigation and account state simpler for the first release. |
| 2026-03-15 | D-006 | Require strong mobile usability for core release-1 flows, but not full parity for every advanced feature on day one. | This protects mobile viability without over-scoping the first release. |
| 2026-03-15 | D-007 | When a blocker gate is reached, XP continues to accrue but progression past the gate stays locked until blocker completion. | This preserves motivation without making blockers punitive. |
| 2026-03-15 | D-008 | Social and sharing features are out of scope for release 1. | They do not support the first build's core product loop. |
| 2026-03-15 | D-009 | The server must keep user Claude API keys encrypted at rest and never expose them to the client. | This is the minimum acceptable security baseline. |
| 2026-03-15 | D-010 | Release 1 ships blocker gate visibility and locked progression state only; the blocker completion UI flow is deferred to a later release. | Keeps the first release focused on the core loop. Gate state and locked progression are sufficient to validate the mechanic. The full completion ceremony (evidence submission, confirmation, unlock animation) adds scope without being required to prove the concept. Builds directly on D-007. **Known release-1 limitation:** users who reach a blocker gate cannot complete it in release 1; the gate is informational only in this release. |
| 2026-03-15 | D-011 | AI-assisted skill calibration in the onboarding flow is optional, not mandatory. A manual starting-level selection must always be available as a fallback path. | Mandatory AI calibration creates a hard onboarding dependency on the user's Claude API key being valid at signup time. A failed or missing key would block the user from creating their first skill, which violates the low-friction logging principle. The AI calibration path remains the recommended default but must never be the only path. |
| 2026-03-15 | D-012 | Release 1 uses email/password auth only. Social auth (OAuth providers) is deferred to a later release. | Keeps the auth schema minimal for release 1 and avoids OAuth provider integration scope. Social auth can be layered on after the core loop is stable. |
| 2026-03-15 | D-013 | The XP progression curve is non-linear. The XP required to advance to each successive level increases, so higher levels demand progressively more effort. The exact curve shape (e.g., quadratic, exponential, custom step function) is left to the architecture-agent to propose, but the growth direction is confirmed. | Reflects that real-world skill mastery becomes harder as you progress; non-linear growth is intentional. **Resolved by D-014.** |
| 2026-03-15 | D-014 | XP curve shape confirmed: quadratic with tier-based base multipliers. Formula: `XP_to_reach_level(N) = base_multiplier(tier(N)) × N²`. Tier multipliers: Levels 1–9 = 100 (Novice), Levels 10–19 = 120 (Apprentice), Levels 20–29 = 150 (Journeyman), Levels 30–49 = 180 (Expert), Levels 50+ = 220 (Master). Representative thresholds: L1=100 XP, L5=2500, L10=12000, L20=60000, L30=162000, L50=550000. Tier transitions at levels 10, 20, 30 are intentional step increases that correspond to blocker gate levels (9, 19, 29). The level computation is a pure function in the `xpcurve` Go package. See architecture.md section 0 and 2 for the full formula and Go code. | Resolves D-013. Quadratic curve with tier multipliers is easy to explain to users, produces clean numbers, avoids floating-point complexity, and aligns tier transitions with the existing blocker gate levels. Phase 2 schema work (step 2a) is now unblocked. |
| 2026-03-15 | D-015 | Claude API key encryption confirmed as AES-256-GCM envelope encryption at the Go application layer. Supersedes A-001. The approach is confirmed (not just assumed) with the following production requirement: in production, the master key must be loaded from a secrets manager at startup (Kubernetes secret, AWS Secrets Manager, GCP Secret Manager, or HashiCorp Vault), not from a bare environment variable. In development, an environment variable is acceptable. All other details from A-001 are confirmed unchanged: per-user DEK wrapped by master key, decryption only in the Go process at request time, key never logged or returned to client, validation at save time, rotation via DEK re-encryption. Supabase Vault was evaluated and rejected due to infrastructure coupling risk. A Go KMS library was evaluated and rejected as excess operational complexity at this stage. | Supabase Vault tightly couples key management to Supabase as an infrastructure dependency; if the project migrates providers, vault-encrypted data requires a migration path. The Go-layer AES-256-GCM approach satisfies D-009, is fully testable, keeps the decryption surface narrow (single Go process), and is portable. The production secrets-manager requirement hardens A-001's weakest point. F-003 build is now unblocked. |

## Implementation Assumptions

| Date | ID | Assumption | Scope | Risk If Wrong |
| --- | --- | --- | --- | --- |
| 2026-03-15 | A-001 | **RETIRED — superseded by D-015 (2026-03-15).** Original assumption: AES-256-GCM envelope encryption at the Go application layer. Confirmed and upgraded to D-015 by architecture-agent. | — | — |
| — | A-002 | Not used — number reserved and voided during requirements pass. | — | — |
| 2026-03-15 | A-003 | Meta-skills and cross-app automation can remain deferred until after the core LifeQuest loop is proven in practice. | Scope boundary | MVP could become too large if this assumption is false. |

## Implementation Risks (added by architecture-agent)

| Date | ID | Risk | Mitigation |
| --- | --- | --- | --- |
| 2026-03-15 | R-001 | Supabase JWKS cache staleness: if the Go process caches the Supabase JWKS and Supabase rotates its signing keys, JWT validation will fail for all users until the cache is refreshed. | Cache JWKS with a 1-hour TTL. On JWT validation failure due to unknown key ID, re-fetch JWKS once before rejecting the token. |
| 2026-03-15 | R-002 | AES-256-GCM nonce reuse: catastrophic if a nonce is reused with the same key — ciphertext confidentiality is fully broken. | Always use `crypto/rand` to generate a fresh 12-byte nonce per encryption operation. Never derive nonces deterministically or from counters. Enforced by code review and unit tests. |
| 2026-03-15 | R-003 | XP aggregate drift: `skills.current_xp` is a denormalised aggregate; if a write to `skills` succeeds but the `xp_events` write fails (or vice versa), they drift silently. | Always update both in a single database transaction. Provide a reconciliation query: `UPDATE skills SET current_xp = (SELECT COALESCE(SUM(xp_delta), 0) FROM xp_events WHERE skill_id = skills.id)` for operational use. |
| 2026-03-15 | R-004 | Level gate bypass: if effective-level computation lives only in the template layer, a user crafting direct API requests could observe an uncapped level or trigger actions that assume a higher level. | The `effective_level()` computation must live in the Go service/handler layer. Templates receive the already-capped level value and have no access to the raw level. |

## Open Questions

None. All open questions from the initial pass have been resolved as confirmed decisions (D-010, D-011, D-012) or implementation assumptions (A-001, now superseded by D-015). D-013 is resolved by D-014.
