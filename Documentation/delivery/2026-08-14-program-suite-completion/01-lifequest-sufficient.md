# Workstream 1 — LifeQuest Sufficient Skill Tracker

**Program:** `2026-08-14-program-suite-completion`  
**Features:** F-009b (primary), F-007, F-010, F-012  
**Decision:** D-064  
**App:** `apps/rpg-tracker` + `apps/api` + `packages/ui` + `packages/api-client`

## Why this workstream exists

Release 1 shipped skill CRUD, quick log, XP, and **gate visibility**. The product core loop in `product-requirements.md` still includes “blocker challenges gate advancement” and “AI feedback uses recent activity.” Today a user who reaches a gate cannot complete it in the UI, the Go gate store is stubbed, and coaching does not exist. “Sufficient” means that loop actually closes. It does **not** mean skill trees, meta-skills, or narrative immersion.

## Current-state audit

| Piece | State | Evidence |
|-------|-------|----------|
| Gate visibility + XP lock | Shipped | `BlockerGateSection` on skill detail; D-021 tests |
| `POST /api/v1/blocker-gates/{id}/submit` | Partial | `apps/api/internal/handlers/gate.go` |
| `dbGateStore.GetGate` | Stub (`nil, nil`) | `gate.go` |
| `dbGateStore.GetActiveCooldown` | Stub (never cools down) | `gate.go` |
| AI assess path | Broken | `CallRaw` with empty API key; always clears gate; verdict hardcoded `[REDACTED]` |
| Self-report path | Likely works if insert/clear work | `handleSelfReport` |
| HTTP body | Mismatch | Handler `ParseForm`; `submitGate()` JSON-encodes |
| `GateSubmissionForm` / `GateVerdictCard` | Built, exported, **not mounted** | `packages/ui/src/` |
| Skill detail submit | Button shown when `firstNotifiedAt` set; `onSubmitForAssessment` not passed | `skills/[id]/page.tsx` |
| `log_note` | Column + optional quick-log field | Not an NL parse flow |
| Reward ceremony | Missing | Tier modal exists (D-022); no gate-clear ceremony |
| AI coaching | Missing | Planner exists only for goals (`goal_plan.go`) |

## Out of scope

F-011, F-025, F-029, F-028, F-031, F-042, F-043, F-020, NutriLog, paywall redesign. Do not change XP curve (D-014). Do not change quick-log to chip-first (D-034).

---

## User cases

### C-LQ-01 Gate appears at tier boundary

**Given** a skill whose effective level has reached a not-yet-cleared gate  
**When** the user opens skill detail  
**Then** `BlockerGateSection` replaces the XP bar (D-021), shows title/description, and XP continues to accrue behind the gate (D-007).

### C-LQ-02 Submit for assessment (AI)

**Given** the user has AI entitlement (`pro` + stored key, F-075) and an active notified gate  
**When** they tap Submit → choose AI path → fill What (≥50), How (≥50), Feeling (≥20) → submit  
**Then** Go decrypts the user key (D-015), calls Claude with a structured JSON schema, persists `gate_submissions`, and:

- `pass` → `blocker_gates.is_cleared = true`, `cleared_at = now()`, response `gate_cleared: true`, UI shows `GateVerdictCard` + reward (LQ-04).
- `reject` → gate stays locked, `next_retry_at` = now+24h, 429 on retry until then, UI shows feedback and disabled retry.

### C-LQ-03 Self-report path

**Given** an active gate  
**When** the user chooses self-report and meets the same evidence length rules  
**Then** the gate clears without Claude. Verdict `self_reported`. This path always exists (same spirit as D-011: AI optional).

### C-LQ-04 No key / not entitled

**Given** `has_api_key = false` or entitlement reason `subscription_required`  
**When** the form is shown  
**Then** AI path is disabled; self-report remains. Do not send an empty key to Anthropic.

### C-LQ-05 Unauthenticated / other user

**Given** no JWT, or a gate owned by another user  
**When** POST submit  
**Then** 401 or 404. Never leak another user’s evidence.

### C-LQ-06 Cooldown

**Given** a rejected AI attempt with `next_retry_at` in the future  
**When** POST again  
**Then** 429 `gate submission in cooldown`. Store must not be a stub.

### C-LQ-07 Validation

