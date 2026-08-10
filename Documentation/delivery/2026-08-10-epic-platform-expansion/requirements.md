# Platform Expansion — NX Monorepo, Agentic Harness, Nutri Notes, Project Manager

**Epic ID:** `2026-08-10-epic-platform-expansion`  
**Lane:** Platform foundation + suite expansion  
**Status:** Awaiting sign-off  
**Related features (proposed):** F-076–F-081  
**Binding constraints:** D-001 (Go/Next stack), D-004 (NutriLog post-R1), D-037 (hub architecture), D-055–D-062 (agentic pipeline), D-059 (docs contract)

---

## Goal

Evolve the already-monorepo platform so agent-driven delivery completes work reliably (NX + agentic harness), keep improving LifeQuest skill tracking, reposition nutrition as a low-friction meal note-keeper (with a later recipe/shopping/recommendation layer), and add a high-level Project Manager product area.

## Non-goals (this epic’s first signed slice)

- Full calorie/macro tracker UX as the NutriLog primary loop (existing F-014 remains deferred until notes MVP proves value).
- Barcode scanning, saved meal templates as first-class nutrition UX (F-015/F-016).
- GraphDB / LLM recipe recommendation production stack before notes + shopping-list primitives exist.
- Replacing Cursor Bugbot / Pillar D delivery with “superpowers”-style agent packs.
- MindTrack feature work (still deferred).
- PWA, social, data export.

---

## Current baseline (facts)

| Area | Today |
|------|--------|
| Monorepo | **Already** Turborepo + pnpm workspaces (`apps/*`, `packages/*`) — not a greenfield monorepo move |
| Agent eval | `apps/cursor-lab` local eval harness for `.cursor/` rules/skills |
| LifeQuest | Release 1–2 core loop shipped; immersion/coaching items deferred |
| NutriLog | Weight logging MVP (F-013) shipped; calorie/recipe features deferred |
| Project Manager | Does not exist |
| `agentic-harness` | Not present in this repo; no matching public repo under `EdenExperiments` found from this environment |

---

## Workstreams (ordered)

### WS-1 — Monorepo tooling: Turborepo → NX (foundation)

**Intent:** Adopt NX as the primary task runner / project graph for the existing monorepo (apps + packages + Go API coordination), not “create a monorepo from scratch.”

**Confirmed requirements (pending sign-off):**

1. Introduce NX at the repo root while preserving pnpm workspaces and existing app package names unless a migration script requires renames.
2. Map current Turbo tasks (`build`, `dev`, `test`, `lint`, `format`, coverage) to NX targets with equivalent CI entrypoints.
3. Keep Go API invocable from root scripts (`test:go`, migrate/run docs) without forcing Go into an NX executor that breaks local `make` workflows.
4. Update `README.md`, `docs/CURSOR-AGENT-HANDBOOK.md`, and CI workflows that invoke `turbo` so agents and humans use one documented command surface.
5. Record a binding decision (proposed **D-063**) on NX vs Turborepo once migration approach is chosen.

**Assumptions:**

- Prefer incremental migration (NX alongside Turbo briefly, then remove Turbo) over big-bang rewrite.
- `@rpgtracker/*` package names stay stable across the cutover.

**Open questions:** see Q1–Q2.

---

### WS-2 — Bring in `agentic-harness` for completion-of-work (not superpowers)

**Intent:** Integrate the user’s `agentic-harness` repository as the completion / verification harness for agent-delivered work — complementary to (not replacing) Bugbot review, Sonar gates, and Pillar D TDD dispatch. Explicitly **not** adopting a “superpowers” agent-skill pack as the completion mechanism.

**Confirmed requirements (pending sign-off + source location):**

1. Vendor or submodule/workspace-include the harness under an agreed path (candidate: `apps/agentic-harness` or `packages/agentic-harness`) with clear ownership boundaries vs `apps/cursor-lab`.
2. Document how harness runs relate to existing lanes: Bugbot (review), SDK remediation, Automations, Pillar D delivery (D-060).
3. Provide at least one root script / CI job that runs a harness “completion check” on a golden or sample task without weakening existing tests (security baseline).
4. Kill-switch respect: if `AGENTS_ENABLED=false`, harness automation must no-op (existing baseline).

**Assumptions:**

- `cursor-lab` remains the LLM-as-judge eval surface for rules/skills (F-061); harness owns task-completion verification, not duplicate judge loops.
- Harness does not auto-merge or bypass dual gates (D-047).

**Open questions:** see Q3–Q4.

---

### WS-3 — Continue LifeQuest skill-tracking improvements

