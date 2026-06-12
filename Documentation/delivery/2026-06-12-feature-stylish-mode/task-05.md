# Task 05 — Cinematic Landing (Stylish Only) (F-047)

**Feature:** F-047  
**Gate:** Visual review only (D-036)  
**Depends on:** [task-01](./task-01.md) — mode infra required  
**Parallel with:** tasks 02–04 (different file paths)

---

## Scope

Gate landing atmosphere and section treatments on `data-mode="stylish"`. Clean mode keeps the functional F-044 baseline landing without cinematic enhancements.

### Section flow (Stylish only — per `page-guides/landing.md`)

1. **Hero** — mission statement, CTA, theme switcher (existing `ThemeSwitcher`)
2. **Key Features** — per-theme animations (Minimal fade, Retro pixel reveal, Modern holographic)
3. **Suite Apps** — LifeQuest, NutriLog, MindTrack previews
4. **Social Proof** — mission expansion + beta highlights
5. **CTA** — sign up / get started

### In scope

- `apps/landing/app/layout.tsx` — SSR `data-mode` from cookie (wired in task-01; verify integration)
- `apps/landing/app/globals.css` — gate atmosphere (orbs, grid, hero effects) behind `[data-mode="stylish"]`
- `apps/landing/app/components/**` — enhance `ScrollReveal`, `HeroSection`, `FeaturesSection`, etc. for Stylish treatments
- Per-theme animation differences in Stylish mode only
- Shared `rpgt-mode` cookie with `apps/rpg-tracker`

### Out of scope

- Changes to `packages/ui/tokens/pages.css` app surfaces (tasks 02–04)
- New landing sections not in page guide
- Behaviour tests asserting CSS classes
- Auth or signup flow changes

### Clean mode behaviour (R-047-2, Q-2 default)

- Keep existing section DOM; disable/hide atmosphere via CSS when `[data-mode="clean"]`
- Sections remain readable and functional — no missing content

---

## Target paths

```
apps/landing/app/layout.tsx
apps/landing/app/globals.css
apps/landing/app/landing-tokens.css
apps/landing/app/page.tsx
apps/landing/app/components/HeroSection.tsx
apps/landing/app/components/FeaturesSection.tsx
apps/landing/app/components/SuiteAppsSection.tsx
apps/landing/app/components/SocialProofSection.tsx
apps/landing/app/components/CTASection.tsx
apps/landing/app/components/ScrollReveal.tsx
apps/landing/app/components/Navbar.tsx
```

---

## Acceptance criteria

| ID | Criterion |
|----|-----------|
| AC-047-1 | Stylish: full cinematic flow per `page-guides/landing.md` |
| AC-047-2 | Clean: basic landing, atmosphere CSS inactive |
| AC-047-3 | Theme switcher works in both modes |
| AC-047-4 | `rpgt-mode` persists landing ↔ app |
| AC-046-A | WCAG AA in both modes |

---

## Reference guides

- `Documentation/page-guides/landing.md`
- `Documentation/style-guide/{minimal,retro,modern}.md` — motion character per theme
- Existing components: `apps/landing/app/components/HeroSection.tsx` (orbs/grid already present — gate on Stylish)

---

## Verification command

```bash
pnpm --filter landing test && pnpm build
```

Existing `apps/landing/app/__tests__/landing.test.tsx` must continue to pass. Do not add CSS class assertions.

---

## Visual review checklist (D-036)

Test `apps/landing` at `localhost:3001` (or configured port):

### Stylish mode (`data-mode="stylish"`)

| Section | Minimal theme | Retro theme | Modern theme |
|---------|---------------|-------------|--------------|
| Hero | Clean fade hero, theme switcher visible | Dark atmospheric hero, pixel flavour | Navy hero, ambient glow |
| Features | Fade-in on scroll | Pixel dissolve / wipe | Holographic shimmer |
| Suite Apps | Styled cards | Themed cards | Glass cards |
| Social Proof | Present | Present | Present |
| CTA | Clear CTA | Clear CTA | Clear CTA |
| Navbar | Themed | Themed | Themed |

### Clean mode (`data-mode="clean"`)

| Check | Expected |
|-------|----------|
| Orbs / hero-grid / atmosphere | Not visible / inactive |
| Sections | All present, readable |
| Theme switcher | Still works |
| Motion | Minimal, functional |

### Cross-app

| Check | Expected |
|-------|----------|
| Set Stylish on landing → open rpg-tracker | Mode persists |
| Set Clean on account → reload landing | Mode persists |

### Accessibility

- [ ] Skip link works
- [ ] Focus visible on interactive elements
- [ ] Contrast AA in both modes
- [ ] `prefers-reduced-motion: reduce` disables cinematic animations

---

## Subagent routing

| Phase | Agent |
|-------|-------|
| Implement | `implementer-ts` |
| Verify | `verifier` (visual evidence + existing tests green) |

**No TDD lock.**
