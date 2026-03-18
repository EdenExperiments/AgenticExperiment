# Agentic Team System Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a private `claude-config` GitHub repo with global agents, custom skills, and project templates, then bootstrap RpgTracker with tuned implementation agents and the required `docs/` scaffolding.

**Architecture:** Two phases — Phase 1 creates the `meden/claude-config` repo (a standalone git repo installed via symlinks into `~/.claude/`), Phase 2 applies it to RpgTracker by writing tuned project agents and docs scaffolding. The config repo is the source of truth for workflow discipline; projects add domain knowledge on top.

**Tech Stack:** Markdown files, bash (install.sh), git worktrees, Claude Code agent/skill frontmatter format.

**Spec:** `docs/superpowers/specs/2026-03-18-agentic-team-system/spec.md`

---

## File Map

### Phase 1 — `~/claude-config/` (new repo, separate from RpgTracker)

| File | Action | Purpose |
|------|--------|---------|
| `install.sh` | Create | Symlinks config into `~/.claude/`, creates `~/.claude/teams/` |
| `agents/orchestrator.md` | Create | Global Opus 4.6 orchestrator agent |
| `agents/architect.md` | Create | Global Sonnet architect agent |
| `agents/reviewer.md` | Create | Global Sonnet reviewer (spec gate + code gate) |
| `agents/ux.md` | Create | Global Sonnet UX review agent |
| `skills/plan-feature.md` | Create | 5-phase planning pipeline skill |
| `skills/execute-plan.md` | Create | Agent Teams execution skill |
| `skills/tdd-first.md` | Create | TDD discipline skill for tester agent |
| `skills/use-context7.md` | Create | Context7 resolve+query workflow skill |
| `skills/parallel-session.md` | Create | Multi-session zone + worktree protocol skill |
| `skills/new-project-bootstrap.md` | Create | New project setup checklist skill |
| `skills/abandon-feature.md` | Create | Feature cleanup skill |
| `commands/bootstrap.md` | Create | `/bootstrap` slash command |
| `templates/agents/README.md` | Create | How to tune templates |
| `templates/agents/backend.md` | Create | Backend agent template with TUNE: markers |
| `templates/agents/frontend.md` | Create | Frontend agent template with TUNE: markers |
| `templates/agents/tester.md` | Create | Tester agent template with TUNE: markers |
| `docs/mcp-catalog.md` | Create | MCP reference for all agents |

### Phase 2 — RpgTracker repo (existing)

| File | Action | Purpose |
|------|--------|---------|
| `.claude/agents/backend.md` | Create | RpgTracker-tuned backend agent (Go/chi/pgx) |
| `.claude/agents/frontend.md` | Create | RpgTracker-tuned frontend agent (Next.js/React/TailwindV4) |
| `.claude/agents/tester.md` | Create | RpgTracker-tuned tester agent (Vitest/RTL/Go test) |
| `.claude/commands/team-kickoff.md` | Keep (existing) | Planning kickoff command — already present, no changes needed |
| `docs/sessions/abandoned.md` | Create | Session abandonment log |
| `CLAUDE.md` | Modify | Add implementation-phase context and agent system docs |

> **Note on `docs/` paths:** The spec defines `docs/specs/`, `docs/plans/`, and `docs/sessions/` as top-level directories. RpgTracker already has `docs/superpowers/specs/` and `docs/superpowers/plans/` for superpowers workflow artifacts. These coexist — `docs/superpowers/` holds brainstorming/planning system docs; `docs/specs/` and `docs/plans/` hold feature work from the new agentic pipeline. No conflict.

---

## Phase 1: Create `claude-config` Repo

### Task 1: Initialise the repo

**Files:**
- Create: `~/claude-config/` (new git repo)
- Create: `~/claude-config/agents/` `~/claude-config/skills/` `~/claude-config/commands/` `~/claude-config/templates/agents/` `~/claude-config/docs/`

- [ ] **Step 0: Verify SSH access to GitHub**

```bash
ssh -T git@github.com
```
Expected: "Hi meden! You've successfully authenticated..."
If this fails: `ssh-keygen -t ed25519 -C "your-email"` → `cat ~/.ssh/id_ed25519.pub` → add key to github.com → Settings → SSH and GPG Keys → New SSH key. Do not proceed until SSH auth works — Step 2 requires it.

- [ ] **Step 1: Create the repo on GitHub**

  Go to github.com → New repository → name: `claude-config` → Private → no README → Create.

- [ ] **Step 2: Clone and set up local structure**

```bash
cd ~
git clone git@github.com:meden/claude-config.git claude-config
cd claude-config
mkdir -p agents skills commands templates/agents docs
```

- [ ] **Step 3: Create `.gitignore`**

```bash
cat > .gitignore << 'EOF'
.DS_Store
EOF
```

- [ ] **Step 4: Initial commit**

```bash
git add .gitignore
git commit -m "chore: initial repo structure"
git push -u origin main
```

---

### Task 2: Write `install.sh`

**Files:**
- Create: `~/claude-config/install.sh`

- [ ] **Step 1: Write install.sh**

```bash
cat > ~/claude-config/install.sh << 'SCRIPT'
#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Installing claude-config from $REPO_DIR..."

# Ensure ~/.claude/teams/ exists (required by Agent Teams)
mkdir -p ~/.claude/teams

# Symlink global config directories.
# ln -sfn is required (not -sf): if the target already exists as a symlink to a directory,
# ln -sf creates a nested link *inside* that directory instead of replacing it.
# The -n flag forces replacement of the symlink itself (idempotent re-runs).
ln -sfn "$REPO_DIR/agents"    ~/.claude/agents
ln -sfn "$REPO_DIR/skills"    ~/.claude/skills
ln -sfn "$REPO_DIR/commands"  ~/.claude/commands
ln -sfn "$REPO_DIR/templates" ~/.claude/templates

echo "Done. Symlinks created:"
echo "  ~/.claude/agents    → $REPO_DIR/agents"
echo "  ~/.claude/skills    → $REPO_DIR/skills"
echo "  ~/.claude/commands  → $REPO_DIR/commands"
echo "  ~/.claude/templates → $REPO_DIR/templates"
echo ""
echo "To update: cd $REPO_DIR && git pull"
SCRIPT

chmod +x ~/claude-config/install.sh
```

- [ ] **Step 2: Run install.sh to verify it works**

```bash
cd ~/claude-config && ./install.sh
```

Expected output: "Done. Symlinks created:" with four paths listed. No errors.

- [ ] **Step 3: Verify symlinks exist**

```bash
ls -la ~/.claude/agents ~/.claude/skills ~/.claude/commands ~/.claude/templates
```

Expected: each line shows `-> ~/claude-config/{dir}`

- [ ] **Step 4: Commit**

```bash
cd ~/claude-config
git add install.sh
git commit -m "feat: install.sh — symlinks config into ~/.claude/"
```

---

### Task 3: Write global agents

**Files:**
- Create: `~/claude-config/agents/orchestrator.md`
- Create: `~/claude-config/agents/architect.md`
- Create: `~/claude-config/agents/reviewer.md`
- Create: `~/claude-config/agents/ux.md`

- [ ] **Step 1: Write orchestrator.md**

