# Feature Tracker

Last updated: 2026-08-10 (Epic draft: NX + agentic-harness + meal notes + Project Manager — F-076–F-081; awaiting sign-off)

Status values: `done` · `in-progress` · `ready-for-build` · `ready-for-planning` · `needs-clarification` · `deferred`

---

## Shipped (compact index)

Release 1–2 + Phase 7 + 9A. Detail in git history and archived `docs/archive/roadmap.md`.

| ID | Feature | Note |
| --- | --- | --- |
| F-001 | App shell & navigation | Sidebar + bottom tabs; 4 sections incl. NutriLog placeholder |
| F-002 | Supabase auth & profile | Email/password (D-012); ES256 JWT |
| F-003 | Claude API key storage | AES-256-GCM envelope encryption (D-015) |
| F-004 | Skill CRUD | Soft-delete; preserves XP history |
| F-005 | AI skill calibration | Optional AI path; starting level max 99 (D-018) |
| F-006 | Quick XP logging | Time-primary quick log (D-034); 3-tap baseline (D-019) |
| F-008 | XP & level progression | Quadratic curve; 11 tiers (D-014, D-020, D-022) |
| F-009 | Blocker gates | Visibility + locked state (D-010, D-021) |
| F-023 | Three-theme system | Minimal/Retro/Modern; three-layer architecture (D-035) |
| F-024 | Focus timer / Pomodoro | Session page; 3 timer variants |
| F-032 | Categories & tags | 9 presets; user tags; filters |
| F-033 | Favourites / pinning | Optimistic toggle |
| F-034 | Primary Skill Focus | Single pin (D-041) |
| F-035 | Quick Session + Dashboard | Hub cards; inline quick log |
| F-036 | Avatar system | Supabase Storage (D-042) |
| F-037 | Account stats | PlayerCard; theme preview |
| F-038 | Skill create overhaul | 2-step flow; gate auto-clear (D-033) |
| F-041 | Landing page overhaul | Auth restyle; registration callouts |
| F-044 | Clean UI cleanup | Phase 9A polish |
| F-045 | Clean/Stylish mode infrastructure | `data-mode` cookie + switcher; SSR hydration (D-043) |
| F-046 | Per-theme Stylish treatments | Minimal, Retro, Modern additive CSS layers; session/Pomodoro stylish flair + Retro beat-em-up backdrop (`img_23`) |
| F-047 | Cinematic landing (Stylish) | Landing atmosphere gated on `data-mode="stylish"` |
| F-075 | AI goal planning + paywall UX | `POST /goals/plan`, wizard, `GET /account/ai-entitlement`, PaywallCTA gating |
| F-013 | NutriLog weight logging MVP | API + typed client + NutriLog dashboard (chart, log, delete) |

### Partially Shipped


| ID    | Feature                           | Status      | Notes                                                         |
| ----- | --------------------------------- | ----------- | ------------------------------------------------------------- |
| F-039 | Social auth (Google/GitHub/Apple) | in-progress | UI buttons shipped. Supabase provider config not yet enabled. |
| F-048 | AI goal product funnel analytics  | in-progress | Event schema shipped; provider integration deferred. Paywall hooks wired in F-075. |


---

## New — Agentic Operations (Cursor-First)


