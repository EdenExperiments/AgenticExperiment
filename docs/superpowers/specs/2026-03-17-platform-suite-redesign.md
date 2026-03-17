# Platform Suite Redesign — Design Spec

**Date:** 2026-03-17
**Status:** Draft — second review pass
**Replaces:** Current single-app RpgTracker architecture

---

## 1. Context & Motivation

The current codebase is a single Go + HTMX + Templ application targeting one product (LifeQuest / RPG Tracker). Three issues drove a strategic pause before continuing Release 1:

1. **Scope expansion is confirmed** — RPG Tracker, NutriLog (with fasting), and a Mental Health app are all planned. Treating each as an afterthought to a single app would require disruptive rework later.
2. **HTMX is the wrong tool for the RPG experience** — the intended game-like animated login, cinematic tier transitions, and rich XP animations cannot be built naturally against HTMX's server-rendered fragment model.
3. **Agentic workflow discipline** — current setup lacks frontend-specialist agents, deterministic TDD enforcement, and project-specific skill conventions.

The user confirmed they are comfortable pausing Release 1 to get the foundation right. F-001 (app shell), F-002 (auth), and F-003 (API key storage) are shipped; business logic (XP curve, key encryption, auth middleware) is preserved. The rendering layer is replaced.

---

## 2. Product Architecture

### 2.1 Three Standalone Apps Under One Platform

The platform ships three independently branded products:

| App | Identity | Theme range |
|-----|----------|-------------|
| **LifeQuest** (RPG Tracker) | Gamified skill progression | `rpg-game` (cinematic) ↔ `rpg-clean` (minimal) |
| **NutriLog** | Nutrition, macro, and fasting tracking | `nutri-saas` (professional SaaS) |
| **MindTrack** | Mental health tracking (needs scoping) | `mental-calm` (default) + user-customisable palette |

Each app is a **complete, standalone product**. A user who only uses NutriLog never sees LifeQuest or feels its absence. Cross-app integrations are an opt-in layer, not a structural dependency.

### 2.2 Cross-App Sync Layer (Opt-In, Post-LifeQuest-Port)

**Scope note:** The connections service is **not** in scope for the monorepo migration or the LifeQuest React port. It maps to F-020 (Cross-app XP integration), which remains deferred. The design below defines the target architecture for when F-020 is activated — it is not a release-1 deliverable.

Users can enable connections between apps from their account settings. Connections translate domain events from one app into additive actions in another (e.g. fasting streak → XP bonus in LifeQuest). Apps emit events; they do not call each other directly. The connections service in the Go API consumes events and routes them.

**Planned example connections (future, F-020 scope):**
- Fasting streak completed → bonus XP in a linked LifeQuest skill
- 7-day nutrition logging streak → XP reward
- Mental health check-in logged → small XP in a "Wellbeing" LifeQuest skill

**Design constraints:**
- All cross-app writes are additive — never destructive to either app's data
- Apps are fully functional with connections disabled
- Connection state stored in PostgreSQL per user
- Schema, event bus design, and API contracts will be specified in a dedicated F-020 spec

### 2.3 Subscription Model

A single account gates access to one or more apps plus an AI tier:

| Tier | Access |
|------|--------|
| Free | One app, no platform AI |
| Per-app | Individual app subscription |
| Bundle | All apps at a discount |
| AI add-on | Platform-supplied Claude API key (server-side only, never client-exposed) |
| Power user | Bring-your-own Claude API key (existing D-003 mechanism, preserved) |

Platform-supplied AI is a second key resolution path in the Go API: if a user has the AI subscription tier and no personal key set, the server uses a platform-level API key stored as a server environment secret. The client never knows which key was used. The D-009 constraint (key never exposed to client) is preserved for both paths.

---

## 3. Technical Architecture

### 3.1 Monorepo Structure (Turborepo)

```
/
├── apps/
│   ├── rpg-tracker/        ← Next.js (App Router) — LifeQuest
│   ├── nutri-log/          ← Next.js (App Router) — NutriLog
│   ├── mental-health/      ← Next.js (App Router) — MindTrack
│   └── api/                ← Go backend (migrated from repo root)
│
├── packages/
│   ├── ui/                 ← shared React component library + design tokens
│   ├── auth/               ← shared Supabase auth hooks + session logic
│   ├── api-client/         ← typed fetch client shared across apps
│   └── tsconfig/           ← shared TypeScript configuration
│
├── turbo.json
└── package.json            ← workspace root (pnpm workspaces)
```

