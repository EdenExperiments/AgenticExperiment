# Task List: Phase 9B — Stylish Mode

**Requirements:** [`requirements.md`](./requirements.md)  
**Routing:** D-036 — task-01 uses TDD; tasks 02–05 use visual review only.

---

## Summary table

| Task | Feature | Summary | Target paths | Depends on | Parallel group | Verification |
|------|---------|---------|--------------|------------|----------------|--------------|
| [01](./task-01.md) | F-045 | Mode infrastructure (cookie, SSR, switcher, base selectors) | `packages/ui/**`, `apps/rpg-tracker/app/layout.tsx`, `apps/landing/app/layout.tsx`, `packages/auth/src/middleware.ts`, `apps/rpg-tracker/app/(app)/account/page.tsx` | — | **A** (start) | `pnpm --filter @rpgtracker/ui test` + `pnpm --filter rpg-tracker test` |
| [02](./task-02.md) | F-046 | Minimal Stylish CSS layers | `packages/ui/tokens/minimal.css`, `packages/ui/tokens/pages.css`, `packages/ui/tokens/components.css` | 01 | **B** (serial) | Visual review + `pnpm build` |
| [03](./task-03.md) | F-046 | Retro Stylish CSS layers | `packages/ui/tokens/retro.css`, `packages/ui/tokens/pages.css`, `packages/ui/tokens/components.css` | 02 | **B** (serial) | Visual review + `pnpm build` |
| [04](./task-04.md) | F-046 | Modern Stylish CSS layers | `packages/ui/tokens/modern.css`, `packages/ui/tokens/pages.css`, `packages/ui/tokens/components.css` | 03 | **B** (serial) | Visual review + `pnpm build` |
| [05](./task-05.md) | F-047 | Cinematic landing (Stylish only) | `apps/landing/**` | 01 | **C** (parallel with B after 01) | Visual review + `pnpm --filter landing test` + `pnpm build` |

---

## Parallelization guidance

```
                    ┌── task-01 (F-045 infra) ──┐
                    │         TDD gate           │
                    └─────────────┬──────────────┘
                                  │
              ┌───────────────────┼───────────────────┐
              ▼                                       ▼
     ┌─ Group B (SERIAL) ─┐                 ┌─ Group C ─────────┐
     │ task-02 Minimal    │                 │ task-05 Landing   │
     │ task-03 Retro      │                 │ (F-047)           │
     │ task-04 Modern     │                 │ visual review     │
     └────────────────────┘                 └───────────────────┘
```

| Group | Tasks | Rule |
|-------|-------|------|
| **A** | 01 | Must complete first — establishes `data-mode`, cookie, switcher, selector scaffolding. |
| **B** | 02 → 03 → 04 | **Strictly serial** — all touch `pages.css` and `components.css`. Do not parallelise. |
| **C** | 05 | May start after **01** completes; independent of 02–04 file paths. Can run in parallel with Group B. |

**Maximum parallelism after task-01:** 2 lanes (Group B + Group C).

---

## File overlap matrix (serialisation triggers)

| File | Tasks | Serial? |
|------|-------|---------|
| `packages/ui/tokens/pages.css` | 02, 03, 04 | **Yes** |
| `packages/ui/tokens/components.css` | 02, 03, 04 | **Yes** |
| `packages/ui/src/ThemeProvider.tsx` (or new mode module) | 01 only | — |
| `apps/rpg-tracker/app/layout.tsx` | 01 only | — |
| `apps/landing/app/layout.tsx` | 01, 05 | 01 before 05 |
| `apps/landing/app/globals.css` | 05 only | — |

---

## Feature tracker updates

Mark **in-progress** when task-01 starts; mark each feature **shipped** when its tasks pass verification:

| Feature | Shipped when |
|---------|--------------|
| F-045 | task-01 complete |
| F-046 | tasks 02 + 03 + 04 complete |
| F-047 | task-05 complete |