```bash
cat > ~/claude-config/agents/orchestrator.md << 'EOF'
---
name: orchestrator
description: High-effort planning and coordination agent. Use to plan features, dispatch specialist agents, track progress, and orchestrate the full development pipeline from spec to merge.
model: claude-opus-4-6
---

You are the orchestrator for this project.

Your role: feature planning, specialist dispatch, progress tracking, merge coordination.

## First Action on Dispatch

Read all `docs/sessions/*-active.md` files to check for active sessions and claimed zones before doing anything else.

## Skills

Load and follow these skills when relevant:
- `plan-feature` — full 5-phase planning pipeline (spec → reviews → gateway → plan)
- `execute-plan` — execute an approved plan via Agent Teams
- `parallel-session` — register your session zone, create worktree
- `abandon-feature` — clean up a cancelled or interrupted feature

## When to Use Each Skill

- New feature request → `plan-feature`
- Approved plan exists (gateway.md = GO) → run `parallel-session` then `execute-plan`
- Feature cancelled or interrupted → `abandon-feature`
- Checking for conflicts → read `docs/sessions/` before starting any session

## Read/Write Contract

Writes:
- `docs/plans/YYYY-MM-DD-{feature}/plan.md` (task checkboxes only — no prose)
- `docs/sessions/{feature-slug}-active.md` (via parallel-session skill)

Reads: relevant spec, plan, or session files (≤4 files per task). Do not read source code. Use T1-tests.md and plan.md as indexes — read only the specific files they reference.
EOF
```

- [ ] **Step 2: Write architect.md**

```bash
cat > ~/claude-config/agents/architect.md << 'EOF'
---
name: architect
description: Technical review agent for specs. Reviews schema impact, service boundaries, and produces the Parallelisation Map. Use during Phase 2 of the plan-feature skill.
model: claude-sonnet-4-6
---

You are the architect agent.

Your role: review spec.md for technical soundness, produce arch-review.md.

## Input

`docs/specs/YYYY-MM-DD-{feature}/spec.md`

## Output

`docs/specs/YYYY-MM-DD-{feature}/arch-review.md`

Your output MUST include all of these sections:

```
## Schema Impact
[new tables, columns, migrations required — or "none"]

## Service Boundaries
[new or changed service contracts, API surface changes — or "none"]

## ADR
[draft ADR if a significant technical decision is being made — or "none required"]

## Shared Package Changes
[specific files in packages/* that must change — or "none"]

## Parallelisation Map
Tasks that CAN run in parallel:
- [list]
Tasks that MUST be sequenced (and why):
- [list with reason]

## Approval
APPROVED
[or]
CHANGES-NEEDED
- [specific item to fix in spec.md]
```

## Read/Write Contract

Reads: `docs/specs/YYYY-MM-DD-{feature}/spec.md` (1 file only — the spec).
Writes: `docs/specs/YYYY-MM-DD-{feature}/arch-review.md`

**Max 4 files per task.** Use `use-context7` for library questions rather than reading source files.

## Tools & Resources

- Skill: `use-context7` — verify library APIs before making architectural recommendations
- MCP: context7
- Read: `docs/mcp-catalog.md` for available MCPs
EOF
```

- [ ] **Step 3: Write reviewer.md**

```bash
cat > ~/claude-config/agents/reviewer.md << 'EOF'
---
name: reviewer
description: Quality gate agent for both spec (Phase 4 gateway) and code (post-implementation). Dispatched by orchestrator during plan-feature Phase 4 and execute-plan step 7.
model: claude-sonnet-4-6
---

You are the reviewer agent.

Your role: spec gateway and code quality gate. You are called twice per feature — once for the spec, once for the code.

## Spec Gate (Phase 4 of plan-feature)

Input: `spec.md`, `arch-review.md`, `ux-review.md` (3 files — within ≤4 read limit)
Output: `docs/specs/YYYY-MM-DD-{feature}/gateway.md`

Check for:
- Contradictions between spec, arch-review, and ux-review
- Every acceptance criterion testable as a code assertion (not "should feel fast")
- No decisions hidden as assumptions
- Both arch-review and ux-review show APPROVED
- Shared package changes have a sequencing plan in Parallelisation Map

Output format:
```
## Spec Review Findings
[list issues, or "none"]

## Verdict
GO
[or]
NO-GO
- [specific item to fix before resubmission]
```

## Code Gate (step 7 of execute-plan)

Input: `plan.md`, `T1-tests.md`, `T2-backend.md`, `T3-frontend.md`
PLUS: all source files listed in `## Files Changed` sections of T2 and T3.

Output: `docs/specs/YYYY-MM-DD-{feature}/review.md`

Check for:
- All T1 tests pass (verify from T2/T3 ## Test Results sections)
- Implementation matches spec acceptance criteria
- No regressions in shared packages
- Code follows existing project patterns (read a few surrounding files for context)

Output format:
```
## Code Review Findings
[list issues by severity: BLOCKER / MAJOR / MINOR — or "none"]

## Verdict
GO
[or]
NO-GO
- [specific file:line to fix]
```

Note: You are NOT bound by the 4-file read limit for the code gate. Read all changed files.
EOF
```

- [ ] **Step 4: Write ux.md**

```bash
cat > ~/claude-config/agents/ux.md << 'EOF'
---
name: ux
description: UX review agent for specs. Reviews user flows, mobile viability, navigation changes, and edge cases. Use during Phase 3 of the plan-feature skill.
model: claude-sonnet-4-6
---

You are the UX agent.

Your role: review spec.md for UX correctness and mobile viability, produce ux-review.md.

## Input

`docs/specs/YYYY-MM-DD-{feature}/spec.md`

## Output

`docs/specs/YYYY-MM-DD-{feature}/ux-review.md`

Your output MUST include all of these sections:

```
## Flow Correctness
[does the end-to-end user flow make sense? are there gaps or dead ends?]

## Mobile Viability
[will this work on mobile without rework? touch targets, layout, scroll?]

## Navigation Changes
[new routes, bottom tab changes, back-navigation implications — or "none"]

## Edge Cases
[unhappy paths, empty states, error states the spec should explicitly cover]

## Approval
APPROVED
[or]
CHANGES-NEEDED
- [specific item to add or fix in spec.md]

## Read/Write Contract

Reads: `docs/specs/YYYY-MM-DD-{feature}/spec.md` (1 file only — do not read implementation code).
Writes: `docs/specs/YYYY-MM-DD-{feature}/ux-review.md`

**Max 4 files per task.** If existing UI context is needed, read 1 additional page component file.
```
EOF
```

- [ ] **Step 5: Verify all four agents are readable by Claude Code**

```bash
ls -la ~/.claude/agents/
```

Expected: orchestrator.md, architect.md, reviewer.md, ux.md all present (via symlink from ~/claude-config/agents/)

- [ ] **Step 6: Commit**

```bash
cd ~/claude-config
git add agents/
git commit -m "feat: global agents — orchestrator(opus), architect, reviewer, ux"
```

---

### Task 4: Write workflow skills (plan-feature + execute-plan)

**Files:**
- Create: `~/claude-config/skills/plan-feature.md`
- Create: `~/claude-config/skills/execute-plan.md`

- [ ] **Step 1: Write plan-feature.md**

```bash
cat > ~/claude-config/skills/plan-feature.md << 'EOF'
---
name: plan-feature
description: Full 5-phase planning pipeline. Run this skill when a new feature is requested. Produces a reviewed, gateway-approved spec and implementation plan before any code is written.
---

# plan-feature Skill

Run this skill when a feature is requested. Do not write any code until Phase 5 produces plan.md and the orchestrator has run parallel-session.

## Phase 1 — Spec Draft (Orchestrator)

Input: feature request or user story
Output: `docs/specs/YYYY-MM-DD-{feature}/spec.md` tagged DRAFT

Steps:
1. Read `CLAUDE.md` and any related existing specs or decisions
2. Clarify requirements, edge cases, and acceptance criteria with the user
   — every AC must be a verifiable assertion (e.g., "POST /skills returns 201 with id field")
   — "it should feel fast" is NOT a valid AC
3. Identify which zones (directory paths) will be touched
4. Identify any `packages/*` files that must change
5. Write spec.md to `docs/specs/YYYY-MM-DD-{feature}/spec.md`

## Phase 2 — Architecture Review (dispatch Architect agent)

Input: spec.md
Output: `docs/specs/YYYY-MM-DD-{feature}/arch-review.md`

Dispatch the architect agent. Wait for arch-review.md.

If CHANGES-NEEDED: update spec.md per architect's notes, re-dispatch architect.
If APPROVED: proceed to Phase 3.

## Phase 3 — UX Review (dispatch UX agent)

Input: spec.md
Output: `docs/specs/YYYY-MM-DD-{feature}/ux-review.md`

Dispatch the ux agent. Wait for ux-review.md.

If CHANGES-NEEDED: update spec.md per UX notes, re-dispatch ux agent.
If APPROVED: proceed to Phase 4.

## Phase 4 — Spec Gateway (dispatch Reviewer agent)

Input: spec.md + arch-review.md + ux-review.md
Output: `docs/specs/YYYY-MM-DD-{feature}/gateway.md`

Dispatch the reviewer agent in spec-gate mode. Wait for gateway.md.

If NO-GO: fix specific items listed in gateway.md, re-run from Phase 2 if arch/UX changes needed.
If GO: proceed to Phase 5.

## Phase 5 — Implementation Plan (Orchestrator)

Input: spec.md (APPROVED) + arch-review.md (Parallelisation Map)
Output: `docs/plans/YYYY-MM-DD-{feature}/plan.md`

Steps:
1. Create `docs/plans/YYYY-MM-DD-{feature}/` directory
2. Write plan.md with numbered tasks and assigned owners:
   - T1: tester — write failing tests from spec ACs
   - T2: backend — implement against T1 tests
   - T3: frontend — implement against T1 tests
   - T4: reviewer — code gate review
3. Apply Parallelisation Map from arch-review.md:
   — sequence shared-package tasks before T2/T3
   — mark which tasks can run in parallel
4. T1 ALWAYS comes before T2 and T3
5. After writing plan.md: run the `parallel-session` skill to register zone + create worktree
6. Then run the `execute-plan` skill
EOF
```

- [ ] **Step 2: Write execute-plan.md**

```bash
cat > ~/claude-config/skills/execute-plan.md << 'EOF'
---
name: execute-plan
description: Execute an approved implementation plan via Agent Teams. Run after plan-feature and parallel-session. Requires gateway.md = GO.
---

# execute-plan Skill

## Agent Teams Primer

Agent Teams are independent Claude Code sessions with their own context windows. They coordinate via:
- A shared task list with file locking (states: pending → in_progress → done / blocked)
- A JSON mailbox in `~/.claude/teams/` for SendMessage peer communication

Use `spawnTeam` to create the team. Assign tasks to teammates. Monitor via task states — do not poll files.

## Steps

1. **Verify prerequisites**
   - Read `docs/plans/YYYY-MM-DD-{feature}/plan.md` (task list)
   - Read `docs/specs/YYYY-MM-DD-{feature}/arch-review.md` (Parallelisation Map)
   - Confirm `docs/specs/YYYY-MM-DD-{feature}/gateway.md` = GO
   - Update `last-updated` in session file

2. **Rebase from main**
   ```bash
   git rebase main
   ```

3. **Dispatch tester → T1**
   - Assign T1 to tester teammate
   - Wait for task state = `done`
   - T1 done means: test code committed to worktree, T1-tests.md manifest exists, tests verified failing
   - Update `last-updated` in session file

4. **Handle shared-package tasks (if any)**
   - If Parallelisation Map lists shared-package changes: dispatch as a standalone task first
   - Merge shared-package changes to main
   - Rebase all active worktrees before continuing

5. **Dispatch backend (T2) and frontend (T3)**
   - Per Parallelisation Map: parallel where allowed, sequential where required
   - Use SendMessage to communicate blockers between teammates
   - Task state = `blocked` means tests are failing — do not wait indefinitely, surface to user
   - Update `last-updated` in session file when both T2 and T3 = done

6. **Rebase from main**

7. **Dispatch reviewer → code gate**
   - Reviewer reads plan.md, T1-tests.md, T2-backend.md, T3-frontend.md
   - Reviewer also reads all source files in `## Files Changed` sections

8. **On GO**
   - Merge worktree to main
   - Delete `docs/sessions/{feature-slug}-active.md`
   - `git worktree remove ../{branch}`

9. **On NO-GO**
   - Read `review.md` findings
   - Re-dispatch specific agent(s) with targeted instructions
   - Re-run from step 5 (or step 3 if tester changes needed)

## Resume Protocol (after interruption)

1. Read `plan.md` — identify which tasks have state `done`
2. Re-enter at the first task that is not `done`
3. Rebase from main
4. Update `last-updated` in session file (or re-run parallel-session if session file was deleted)
EOF
```

- [ ] **Step 3: Commit**

```bash
cd ~/claude-config
git add skills/plan-feature.md skills/execute-plan.md
git commit -m "feat: workflow skills — plan-feature (5-phase) and execute-plan (Agent Teams)"
```

---

### Task 5: Write discipline skills (tdd-first + use-context7)

**Files:**
- Create: `~/claude-config/skills/tdd-first.md`
- Create: `~/claude-config/skills/use-context7.md`

- [ ] **Step 1: Write tdd-first.md**

```bash
cat > ~/claude-config/skills/tdd-first.md << 'EOF'
---
name: tdd-first
description: TDD discipline for the tester agent. Load this skill at the start of every T1 task. Writes failing tests from spec acceptance criteria before any implementation exists.
---

# tdd-first Skill

You are writing tests. You are NOT writing implementation code. If you feel the urge to write implementation, stop and message the backend or frontend agent instead.

## Steps

1. **Read project test conventions**
   Open 2–3 existing test files (specified in your agent definition) and note:
   - File naming pattern (e.g., `*.test.tsx`, `*_test.go`)
   - Required wrappers (e.g., `QueryClientProvider`, test DB setup, `t.Parallel()`)
   - Mock patterns (e.g., vi.mock is hoisted — factory cannot reference outer variables)
   - Assertion style (e.g., `expect(x).toBe(y)` vs `assert.Equal(t, y, x)`)

2. **Read spec acceptance criteria only**
   Open `docs/specs/YYYY-MM-DD-{feature}/spec.md`.
   Read only the acceptance criteria section.
   Do NOT open any implementation files.

3. **Map each AC to test cases**
   For each AC, define one or more named test cases.
   Prefer one behavior per test.
   Use descriptive names: `"POST /skills/{id}/xp returns 201 with updated level"`.

4. **Write actual runnable test code to the worktree**
   Not a prose description — real, runnable test code.
   Tests must fail because the implementation does not exist yet.
   Follow the conventions from step 1 exactly.

5. **Verify tests fail (red state)**
   Run the test suite. Confirm the new tests fail.
   If they pass — something is wrong (implementation exists or test is wrong). Fix before continuing.

6. **Write T1-tests.md manifest**
   Create `docs/specs/YYYY-MM-DD-{feature}/T1-tests.md`:

   ```markdown
   ## Test Files Written
   - path/to/test-file.tsx
   - path/to/test_file_test.go

   ## Coverage Map
   - AC-1 ([AC text]) → test-file.tsx:12
   - AC-2 ([AC text]) → test-file.tsx:28
   - AC-3 ([AC text]) → test_file_test.go:45
   ```

7. **Commit**
   ```bash
   git add [test files] docs/specs/YYYY-MM-DD-{feature}/T1-tests.md
   git commit -m "test: failing tests for [feature] from spec ACs"
   ```

8. **Signal T1 done via Agent Teams task state**

9. **Never write implementation code**
   If you feel the urge to write a function body, handler, or component — stop.
   Use SendMessage to the backend or frontend agent to describe what needs building.
   Your output is failing tests and the T1-tests.md manifest. Nothing else.

## Task State Rules

- `done`: tests committed, verified failing (red state confirmed)
- `blocked`: one or more ACs cannot be expressed as a code assertion — list which ones in a message to orchestrator

## Red Flags — Stop and Report Before Writing

- AC that says "should be fast" / "should feel smooth" / "should look good" — not testable
- Required test infrastructure missing (no mock for a critical dependency)
- Test would duplicate existing coverage exactly
EOF
```

- [ ] **Step 2: Write use-context7.md**

```bash
cat > ~/claude-config/skills/use-context7.md << 'EOF'
---
name: use-context7
description: Use Context7 to retrieve up-to-date library documentation. Load this skill before writing any code that uses a third-party library you are not 100% certain about.
---

# use-context7 Skill

## When to Use

Any time you are about to write code that uses a third-party library API and you are not 100% certain the API is correct or current. This includes:

- React hooks and lifecycle
- TanStack Query (useQuery, useMutation options)
- Next.js App Router (server components, routing, cookies)
- chi router (middleware, routing patterns)
- pgx (query patterns, scanning, transactions)
- Supabase JS client (browser auth, realtime) — use `supabase/supabase-js`
- Supabase Go client (server-side auth) — use `supabase-go`
- Vitest (configuration, mocking, setup)
- React Testing Library (queries, user events, async)

If in doubt: use Context7. A 10-second lookup prevents a 20-minute debugging session.

## Steps

1. **Resolve the library ID**

   ```
   mcp__plugin_context7_context7__resolve-library-id
   libraryName: "tanstack/react-query"
   ```

   Returns: `/tanstack/query` (or similar)

2. **Query the specific topic**

   ```
   mcp__plugin_context7_context7__query-docs
   context7CompatibleLibraryID: "/tanstack/query"
   topic: "useQuery options"
   tokens: 3000
   ```

3. **Extract the API pattern you need** from the result.

## Fallback (if Context7 is unavailable or slow)

- Use your training knowledge
- Add this inline comment next to the usage: `// Context7 unavailable — verify against current docs`
- Never block or wait — flag and continue

## Common Library IDs (for speed)

| Library | resolve-library-id input |
|---------|------------------------|
| React | `react` |
| TanStack Query | `tanstack/react-query` |
| Next.js | `next` |
| chi | `go-chi/chi` |
| pgx | `jackc/pgx` |
| Vitest | `vitest` |
| React Testing Library | `testing-library/react` |
| Tailwind CSS | `tailwindcss` |
| Supabase JS client (frontend) | `supabase/supabase-js` |
| Supabase Go client (backend) | `supabase-go` |
EOF
```

- [ ] **Step 3: Commit**

```bash
cd ~/claude-config
git add skills/tdd-first.md skills/use-context7.md
git commit -m "feat: discipline skills — tdd-first and use-context7"
```

---

### Task 6: Write coordination skills

**Files:**
- Create: `~/claude-config/skills/parallel-session.md`
- Create: `~/claude-config/skills/abandon-feature.md`
- Create: `~/claude-config/skills/new-project-bootstrap.md`

- [ ] **Step 1: Write parallel-session.md**

```bash
cat > ~/claude-config/skills/parallel-session.md << 'EOF'
---
name: parallel-session
description: Register your session zone and create a git worktree. Run this after plan-feature Phase 5 produces plan.md, before execute-plan. Prevents conflicts between simultaneous Opus sessions.
---

# parallel-session Skill

Run this skill AFTER plan-feature produces plan.md, BEFORE execute-plan.

## Zone Overlap Algorithm

Two sessions overlap if, for any path A (this session) and path B (other session):
- A starts with B (B is a prefix of A), OR
- B starts with A (A is a prefix of B)

`packages/*` is always a conflict zone — declare any shared package changes explicitly.

## Steps

### On Session Start

1. **Write your session file** (unique filename — no write conflict between sessions)

   Create `docs/sessions/{feature-slug}-active.md`:
   ```yaml
   feature: {feature-slug}
   worktree: plan-{feature-slug}
   paths:
     - {path/to/zone/1/}
     - {path/to/zone/2/}
   shared-packages: []   # list specific packages/* files if needed, else empty
   started: {ISO8601 timestamp}
   last-updated: {ISO8601 timestamp}
   ```

2. **Wait 2 seconds** (allows any near-simultaneous session to write)

3. **Read all session files**
   ```bash
   ls docs/sessions/*-active.md
   ```
   Read each one.

4. **Run overlap check** against each other session file
   - Apply prefix algorithm above
   - Also check `shared-packages` fields for package-level conflicts

5. **If overlap found**: delete your session file, report the conflict to the user. Stop.

6. **If no overlap**: continue.

7. **Create worktree**
   ```bash
   git worktree add -b plan-{feature-slug} ../plan-{feature-slug} main
   cd ../plan-{feature-slug}
   ```

8. **Rebase from main**
   ```bash
   git rebase main
   ```

### Rebase Checkpoints

Update `last-updated` in your session file at each of these points:
- Before dispatching T1
- Before dispatching T2/T3
- After any shared-package task merges to main
- Before final merge

### Shared Package Changes

If `shared-packages` is non-empty:
1. Create a sub-branch for shared-package work (off your feature worktree):
   ```bash
   git checkout -b plan-{feature-slug}--shared
   ```
2. Complete shared-package changes on this sub-branch and commit.
3. Merge to main:
   ```bash
   git checkout main && git merge plan-{feature-slug}--shared
   ```
4. Delete the sub-branch: `git branch -d plan-{feature-slug}--shared`
5. Rebase all active worktrees from main
6. Then proceed with T2/T3 dispatch

### On Session End

1. Delete `docs/sessions/{feature-slug}-active.md`
2. Remove worktree: `git worktree remove ../plan-{feature-slug}`

## Stale Session Recovery

If another session file has `last-updated` older than 8 hours:
1. Check the worktree branch for recent commits: `git log plan-{stale-feature} --since="8 hours ago"`
2. If no recent commits: the session was interrupted
3. Delete the stale session file
4. Log to `docs/sessions/abandoned.md`: `{date} | {feature} | reclaimed (stale — no commits in 8h)`
5. Proceed with your own session registration
EOF
```

- [ ] **Step 2: Write abandon-feature.md**

```bash
cat > ~/claude-config/skills/abandon-feature.md << 'EOF'
---
name: abandon-feature
description: Clean up a cancelled, blocked, or interrupted feature. Archives spec and plan, removes worktree and session file, logs the abandonment.
---

# abandon-feature Skill

Use when a feature is: cancelled by the user, blocked indefinitely, superseded by another approach, or the session was interrupted and will not be resumed.

## Steps

1. **Archive the spec directory**
   ```bash
   mv docs/specs/YYYY-MM-DD-{feature}/ docs/specs/archived/YYYY-MM-DD-{feature}/
   ```

2. **Archive the plan directory**
   ```bash
   mv docs/plans/YYYY-MM-DD-{feature}/ docs/plans/archived/YYYY-MM-DD-{feature}/
   ```

3. **Delete the session file**
   ```bash
   rm -f docs/sessions/{feature-slug}-active.md
   ```

4. **Remove the worktree (if it exists)**
   ```bash
   git worktree list | grep plan-{feature-slug}
   # If present:
   git worktree remove ../plan-{feature-slug}
   ```

5. **Delete the branch (safe — warns on unmerged commits)**
   ```bash
   git branch -d plan-{feature-slug}
   ```
   If there are unmerged commits you want to keep, use `git branch -m plan-{feature-slug} archived-{feature-slug}` instead.

6. **Log the abandonment**
   Append to `docs/sessions/abandoned.md`:
   ```
   {YYYY-MM-DD} | {feature-slug} | {reason: cancelled / blocked / superseded / interrupted}
   ```

7. **Commit the cleanup**
   ```bash
   git add docs/
   git commit -m "chore: archive {feature-slug} ({reason})"
   ```
EOF
```

- [ ] **Step 3: Write new-project-bootstrap.md**

```bash
cat > ~/claude-config/skills/new-project-bootstrap.md << 'EOF'
---
name: new-project-bootstrap
description: Bootstrap a new project with the agentic team system. Run once per project to set up tuned agents, docs scaffolding, and CLAUDE.md. Triggered by /bootstrap slash command.
---

# new-project-bootstrap Skill

Run this skill once when starting a new project. By the end, the project has tuned agent definitions, docs scaffolding, and a CLAUDE.md that tells agents where to start.

## Steps

### 1. Copy and tune agent templates

```bash
mkdir -p .claude/agents
cp ~/.claude/templates/agents/backend.md  .claude/agents/backend.md
cp ~/.claude/templates/agents/frontend.md .claude/agents/frontend.md
cp ~/.claude/templates/agents/tester.md   .claude/agents/tester.md
```

Open each file. Fill in every `<!-- TUNE: -->` marker:

**backend.md:**
- Stack: language, framework, ORM/DB client, auth library
- File locations: handler directory, repository directory, test directory
- Context7 libraries: all third-party libs this agent will use

**frontend.md:**
- Framework + version (Next.js 15, Remix 2, etc.)
- Component library path (if any)
- Context7 libraries: all third-party libs this agent will use

**tester.md:**
- Test runner + assertion library (Vitest, Go testing, pytest, etc.)
- Two or three specific existing test files to read for conventions
- Known mock patterns and wrappers specific to this project

### 2. Write project CLAUDE.md

Add or update `CLAUDE.md` with:
- **Start here:** which files to read first (key entry points)
- **Zones:** which directory paths belong to which product area
- **Shared packages:** list all `packages/*` or shared directories explicitly
- **Implementation agents:** backend, frontend, tester (brief purpose of each)
- **Planning agents:** orchestrator, architect, reviewer, ux (brief purpose of each)

### 3. Create docs/ structure

```bash
mkdir -p docs/specs/archived docs/plans/archived docs/sessions
printf "# Abandoned Features\n\n" > docs/sessions/abandoned.md
```

### 4. Commit

```bash
git add .claude/agents/ docs/ CLAUDE.md
git commit -m "chore: bootstrap agentic team system"
```

### 5. Verify

Open a new Claude Code session and run the orchestrator agent. Confirm it can:
- Read `docs/sessions/*-active.md` without error (directory exists, no conflict)
- Dispatch the architect agent
- Dispatch the ux agent

If any agent fails to load, check that `~/.claude/agents/` symlink points to `~/claude-config/agents/`.
EOF
```

- [ ] **Step 4: Commit**

```bash
cd ~/claude-config
git add skills/parallel-session.md skills/abandon-feature.md skills/new-project-bootstrap.md
git commit -m "feat: coordination skills — parallel-session, abandon-feature, new-project-bootstrap"
```

---

### Task 7: Write commands, templates, and MCP catalog

**Files:**
- Create: `~/claude-config/commands/bootstrap.md`
- Create: `~/claude-config/templates/agents/README.md`
- Create: `~/claude-config/templates/agents/backend.md`
- Create: `~/claude-config/templates/agents/frontend.md`
- Create: `~/claude-config/templates/agents/tester.md`
- Create: `~/claude-config/docs/mcp-catalog.md`

- [ ] **Step 1: Write bootstrap.md slash command**

```bash
cat > ~/claude-config/commands/bootstrap.md << 'EOF'
---
description: Bootstrap this repository with the agentic team system — tuned agents, docs scaffolding, and CLAUDE.md update.
---

Load and follow the `new-project-bootstrap` skill to set up this project's agentic team configuration.
EOF
```

- [ ] **Step 2: Write templates/agents/README.md**

```bash
cat > ~/claude-config/templates/agents/README.md << 'EOF'
# Agent Templates

These templates are the starting point for project-tuned agents. Copy them into your project's `.claude/agents/` directory, then fill in every `<!-- TUNE: -->` marker.

## How to use

```bash
cp ~/.claude/templates/agents/backend.md  .claude/agents/backend.md
cp ~/.claude/templates/agents/frontend.md .claude/agents/frontend.md
cp ~/.claude/templates/agents/tester.md   .claude/agents/tester.md
```

Search for `TUNE:` in each file to find what needs customising.

## What stays the same

- The agent's role and read/write contract
- The skills it uses
- The output file format

## What you tune

- Tech stack (language, framework, libraries)
- File locations specific to this codebase
- Which Context7 libraries to use
- Test conventions (for tester.md)

## Naming

Templates are named `backend`, `frontend`, `tester`. These names do NOT conflict with the global agents (`orchestrator`, `architect`, `reviewer`, `ux`). You can rename them if your project needs different specialists (e.g., `go-api`, `react-ui`, `e2e-tester`).
EOF
```

- [ ] **Step 3: Write templates/agents/backend.md**

```bash
cat > ~/claude-config/templates/agents/backend.md << 'EOF'
---
name: backend
description: <!-- TUNE: one sentence describing this agent's speciality, e.g. "Go API implementation specialist for the rpg-tracker service" -->
model: claude-sonnet-4-6
---

You are the backend implementation agent for this project.

<!-- TUNE: describe the tech stack in one line -->
**Stack:** [language] + [framework] + [ORM/DB client] + [auth library]

<!-- TUNE: list the key directories this agent works in -->
**Key file locations:**
- Handlers/controllers: `[path/to/handlers/]`
- Repositories/data layer: `[path/to/repositories/]`
- Tests: `[path/to/tests/]`

## Tools & Resources

- Skill: `use-context7` — use before writing any third-party library API call
  <!-- TUNE: list the libraries this agent uses, so it knows what to Context7 -->
  MCP context7 libraries: [library1, library2, library3]
- Skill: `tdd-first` — always read T1-tests.md manifest before writing implementation
- Read: `docs/mcp-catalog.md` for full MCP list

## Read/Write Contract

Reads (≤4 files): `spec.md`, `plan.md`, `T1-tests.md` + test files listed in manifest (read one at a time as needed).

Writes: `docs/specs/YYYY-MM-DD-{feature}/T2-backend.md`

```markdown
## Status: DONE / BLOCKED
## Files Changed
- [path/to/changed/file]
## Notes
[deviations from spec, edge cases encountered]
## Test Results
[all T1 tests pass / N tests failing — list which]
```

Task state = `done` only when Status = DONE and all T1 tests pass.
Task state = `blocked` when tests are failing or a dependency is missing — describe in Notes.
EOF
```

- [ ] **Step 4: Write templates/agents/frontend.md**

```bash
cat > ~/claude-config/templates/agents/frontend.md << 'EOF'
---
name: frontend
description: <!-- TUNE: one sentence, e.g. "Next.js + React UI specialist for the rpg-tracker app" -->
model: claude-sonnet-4-6
---

You are the frontend implementation agent for this project.

<!-- TUNE: describe the UI stack -->
**Stack:** [framework + version] + [CSS approach] + [state/data library]

<!-- TUNE: list key directories -->
**Key file locations:**
- Pages/routes: `[path/to/app/]`
- Components: `[path/to/components/]`
- Tests: `[path/to/tests/]`

## Tools & Resources

- Skill: `use-context7` — use before writing any third-party library API call
  <!-- TUNE: list libraries -->
  MCP context7 libraries: [framework, ui-library, data-library, css-library]
- Skill: `tdd-first` — read T1-tests.md manifest before implementing
- Read: `docs/mcp-catalog.md`

## Read/Write Contract

Reads (≤4 files): `spec.md`, `plan.md`, `T1-tests.md` + test files in manifest (read one at a time as needed).

Writes: `docs/specs/YYYY-MM-DD-{feature}/T3-frontend.md`

```markdown
## Status: DONE / BLOCKED
## Files Changed
- [path]
## Notes
[deviations, edge cases]
## Test Results
[all T1 tests pass / N failing]
```

Task state = `done` only when Status = DONE and all T1 tests pass.
Task state = `blocked` when tests failing or dependency missing.
EOF
```

- [ ] **Step 5: Write templates/agents/tester.md**

```bash
cat > ~/claude-config/templates/agents/tester.md << 'EOF'
---
name: tester
description: <!-- TUNE: e.g. "TDD-first test author for Vitest + Go testing in rpg-tracker" -->
model: claude-sonnet-4-6
---

You are the tester agent. Your job is to write failing tests from the spec. You NEVER write implementation code.

## Core Discipline

Always load and follow the `tdd-first` skill at the start of every T1 task.

<!-- TUNE: specify the test runner and assertion style -->
**Test stack:** [Vitest + React Testing Library / Go testing / pytest / etc.]

<!-- TUNE: list 2-3 specific existing test files to read for conventions -->
**Read these files first** to learn project test conventions:
- `[path/to/existing/test1]`
- `[path/to/existing/test2]`

<!-- TUNE: describe known patterns, common gotchas -->
**Known conventions:**
- [e.g., vi.mock is hoisted — factory function cannot reference outer variables]
- [e.g., React component tests require QueryClientProvider wrapper]
- [e.g., Go tests use t.Parallel() and testcontainers for DB]

## Tools & Resources

- Skill: `tdd-first` — load first, follow exactly
- Skill: `use-context7` — for test library APIs
  <!-- TUNE: list test libraries to Context7 -->
  MCP context7 libraries: [Vitest, RTL, etc.]

## Read/Write Contract

Reads (≤4 files): `spec.md` + 2–3 convention test files listed in your tuned agent definition.
Writes: `docs/specs/YYYY-MM-DD-{feature}/T1-tests.md` manifest + actual test code in worktree

T1-tests.md format:
```markdown
## Test Files Written
- [path/to/test.tsx]
## Coverage Map
- AC-1 ([text]) → test.tsx:12
```

Task state = `done`: tests committed and verified failing.
Task state = `blocked`: ACs cannot be expressed as assertions — list which ones.
EOF
```

- [ ] **Step 6: Write docs/mcp-catalog.md**

```bash
cat > ~/claude-config/docs/mcp-catalog.md << 'EOF'
# MCP Catalog

Available MCPs and which agents use them.

## context7

**Purpose:** Retrieve up-to-date library documentation and API references.

**Used by:** backend, frontend, tester, architect

**How to use:**
1. Resolve library ID:
   ```
   mcp__plugin_context7_context7__resolve-library-id
   libraryName: "react"
   → returns "/facebook/react"
   ```
2. Query specific topic:
   ```
   mcp__plugin_context7_context7__query-docs
   context7CompatibleLibraryID: "/facebook/react"
   topic: "useEffect dependencies"
   tokens: 3000
   ```

**Common library IDs:**

| Library | Input to resolve-library-id |
|---------|---------------------------|
| React | `react` |
| TanStack Query | `tanstack/react-query` |
| Next.js | `next` |
| chi (Go) | `go-chi/chi` |
| pgx (Go) | `jackc/pgx` |
| Supabase JS | `supabase/supabase-js` |
| Vitest | `vitest` |
| React Testing Library | `testing-library/react` |
| Tailwind CSS | `tailwindcss` |

**Fallback:** If unavailable — use training knowledge + add `// Context7 unavailable` inline comment. Never block.

---

*Add new MCPs here as they are configured. Include: purpose, which agents use it, usage pattern, fallback.*
EOF
```

- [ ] **Step 7: Commit everything**

```bash
cd ~/claude-config
git add commands/ templates/ docs/
git commit -m "feat: commands, agent templates, and MCP catalog"
```

- [ ] **Step 8: Push to GitHub**

```bash
cd ~/claude-config
git push origin main
```

---

### Task 8: Verify the install end-to-end

- [ ] **Step 1: Confirm all skills are accessible**

```bash
ls ~/.claude/skills/
```

Expected: abandon-feature.md, execute-plan.md, new-project-bootstrap.md, parallel-session.md, plan-feature.md, tdd-first.md, use-context7.md

- [ ] **Step 2: Confirm all global agents are accessible**

```bash
ls ~/.claude/agents/
```

Expected: orchestrator.md, architect.md, reviewer.md, ux.md (plus any existing agents)

- [ ] **Step 3: Confirm templates are accessible**

```bash
ls ~/.claude/templates/agents/
```

Expected: README.md, backend.md, frontend.md, tester.md

- [ ] **Step 4: Open Claude Code and verify orchestrator loads**

Open a Claude Code session. Type: "Use the orchestrator agent to check for active sessions."

Expected: orchestrator loads, reads `docs/sessions/` (or reports directory doesn't exist if no project is bootstrapped yet — that's fine).

---

## Phase 2: Bootstrap RpgTracker

### Task 9: Create docs/ scaffolding in RpgTracker

**Files:**
- Create: `docs/sessions/abandoned.md`
- Create: `docs/specs/archived/` (directory)
- Create: `docs/plans/archived/` (directory)

Note: `docs/superpowers/` already exists (from this spec/plan). The new structure lives alongside it.

- [ ] **Step 1: Create the directory structure**

```bash
cd /home/meden/GolandProjects/RpgTracker
mkdir -p docs/specs/archived docs/plans/archived docs/sessions
```

- [ ] **Step 2: Create abandoned.md**

```bash
printf "# Abandoned Features\n\nLog of abandoned or interrupted feature sessions.\n\n| Date | Feature | Reason |\n|------|---------|--------|\n" > docs/sessions/abandoned.md
```

- [ ] **Step 3: Commit**

```bash
git add docs/specs/ docs/plans/ docs/sessions/
git commit -m "chore: docs/ scaffolding for agentic team system"
```

---

### Task 10: Write RpgTracker-tuned implementation agents

**Files:**
- Create: `.claude/agents/backend.md`
- Create: `.claude/agents/frontend.md`
- Create: `.claude/agents/tester.md`

- [ ] **Step 1: Write backend.md**

```bash
cat > /home/meden/GolandProjects/RpgTracker/.claude/agents/backend.md << 'EOF'
---
name: backend
description: Go API implementation specialist for RpgTracker. Handles chi route handlers, pgx repository layer, Supabase auth middleware, and Go test files.
model: claude-sonnet-4-6
---

You are the backend implementation agent for RpgTracker.

**Stack:** Go + chi router + pgx v5 + Supabase JWT auth

**Key file locations:**
- Handlers: `apps/api/internal/handlers/`
- Skills/XP repositories: `apps/api/internal/skills/`
- Auth middleware: `apps/api/internal/auth/`
- Server routing: `apps/api/internal/server/server.go`
- Tests: `apps/api/internal/**/*_test.go`

## Tools & Resources

- Skill: `use-context7` — use before writing any Go library call you're uncertain about
  MCP context7 libraries: [Go standard library, go-chi/chi, jackc/pgx, supabase-go]
- Skill: `tdd-first` — read T1-tests.md manifest before implementing
- Read: `docs/mcp-catalog.md`

## Key patterns in this codebase

- Handlers return JSON via `api.RespondJSON(w, status, payload)` or `api.RespondError(w, status, msg)`
- User ID extracted from context: `auth.UserIDFromContext(r.Context())`
- DB pool injected via constructor: `handlers.NewSkillHandler(db *pgxpool.Pool)`
- Tests use `httptest.NewRecorder()` + `httptest.NewRequest()`, no external test DB

## Read/Write Contract

Reads (≤4 files): `spec.md`, `plan.md`, `T1-tests.md` + Go test files listed in manifest (read one at a time as needed).

Writes: `docs/specs/YYYY-MM-DD-{feature}/T2-backend.md`

```markdown
## Status: DONE / BLOCKED
## Files Changed
- [path]
## Notes
[deviations from spec, edge cases]
## Test Results
[all T1 tests pass / N failing — list which]
```

Task state = `done` only when Status = DONE and `go test ./...` passes.
Task state = `blocked` when tests failing — describe root cause in Notes.
EOF
```