**Given** any evidence field below minimum  
**When** POST  
**Then** 422 with `fields` map (already sketched in handler). UI counters turn ready at threshold (`GateSubmissionForm` tests).

### C-LQ-08 JSON and form both accepted (contract)

**Given** the typed client sends JSON  
**When** POST  
**Then** the handler decodes JSON **or** form-urlencoded. Prefer JSON as canonical; keep form for existing Go tests until migrated.

### C-LQ-09 Detailed natural-language log (F-007)

**Given** a skill with no active gate blocking the log action (logging itself is always allowed; level is gated)  
**When** the user opens “Log in words” and types a paragraph (e.g. “45 minutes of barre chords, slow tempo”)  
**Then** if entitled, Claude returns `{ "time_spent_minutes": 45, "summary": "..." }`; XP is computed with D-034 from minutes × tier; `log_note` stores the original text. If not entitled or AI fails, the user can still pick time chips (existing quick log). Never invent minutes without a user-visible preview and confirm.

### C-LQ-10 Note-only (already shipped)

**Given** quick log  
**When** the user adds an optional note  
**Then** behaviour stays; F-007 must not remove the 3-tap path.

### C-LQ-11 Reward moment (F-010)

**Given** a gate just cleared  
**When** the response `gate_cleared: true` arrives  
**Then** a full-screen ceremony (reuse `TierTransitionModal` patterns, not a toast): gate title, “path cleared”, optional title string if this program adds titles as copy-only (no new title inventory system). If the clear also crossed a tier, show **one** combined modal, not two stacked.

### C-LQ-12 Coaching (F-012)

**Given** the skill has ≥3 `xp_events` in the last 14 days and the user is AI-entitled  
**When** they open skill detail or tap “Coach”  
**Then** `POST /api/v1/skills/{id}/coach` returns grounded bullets from recent `log_note` + minutes + level + active gate. No key in response. Empty history → 422 `not_enough_history`, UI copy “Log a few sessions first.”

### C-LQ-13 Double submit

**Given** an in-flight gate POST  
**When** the user taps submit again  
**Then** button disabled; server-side unique attempt numbering already described in `InsertSubmission`.

---

## Confirmed requirements

1. Un-stub `GateStore` DB methods; load the user’s encrypted Claude key for the AI path the same way `goal_plan.go` does.
2. Parse Claude output as JSON `{ "verdict": "pass"|"reject", "feedback": string }`. On parse failure, treat as 502 `ai assessment unavailable` and **do not** clear the gate.
3. Align `submitGate` and the handler on JSON.
4. Mount `GateSubmissionForm` + `GateVerdictCard` from skill detail; pass `onSubmitForAssessment`.
5. Add a detailed-log sheet that is opt-in from skill detail / dashboard, not a replacement for quick log.
6. Gate-clear ceremony (F-010) on success.
7. Coaching endpoint + panel, entitlement-gated, after F-007.

## Assumptions

- `first_notified_at` is set by existing XP/log handlers when the user first hits the gate; do not redesign that.
- Titles in F-010 are ceremonial copy (“Gate title completed”), not a new `titles` table, unless a later program adds inventory.
- Coaching is on-demand, not a weekly cron (weekly review is F-019, out of scope).

---

## Acceptance criteria

| ID | Criterion | Verify |
|----|-----------|--------|
| AC-LQ-01 | `GetGate` returns the row for `(user, gate)`; other user → not found | `go test ./internal/handlers/ ./internal/skills/` |
| AC-LQ-02 | Cooldown persisted and enforced (429) | Go test |
| AC-LQ-03 | AI path uses decrypted user key; empty key never called | Go test with fake caller capturing key |
| AC-LQ-04 | `pass` clears gate; `reject` does not; parse failure does not | Go test |
| AC-LQ-05 | Self-report clears gate without Claude | Go test (existing, keep green) |
| AC-LQ-06 | JSON body accepted for submit | Go test + api-client test |
| AC-LQ-07 | Unauthenticated 401; foreign gate 404 | Go test |
| AC-LQ-08 | Skill detail: Submit opens form; success shows verdict; reject shows cooldown | `pnpm --filter rpg-tracker test skill-detail` |
| AC-LQ-09 | AI path disabled without entitlement; self-report available | rpg-tracker + ui tests |
| AC-LQ-10 | Quick log 3-tap path unchanged | `pnpm --filter @rpgtracker/ui test QuickLogPanel` |
| AC-LQ-11 | NL log: entitled user sees preview minutes/XP and confirm writes `xp_events` + `log_note` | Go + rpg-tracker tests |
| AC-LQ-12 | NL log AI failure falls back to time chips; no XP written until confirm | tests |
| AC-LQ-13 | Gate-clear UI is a modal/ceremony, not only a toast | rpg-tracker test |
| AC-LQ-14 | Coach returns 422 without history; 200 with grounded summary; 403/paywall reason when not entitled | Go + UI |
| AC-LQ-15 | No `nl_*` or hub XP changes | `git diff` scope |

