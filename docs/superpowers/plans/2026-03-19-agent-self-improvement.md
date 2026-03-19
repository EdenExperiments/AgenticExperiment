# Agent Self-Improvement Loop — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Quick Path session tracking so `what-next` can recover interrupted quick tasks, add retro notes after every merge, and create an `improve` skill that synthesises retro patterns into human-approved skill/agent edits.

**Architecture:** All changes are markdown file edits in `~/claude-config/` (a separate git repo) plus a new `docs/sessions/retros/` directory in the project repo. No code files are touched. Tasks are sequential — each builds on the previous.

**Tech Stack:** Markdown, bash (grep for verification), two git repos (`~/claude-config/` and project root).

---

## File Map

**Modify:**
- `~/claude-config/skills/plan-feature.md` — add session file step to Quick Path
- `~/claude-config/skills/what-next.md` — handle `*-quick-active.md` files
- `~/claude-config/skills/execute-plan.md` — add retro note to On GO step
- `~/claude-config/agents/orchestrator.md` — add `improve` to skills list + retro to Writes contract
- `~/claude-config/README.md` — add `improve` to skills table

**Create:**
- `~/claude-config/skills/improve.md` — new improve skill
- `docs/sessions/retros/.gitkeep` — new directory

---

### Task 1: Quick Path session file — plan-feature.md

**Files:**
- Modify: `~/claude-config/skills/plan-feature.md`

The Quick Path currently skips session file creation (step 5 says "No session file, no worktree, no plan.md needed"). We need to add a session file step between hidden-complexity check and implementation, and change step 5 to update status + commit.

- [ ] **Step 1: Verify the target content is currently absent**

```bash
grep -n "quick-active.md" ~/claude-config/skills/plan-feature.md
```