Turborepo manages the build pipeline and remote caching. Each Next.js app builds and deploys independently. The Go API is a single service shared by all apps.

### 3.2 Frontend Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 + CSS custom properties (design tokens) |
| Animation | Framer Motion (UI transitions) + GSAP (cinematic sequences, RPG only) |
| Data fetching | TanStack Query (React Query v5) for client-side state; native Next.js `fetch` in React Server Components |
| Component tests | Vitest + React Testing Library |
| E2E tests | Playwright (per app) |
| iOS path | React Native — future consideration, out of scope for this redesign. `packages/ui` targets web only; RN sharing is deferred to a dedicated spec. |

HTMX and Templ are removed. Go HTTP handlers return JSON; React components own all rendering decisions.

### 3.3 Backend Stack (Preserved)

The Go backend migrates into `apps/api/`. The following are preserved unchanged:

- Supabase Auth + JWKS validation middleware
- AES-256-GCM envelope encryption for Claude API keys (D-015)
- XP curve package (`xpcurve`) — pure Go, no rendering dependency
- PostgreSQL schema (Supabase)
- All existing security decisions (D-009, D-015, R-001 through R-005)

Go HTTP handlers are updated from "render Templ HTML fragment" to "return JSON response." No business logic changes.

**F-008 tier data note:** The feature-tracker entry for F-008 (XP and level progression display) still references the old six-tier structure. The authoritative tier structure is D-014 and D-016 (eleven tiers: Novice through Legend, L1–200). Before porting F-008 to React, the feature-tracker entry must be updated to reflect the eleven-tier structure. The `xpcurve` Go package already implements the correct D-014 formula.

The Go API gains:
- Subscription middleware (per-route app access gating)
- Platform AI key resolution path
- Connections service (deferred — F-020 scope, see Section 2.2)

### 3.4 Auth & Identity

Single Supabase account across all apps. JWT issued by Supabase, validated by Go API middleware on every request. Per-app access is gated by subscription middleware before handler execution. The `packages/auth` shared package exposes a `useSubscription()` React hook that apps use to conditionally render gated features. Email/password auth only for this redesign — OAuth provider integration remains deferred (D-012 carried forward unchanged).

### 3.5 API Call Path & Security Boundary

**Topology:** Each Next.js app communicates with the Go API exclusively via Next.js **Route Handlers** (server-side). The browser never calls the Go API directly. This is a Backend for Frontend (BFF) proxy pattern.

```
Browser → Next.js Route Handler (same origin) → Go API (internal)
```

**Benefits:** No CORS configuration needed on the Go API (all calls are server-to-server). The Supabase JWT is forwarded from the Next.js Route Handler to Go in the `Authorization: Bearer <token>` header. The browser only ever holds a session cookie; the JWT itself stays server-side.

**Token transport:** Supabase session is stored in an `httpOnly` cookie set by `packages/auth` on login. Next.js Route Handlers read this cookie, extract the JWT, and forward it to the Go API. The Go API validates the JWT on every request using the existing JWKS middleware (R-001 mitigations apply).

**Go API network exposure:** In production, the Go API is not publicly accessible — it accepts requests only from the Next.js application servers. In development, it runs on `localhost:8080` alongside the Next.js dev servers.

---

## 4. Theming System

All theme values are CSS custom properties (design tokens). Every component references tokens; no hard-coded colour or spacing values. Swapping a theme is a single class swap on `<html>` — no component rewrites.

**Token files in `packages/ui/tokens/`:**

| File | App | Description |
|------|-----|-------------|
| `base.css` | All | Spacing, radii, font sizes — never overridden |
| `rpg-game.css` | LifeQuest | Dark, dramatic, gold accents, fantasy typography, full animation budget |
| `rpg-clean.css` | LifeQuest | Same layout, neutral palette, animations off or minimal |
| `nutri-saas.css` | NutriLog | Light/professional, clinical greens and blues |
| `mental-calm.css` | MindTrack | Soft neutrals, muted palette, low contrast base |
| `mental-[user].css` | MindTrack | Provisional placeholder — user-customisable palette is subject to MindTrack scoping (see Section 2.1 note). |

