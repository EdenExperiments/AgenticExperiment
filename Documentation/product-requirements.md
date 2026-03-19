# Product Requirements

Last updated: 2026-03-19 (tech stack updated to reflect monorepo; MindTrack added as third app). Prior: 2026-03-15

## Product Summary

Build a platform of three connected apps under a shared Go API, auth layer, and UI component library:

- `LifeQuest` (`apps/rpg-tracker`): a gamified skill progression system based on real-world activity — **fully implemented**
- `NutriLog` (`apps/nutri-log`): a calorie, macro, and weight tracking system with AI assistance — scaffolded, pending feature work
- `MindTrack` (`apps/mental-health`): a mental wellness and mood tracking app — scaffolded, pending feature work

The product should feel like a self-improvement operating system rather than a generic task tracker.

## Planning Baseline For Release 1

The planning baseline for release 1 is a `LifeQuest`-first MVP built on a shared platform foundation.

- Release 1 includes the shared app shell, auth, secure user AI key handling, skill creation, AI-assisted calibration (optional, not mandatory), quick logging, XP and level display, and blocker gate visibility with locked progression state.
- Release 1 does **not** include the blocker completion UI flow (evidence submission, confirmation, unlock animation). Gate visibility and locked progression are sufficient for release 1 validation.
- `NutriLog` remains part of the product vision, but its feature delivery is deferred until after the LifeQuest MVP foundation is stable.
- Release 1 uses one unified application shell with multiple product areas rather than two fully separate apps.
- Release 1 must support core mobile use well, but full desktop-mobile feature parity is not required for every advanced feature on day one.
- Social or sharing features are out of scope for release 1.

## Product Goals

- Make progress tracking feel motivating rather than administrative.
- Preserve low-friction logging for daily use on desktop and mobile.
- Use AI for contextual guidance rather than novelty output.
- Allow user health and skill data to reinforce each other across the two app areas.

## Platform And Technical Direction

- Monorepo: Turborepo + pnpm workspaces (`apps/*`, `packages/*`)
- Backend: Go (chi router, pgx v5, Supabase JWT auth) — single API shared by all three apps
- Frontend: Next.js 15 App Router + React + Tailwind v4 — one app per product area
- Shared packages: `@rpgtracker/ui` (components + design tokens), `@rpgtracker/auth` (Supabase SSR), `@rpgtracker/api-client` (typed client)
- BFF pattern: Next.js Route Handler proxy forwards authenticated requests to Go API
- Database: PostgreSQL via Supabase
- Authentication: Supabase Auth (email/password for release 1)
- AI provider: Claude API with user-supplied API key stored server-side (AES-256-GCM, D-015)
- Delivery target: web app; PWA deferred (F-021)

## Product Principles

- Logging must stay low-friction.
- Gamification must reflect real achievement, not cosmetic points only.
- Existing competence should be recognized during onboarding.
- AI output must be grounded in user context such as recent logs, current level, blockers, goals, and remaining calories.
- Punishment mechanics should be optional, not default.

## Experience 1: LifeQuest

### Core Loop

1. User creates a skill.
2. AI helps define mastery and milestone descriptions.
3. User logs activity quickly or in detail.
4. XP and level progress update.
5. Blocker challenges gate advancement at milestone tiers.
6. AI feedback uses recent activity history to coach the user.

### Functional Requirements

- Support AI-assisted skill creation and calibration.
- Support both quick logs and detailed natural-language logs. (deferred: post-release-1 for detailed logs; quick logs are in release 1)
- Track XP, current level, milestone descriptions, and progress history.
- Support blocker challenges at level gates at every tier boundary: 9, 19, 29, 39, 49, 59, 69, 79, 89, 99 (10 gates total — one per tier transition).
- Show blocker state clearly in the UI before completion.
- Support reward moments for blocker completion. (deferred: post-release-1)
- Support optional meta-skills powered by weighted child-skill relationships. (deferred: post-release-1)
- Provide periodic AI coaching based on recent activity patterns. (deferred: post-release-1)
- Provide charts or summaries for recent progress. (deferred: post-release-1)
- Support optional XP decay as a configurable feature, not the default. (deferred: post-release-1)

### Release 1 LifeQuest Scope

- Include AI-assisted skill creation and starting-level calibration as an optional step; manual starting-level selection is the fallback and is always available.
- Include quick logging.
- Include XP and level progression display.
- Include blocker gate visibility: show the gate, the blocker description, and that progression is locked. XP continues to accrue behind the gate (D-007).
- Do **not** include the blocker completion UI flow in release 1 (D-010). That flow is deferred.
- Defer detailed natural-language logs unless they are needed to support calibration or blockers.
- Defer meta-skills, titles, advanced coaching, and other depth systems until after the base loop is stable.

### LifeQuest Design Decisions (Resolved)