---

## API sketches

### `POST /api/v1/blocker-gates/{id}/submit`

Canonical JSON:

```json
{
  "path": "ai",
  "evidence_what": "…",
  "evidence_how": "…",
  "evidence_feeling": "…"
}
```

Response `200`:

```json
{
  "submission": { "id": "…", "verdict": "pass", "ai_feedback": "…", "attempt_number": 1, "next_retry_at": null },
  "gate_cleared": true
}
```

Reject: `gate_cleared: false`, `verdict: "reject"`, `next_retry_at` set.

### `POST /api/v1/skills/{id}/logs/parse` (LQ-03)

```json
{ "text": "practiced guitar 45 minutes on barre chords" }
```

Response `200`: `{ "time_spent_minutes": 45, "summary": "Barre chord practice", "confidence": "high" }`  
Does **not** write XP. Client then calls existing log XP with preview.

### `POST /api/v1/skills/{id}/coach` (LQ-05)

Empty body. Response `{ "bullets": ["…"], "based_on_log_count": 5, "window_days": 14 }`.

---

## Sessions

### LQ-01 — Gate persistence and real AI assessment (Go)

**Size:** one agent run. **Blocks:** LQ-02.

**Target paths**

- `apps/api/internal/handlers/gate.go`
- `apps/api/internal/handlers/gate_test.go`
- `apps/api/internal/skills/` (repository methods for GetGate, cooldown, key lookup)
- Do not edit NutriLog or rpg-tracker in this session.

**Do**

1. Implement real `GetGate` / `GetActiveCooldown` / keep `InsertSubmission` + `ClearGate`.
2. Accept JSON (and still accept form for current tests, or migrate tests to JSON in this PR).
3. Load Claude key like `goal_plan.go`; never log it.
4. Structured verdict parse; reject does not clear; 502 on AI/parse failure.
5. Tests for C-LQ-02, 03, 05, 06, 07, 08.

**Verify:** `cd apps/api && go test ./internal/handlers/ ./internal/skills/ ./internal/keys/`

**Prompt**

```text
Implement session LQ-01 from Documentation/delivery/2026-08-14-program-suite-completion/01-lifequest-sufficient.md.

Close F-009b on the API only. Un-stub dbGateStore.GetGate and GetActiveCooldown. Accept JSON on POST /api/v1/blocker-gates/{id}/submit (keep or migrate form tests). AI path must decrypt the user’s Claude key (copy the goal_plan pattern), send a JSON-schema prompt, parse {verdict: pass|reject, feedback}, clear the gate only on pass or self_report. Parse/AI failure = 502 and do not clear. Reject sets a 24h cooldown. Empty API key must never be sent to Anthropic.

Do not touch apps/rpg-tracker, NutriLog, or XP curve. Write Go tests for AC-LQ-01 through AC-LQ-07. Run: cd apps/api && go test ./internal/handlers/ ./internal/skills/
Stop when those tests pass. Update Documentation/feature-tracker.md: F-009b note “API complete; UI not wired”.
```

---

### LQ-02 — Wire gate submission UI

**Depends on:** LQ-01. **Size:** one agent run.

**Target paths**

- `apps/rpg-tracker/app/(app)/skills/[id]/page.tsx`
- `apps/rpg-tracker/app/__tests__/skill-detail.test.tsx`
- `packages/api-client/src/client.ts` (submitGate body/headers if still wrong)
- `packages/ui` only if wiring bugs in `GateSubmissionForm` / `BlockerGateSection`

**Do**

