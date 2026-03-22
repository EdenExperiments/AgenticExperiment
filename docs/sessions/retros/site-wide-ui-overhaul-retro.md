## site-wide-ui-overhaul — 2026-03-22

type: full-pipeline
corrections: 1 (T5 review found 4 files with remaining hardcoded colours — fixed in same pass)
blocks: background agents could not write to worktree (permissions issue) — all changes applied from main session
reviewer-flags: none (GO verdict)
quick-path-abort: no
summary: clean

### Stats
- 28 files changed, +1201 / -300 lines
- 170 tests at merge (56 app + 114 UI)
- Post-merge cleanup (2026-03-22): 23 visual/layout tests removed per D-036 pipeline split → 149 tests (33 app + 116 UI)
- 11 commits on feature branch
- Full pipeline: spec → arch → UX → gateway → plan → TDD → implementation → review

### Key Decisions
- Option B for skill detail (hero + 2-col grid) chosen by UX review
- Container strategy: max-w-[1500px] w-[90%] mx-auto in layout wrapper
- Protected components left untouched per D-020 binding decision
- Auth pages included in migration scope per user directive ("ALL areas")

### Learnings
- Background agents dispatched to worktree paths consistently failed with permissions — apply changes directly from orchestrator session
- AC-13 full-grep sweep is an effective quality gate — caught 4 files the implementation pass missed
- GateSubmissionForm was not in protected list but was initially overlooked in T3/T4 — the separate T5 review pass caught it
- **Post-merge (D-036):** T1b visual tests (CSS class assertions for grid-cols, font-display, bg-gray absence, container max-w) were removed. These tested implementation details not user behaviour, broke on any layout change, and conflict with the new pipeline split. Visual quality is now reviewer-owned (Visual Review mode), not test-owned. T1a tests (packages/ui hover, motion-scale, colour migration) remain — they test component contracts, not page layout.

processed: 2026-03-22