**Theme persistence and SSR:** Theme preference is stored in an `httpOnly` cookie (set at login or preference change) and mirrored to the user profile in PostgreSQL as the source of truth. The cookie is read by Next.js middleware on every request; the correct theme class is applied to `<html>` server-side before any HTML reaches the browser — no flash of wrong theme.

**Unauthenticated users** (landing page, login screen) receive the app's default theme: `rpg-game` for LifeQuest, `nutri-saas` for NutriLog, `mental-calm` for MindTrack. No DB read is required for unauthenticated routes — the default is a build-time constant per app.

**MindTrack theming note:** The `mental-calm` token file and provisional user-palette concept in this table are scaffold placeholders only. Final MindTrack theme design is subject to the MindTrack scoping exercise and must not be treated as confirmed design decisions.

---

## 5. TDD Approach

### 5.1 Go API

- Unit tests: pure functions first — XP curve, key encryption, event handlers, connection routing
- Integration tests: `httptest` package for every API endpoint contract before implementation
- Database tests: real local PostgreSQL via Supabase local dev — no mocks for the DB layer
- Existing test suite is preserved and extended

### 5.2 React (Next.js apps)

- Component tests: Vitest + React Testing Library — test behaviour, not implementation
- Hook tests: shared hooks in `packages/auth` and `packages/api-client` cover loading/error/success states
- E2E: Playwright for critical flows per app (login, core feature, subscription gate)

### 5.3 CI Pipeline

```
on: push
jobs:
  api-tests:   go test ./...
  ui-tests:    vitest run (all packages + apps, parallelised via Turborepo)
  e2e:         playwright (per app, parallelised)
```

---

## 6. Agentic Team Improvements

### 6.1 Skill Layer — Custom Skills Replace Superpowers

Project-specific skills replace generic superpowers skills for all core workflows. Skills live in `.claude/skills/`, are versioned in git, and encode this project's specific stack conventions.

| Custom skill | Replaces | Purpose |
|---|---|---|
| `brainstorm` | `superpowers:brainstorming` | Tailored to platform/multi-app context |
| `tdd` | `superpowers:test-driven-development` | Go + Vitest + Playwright conventions |
| `feature-spec` | — | Spec template for this monorepo |
| `frontend-conventions` | — | Next.js App Router, design tokens, Framer Motion patterns |
| `api-conventions` | — | Go REST endpoint + test patterns |

Superpowers plugin is removed from the active context once custom skills are in place, recovering context budget.

**Skill file format** (Claude Code standard, `.claude/skills/<name>/SKILL.md`):

```markdown
---
name: skill-name
description: One-line description used for trigger matching
user-invocable: true          # appears in /skill-name slash command
disable-model-invocation: false
---

Skill content here — step-by-step instructions Claude follows when invoked.
```

### 6.2 Hook Layer — Deterministic Enforcement

Hooks provide guarantees that skills cannot — they fire at lifecycle events and can block actions.

| Hook | Event | Behaviour |
|---|---|---|
| `require-tests.sh` | `PreToolUse` (Edit/Write) | Blocks `.ts`/`.tsx` edits if no corresponding test file exists |
| `validate-commit.sh` | `PreToolUse` (Bash commit) | Enforces commit message format |
| `check-env-vars.sh` | `PreToolUse` (Write) | Blocks hardcoded secrets in files |

**Hook registration format** (`.claude/settings.json`):

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [{ "type": "command", "command": ".claude/hooks/require-tests.sh" }]
      }
    ]
  }
}
```

Hook scripts exit `0` to allow, `2` to block. They receive tool input as JSON on stdin.

### 6.3 Subagent Layer — Specialist Agents

| Agent | Specialisation | Tools |
|---|---|---|
| `requirements-agent` | Product requirements, decision log | Read, Grep, Glob |
| `architecture-agent` | Service boundaries, schema design | Read, Grep, Glob |
| `ux-agent` | User flows, information architecture | Read, Grep, Glob |
| `frontend-agent` | React, theming, animation, responsive design | Read, Edit, Write, Bash(npm) |
| `api-agent` | Go REST endpoints, middleware, tests | Read, Edit, Write, Bash(go test) |
| `spec-reviewer` | Spec completeness and consistency review | Read, Grep, Glob |

**Agent file format** (`.claude/agents/<name>.md`):

```markdown
---
name: agent-name
description: One-line description — used to decide when to dispatch this agent
tools: Read, Grep, Glob      # restrict to what the agent actually needs
model: sonnet
---