- Blocker XP behavior: XP continues to accumulate when a blocker gate is reached, but level advancement beyond the gate remains locked until the blocker is completed (D-007, confirmed).
- Blocker release 1 scope: gate visibility and locked progression state only; completion flow is deferred (D-010, confirmed).
- Blocker authoring: the user owns the final blocker, with AI allowed to suggest a draft during skill creation. This is not changed.
- AI calibration: optional with manual fallback always available (D-011, confirmed).
- Meta-skills: deferred beyond release 1 (A-003, confirmed assumption).

## Experience 2: NutriLog

### Core Loop

1. User sets calorie and weight goals.
2. User logs food, weight, and optionally photos.
3. The app tracks calories and macros against goals.
4. AI suggests meals, recipes, and weekly adjustments using current context.

### Functional Requirements

- Support daily calorie target setup, ideally including TDEE estimation.
- Support weight logging with a visible trend graph.
- Support calorie and macro logging, including food search.
- Support barcode scanning in the mobile web experience.
- Support custom foods and saved meal templates.
- Support Claude-driven recipe and meal suggestions using remaining calories, macro targets, preferences, and recent meals.
- Support weekly health-oriented review output.
- Support progress photos as an optional feature.
- Support goal setting for target weight and weekly change rate.
- Support streak or consistency tracking for logging behavior.

### NutriLog Release Position

- NutriLog is a planned post-release-1 workstream.
- Architecture and schema planning should leave space for NutriLog to avoid obvious rework.
- NutriLog should not expand the first implementation scope before the LifeQuest MVP is build-ready.

## Cross-App Requirements

- Support shared authentication and synced data across devices.
- Support future cross-app mechanics such as calorie deficit streaks feeding skill XP.
- Support a unified character or dashboard view in a later phase.
- Support browser notifications and PWA installation.

## Non-Functional Requirements

- Mobile use must be first-class, not a desktop afterthought.
- AI responses should stream for a responsive interface.
- User API keys must never be exposed to the client.
- The product should remain understandable without heavy client-side state management.

### Security Baseline

- Store user Claude API keys encrypted at rest on the server side.
- Decrypt keys only for server-side request execution.
- Never place user Claude API keys in browser state, local storage, cookies, or rendered HTML.
- Encryption mechanism: AES-256-GCM at the Go application layer with envelope encryption. A server-side master key (environment variable or Go-compatible external secret store) wraps a per-user data encryption key. Decryption happens only in the Go process at request time. See A-001 in decision-log.md. This is the planned approach per A-001 and is subject to architecture review; the architecture-agent is free to evaluate Supabase Vault or a KMS as alternatives, provided the constraints in D-009 remain satisfied.
- Key validation: test-decrypt at save time; reject if the decrypted value does not match a valid Claude API key format.
- Key rotation: re-encrypt per-user DEKs under the new master key as a background migration; old DEKs remain usable until migration completes.

## Release Framing

### Release 1 — Confirmed MVP Scope

The following features are confirmed in scope for release 1. Nothing else should be assumed in scope without an explicit decision.

- Shared app shell and navigation (F-001)
- Supabase auth and user profile baseline — email/password only (F-002)
- User Claude API key storage with AES-256-GCM envelope encryption (F-003)
- Skill CRUD: create, view, edit, delete a skill (F-004)
- AI-assisted skill calibration as an optional step during skill creation; manual starting-level selection is always available (F-005)
- Quick XP logging (F-006)
- XP and level progression display (F-008)
- Blocker gate visibility: show the gate, show locked progression state, show what the blocker is — no completion flow in this release (F-009 partial). **Known release-1 limitation:** users who reach a blocker gate cannot complete it in release 1; the gate is informational only in this release.

The following are confirmed **not** in release 1:

- Blocker completion UI flow (evidence submission, confirmation screen, unlock ceremony) — deferred to a later release
- Detailed natural-language logs (F-007)
- Meta-skills (F-011)
- Titles and reward moments (F-010)
- AI coaching feedback (F-012)
- XP decay
- Any NutriLog features (F-013 through F-018)
- Cross-app XP integration (F-020)
- Weekly AI review (F-019)
- PWA install and push notifications (F-021)
- Data export (F-022)
- Social or sharing features

### Deferred Workstreams

- NutriLog (all features): planned post-release-1 workstream. Architecture and schema planning should reserve space for NutriLog without building it.
- Cross-app layer: deferred until both LifeQuest and NutriLog core loops are stable.
- LifeQuest depth features (meta-skills, decay, coaching, detailed logs, reward moments, blocker completion flow): deferred until after the base release-1 loop is in production.

## Assumptions

- The first release will prioritize a cohesive personal-use product over social features.
- The first release will share a common shell and navigation rather than behaving as two fully separate products.
- See decision-log.md for the full set of confirmed decisions (D-001 through D-011) and implementation assumptions (A-001, A-003).

These assumptions have been adopted as the planning baseline for the first agent-team pass and can be revised later if product direction changes.