Expected: no output (the pattern doesn't exist yet — this is the "failing test")

- [ ] **Step 2: Edit plan-feature.md — replace Quick Path steps 3–5**

Replace the block from step 3 through step 5 in the Quick Path section:

Old content:
```
3. **Implement directly.** For a ≤3-file change with clear ACs, the orchestrator or a single specialist agent can implement inline. No T1 tester dispatch needed for trivial one-liner fixes, but write at least 1 test assertion for any logic change.

4. **Quick review.** After implementing, re-read the 2–4 ACs and confirm each is met. No gateway.md needed.

5. **Commit and done.** No session file, no worktree, no plan.md needed for Quick Path.
```

New content:
```
3. **Write the Quick Path session file.** Create `docs/sessions/{feature-slug}-quick-active.md`:
   ```
   feature: {slug}
   type: quick
   files: [list of files to touch]
   ac-summary: {one-liner from mini-spec What field}
   started: {YYYY-MM-DD HH:MM}
   status: in-progress
   ```
   No worktree, no plan.md — session file only.

4. **Implement directly.** For a ≤3-file change with clear ACs, the orchestrator or a single specialist agent can implement inline. No T1 tester dispatch needed for trivial one-liner fixes, but write at least 1 test assertion for any logic change.

5. **Quick review.** After implementing, re-read the 2–4 ACs and confirm each is met. No gateway.md needed.

6. **Update session status, write Quick Path retro note, and commit.**
   - Set `status: done` in `docs/sessions/{feature-slug}-quick-active.md`
   - Write `docs/sessions/retros/{feature-slug}-retro.md` (single source: the quick-active.md file):
     ```
     ## {feature-slug} — {YYYY-MM-DD}

     type: quick
     corrections: none
     blocks: none
     reviewer-flags: none
     quick-path-abort: no | yes → {reason from session file status: aborted}
     summary: clean | aborted → {reason}
     processed: —
     ```
   - Commit all changes including the session file and retro note
```

- [ ] **Step 3: Verify the edit was applied**

```bash
grep -n "quick-active.md" ~/claude-config/skills/plan-feature.md
```

Expected: lines containing `quick-active.md` found (confirms new content is present)

```bash
grep -n "No session file" ~/claude-config/skills/plan-feature.md
```

Expected: no output (old content removed)

- [ ] **Step 4: Commit**

```bash
cd ~/claude-config
git add skills/plan-feature.md
git commit -m "feat: Quick Path session file tracking"
```

---

### Task 2: what-next Quick Path recovery — what-next.md

**Files:**
- Modify: `~/claude-config/skills/what-next.md`

The current `what-next` step 1 globs `*-active.md` which already matches `*-quick-active.md` — so it finds the file automatically. But steps 2–4 assume a full pipeline session (worktree, plan.md, T1/T2/T3 tasks). We need to add a branch immediately after reading the session file: if `type: quick`, skip to the Quick Path report.

Note: the spec states "no changes to `what-next` logic are needed", but step 3 reads `plan.md` unconditionally — a Quick Path session has no plan.md, so a branch is required here to avoid a dead read. This is a gap in the spec that this task resolves.

- [ ] **Step 1: Verify Quick Path branch is currently absent**

```bash
grep -n "type: quick" ~/claude-config/skills/what-next.md
```

Expected: no output

- [ ] **Step 2: Edit what-next.md — extend step 2 with a Quick Path branch**

After the existing step 2 content (the "Note: feature slug, worktree path…" line), add a new branch block. The full updated step 2 should read:

```markdown
2. **Read the session file** (1 file)

   Note: feature slug, worktree path, zone paths, last-updated timestamp.

   If `last-updated` is stale (> 8 hours), treat this as a potential interruption — proceed carefully and check git log before assuming state is valid.

   **If `type: quick`** — skip steps 3–4 and report directly:

   ```
   ## Current Session
   Feature: {feature-slug}
   Type: Quick Path
   Files: {files from session file}
   AC summary: {ac-summary from session file}
   Status: {status from session file}

   ## Next action
   [If status = in-progress]: "Verify ACs against {files} then update status to done and commit."
   [If status = done]: "Quick Path complete — no further action needed."
   [If status = aborted]: "Quick Path was aborted — check for a full pipeline session file for this feature."
   ```

   Execute the next action. Do not read plan.md (there is none for Quick Path).
```

- [ ] **Step 3: Verify the edit was applied**

```bash
grep -n "type: quick" ~/claude-config/skills/what-next.md
```

Expected: line found

```bash
grep -n "skip steps 3" ~/claude-config/skills/what-next.md
```

Expected: line found

- [ ] **Step 4: Commit**

```bash
cd ~/claude-config
git add skills/what-next.md
git commit -m "feat: what-next handles Quick Path session files"
```

---

### Task 3: Retro note on merge — execute-plan.md

**Files:**
- Modify: `~/claude-config/skills/execute-plan.md`

The On GO step (step 8) currently merges and cleans up. We need to add a retro note write before the session file is deleted, while the information is still available.

- [ ] **Step 1: Verify retro step is currently absent**

```bash
grep -n "retro" ~/claude-config/skills/execute-plan.md
```

Expected: no output

- [ ] **Step 2: Edit execute-plan.md — add retro note to step 8**

Replace the On GO step:

Old:
```markdown
8. **On GO**
   - Merge worktree to main
   - Delete `docs/sessions/{feature-slug}-active.md`
   - `git worktree remove ../{branch}`
```

New:
```markdown
8. **On GO**
   - Merge worktree to main
   - Write retro note to `docs/sessions/retros/{feature-slug}-retro.md` (see format below)
   - Delete `docs/sessions/{feature-slug}-active.md`
   - `git worktree remove ../{branch}`

### Retro Note Format

Sources to read before writing (≤4 files, already available from this session):
- `docs/plans/YYYY-MM-DD-{feature}/plan.md` — any blocked tasks?
- `docs/specs/YYYY-MM-DD-{feature}/correction.md` — if it exists
- `docs/specs/YYYY-MM-DD-{feature}/review.md` — code gate flags
- `docs/sessions/{feature-slug}-active.md` — metadata (read before deleting)

Write facts only — no analysis:
```markdown
## {feature-slug} — {YYYY-MM-DD}

type: full
corrections: none | 1 spec-level | 1 plan-level | 2 spec-level | etc.
blocks: none | T2 blocked ({reason}) | T3 blocked ({reason})
reviewer-flags: none | "{flag 1}" | "{flag 1}", "{flag 2}"
quick-path-abort: no | yes → {reason}
summary: clean | 1 plan correction | reviewer flagged 2 issues
processed: —
```
```

- [ ] **Step 3: Verify the edit was applied**

```bash
grep -n "retro" ~/claude-config/skills/execute-plan.md
```

Expected: multiple lines found (retro note, retro format, etc.)

- [ ] **Step 4: Commit**

```bash
cd ~/claude-config
git add skills/execute-plan.md
git commit -m "feat: write retro note on feature merge"
```

---

### Task 4: Orchestrator awareness — orchestrator.md

**Files:**
- Modify: `~/claude-config/agents/orchestrator.md`

Add `improve` to the skills list + when-to-use table, and add retro note and quick session file to the Read/Write Contract. The spec's "Existing Files to Edit" table also says to add a retro note step to the orchestrator's merge procedure — since the merge procedure delegates to execute-plan.md (Task 3), the Writes contract entry here is the correct orchestrator-level hook; add a note making this delegation explicit.

- [ ] **Step 1: Verify `improve` is currently absent**

```bash
grep -n "improve" ~/claude-config/agents/orchestrator.md
```

Expected: no output

- [ ] **Step 2: Edit orchestrator.md — add improve to Skills section**

In the Skills section, append after `correct-course`:

```
- `improve` — synthesise retro notes into proposed skill/agent improvements; run after 3–5 features
```

- [ ] **Step 3: Edit orchestrator.md — add improve to When to Use section**

Append after the last bullet in "When to Use Each Skill":

```
- After 3–5 features merged, or when friction is noticed → `improve`
```

- [ ] **Step 4: Edit orchestrator.md — update Read/Write Contract**

In the Writes section, append:
```
- `docs/sessions/{feature-slug}-quick-active.md` (Quick Path only — via plan-feature skill)
- `docs/sessions/retros/{feature-slug}-retro.md` (after every merge — via execute-plan skill)
```

- [ ] **Step 5: Verify all edits applied**

```bash
grep -n "improve\|retro\|quick-active" ~/claude-config/agents/orchestrator.md
```

Expected: lines for `improve` (skills + when-to-use), `retro`, and `quick-active`

- [ ] **Step 6: Commit**

```bash
cd ~/claude-config
git add agents/orchestrator.md
git commit -m "feat: orchestrator aware of improve skill + retro/quick-path writes"
```

---

### Task 5: improve skill — new file

**Files:**
- Create: `~/claude-config/skills/improve.md`

- [ ] **Step 1: Verify the file does not already exist**

```bash
ls ~/claude-config/skills/improve.md 2>/dev/null && echo "EXISTS" || echo "OK — does not exist"
```

Expected: `OK — does not exist`

- [ ] **Step 2: Create improve.md**

```markdown
---
name: improve
description: Synthesise retro notes from completed features into targeted skill and agent improvements. Run manually after 3–5 features. Proposes changes for human approval — never edits files autonomously.
---

# improve Skill

## When to Use

Run manually when you want to iterate on the agent system. Suggested cadence: after 3–5 merged features. Do not run automatically.

## Steps

### 1. Find unprocessed retros

```bash
grep -rl "processed: —" docs/sessions/retros/ 2>/dev/null
```

If no results: "No unprocessed retros found. Run after completing more features." Stop.

### 2. Read all unprocessed retro notes

Read every file returned in step 1. This step has no file count limit — it is the one explicit exception to the ≤4-file read constraint.

### 3. Identify patterns

Group findings across retros. **Single-occurrence issues are ignored** — a pattern requires ≥2 occurrences in the unprocessed batch.

Pattern types to look for:
- Same agent task blocked (T2 or T3 blocked) across multiple features — same root cause
- Same reviewer flag appearing more than once
- Spec-level corrections on multiple features
- Quick Path aborts — task unexpectedly required full pipeline

### 4. Draft proposals

For each pattern:

1. Read the specific skill or agent file it relates to (1 file per pattern)
2. Draft a targeted proposal:
   - **What:** the exact change — add/remove/rewrite a section. Never a full rewrite.
   - **Why:** cite the retro notes that evidence this (e.g. "T2 blocked in 3 of last 4 features — same missing dep")
   - **Size check:** if the proposed addition is >10 lines, identify equivalent content to remove first. Net line count must be neutral or negative unless a whole section is genuinely absent. If a skill file has visibly grown since the last cycle, prefer net-negative edits regardless of individual proposal size.
   - **Generalisability check:** would this change help any future feature, or only this specific one? One-feature-specific guidance is never added.

### 5. Present proposals to user

Present one proposal at a time:

```
## Proposal {N}/{total}

**Target:** `{path/to/file.md}`
**Pattern:** {description of recurring issue}
**Evidence:** {feature slugs and what each showed}

**Proposed change:**
[old text → new text, or "add after line X: ..."]

**Size impact:** +{N} lines / -{N} lines / neutral

Approve? (yes / no / skip)
```

Wait for user response before proceeding to next proposal.

### 6. Apply approved changes

For each approved proposal: edit the target file in `~/claude-config/` with the targeted change.

### 7. Mark retros as processed

In each retro file that was read in step 2, update:
```
processed: —
```
to:
```
processed: {YYYY-MM-DD}
```

### 8. Commit (two separate repos)

In `~/claude-config/` (skill/agent edits):
```bash
cd ~/claude-config
git add .
git commit -m "chore: improve agent system — {one-line summary of changes}"
git push
```

In the project repo (retro processed markers):
```bash
git add docs/sessions/retros/
git commit -m "chore: mark retros processed — {YYYY-MM-DD}"
```

## Hard Constraints

- **One-time events are never added** — ≥2 occurrences required
- **No whole-file rewrites** — targeted section edits only
- **Size gate** — net neutral or negative line count unless a section is genuinely absent
- **Generalisable only** — never add guidance specific to a single feature's implementation
- **Human gate** — every proposal requires explicit approval before applying
- **Validity check** — each proposal must answer yes to: "Would this change have prevented the documented problem?"
```

- [ ] **Step 3: Verify the file was created with key content**

```bash
grep -n "processed: —\|Size check\|Hard Constraints" ~/claude-config/skills/improve.md
```

Expected: 3 matching lines found

- [ ] **Step 4: Commit**

```bash
cd ~/claude-config
git add skills/improve.md
git commit -m "feat: improve skill — periodic retro synthesis"
```

---

### Task 6: Retros directory + README update

**Files:**
- Create: `docs/sessions/retros/.gitkeep`
- Modify: `~/claude-config/README.md`

- [ ] **Step 1: Create the retros directory**

```bash
mkdir -p /home/meden/GolandProjects/RpgTracker/docs/sessions/retros
touch /home/meden/GolandProjects/RpgTracker/docs/sessions/retros/.gitkeep
```

- [ ] **Step 2: Verify directory exists**

```bash
ls /home/meden/GolandProjects/RpgTracker/docs/sessions/retros/
```

Expected: `.gitkeep`

- [ ] **Step 3: Add `improve` to README skills table**

In `~/claude-config/README.md`, find the skills table row for `correct-course` and add after it:

```
| `improve` | After 3–5 merged features → synthesise retro patterns, propose targeted skill/agent edits for approval |
```

- [ ] **Step 4: Verify README update**

```bash
grep -n "improve" ~/claude-config/README.md
```

Expected: line found in skills table

- [ ] **Step 5: Commit both repos**

In the project repo:
```bash
git add docs/sessions/retros/.gitkeep
git commit -m "feat: create retros directory for post-merge notes"
```

In `~/claude-config/`:
```bash
cd ~/claude-config
git add README.md
git commit -m "docs: add improve skill to README"
git push
```

---

### Task 7: Reviewer spec-draft and plan review modes — reviewer.md

**Files:**
- Modify: `~/claude-config/agents/reviewer.md`

Add two new review mode sections and broaden the file-read exemption note to cover all modes.

- [ ] **Step 1: Verify new modes are currently absent**

```bash
grep -n "Spec-Draft\|Plan Review\|Phase 1.5\|Phase 5.5" ~/claude-config/agents/reviewer.md
```

Expected: no output

- [ ] **Step 2: Insert spec-draft review mode section (before Code Gate)**

After the existing `## Spec Gate (Phase 4 of plan-feature)` section and before `## Code Gate`, insert:

```markdown
## Spec-Draft Review (Phase 1.5 of plan-feature)

Input: `spec.md` only
Output: Inline findings returned to orchestrator — no file written.

Check for:
- Every acceptance criterion is a verifiable code assertion (no "should feel fast", no subjective language). Phase 4 remains the authoritative AC gate; this is a pre-flight on the draft only.
- All zones (directory paths) that will be touched are explicitly named
- No hidden assumptions stated as facts (e.g. "the auth middleware already handles X" without citing source)
- Scope is bounded — no open-ended "and any related changes"

Output format:
```
## Spec-Draft Review Findings
[list issues, or "none — proceed to Phase 2"]
```

Max 2 iterations. If issues remain after 2 fixes, surface to the user.
```

- [ ] **Step 3: Append plan review mode section**

After the `## Code Gate` section and before the final Note line, insert:

```markdown
## Plan Review (Phase 5.5 of plan-feature)

Input: `plan.md` + `spec.md`
Output: Inline findings returned to orchestrator — no file written.

Check for:
- Every spec AC maps to at least one task in the plan
- Every task references exact file paths (no "update the handler", no relative paths without a base)
- Every implementation step has a corresponding verification step (grep, test command, or compile check)
- Every task has an explicit Done condition

Output format:
```
## Plan Review Findings
[list issues, or "none — proceed to parallel-session"]
```

Max 2 iterations. If issues remain after 2 fixes, surface to the user.
```

- [ ] **Step 4: Update the file-read exemption note**

First confirm the old Note line exists:
```bash
grep -n "4-file read limit for the code gate" ~/claude-config/agents/reviewer.md
```
Expected: 1 line found (pre-flight — confirms the edit target is present before attempting replacement)

Old:
```
Note: You are NOT bound by the 4-file read limit for the code gate. Read all changed files.
```

New:
```
Note: You are NOT bound by the 4-file read limit for any review mode. Read all files required for the review.
```

- [ ] **Step 5: Verify all edits applied**

```bash
grep -n "Spec-Draft\|Plan Review\|any review mode" ~/claude-config/agents/reviewer.md
```

Expected: lines for `Spec-Draft Review`, `Plan Review`, and `any review mode` found

- [ ] **Step 6: Commit**

```bash
cd ~/claude-config
git add agents/reviewer.md
git commit -m "feat: reviewer spec-draft and plan review modes"
git push
```

---

### Task 8: Wire Phase 1.5 and Phase 5.5 into pipeline — plan-feature.md

**Files:**
- Modify: `~/claude-config/skills/plan-feature.md`

Add Phase 1.5 (spec-draft review) after Phase 1 and Phase 5.5 (plan review) after Phase 5.

- [ ] **Step 1: Verify new phases are currently absent**

```bash
grep -n "Phase 1.5\|Phase 5.5\|spec-draft mode\|plan-review mode" ~/claude-config/skills/plan-feature.md
```

Expected: no output

- [ ] **Step 2: Add Phase 1.5 after Phase 1**

After the Phase 1 section (the block ending with `5. Write spec.md to \`docs/specs/YYYY-MM-DD-{feature}/spec.md\``), insert:

```markdown
## Phase 1.5 — Spec-Draft Review (dispatch Reviewer in spec-draft mode)

Input: spec.md (draft)
Output: Inline findings

Dispatch the reviewer agent in spec-draft mode. Wait for findings.

If issues found: fix spec.md, re-dispatch. Max 2 iterations — if still failing after 2 fixes, surface to user.
If clean ("none — proceed to Phase 2"): continue to Phase 2.
```

- [ ] **Step 3: Add Phase 5.5 after Phase 5**

In Phase 5, replace:
```
5. After writing plan.md: run the `parallel-session` skill to register zone + create worktree
6. Then run the `execute-plan` skill
```

With:
```
5. After writing plan.md: dispatch reviewer in plan-review mode (Phase 5.5)
   - If issues found: fix plan.md, re-dispatch. Max 2 iterations — if still failing, surface to user.
   - If clean ("none — proceed to parallel-session"): continue
6. Run the `parallel-session` skill to register zone + create worktree
7. Then run the `execute-plan` skill
```

- [ ] **Step 4: Verify both phases are present**

```bash
grep -n "Phase 1.5\|Phase 5.5\|spec-draft mode\|plan-review mode" ~/claude-config/skills/plan-feature.md
```

Expected: lines for Phase 1.5 and Phase 5.5 found

```bash
grep -n "parallel-session" ~/claude-config/skills/plan-feature.md
```

Expected: parallel-session still referenced (confirm it wasn't accidentally removed)

- [ ] **Step 5: Commit**

```bash
cd ~/claude-config
git add skills/plan-feature.md
git commit -m "feat: Phase 1.5 spec-draft review + Phase 5.5 plan review in pipeline"
git push
```