- [ ] **Step 2: Write frontend.md**

```bash
cat > /home/meden/GolandProjects/RpgTracker/.claude/agents/frontend.md << 'EOF'
---
name: frontend
description: Next.js 15 + React UI specialist for RpgTracker. Handles App Router pages, @rpgtracker/ui components, Tailwind v4 styling, and TanStack Query data fetching.
model: claude-sonnet-4-6
---

You are the frontend implementation agent for RpgTracker.

**Stack:** Next.js 15 App Router + React + Tailwind v4 + TanStack Query v5 + @rpgtracker/ui

**Key file locations:**
- App pages: `apps/rpg-tracker/app/(app)/`
- Auth pages: `apps/rpg-tracker/app/(auth)/`
- Shared UI components: `packages/ui/src/`
- API client: `packages/api-client/src/client.ts`
- Styles/tokens: `apps/rpg-tracker/tokens.css`
- Tests: `apps/rpg-tracker/app/__tests__/`

## Tools & Resources

- Skill: `use-context7` — use before writing any framework or library API
  MCP context7 libraries: [next, react, tanstack/react-query, tailwindcss, testing-library/react, vitest]
- Skill: `tdd-first` — read T1-tests.md manifest before implementing
- Read: `docs/mcp-catalog.md`

## Key patterns in this codebase

- Pages use `'use client'` directive and TanStack Query (`useQuery`, `useMutation`)
- All API calls go through `@rpgtracker/api-client` functions — never fetch directly
- Tailwind v4: `@source "../../packages/ui/src"` scans shared packages; uses `var(--color-accent)` for theme-aware colours
- Components in `packages/ui/src/` must be exported from `packages/ui/src/index.ts`
- Dark mode via `dark:` Tailwind classes responding to `prefers-color-scheme`
- Auth: `createBrowserClient()` from `@rpgtracker/auth/client` for client-side Supabase

## Read/Write Contract

Reads (≤4 files): `spec.md`, `plan.md`, `T1-tests.md` + test files in manifest (read one at a time as needed).

Writes: `docs/specs/YYYY-MM-DD-{feature}/T3-frontend.md`

```markdown
## Status: DONE / BLOCKED
## Files Changed
- [path]
## Notes
[deviations, edge cases]
## Test Results
[all T1 tests pass / N failing]
```

Task state = `done` only when Status = DONE and `pnpm turbo test` passes.
Task state = `blocked` when tests failing — describe root cause in Notes.
EOF
```

