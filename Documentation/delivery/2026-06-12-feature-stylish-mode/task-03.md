# Task 03 — Retro Stylish Treatments (F-046)

**Feature:** F-046 (Retro theme slice)  
**Gate:** Visual review only (D-036)  
**Depends on:** [task-02](./task-02.md) — **serial** (`pages.css`, `components.css` overlap)  
**Blocks:** task-04

---

## Scope

Add **additive** Stylish-mode CSS for the Retro theme: RPG atmosphere (scanlines, warm gold accents, narrative framing, crunchy motion) on shared surfaces. Clean mode unchanged.

### Surfaces

Same surface list as task-02, scoped to `[data-theme="retro"][data-mode="stylish"]`:

- Background atmosphere (textures, scanlines — Layer 2)
- Dashboard quest-log framing
- Skill cards — warm borders, pixel accents
- Gate section — RPG challenge presentation
- Activity history — game journal styling
- Nav atmosphere — menu-like framing
- Density tokens — slightly more immersive spacing on desktop

### In scope

- `packages/ui/tokens/retro.css` — Stylish overrides
- `packages/ui/tokens/pages.css` — Retro Stylish blocks (append after task-02 sections)
- `packages/ui/tokens/components.css` — Retro Stylish nav/atmosphere blocks

### Out of scope

- Minimal / Modern Stylish (tasks 02, 04)
- Glassmorphism (Modern-only per `style-guide/retro.md`)
- Landing cinematic CSS (task 05)

---

## Target paths

```
packages/ui/tokens/retro.css
packages/ui/tokens/pages.css
packages/ui/tokens/components.css
```

---

## Acceptance criteria

| ID | Criterion |
|----|-----------|
| AC-046-R | Retro Stylish matches `Documentation/style-guide/retro.md` — dark, warm, tactile, crunchy motion |
| AC-046-X | `[data-theme="retro"][data-mode="clean"]` unchanged |
| AC-046-A | WCAG AA in Stylish |
| R-046-4 | Mobile convergence |

---

## Reference guides

- `Documentation/style-guide/retro.md`
- `Documentation/page-guides/dashboard.md` — Retro section
- `Documentation/page-guides/skill-detail.md`

---

## Verification command

```bash
pnpm build
```

---

## Visual review checklist (D-036)

Review at desktop + mobile with `data-theme="retro"`:

| Check | Clean | Stylish |
|-------|-------|---------|
| `/dashboard` | Baseline | Quest-log / save-state feel |
| Skill cards | Baseline | Warm borders, pixel accents |
| Gate section | Baseline | RPG challenge card |
| Activity history | Baseline | Journal styling |
| Nav | Baseline | Game-menu atmosphere |
| Motion | Functional | Screen-wipe / pixel dissolve where appropriate |
| No Modern effects | — | No glassmorphism, no parallax |
| Contrast | AA | AA |
| `prefers-reduced-motion` | — | Decorative motion off |

---

## Subagent routing

| Phase | Agent |
|-------|-------|
| Implement | `implementer-ts` |
| Verify | `verifier` (visual evidence) |

**No TDD lock.**