**Intent:** Keep improving the skill tracking application after Release 1–2.

**Confirmed requirements (pending prioritization):**

1. Treat LifeQuest as the hub (D-037); any new suite apps feed progression later, not in WS-3’s first slice.
2. Produce a short prioritized backlog from deferred LifeQuest IDs (F-007, F-009b, F-012, etc.) **or** newly named improvements the human specifies at sign-off.
3. Each chosen improvement ships via Pillar D (`/feature` or task under this epic) with signed criteria — no drive-by UI churn.

**Assumptions:**

- Default candidate if no preference: **blocker completion UI (F-009b)** or **detailed natural-language logs (F-007)** — highest leverage on the core loop.

**Open questions:** see Q5.

---

### WS-4 — Nutrition: meal note-keeper (NutriLog product pivot)

**Intent:** Prefer a health-conscious **note keeper** over a full food-tracking app for the next NutriLog slice: e.g. “Had X for breaky”, “Had X for lunch at Xpm”, “Having Y for Dinner”.

**Confirmed requirements (pending sign-off — this revises NutriLog primary UX):**

1. Add authenticated meal-note CRUD in NutriLog (`apps/nutri-log`) backed by Go API under the `nl_` schema namespace.
2. Support free-text meal description + meal slot (breakfast / lunch / dinner / snack / other) + optional eaten-at timestamp.
3. List notes by day (mobile-first, low-friction create — same spirit as LifeQuest quick log).
4. Keep existing weight logging (F-013); notes are additive, not a replacement of weight.
5. Explicitly defer calorie totals, macros, barcode, and “healthy check” scoring from this slice.

**Assumptions:**

- Notes are personal journal entries, not a food database with nutrition facts.
- Approx calories / “eating healthy check” become a **later** enrichment layer (WS-5), optional and never blocking note capture.
- This supersedes “calorie logging first” sequencing from earlier NutriLog planning for the *next* build, without deleting deferred F-014–F-017 from the tracker.

**Open questions:** see Q6–Q7.

---

### WS-5 — Later: recipes, shopping list, shared-ingredient recommendations

**Intent (explicitly post-notes):** Scrape/import recipes, build a shopping list from selected recipes, and recommend related recipes that share ingredients using LLMs and/or GraphDB/indexes over the current selection.

**Confirmed requirements for planning only (not build until notes MVP signed + shipped):**

1. Recipe ingest path (URL scrape and/or paste) producing structured ingredients + steps stored under `nl_`.
2. Shopping list derived from one or more selected recipes (merge quantities where trivial; no perfect unit conversion required in v1).
3. Recommendation surface: given current selection, suggest other recipes sharing ingredients (GraphDB **or** Postgres + embeddings/index — decide in architecture stage).
4. Optional approx-calorie / healthy-check overlay remains optional and never blocks logging or list building.

**Non-goals for early WS-5:** perfect nutrition science claims; commercial recipe licensing at scale without a source policy.

**Open questions:** see Q8–Q9.

---

### WS-6 — Project Manager (high-level project info)

**Intent:** Let the user keep high-level information about projects (status, notes, links, outcomes) — not a full Jira clone.

**Confirmed requirements (pending placement decision):**

1. CRUD for projects: name, summary/description, status (at least `active` / `paused` / `done`), optional links, updated-at.
2. Authenticated, user-scoped via existing Go API + Supabase auth.
3. Hub awareness: LifeQuest nav/shell can deep-link to the Project Manager surface (D-037); XP integration deferred unless explicitly requested.
4. Mobile-usable list + detail; Minimal/Retro/Modern theme tokens from `@rpgtracker/ui`.

**Assumptions:**

- v1 is personal project notes, not multi-user collaboration, boards, or Gantt.
- Schema prefix TBD (`pm_` candidate) at architecture stage.

**Open questions:** see Q10.

---

## Proposed feature IDs


| ID    | Feature                                      | Workstream | Proposed status      |
| ----- | -------------------------------------------- | ---------- | -------------------- |
| F-076 | NX monorepo migration (replace Turbo tasks)  | WS-1       | needs-clarification  |
| F-077 | Integrate agentic-harness for completion     | WS-2       | needs-clarification  |
| F-078 | LifeQuest skill-tracking improvement slice   | WS-3       | needs-clarification  |
| F-079 | NutriLog meal note-keeper MVP                | WS-4       | ready-for-planning*  |
| F-080 | Recipes + shopping list + ingredient recs    | WS-5       | deferred             |
| F-081 | Project Manager high-level projects          | WS-6       | needs-clarification  |

\*ready-for-planning once Q6–Q7 answered; product intent is clear enough to draft architecture after sign-off.