1. Pass `onSubmitForAssessment` from skill detail; show form; call `submitGate`.
2. Entitlement: reuse `GET /account/ai-entitlement`.
3. Map success/reject to `GateVerdictCard`.
4. Fix client JSON vs form if LQ-01 made JSON canonical.

**Verify:** `pnpm --filter @rpgtracker/api-client test` and `pnpm --filter rpg-tracker test skill-detail`

**Prompt**

```text
Implement session LQ-02 from Documentation/delivery/2026-08-14-program-suite-completion/01-lifequest-sufficient.md.

Wire GateSubmissionForm and GateVerdictCard on skill detail. BlockerGateSection already has onSubmitForAssessment unused. Use submitGate from api-client. Disable AI path when entitlement is not ready; keep self-report. Cover C-LQ-02, 03, 04, 08 in skill-detail tests. Do not implement F-010 ceremony yet (LQ-04) beyond showing GateVerdictCard. Do not change QuickLog. Stop when named tests pass. Mark F-009b in-progress or done if AC-LQ-08/09 hold.
```

---

### LQ-03 — Detailed natural-language logs (F-007)

**Depends on:** nothing strictly; better after LQ-01 for Claude patterns. **Size:** one agent run (Go + client + UI allowed as a vertical slice because the surface is small).

**Target paths**

- New handler `apps/api/internal/handlers/log_parse.go` (or skills handler)
- `packages/api-client`
- `packages/ui` or skill-detail: “Log in words” entry next to Log XP
- Existing `logXP` write path unchanged for the confirm step

**Do:** C-LQ-09, C-LQ-10, AC-LQ-10–12. Preview + confirm. Fallback to chips.

**Verify:** `cd apps/api && go test ./internal/handlers/` ; `pnpm --filter rpg-tracker test skill-detail` ; ui QuickLog tests still green.

**Prompt**

```text
Implement session LQ-03 from 01-lifequest-sufficient.md (F-007).

Add POST /api/v1/skills/{id}/logs/parse that returns suggested minutes + summary from user text using the user’s Claude key and entitlement. Do not write XP in parse. UI: optional “Log in words” on skill detail that shows preview XP via D-034 and confirms through existing logXP. If AI fails or user is not entitled, show existing QuickLogSheet. Do not replace the 3-tap quick log. Tests for AC-LQ-10, 11, 12. Stop when verification commands pass. Tracker: F-007 in-progress or done.
```

---

### LQ-04 — Reward moment on gate clear (F-010)

**Depends on:** LQ-02. **Size:** one agent run (UI-heavy; write a page-guide note in `Documentation/page-guides/skill-detail.md` first).

**Do:** C-LQ-11, AC-LQ-13. Combine with tier modal if both fire. No new title inventory table.

**Verify:** `pnpm --filter rpg-tracker test skill-detail`

**Prompt**

```text
Implement session LQ-04 from 01-lifequest-sufficient.md (F-010).

After gate_cleared true, show a full-screen ceremony (not a toast). Follow D-022 patterns from TierTransitionModal. If the same log also crossed a tier, one combined modal. Update skill-detail page guide. Token-only colours (D-035). Tests AC-LQ-13. No schema. Stop when tests pass. Tracker: F-010 done.
```

---

### LQ-05 — AI coaching (F-012)

**Depends on:** LQ-03 (history quality). **Size:** one agent run, vertical slice OK.

**Do:** C-LQ-12, AC-LQ-14. Ground in last 14 days of events. Entitlement identical to F-075.

**Verify:** Go handler tests + skill-detail tests.

**Prompt**

```text
Implement session LQ-05 from 01-lifequest-sufficient.md (F-012).

POST /api/v1/skills/{id}/coach using recent xp_events (14 days). 422 not_enough_history if fewer than 3 events. Entitlement-gated. Return bullets only; never echo the API key. UI panel on skill detail. Tests AC-LQ-14. Do not build weekly review (F-019). Stop when tests pass. Tracker: F-012 done.
```

---

## Combined LifeQuest run (operator opt-in only)

Only if the operator asks for one long agent: LQ-01 → LQ-02 → LQ-04 in order in one branch, then a second branch for LQ-03 → LQ-05. Do not mix NutriLog.

## Done when

F-009b, F-007, F-010, F-012 are `done` in the tracker. Manual: create a skill, log until a gate, self-report clear, see ceremony; with a key, reject path cools down; NL log previews minutes; coach appears after three logs.
