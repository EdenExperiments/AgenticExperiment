# Agent Self-Improvement Loop — Design

**Date:** 2026-03-18

---

## Goal

Close two gaps in the agentic pipeline:
1. Quick Path tasks leave no session state, so `what-next` cannot recover them after an interruption.
2. There is no feedback loop from completed features back into agent/skill definitions.

---

## Components

### 1. Quick Path Tracking

**Problem:** The Quick Path bypasses session file creation, so `what-next` finds nothing and cannot report current state.

**Solution:** The orchestrator writes `docs/sessions/{feature-slug}-quick-active.md` at the start of every Quick Path task. The filename matches the existing `*-active.md` glob, so `what-next` picks it up automatically without changes to its logic.

**File format:**
```
feature: {slug}
type: quick
files: [list of files to be touched]
ac-summary: {one-liner}
started: {YYYY-MM-DD HH:MM}
status: in-progress
```

**Lifecycle:**
- Written at the start of Quick Path (after mini-spec, before implementation)
- `status` updated to `done` on completion or `aborted` if it escalates to full pipeline
- If aborted: note why (abort triggers are defined in `plan-feature.md` Quick Path section — record the exact trigger that fired), then create full session file via `parallel-session` as normal

**`what-next` behaviour when it finds a `*-quick-active.md`:**
- Reports: feature slug, files, AC summary, status
- Next action: "Verify ACs against {files}" (if in-progress) or "Quick Path complete — no further action" (if done)
- Does NOT try to read plan.md (there is none)

---

### 2. Retro Note

**Problem:** No structured record of what went wrong (or right) in a feature session.

**Solution:** Orchestrator writes a minimal structured retro note to `docs/sessions/retros/{feature-slug}-retro.md` after every merge. Facts only — no analysis.

**Full Pipeline sources (≤4 files):**
- `docs/plans/YYYY-MM-DD-{feature}/plan.md` — blocked tasks?
- `docs/specs/YYYY-MM-DD-{feature}/correction.md` — if it exists
- `docs/specs/YYYY-MM-DD-{feature}/review.md` — code gate flags (produced by reviewer in execute-plan step 7–9)
- `docs/sessions/{feature-slug}-active.md` — metadata

**Quick Path sources (1 file):**
- `docs/sessions/{feature-slug}-quick-active.md`

**File format:**
```markdown
## {feature-slug} — {YYYY-MM-DD}

type: full | quick
corrections: none | 1 spec-level | 1 plan-level | 2 spec-level | etc.
blocks: none | T2 blocked ({reason}) | T3 blocked ({reason})
reviewer-flags: none | "{flag 1}" | "{flag 1}", "{flag 2}"
quick-path-abort: no | yes → {reason}
summary: clean | 1 plan correction | reviewer flagged 2 issues
processed: —
```

**Rules:**
- `processed:` starts as `—`, filled in by the `improve` skill after synthesis
- Orchestrator writes this as the final step of the merge, before closing the session file
- Quick Path tasks get a retro note too (type: quick) — single source: `docs/sessions/{feature-slug}-quick-active.md`; fields `corrections`, `blocks`, and `reviewer-flags` will always be `none`

---

### 3. `improve` Skill

**Purpose:** Periodic synthesis of retro notes into targeted skill/agent improvements.

**When to run:** Manually — after 3–5 features, or whenever friction is noticed. Not automatic.

**Steps:**

1. **Find unprocessed retros**
   ```bash
   grep -l "processed: —" docs/sessions/retros/*.md
   ```

2. **Read all unprocessed retro notes** (no file limit for this step — this is the one explicit exception to the ≤4-file read constraint)

3. **Identify patterns** — group findings across retros. Single-occurrence issues are ignored. A pattern requires ≥2 occurrences in unprocessed retros.

4. **For each pattern, read the relevant skill/agent file** and draft a targeted proposal:
   - **What:** the exact change (add/remove/rewrite a section — never a full rewrite)
   - **Why:** which retro notes evidence this (e.g., "T2 blocked in 3 of last 4 features — same cause")
   - **Size check:** if the proposed addition is >10 lines, identify equivalent content to remove first. Net line count must be neutral or negative unless a whole section is genuinely absent. Note: the >10-line threshold applies per proposal; cumulative growth across multiple improvement cycles is a known gap — if a skill file has visibly grown since the last cycle, prefer net-negative edits regardless of individual proposal size.

5. **Present proposals to user** — one proposal at a time, approve or reject each

6. **Apply approved changes** via targeted edits to skill/agent files in `~/claude-config/`

7. **Mark retros as processed**
   ```bash
   # Update processed: — to processed: {YYYY-MM-DD} in each retro file
   ```

8. **Commit changes** (two separate repos — each needs its own commit)

   In `~/claude-config/` (skill/agent edits):
   ```bash
   cd ~/claude-config
   git add .
   git commit -m "chore: improve agent system — {one-line summary of changes}"
   git push
   ```

   In the project repo (retro `processed:` updates):
   ```bash
   cd {project-root}
   git add docs/sessions/retros/
   git commit -m "chore: mark retros processed — {YYYY-MM-DD}"
   ```

**Hard constraints:**
- One-time events → ignored, never added
- No whole-file rewrites — targeted section edits only
- Net line count stays neutral or decreases unless a section is genuinely missing
- Proposals must survive: "would this have prevented the documented problem?"
- Never add implementation-specific one-liners (e.g. "remember to check X in handler Y") — improvements must be generalisable guidance

---

## File Layout

```
docs/sessions/
  {feature-slug}-active.md          ← full pipeline (existing)
  {feature-slug}-quick-active.md    ← quick path (new)
  abandoned.md                       ← existing
  retros/
    {feature-slug}-retro.md         ← one per merged feature (new)
```

```
~/claude-config/
  skills/
    improve.md                      ← new skill
  (all other skills — targets of improve proposals)
```

---

## Existing Files to Edit

This design requires changes to existing skill files — not just new files:

| File | Change required |
|------|----------------|
| `~/claude-config/skills/plan-feature.md` | Quick Path step 5: change "No session file, no worktree, no plan.md needed" to "Write `{feature-slug}-quick-active.md` session file, then implement, then update status to done" |
| `~/claude-config/agents/orchestrator.md` | Add retro note step to merge procedure; add `improve` to the skills list |
| `~/claude-config/skills/execute-plan.md` | Step 8 (On GO): add "write retro note" before deleting the session file |

---

## Out of Scope

- Automatic skill editing without human approval — not in this design
- In-session editing of skill files during a feature — deferred
- Improvement proposals for project-tuned agents (`.claude/agents/`) — those stay project-specific; only global `~/claude-config/agents/` are in scope