| ID    | Feature                                          | Area     | Status | Notes                                                                                                                                                                                  |
| ----- | ------------------------------------------------ | -------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F-049 | Cursor-first docs and workflow cutover           | Docs/Ops | done   | `AGENTS.md` rewritten as repo context directory. Added `Documentation/README.md` index and `docs/CURSOR-AGENT-HANDBOOK.md`. Claude-specific repo setup deprecated/removed.             |
| F-050 | Cursor SDK PR review automation                  | Ops/CI   | retired | **Retired D-060:** duplicate of Bugbot review. `pr-review.ts` removed; retire `cursor-pr-review.yml` via CODEOWNER (see `Documentation/delivery/D-060-pipeline-reviewer-retirement.md`). |
| F-051 | Cursor SDK security/dependency triage automation | Ops/CI   | done   | Added `.github/workflows/cursor-security-triage.yml`, `.github/workflows/codeql.yml`, and `.github/dependabot.yml` with triage script `packages/cursor-agents/src/security-triage.ts`. Dependabot version updates later retired in favour of Renovate (D-057, F-066). |
| F-052 | Pre-commit lint/test gate                         | Ops/CI   | done   | Added Husky pre-commit hook and root `check:precommit` script (`lint` + JS `test` + Go `go test`) to catch easy issues before commit.                                                 |
| F-053 | Repo skill library baseline                       | Docs/Ops | done   | Added `.cursor/skills/` structure, skill index, starter skills, plus `pnpm validate:skills` for index/file consistency enforcement.                                                      |
| F-054 | Mend Renovate + SonarCloud onboarding starter     | Ops/CI   | done   | Added `renovate.json`, `mend-renovate.yml`, `sonarcloud.yml`, `sonar-project.properties`, onboarding guides, and one-click `quality-onboarding-smoke.yml`. Renovate workflow pins a concrete `renovatebot/github-action` tag because upstream does not publish moving major tags. |
| F-055 | Docs folder cull (legacy agentic artifacts)       | Docs/Ops | done   | Removed legacy `docs/specs`, `docs/plans`, and `docs/sessions` artifacts; retained lean future-focused docs (`handbook`, PRD, setup, guides, archive note).                             |
| F-056 | Gated SDK remediation loop                        | Ops/CI   | evolved | **D-060:** `fix-attempt` decoupled from custom reviewer schema; Sonar-first + optional Bugbot advisory prose; `/cursor-fix` + `workflow_dispatch` triggers. Dual gates (D-047), planner/executor routing, scanner wait unchanged. |
| F-057 | Model-routed remediation + test/coverage enforcement | Ops/CI | done | Auto-fix now uses planner/executor model split with unit-test-change enforcement, and Sonar PR workflow now enforces minimum new-code coverage (default 80). |
| F-058 | Structured reviewer schema contract | Ops/CI | retired | **Retired D-060:** schema was for removed pipeline reviewer. Superseded by Sonar-first remediation brief. |
| F-059 | Scheduled scans + daily AI digest + scanner signal merge | Ops/CI | done | Nightly Sonar main scan; weekly Renovate schedule; daily digest workflow. SDK remediation enriches Sonar PR context and merged brief (Sonar-primary post D-060). |
| F-060 | Safe Renovate dependency refresh | Ops/CI | done | Applied compatible Renovate updates across npm, Go modules, and GitHub Actions after checking app impact. Deferred unsupported/high-risk majors (Node 24, pnpm 11, TypeScript 6, Vitest 4, jsdom 29, Vite React plugin 6) for explicit migration work. |
| F-061 | Cursor Lab: LLM-as-judge eval flow | Ops/CI | in-progress | Phases A–D landed: sandbox, fixtures/registry, evaluate orchestrator, DSPy judge, reporting, cache/gate/promote CLI. Remaining: operator golden-PR runs, CI wiring (Phase F). |
| F-062 | CI recovery + agent model-slug resilience | Ops/CI | done | Restored green CI by aligning `react` to 19.2.6 (react-dom mismatch had failed 21/23 `packages/ui` test files since 2026-05-17). Replaced retired `composer-2-fast` defaults with `composer-2.5` and added shared `model-fallback.ts` (D-054) used by digest and triage. Security triage now degrades gracefully when code-scanning API access is denied (403). Renovate workflow skips cleanly when `RENOVATE_TOKEN` is absent. |


## New — Agentic Pipeline (Brief v2 Adoption, D-055 to D-058)

Target design: `Documentation/agentic-pipeline/Agentic-Pipeline-Brief-v2.md`. Milestones M0–M6 map to the features below.