Agent system prompt here — role, responsibilities, constraints, output format.
```

### 6.4 MCP Layer

Context7 MCP (already configured) provides just-in-time library documentation — Next.js App Router, Tailwind v4, Framer Motion, TanStack Query (React Query v5) — fetched on demand rather than carried in context. Frontend-agent invokes Context7 when implementing features requiring precise API knowledge.

### 6.5 Scaffolding Sequence

Agentic tooling must be scaffolded in this order to avoid agents running without the conventions they depend on:

1. Create `.claude/skills/` directory and write all five custom skill files (Section 6.1 format)
2. Create `.claude/hooks/` scripts and register them in `.claude/settings.json` (Section 6.2 format)
3. Create `.claude/agents/` directory and write all six agent files (Section 6.3 format)
4. Update `Documentation/claude-agent-team.md` with revised agent briefs reflecting the new stack
5. Validate superpowers skills are no longer needed, then remove the superpowers plugin from active plugins
6. Confirm hooks fire correctly with a test edit before starting feature work

Steps 1–3 can be done in any order. Steps 4–6 require 1–3 to be complete.

### 6.6 Context Hygiene

- Superpowers plugin removed once custom skills are validated
- Each subagent loads only its relevant skills (not the full suite)
- Claude Max subscription recommended for parallel planning sessions (requirements + architecture + UX agents running simultaneously without context exhaustion)

---

## 7. Migration Plan Summary

This spec defines the target architecture. The implementation plan (produced by `writing-plans`) will sequence the migration in detail. High-level order:

1. Restructure repository as Turborepo monorepo
2. Migrate Go backend into `apps/api/`, update handlers to JSON
3. Bootstrap `packages/ui` with design token system
4. Bootstrap `packages/auth` with shared Supabase hooks
5. Scaffold each Next.js app with correct theme and routing structure
6. Port LifeQuest features (F-001 through F-006, F-008, F-009) to React — F-007 (detailed natural-language logs) remains deferred
7. Scaffold agentic tooling (custom skills, hooks, updated agent briefs)
8. Scope and begin MindTrack planning

NutriLog and MindTrack are scaffolded structurally (shell + routing + theme tokens) in step 5, but feature implementation for both apps is deferred until the LifeQuest React port is stable (D-004 extended — structural scaffold is permitted; feature delivery remains sequenced).

---

## 8. Decisions Superseded or Updated by This Spec

| Decision | Status | Change |
|---|---|---|
| D-001 (Go, Templ, HTMX, Tailwind) | **Updated** | Go and Tailwind retained. Templ and HTMX replaced by Next.js + React. |
| D-003 (user-supplied API key only) | **Extended** | Platform-supplied AI key added as a subscription tier. D-003 mechanism preserved as the power-user path. |
| D-004 (LifeQuest-first, NutriLog deferred) | **Extended** | NutriLog and MindTrack app shells are scaffolded structurally during the monorepo migration. Feature implementation for both apps remains deferred until the LifeQuest React port is stable. |
| D-005 (one unified shell) | **Updated** | Three separate Next.js apps replace the single shell. Shared identity and navigation patterns via `packages/auth` and `packages/ui`. |
| D-006 (strong mobile usability) | **Carried forward** | Behavioral requirement unchanged. Implementation migrates from Go-rendered Templ layout to React components. The 44px tap target and 375px–428px viewport requirements apply equally to React implementations. |
| D-012 (email/password auth only) | **Carried forward** | No change. OAuth providers remain deferred. `packages/auth` is scaffolded for email/password only. |
| D-017 (bottom tab bar navigation) | **Carried forward** | Behavioral spec unchanged: four-item fixed bottom tab bar on mobile, left sidebar on desktop, hidden during multi-step flows with back chevron. Implementation migrates from Templ layout to a React component in `packages/ui`. |
| D-019 (quick XP log bottom sheet) | **Carried forward** | Behavioral spec unchanged: bottom sheet on mobile, modal on desktop, three-tap canonical path, preset XP chips, last-used pre-selection. The HTMX double-submission guard is replaced by React state (disabled button during in-flight TanStack Query mutation). |

All other confirmed decisions (D-002, D-007 through D-011, D-013 through D-016, D-018, D-020 through D-027) remain valid and are carried forward without change.
