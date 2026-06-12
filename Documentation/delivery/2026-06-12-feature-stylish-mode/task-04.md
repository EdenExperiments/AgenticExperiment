# Task 04 — Modern Stylish Treatments (F-046)

**Feature:** F-046 (Modern theme slice)  
**Gate:** Visual review only (D-036)  
**Depends on:** [task-03](./task-03.md) — **serial** (`pages.css`, `components.css` overlap)  
**Blocks:** — (F-046 complete after this task)

---

## Scope

Add **additive** Stylish-mode CSS for the Modern theme: command-centre HUD (glassmorphism, glows, fluid motion, atmospheric depth). Clean mode unchanged.

### Surfaces

Same surfaces as tasks 02–03, scoped to `[data-theme="modern"][data-mode="stylish"]`:

- Background atmosphere (gradients, glow zones)
- Dashboard HUD readouts
- Skill cards — glass panels
- Gate section — holographic challenge UI
- Activity history — scrolling data log
- Nav — glass panel atmosphere
- Density tokens — balanced/immersive per `style-guide/modern.md`

### In scope

- `packages/ui/tokens/modern.css` — Stylish overrides
- `packages/ui/tokens/pages.css` — Modern Stylish blocks
- `packages/ui/tokens/components.css` — Modern Stylish nav/atmosphere blocks

### Out of scope

- Minimal / Retro Stylish
- Pixel textures (Retro-only)
- Landing app (task 05)

---

## Target paths

```
packages/ui/tokens/modern.css
packages/ui/tokens/pages.css
packages/ui/tokens/components.css
```

---

## Acceptance criteria

| ID | Criterion |
|----|-----------|
| AC-046-O | Modern Stylish matches `Documentation/style-guide/modern.md` — fluid, glass, atmospheric |
| AC-046-X | `[data-theme="modern"][data-mode="clean"]` unchanged |
| AC-046-A | WCAG AA (including text on glass surfaces) |
| R-046-4 | Mobile convergence |

---

## Reference guides

- `Documentation/style-guide/modern.md`
- `Documentation/page-guides/dashboard.md` — Modern section
- `Documentation/page-guides/skill-detail.md`

---

## Verification command

```bash
pnpm build
```

---

## Visual review checklist (D-036)

Review at desktop + mobile with `data-theme="modern"`:

| Check | Clean | Stylish |
|-------|-------|---------|
| `/dashboard` | Baseline | Command-centre HUD |
| Skill cards | Baseline | Glass panels, subtle glow |
| Gate section | Baseline | Holographic challenge UI |
| Activity history | Baseline | Data-log styling |
| Nav | Baseline | Glass atmosphere |
| Motion | Functional | Fluid fades, ambient pulse (gated by `--motion-scale`) |
| No Retro textures | — | Smooth gradients only |
| Text on glass | — | Readable, AA contrast |
| `prefers-reduced-motion` | — | Pulses/parallax off |

---

## Subagent routing

| Phase | Agent |
|-------|-------|
| Implement | `implementer-ts` |
| Verify | `verifier` (visual evidence) |

**No TDD lock.**