---

## Acceptance criteria (epic-level, checkable after decomposition)

1. **Sign-off artifact:** This file has a filled `Signed off by` block before any implementation PRs for F-076–F-081.
2. **WS-1:** Root `pnpm` scripts and CI invoke NX (or documented NX wrappers) for former Turbo tasks; `pnpm test` / lint paths remain green on mainline apps.
3. **WS-2:** Harness is present in-repo (or documented git submodule) and a named command runs a completion check without skipping existing unit tests.
4. **WS-3:** At least one LifeQuest improvement chosen at sign-off has its own signed feature requirements + verification command.
5. **WS-4:** User can create/list/delete meal notes with slot + timestamp via API + NutriLog UI tests (Go + Vitest).
6. **WS-5:** Remains deferred until F-079 shipped; architecture spike only if explicitly pulled forward.
7. **WS-6:** User can CRUD high-level projects via API + UI with auth isolation tests.
8. **Docs:** `feature-tracker.md` rows updated; any binding tool/product decisions land in `decision-log.md` (D-059). PRD updated only if NutriLog vision / suite composition is confirmed changed.

---

## Affected zones / paths

| Zone | Paths |
|------|--------|
| Root tooling | `package.json`, `pnpm-workspace.yaml`, `nx.json` (new), `turbo.json` (retire), `.github/workflows/ci.yml` |
| Agent ops | `apps/cursor-lab/`, new harness path, `.cursor/`, `packages/cursor-agents/` |
| API | `apps/api/` (`nl_*` notes, `pm_*` projects) |
| NutriLog | `apps/nutri-log/` |
| LifeQuest | `apps/rpg-tracker/` (hub links + chosen skill improvements) |
| Project Manager | new `apps/project-manager/` **or** routes under LifeQuest (Q10) |
| Shared | `packages/ui`, `packages/auth`, `packages/api-client` |
| Canonical docs | `Documentation/feature-tracker.md`, `decision-log.md`, optionally `product-requirements.md` after vision confirm |

---

## Open questions (human sign-off required)

Answer these to unblock architecture + decomposition. Defaults apply if left blank.

| # | Question | Why it changes design | Default if unanswered |
|---|----------|----------------------|------------------------|
| **Q1** | Replace Turborepo **entirely** with NX, or run NX for app graph while keeping Turbo temporarily? | CI, scripts, agent handbook | Incremental: NX primary, remove Turbo in same epic once parity proven |
| **Q2** | Any hard requirement for NX Cloud / remote cache in this epic? | Cost, secrets, CI shape | No — local NX cache only |
| **Q3** | What is the **exact repo URL / access** for `agentic-harness` (private OK)? | Cannot vendor without source | Block WS-2 until URL provided |
| **Q4** | Should harness **replace**, **wrap**, or **sit beside** `apps/cursor-lab`? | Ownership of eval vs completion | Sit beside: lab = rules/skills eval; harness = task completion |
| **Q5** | Which LifeQuest improvement is first (F-009b blocker completion, F-007 detailed logs, F-012 coaching, or other)? | Decomposition target | F-009b blocker completion UI |
| **Q6** | Confirm NutriLog **next** UX is meal notes (not calorie logging F-014)? | PRD + schema sequencing | Yes — notes-first; F-014 stays deferred |
| **Q7** | Meal slots: fixed enum (breakfast/lunch/dinner/snack/other) or free tags? | Schema + UI | Fixed enum + optional free-text note |
| **Q8** | Recipe recommendations: preference for **GraphDB** (e.g. Neo4j) vs **Postgres + index/embeddings** for v1? | Ops complexity | Postgres + index first; GraphDB only if proven necessary |
| **Q9** | Recipe scrape sources allowed (any URL vs allowlist)? | Legal/safety | Allowlist + manual paste in v1 |
| **Q10** | Project Manager as **new Next app** (`apps/project-manager`) or **section inside LifeQuest**? | Zone layout, nav (D-005/D-037) | New Next app + hub link (matches NutriLog pattern) |

---

## Recommended first build after sign-off

1. Resolve Q3 (harness source) and Q1 (NX cutover style).
2. Architecture note in this folder (`architecture.md`) covering NX layout + schema prefixes for notes/projects.
3. Decompose into tasks: **F-076 → F-077 → F-079 → F-081**, with **F-078** as a parallel LifeQuest feature once Q5 is set; **F-080** deferred.

---

## Sign-off

```
Signed off by: _______________
Date: _______________
Answers to Q1–Q10 (or “defaults OK”): _______________
```

Do not start implementation PRs for this epic until the block above is filled.