| ID    | Feature                                            | Milestone | Status      | Notes                                                                                                                                                                                            |
| ----- | -------------------------------------------------- | --------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F-063 | Brief canonicalisation + adoption decisions        | Pre-M0    | done        | Brief + diagrams moved to `Documentation/agentic-pipeline/`; D-055–D-058 recorded; handbook + `AGENTS.md` reference the pipeline.                                                                  |
| F-064 | Layered agent config (base/stack/role, §4c)        | M0        | done        | `security-baseline.mdc` (alwaysApply), `.cursor/hooks.json` guardrails, nested `AGENTS.md` (Go/TS/Python), `.cursor/agents/` roster (test-writer/implementer per stack + shared verifier).         |
| F-065 | Repo controls + cloud agent environment            | M0        | done        | `CODEOWNERS`, `AGENTS_ENABLED` kill-switch wiring in agent workflows, `.cursor/environment.json` + Dockerfile, skills consolidation into `.cursor/skills/`, composition-contract guide.            |
| F-066 | Renovate baseline (Pillar A, M1)                   | M1        | done        | packageRules patch/minor vs major, `deps:safe`/`deps:breaking` labels, `minimumReleaseAge`, patch automerge behind CI+Sonar; Dependabot version updates retired (D-057).                          |
| F-067 | Dependency assessment agent (Pillar A, M2)         | M2        | done        | `dep-assess` entry in `packages/cursor-agents`: classifies Renovate PRs; breaking bumps get release-note digest + affected call-site scan + structured impact comment. Highlight, never auto-fix. |
| F-068 | Bugbot Autofix adoption (Pillar B, M3)             | M3        | in-progress | `BUGBOT.md` shipped; custom pipeline reviewer + workflow YAML retired (D-060). Remaining: dashboard Bugbot enablement + severity status check in branch protection.            |
| F-073 | Pipeline reviewer retirement + lane clarification  | M3/Docs   | done        | D-060: removed `pr-review.ts`; refactored `fix-attempt`; archived stale skill/guide; handbook three-lane model (Bugbot / SDK / Automations). Delivery artifact: `Documentation/delivery/D-060-pipeline-reviewer-retirement.md`. |
| F-074 | Skills, flows, and subagent orchestration expansion | M0/M5   | done        | D-062: `.cursor/flows/` manifests; 4 orchestration/quality skills; 3 subagents (`delivery-orchestrator`, `deps-highlight`, `maintenance-scout`); `validate:agents` + `validate:cursor`; guide `docs/guides/cursor-skills-and-orchestration.md`. |
| F-069 | Unified maintenance queue (Pillar C, M4)           | M4        | in-progress | Queue normaliser + triage scoring + `maintenance-dispatch` brief generator shipped. Remaining: weekly tech-debt Automation cron (operator task-10).          |
| F-070 | Command-driven delivery (Pillar D, M5)             | M5        | done        | `.cursor/commands/` (`/fix`, `/feature`, `/epic`, `/new-project`) + `.cursor/skills/delivery/` chains (elicitation → decomposition → TDD dispatch); artifacts under `Documentation/delivery/`.    |
| F-071 | Telemetry + outcome metrics (M6)                   | M6        | in-progress | Run summaries on all agent jobs + weekly metrics workflow. `weekly-metrics.json` export + workflow artifact uploads in flight. Remaining: `CURSOR_METRICS_ISSUE_NUMBER` dashboard issue (operator task-13).                              |
| F-072 | Documentation slim-down for agentic workflow     | Docs/Ops  | done        | Archived historical planning docs to `docs/archive/`; merged routing rules; 2-tier doc contract (D-059); compact shipped index; removed legacy CLAUDE memory files.                              |


---

## Remaining — Phase 8: Immersion


| ID    | Feature                    | Area      | Status   | Notes                                                                                                            |
| ----- | -------------------------- | --------- | -------- | ---------------------------------------------------------------------------------------------------------------- |
| F-042 | Ambient audio for sessions | LifeQuest | deferred | Lo-fi/chiptune/synthwave per theme. Licensing required.                                                          |
| F-043 | Narrative copy system      | LifeQuest | deferred | Per-theme copy variants across all pages. RPG language (Retro), command-centre (Modern), professional (Minimal). |
| F-031 | Narrative layer            | LifeQuest | deferred | RPG story framing, wizard dialogue, boss battle framing. Strongest in Retro.                                     |


---

## Deferred Features

### LifeQuest


| ID     | Feature                            | Dependencies         | Notes                                                                    |
| ------ | ---------------------------------- | -------------------- | ------------------------------------------------------------------------ |
| F-007  | Detailed natural-language logs     | Claude integration   | `log_note` column exists — no schema change needed.                      |
| F-009b | Blocker completion UI flow         | F-009                | Schema hooks exist (`is_cleared`, `cleared_at`). No code in release 1.   |
| F-010  | Reward moments and titles          | F-009b               | Post-release polish.                                                     |
| F-011  | Meta-skills and dependencies       | —                    | Post-MVP. Revisit after core loop is in production.                      |
| F-012  | AI coaching feedback               | Log history + Claude | Requires meaningful log history.                                         |
| F-025  | Skill trees                        | F-011                | Visual progression paths. Tree vs graph vs linear TBD.                   |
| F-028  | Character avatar / visual identity | Tier + theme system  | Pixel art (Retro), sleek (Modern). Separate from account avatar (F-036). |
| F-029  | Mastery system (sub-skills)        | F-011                | Deep-dive skill breakdown.                                               |


### NutriLog (schema namespace `nl_`; F-013 shipped — see compact index)


