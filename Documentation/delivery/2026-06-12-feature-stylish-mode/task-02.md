# Task 02 — Minimal Stylish Treatments (F-046)

**Feature:** F-046 (Minimal theme slice)  
**Gate:** Visual review only (D-036) — **no faux-TDD on CSS**  
**Depends on:** [task-01](./task-01.md)  
**Blocks:** task-03 (file overlap)

---

## Scope

Add **additive** Stylish-mode CSS for the Minimal theme. Clean mode must remain visually identical to the pre-F-046 baseline.

### Surfaces (per `page-guides/dashboard.md`, `skill-detail.md`, `account.md`)

| Surface | Selector targets (indicative) |
|---------|------------------------------|
| Page background atmosphere | `body` / layout wrappers — subtle depth, not Retro/Modern effects |
| Dashboard stat cards + primary skill | `.stat-card`, `.primary-skill-card`, dashboard sections |
| Skill cards | `.skill-card` |
| Gate section | `.gate-section` and children |
| Activity history | `.activity-history` and children |
| Nav / sidebar atmosphere | `.nav-panel`, `.sidebar`, `BottomTabBar` host classes |
| Density tokens | `--density-scale` or spacing overrides under `[data-theme="minimal"][data-mode="stylish"]` |

### In scope

- `packages/ui/tokens/minimal.css` — Stylish token overrides (`--motion-scale` may increase slightly; honour `prefers-reduced-motion`)
- `packages/ui/tokens/pages.css` — append Minimal Stylish blocks only
- `packages/ui/tokens/components.css` — append Minimal Stylish nav/atmosphere blocks only

### Out of scope

- Retro or Modern Stylish blocks (tasks 03–04)
- Component structure changes (Layer 3)
- Landing app CSS (task 05)
- New React components unless a page guide marks MODIFIED with required structure (none expected)

---

## Target paths

```
packages/ui/tokens/minimal.css
packages/ui/tokens/pages.css      # Minimal [data-mode="stylish"] sections only
packages/ui/tokens/components.css # Minimal [data-mode="stylish"] sections only
```

---

## Acceptance criteria

| ID | Criterion |
|----|-----------|
| AC-046-M | Minimal Stylish matches `Documentation/style-guide/minimal.md` intent: still data-forward, but with permitted subtle atmosphere on desktop |
| AC-046-X | `[data-theme="minimal"][data-mode="clean"]` unchanged from baseline |
| AC-046-A | WCAG AA contrast maintained in Stylish |
| R-046-4 | Mobile largely converges with Clean |

---

## Reference guides

- `Documentation/style-guide/minimal.md`
- `Documentation/style-guide/shared.md` (Layer 1 → 2 order)
- `Documentation/page-guides/dashboard.md` — Minimal section (contrast Stylish vs Clean atmosphere)
- `Documentation/page-guides/skill-detail.md`
- `Documentation/page-guides/account.md`

---

## Verification command

```bash
pnpm build
```

**Primary gate:** visual review (see checklist below). No new Vitest tests for CSS.

---

## Visual review checklist (D-036)

Review at **desktop (≥1024px)** and **mobile (375px)** with `data-theme="minimal"`:

| Check | Clean | Stylish |
|-------|-------|---------|
| `/dashboard` — stat cards, primary skill, skill grid | Baseline unchanged | Subtle atmosphere; not noisy |
| `/skills/[id]` — gate section | Baseline | Enhanced gate card treatment |
| `/skills/[id]` — activity history | Baseline | Styled list per guide |
| Nav / sidebar | Baseline | Light atmosphere acceptable for Minimal |
| `prefers-reduced-motion: reduce` | N/A | Animations suppressed |
| Contrast (text on surfaces) | Pass AA | Pass AA |
| Token usage | No hardcoded Tailwind colours | `var(--color-*)` only |

Capture screenshots for PR evidence.

---

## Subagent routing

| Phase | Agent |
|-------|-------|
| Implement | `implementer-ts` (CSS-only) |
| Verify | `verifier` (visual review evidence required) |

**No TDD lock** — do not dispatch `test-writer-ts` for pure CSS.