- [ ] **Step 3: Write tester.md**

```bash
cat > /home/meden/GolandProjects/RpgTracker/.claude/agents/tester.md << 'EOF'
---
name: tester
description: TDD-first test author for RpgTracker. Writes failing Vitest + RTL tests (frontend) and Go tests (backend) from spec acceptance criteria. Never writes implementation code.
model: claude-sonnet-4-6
---

You are the tester agent for RpgTracker. You write failing tests from the spec. You NEVER write implementation code.

## Core Discipline

Load and follow the `tdd-first` skill at the start of every T1 task. No exceptions.

**Test stack:**
- Frontend: Vitest + React Testing Library (`apps/rpg-tracker/vitest.config.ts`)
- Backend: Go's standard `testing` package (`go test ./...`)

**Read these files first** to learn project test conventions:
- `apps/rpg-tracker/app/__tests__/skill-detail.test.tsx` (React + TanStack Query patterns)
- `apps/rpg-tracker/app/__tests__/account.test.tsx` (QueryClientProvider wrapper pattern)
- `apps/api/internal/handlers/skill_test.go` (Go handler test pattern)

**Known conventions:**
- `vi.mock(...)` is hoisted — factory function CANNOT reference variables declared outside it. Inline mock data inside the factory.
- All React component tests that use `useQuery`/`useMutation` need a `QueryClientProvider` wrapper:
  ```tsx
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
  )
  render(<Component />, { wrapper })
  ```
- `next/link` must be mocked in `apps/rpg-tracker/vitest.config.ts` aliases (see existing config)
- Go tests use `httptest.NewRecorder()` + `httptest.NewRequest()`, inject mock `pgxpool.Pool`
- Frontend test files: `apps/rpg-tracker/app/__tests__/*.test.tsx`
- Backend test files: alongside source in `*_test.go`

## Tools & Resources

- Skill: `tdd-first` — load first, follow exactly
- Skill: `use-context7`
  MCP context7 libraries: [vitest, testing-library/react]

## Read/Write Contract

Reads (≤4 files): `spec.md` + 3 convention test files listed in **Read these files first** above.
Writes: `docs/specs/YYYY-MM-DD-{feature}/T1-tests.md` manifest + test code in worktree

T1-tests.md format:
```markdown
## Test Files Written
- apps/rpg-tracker/app/__tests__/feature.test.tsx
- apps/api/internal/handlers/feature_test.go

## Coverage Map
- AC-1 ([text]) → feature.test.tsx:12
- AC-2 ([text]) → feature.test.tsx:28
- AC-3 ([text]) → feature_test.go:45
```

Task state = `done`: tests committed, `pnpm turbo test` and `go test ./...` both fail on new tests only (red state confirmed).
Task state = `blocked`: ACs cannot be expressed as assertions — list which ones.
EOF
```

- [ ] **Step 4: Commit**

```bash
cd /home/meden/GolandProjects/RpgTracker
git add .claude/agents/backend.md .claude/agents/frontend.md .claude/agents/tester.md
git commit -m "feat: tuned implementation agents — backend (Go), frontend (Next.js), tester (Vitest+Go)"
```

---

### Task 11: Update CLAUDE.md and verify end-to-end

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update CLAUDE.md**

Replace the contents of `CLAUDE.md` with:

```markdown
# Claude Code Guide — RpgTracker

This project is in active development. The authoritative planning docs are under `Documentation/`. The agentic team system is under `docs/`.

## Quick Start

**Starting a new feature:** Use the orchestrator agent → it runs `plan-feature` then `execute-plan`.

**Reviewing planning docs:** Use `requirements-agent`, `planning-agent`, `architecture-agent`, `ux-agent`, `review-agent` in `.claude/agents/` (planning-phase agents, operate on `Documentation/`).

**Implementation:** Use the orchestrator. It dispatches backend, frontend, tester, architect, reviewer.

## Repository Zones

| Zone | Paths | Agent |
|------|-------|-------|
| Go API | `apps/api/` | backend |
| Next.js UI | `apps/rpg-tracker/` | frontend |
| Shared UI components | `packages/ui/src/` | frontend (shared — coordinate) |
| API client | `packages/api-client/src/` | backend or frontend (shared — coordinate) |
| Auth package | `packages/auth/src/` | backend (shared — coordinate) |

**Shared packages** (`packages/*`) require coordination — see `parallel-session` skill.

## Agentic Team — Implementation Phase

Global agents (loaded from `~/.claude/agents/`):
- `orchestrator` — Opus 4.6. Plans features, dispatches team, merges work.
- `architect` — Reviews specs for schema/service impact. Produces Parallelisation Map.
- `reviewer` — Spec gateway (Phase 4) and code quality gate.
- `ux` — Reviews specs for UX correctness and mobile viability.

Project agents (in `.claude/agents/`):
- `backend` — Go API: chi handlers, pgx repositories, auth middleware.
- `frontend` — Next.js App Router, React, Tailwind v4, TanStack Query, @rpgtracker/ui.
- `tester` — Writes failing tests from spec ACs before any implementation.

## Agentic Team — Planning Phase

Use these agents for documentation-level planning (operate on `Documentation/`):
- `requirements-agent` — resolves product ambiguity, tightens MVP scope
- `planning-agent` — converts decisions into backlog slices
- `architecture-agent` — produces schema and service boundary design
- `ux-agent` — defines IA and core journeys
- `review-agent` — reviews planning package for gaps

## Skills (global, from `~/.claude/skills/`)

- `plan-feature` — 5-phase pipeline: spec → arch review → UX review → gateway → plan
- `execute-plan` — Agent Teams execution with TDD gate
- `tdd-first` — TDD discipline for the tester agent
- `use-context7` — Context7 library doc lookup
- `parallel-session` — Zone registration and worktree creation
- `abandon-feature` — Clean up cancelled/interrupted features
- `new-project-bootstrap` — (for new projects) sets up agents + docs from templates

## Key Files

- `docs/sessions/` — active session zone files + abandoned log
- `docs/specs/` — feature specs (DRAFT → APPROVED → archived)
- `docs/plans/` — implementation plans
- `Documentation/` — product requirements, decisions, feature tracker (planning phase)
- `apps/api/` — Go REST API (chi, pgx, Supabase JWT)
- `apps/rpg-tracker/` — Next.js 15 App Router frontend
- `packages/ui/` — shared React component library
- `packages/api-client/` — typed API client (used by frontend)
- `packages/auth/` — Supabase auth helpers (browser + server)
```

- [ ] **Step 2: Commit**

```bash
cd /home/meden/GolandProjects/RpgTracker
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md for implementation phase — agent system, zones, skills"
```

- [ ] **Step 3: Verify the full system in Claude Code**

Open a fresh Claude Code session in the RpgTracker directory.

Check 1 — Global agents load:
```
Type: "Use the architect agent to describe its role."
```
Expected: architect agent loads, describes its role from `agents/architect.md`.

Check 2 — Project agents load:
```
Type: "Use the backend agent to describe the key file locations."
```
Expected: backend agent loads, lists Go handler paths.

Check 3 — Skills accessible:
```
Type: "Load the use-context7 skill and show step 1."
```
Expected: skill loads, shows the resolve-library-id step.

Check 4 — docs/ structure exists:
```bash
ls docs/sessions/ docs/specs/ docs/plans/
```
Expected: `abandoned.md` in sessions/, `archived/` in specs/ and plans/.

- [ ] **Step 4: Push RpgTracker to GitHub**

```bash
cd /home/meden/GolandProjects/RpgTracker
git push origin main
```

---

## Done

Both phases complete. The system is live:

- `~/claude-config` — global config repo, synced to GitHub, installed via symlinks
- RpgTracker `.claude/agents/` — backend, frontend, tester agents tuned to this codebase
- `docs/` scaffolding — ready for first feature session
- `CLAUDE.md` — updated to describe the full agentic system

**To use on a new machine:**
```bash
git clone git@github.com:meden/claude-config.git ~/claude-config
cd ~/claude-config && ./install.sh
# Then clone any project repo — its .claude/ agents are already tuned
```

**To start a new feature:**
Open Claude Code → use the orchestrator agent → it runs `plan-feature`.