| ID    | Feature                        | Notes                 |
| ----- | ------------------------------ | --------------------- |
| F-014 | Calorie and macro logging      | Food data source TBD. Deferred behind meal notes (F-079) if epic sign-off confirms notes-first. |
| F-015 | Barcode scanning               | Mobile camera flow.   |
| F-016 | Saved meals and templates      | QoL feature.          |
| F-017 | AI recipe suggestions          | Claude integration. Superseded in sequencing by F-080 shopping/recs layer. |
| F-018 | Goal setting and weekly rate   | —                     |


---

## Proposed — Platform Expansion Epic (2026-08-10)

Delivery artifact: `Documentation/delivery/2026-08-10-epic-platform-expansion/requirements.md` (awaiting human sign-off).


| ID    | Feature                                         | Area          | Status               | Notes |
| ----- | ----------------------------------------------- | ------------- | -------------------- | ----- |
| F-076 | NX monorepo migration (Turbo → NX task graph)   | Platform/Ops  | needs-clarification  | Repo is already Turborepo+pnpm; epic is tooling cutover, not greenfield monorepo. |
| F-077 | Integrate `agentic-harness` for task completion | Ops/CI        | needs-clarification  | Completion harness beside `cursor-lab`; not “superpowers”. Source URL required (Q3). |
| F-078 | LifeQuest skill-tracking improvement slice      | LifeQuest     | needs-clarification  | Default candidate F-009b unless sign-off picks another. |
| F-079 | NutriLog meal note-keeper MVP                   | NutriLog      | ready-for-planning   | Free-text meal notes + slot + time; calories deferred. |
| F-080 | Recipes + shopping list + shared-ingredient recs| NutriLog      | deferred             | After F-079; GraphDB vs Postgres+index TBD (Q8). |
| F-081 | Project Manager (high-level projects)           | Suite         | needs-clarification  | New app vs LifeQuest section (Q10). |


### Cross-App & Platform


| ID    | Feature                            | Notes                                                                                                                                                                                                                   |
| ----- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F-019 | Weekly AI review                   | After both LifeQuest and NutriLog stable.                                                                                                                                                                               |
| F-020 | Cross-app XP integration           | Which health events award XP TBD.                                                                                                                                                                                       |
| F-021 | PWA install and push notifications | Mobile usability shipped; PWA deferred.                                                                                                                                                                                 |
| F-022 | Data export                        | After schema stabilises.                                                                                                                                                                                                |
| F-026 | Social features                    | Activity stream, party, leaderboard. D-008 defers from release 1.                                                                                                                                                       |
| F-027 | Intel / knowledge base             | Curated resources, expert guidance, book recs.                                                                                                                                                                          |
| F-030 | Location-aware guidance            | Nearest classes/centres. Long-term vision.                                                                                                                                                                              |
| F-040 | Free trial system                  | 14-day messaging shipped. Server-side enforcement TBD (D-039). Analytics schema reserves `paywall_viewed` and `upgrade_clicked`; UI hooks pending a paywall/upgrade surface.                                            |
| F-048 | AI goal product funnel analytics   | Event schema + frontend scaffold shipped for goal creation, AI plan generation/acceptance, weekly check-ins, and recovery hooks. Paywall viewed/clicked wired via F-075; provider analytics integration deferred. |


---

## Key Constraints (enforced in all implementations)


| Constraint                                              | Source |
| ------------------------------------------------------- | ------ |
| Quick-log: 3 taps or fewer (interaction baseline)      | D-019  |
| Quick-log input: time-primary with derived XP preview  | D-034  |
| starting_level ≤ 99 server-side                         | D-018  |
| Tier colour system on bar, badge, accent                | D-020  |
| Tier transition modal on every boundary                 | D-022  |
| Gate replaces XP bar, above fold                        | D-021  |
| XP write = xp_events + skills update in one transaction | R-003  |
| Double-submission guard: disabled button + 1s dedup     | R-003  |
| EffectiveLevel computed in Go handler                   | R-004  |
| Claude key never in HTML/cookies/logs/DB                | D-015  |
| MaxLevel = 200                                          | R-005  |


---

## Tech Stack


| Dependency            | Purpose                                 |
| --------------------- | --------------------------------------- |
| Go + chi + pgx/v5     | API server, routing, PostgreSQL         |
| golang-migrate        | Schema migrations (plain SQL)           |
| Supabase Auth + JWKS  | JWT validation, social auth             |
| Go stdlib crypto      | AES-256-GCM key encryption              |
| Next.js 15 + React 19 | Frontend with App Router, BFF proxy     |
| TanStack Query v5     | Server state, cache invalidation        |
| Tailwind CSS v4       | Design tokens via CSS custom properties |
| Vitest + RTL          | Frontend testing                        |
| @supabase/ssr         | Auth cookie handling                    |


