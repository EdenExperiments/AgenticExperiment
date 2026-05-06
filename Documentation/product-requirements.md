# Product Requirements

Last updated: 2026-05-06 (aligned shipped/deferred framing with feature tracker and decision log)

## Product Vision

"Levelling up as a person" — genuine self-improvement without toxic hustle culture. The platform helps users develop skills they wish they had, look after themselves, and track meaningful progress across all domains of their life. The gamification makes progress visible and rewarding without being prescriptive about how users should live.

The RPG Tracker acts as a **central hub** for a suite of apps. Each app in the suite contributes to unified character progression — nutrition, mental health, skills, focus time — all rolling up to a single picture of personal growth.

Long-term, each skill will be backed by **curated guidance**: expert-informed learning paths, book and resource recommendations, and location-aware suggestions (nearby classes, centres, facilities). The tracker helps users not just track progress, but actually *do the thing*.

## Product Summary

Build a platform of connected apps under a shared Go API, auth layer, and UI component library:

- `LifeQuest` (`apps/rpg-tracker`): the hub — a gamified skill progression system based on real-world activity — **Release 1 complete with additional Release 2 features shipped**
- `NutriLog` (`apps/nutri-log`): a calorie, macro, and weight tracking system with AI assistance — scaffolded, pending feature work. Progress feeds into hub character progression.
- `MindTrack` (`apps/mental-health`): a mental wellness and mood tracking app — scaffolded, pending feature work. Progress feeds into hub character progression.

The product should feel like a self-improvement operating system rather than a generic task tracker.

## Current Delivery State

- Canonical implementation status is maintained in `Documentation/feature-tracker.md`.
- Release 1 core features (F-001 through F-009) are complete.
- Multiple Release 2 features are shipped (including F-023 and F-024), with additional roadmap items still deferred.

## Planning Baseline For Release 1 (Historical)

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

- Monorepo: Turborepo + pnpm workspaces (`apps/`*, `packages/`*)
- Backend: Go (chi router, pgx v5, Supabase JWT auth) — single API shared by all apps
- Frontend: Next.js 15 App Router + React + Tailwind v4 + TanStack Query v5 — one app per product area
- Shared packages: `@rpgtracker/ui` (components + design tokens), `@rpgtracker/auth` (Supabase SSR), `@rpgtracker/api-client` (typed client)
- BFF pattern: Next.js Route Handler proxy forwards authenticated requests to Go API
- Database: Split model - local/application PostgreSQL for domain data plus Supabase Auth for identity and JWT infrastructure
- Authentication: Supabase Auth (email/password for release 1)
- AI provider: Claude API with user-supplied API key stored server-side (AES-256-GCM, D-015)
- Testing: Vitest + React Testing Library (frontend), Go standard `testing` package (backend)
- Delivery target: web app; PWA deferred (F-021)
- Theme system: three switchable UI themes (Minimal, Retro, Modern) — see Three-Theme System section below

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

## Hub Architecture

The RPG Tracker (LifeQuest) is the central hub for the suite. Other apps feed progress into the character/skill system:

- NutriLog — nutrition logging counts as progress toward health-related skills and character development
- MindTrack — mental health and wellbeing progress feeds into the system
- Future apps — any app added to the suite integrates the same way, contributing to overall character progression

Everything rolls up to the hub: skills, level, progress across all domains of self-improvement.

## Three-Theme System

The app offers three switchable UI themes. All themes surface the same features and data — the differences are visual treatment and UX flavour, catering to different user preferences.


| Theme       | Identity                                                                                                                           | Audience                                   |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| **Minimal** | Clean, data-forward, productivity-tool feel. Light backgrounds, bold typographic hierarchy, flat cards, no atmospheric effects.    | Users who want a serious, no-nonsense tool |
| **Retro**   | Full RPG immersion. Dark backgrounds, amber/gold + purple, pixel fonts, character portraits, narrative framing, scanline textures. | Gamers and RPG fans                        |
| **Modern**  | Sci-fi command centre. Dark navy, cyan + magenta, glass morphism, neon accents, atmospheric glows. Sleek and alive.                | Users who want polish and atmosphere       |


### Three-Layer Theme Architecture

1. **CSS Custom Properties** (~60% of variation) — colours, fonts, radii, shadows, motion budgets. Swapped via `data-theme` attribute on `<html>`. Zero JS overhead.
2. **Theme-scoped component CSS** (~25% of variation) — `[data-theme="retro"] .card { ... }` for atmospheric treatments (glass, scanlines, glows). Still pure CSS.
3. **Component variants** (~15% of variation) — only for structurally different elements (pixel art portraits, name formatting, timer display style). Uses a variant registry pattern with code splitting so users never download variants they aren't using.

### Theme Design Principles

- Same functionality across all themes — not different feature sets, just different presentation
- All new components must be built theme-aware from the start
- Use design tokens, never hardcoded colour/font values
- Style guides (one per theme) and page guides (one per page) govern visual implementation
- The landing page CSS (`apps/landing/app/globals.css`) is the visual DNA source of truth for the current dark fantasy aesthetic

## Cross-App Requirements

- Support shared authentication and synced data across devices.
- Support future cross-app mechanics such as calorie deficit streaks feeding skill XP.
- Support a unified character or dashboard view via the hub.
- Support browser notifications and PWA installation.

## Non-Functional Requirements

- Mobile use must be first-class, not a desktop afterthought.
- AI responses should stream for a responsive interface.
- User API keys must never be exposed to the client.
- Client-side state management should remain simple and predictable (TanStack Query for server state, React state for local UI).

### Security Baseline

- Store user Claude API keys encrypted at rest on the server side.
- Decrypt keys only for server-side request execution.
- Never place user Claude API keys in browser state, local storage, cookies, or rendered HTML.
- Encryption mechanism: AES-256-GCM at the Go application layer with envelope encryption. A server-side master key (environment variable or compatible secret store) wraps a per-user data encryption key. Decryption happens only in the Go process at request time. This approach is confirmed in D-015.
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

### Release 2+ Roadmap (planned features, not yet scoped)

These features represent the long-term product vision and remain unscheduled for implementation. Shipped items are tracked in `Documentation/feature-tracker.md`.


| Category               | Features                                                         | Notes                                                                         |
| ---------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| **Progression Depth**  | Skill trees, mastery sub-skills, visual progression paths        | Shows skill relationships and specialisation                                  |
| **Social**             | Activity stream, party system, global tier leaderboard           | Community and accountability features                                         |
| **Knowledge**          | Intel / knowledge base, curated learning resources per skill     | Expert-informed guidance, book recommendations                                |
| **Character**          | Character avatar / visual identity, narrative layer              | Visual representation of progress; RPG story framing (especially retro theme) |
| **Guidance**           | Location-aware suggestions (nearby classes, centres, facilities) | E.g. "snow sports" → nearest snow centre                                      |
| **Hub Integration**    | NutriLog → hub XP, MindTrack → hub XP, cross-app progression     | All suite apps feed unified character progression                             |
| **Blocker Completion** | Evidence submission, AI assessment, unlock ceremony              | Full gate completion flow (F-009b)                                            |


## Assumptions

- The first release will prioritize a cohesive personal-use product over social features.
- The first release will share a common shell and navigation rather than behaving as two fully separate products.
- See `Documentation/decision-log.md` for the full set of confirmed decisions and active assumptions.
- The three-theme system is a product-level commitment — all future features must be designed theme-aware from the start.

These assumptions have been adopted as the planning baseline for the first agent-team pass and can be revised later if product direction changes.