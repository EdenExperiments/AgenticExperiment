# LifeQuest React UI Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the full LifeQuest UI in `apps/rpg-tracker`: navigation shell, auth/account screens, skill CRUD, quick XP logging, XP progression display, and blocker gate visibility.

**Architecture:** Next.js 15 App Router. Shared components (XPProgressBar, TierBadge, SkillCard, BottomTabBar, QuickLogSheet) live in `packages/ui` for future reuse by NutriLog. App-specific screens (skill pages, account pages) live in `apps/rpg-tracker`. TanStack Query v5 manages server state; route handlers in `app/api/[...path]/route.ts` (already implemented) proxy to the Go API. Theme is already applied via `ThemeProvider` from Plan A.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Tailwind CSS v4, TanStack Query v5, Framer Motion, Vitest + React Testing Library, `@rpgtracker/api-client` (types + fetch functions from Plan B1).

**Depends on:** Plan B1 (Go API endpoints) must be complete before this plan executes — Plan B1 Task 7 adds `SkillDetail`, `BlockerGate`, `XPLogResponse`, `CalibrateResponse`, `listSkills`, `getSkill`, `logXP`, `deleteSkill`, `calibrateSkill` to `@rpgtracker/api-client`. Task 1 of this plan fills the remaining gaps Plan B1 omits (`signOut`, `key_hint` on `APIKeyStatus`, `starting_level`/`updated_at` on `SkillDetail`). Auth screens (F-002: login, sign-up) were completed in Plan A's scaffold and are not duplicated here.

---

## File Map

### packages/ui — new shared components
- `packages/ui/src/BottomTabBar.tsx` — fixed bottom tab bar (mobile nav, D-017)
- `packages/ui/src/BottomTabBar.test.tsx`
- `packages/ui/src/Sidebar.tsx` — left sidebar (desktop nav, D-017)
- `packages/ui/src/Sidebar.test.tsx`
- `packages/ui/src/XPProgressBar.tsx` — tier-colored XP bar (D-020)
- `packages/ui/src/XPProgressBar.test.tsx`
- `packages/ui/src/TierBadge.tsx` — tier name badge with tier color
- `packages/ui/src/TierBadge.test.tsx`
- `packages/ui/src/SkillCard.tsx` — skill card for list and dashboard
- `packages/ui/src/SkillCard.test.tsx`
- `packages/ui/src/QuickLogSheet.tsx` — bottom sheet / modal for quick XP log (D-019)
- `packages/ui/src/QuickLogSheet.test.tsx`
- `packages/ui/src/BlockerGateSection.tsx` — gate section replacing XP bar (D-021)
- `packages/ui/src/BlockerGateSection.test.tsx`
- `packages/ui/src/TierTransitionModal.tsx` — tier transition overlay (D-022)
- `packages/ui/src/TierTransitionModal.test.tsx`
- `packages/ui/src/index.ts` — MODIFIED: export all new components

### apps/rpg-tracker — new files
- `apps/rpg-tracker/app/providers.tsx` — TanStack Query QueryClient provider
- `apps/rpg-tracker/app/(app)/layout.tsx` — MODIFIED: add BottomTabBar + Sidebar
- `apps/rpg-tracker/app/(app)/dashboard/page.tsx` — MODIFIED: real skill summary cards
- `apps/rpg-tracker/app/(app)/skills/page.tsx` — skill list screen
- `apps/rpg-tracker/app/(app)/skills/new/page.tsx` — 3-step skill creation flow
- `apps/rpg-tracker/app/(app)/skills/[id]/page.tsx` — skill detail screen
- `apps/rpg-tracker/app/(app)/skills/[id]/edit/page.tsx` — skill edit screen
- `apps/rpg-tracker/app/(app)/account/page.tsx` — account overview
- `apps/rpg-tracker/app/(app)/account/api-key/page.tsx` — API key management
- `apps/rpg-tracker/app/(app)/account/password/page.tsx` — password change
- `apps/rpg-tracker/app/(app)/nutri/page.tsx` — NutriLog placeholder (D-004)

### apps/rpg-tracker — test files
- `apps/rpg-tracker/app/__tests__/skills-list.test.tsx`
- `apps/rpg-tracker/app/__tests__/skill-detail.test.tsx`
- `apps/rpg-tracker/app/__tests__/skill-create.test.tsx`
- `apps/rpg-tracker/app/__tests__/account.test.tsx`

---

## Chunk 1: Setup + Shared UI Components

### Task 1: Install dependencies + QueryClient provider

**Files:**
- Modify: `apps/rpg-tracker/package.json`
- Create: `apps/rpg-tracker/app/providers.tsx`
- Modify: `apps/rpg-tracker/app/layout.tsx`

- [ ] **Step 1: Fill api-client gaps left by Plan B1**

Plan B1 Task 7 adds: `BlockerGate`, `XPEvent`, `SkillDetail`, `XPLogResponse`, `CalibrateResponse`, `listSkills`, `getSkill`, `logXP`, `deleteSkill`, `calibrateSkill`. These four additional pieces are missing from Plan B1 and must be added here:

```typescript
// packages/api-client/src/types.ts — replace/update three interfaces.
// The base Skill interface needs starting_level and updated_at added (Plan B1 adds them to Go
// but omits them from the TypeScript Skill base — SkillDetail extends Skill so they must be here):
export interface Skill {
  id: string
  user_id: string
  name: string
  description: string
  unit: string
  preset_id: string | null
  starting_level: number
  current_xp: number
  current_level: number
  created_at: string
  updated_at: string
}

// SkillDetail extends Skill — replace the Plan B1 version with the authoritative version:
export interface SkillDetail extends Skill {
  effective_level: number
  quick_log_chips: [number, number, number, number]
  tier_name: string
  tier_number: number
  gates: BlockerGate[]
  recent_logs: XPEvent[]
  xp_to_next_level: number
  xp_for_current_level: number
}

// APIKeyStatus — replace the existing definition:
export interface APIKeyStatus {
  has_key: boolean
  key_hint?: string
}
```

```typescript
// packages/api-client/src/client.ts — add signOut (Plan B1 omits this):
export function signOut(): Promise<void> {
  return request('/api/auth/signout', { method: 'POST' })
}
```

Run: `cd packages/api-client && pnpm tsc --noEmit`
Expected: no errors

- [ ] **Step 2: Install TanStack Query and Framer Motion**

```bash
cd apps/rpg-tracker
pnpm add @tanstack/react-query framer-motion
pnpm add -D @tanstack/react-query-devtools
```

- [ ] **Step 3: Write failing test for Providers wrapping**

```tsx
// apps/rpg-tracker/app/__tests__/providers.test.tsx
import { render, screen } from '@testing-library/react'
import { Providers } from '../providers'

test('renders children', () => {
  render(<Providers><div>hello</div></Providers>)
  expect(screen.getByText('hello')).toBeInTheDocument()
})
```

Run: `pnpm vitest run`
Expected: FAIL (Providers not defined)

- [ ] **Step 4: Create providers.tsx**

```tsx
// apps/rpg-tracker/app/providers.tsx
'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30_000, retry: 1 },
    },
  }))
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
```

- [ ] **Step 5: Wrap layout.tsx with Providers**

```tsx
// apps/rpg-tracker/app/layout.tsx — update body to include Providers
import { Providers } from './providers'
// ... existing imports

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const theme = (cookieStore.get('rpgt-theme')?.value ?? 'rpg-game') as Theme

  return (
    <html lang="en" data-theme={theme} suppressHydrationWarning>
      <body>
        <ThemeProvider theme={theme}>
          <Providers>
            {children}
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  )
}
```

- [ ] **Step 6: Run tests**

```bash
cd apps/rpg-tracker && pnpm vitest run
```
Expected: providers test passes

- [ ] **Step 7: Commit**

```bash
git add packages/api-client/src/ apps/rpg-tracker/
git commit -m "feat: add TanStack Query provider, Framer Motion deps, api-client signOut + type gaps"
```

---

### Task 2: XPProgressBar component

**Files:**
- Create: `packages/ui/src/XPProgressBar.tsx`
- Create: `packages/ui/src/XPProgressBar.test.tsx`

The tier color system (D-020) maps tier numbers 1–11 to Tailwind color classes. The bar shows progress within the current level, not cumulative XP. Legend tier (tier 11) uses a gradient fill.

- [ ] **Step 1: Write failing test**

```tsx
// packages/ui/src/XPProgressBar.test.tsx
import { render, screen } from '@testing-library/react'
import { XPProgressBar } from './XPProgressBar'

test('shows correct percentage', () => {
  const { container } = render(
    <XPProgressBar tierNumber={1} xpForCurrentLevel={50} xpToNextLevel={100} />
  )
  // Bar fill should be at 50%
  const fill = container.querySelector('[data-testid="xp-bar-fill"]')
  expect(fill).toHaveStyle('width: 50%')
})

test('applies tier-1 color class for Novice', () => {
  const { container } = render(
    <XPProgressBar tierNumber={1} xpForCurrentLevel={0} xpToNextLevel={100} />
  )
  const fill = container.querySelector('[data-testid="xp-bar-fill"]')
  expect(fill).toHaveClass('bg-gray-400')
})

test('applies gradient for Legend tier 11', () => {
  const { container } = render(
    <XPProgressBar tierNumber={11} xpForCurrentLevel={50} xpToNextLevel={100} />
  )
  const fill = container.querySelector('[data-testid="xp-bar-fill"]')
  expect(fill).toHaveClass('bg-gradient-to-r')
})

test('shows full bar at MaxLevel', () => {
  const { container } = render(
    <XPProgressBar tierNumber={11} xpForCurrentLevel={0} xpToNextLevel={0} isMaxLevel />
  )
  const fill = container.querySelector('[data-testid="xp-bar-fill"]')
  expect(fill).toHaveStyle('width: 100%')
})
```

Run: `cd packages/ui && pnpm vitest run`
Expected: FAIL

- [ ] **Step 2: Implement**

```tsx
// packages/ui/src/XPProgressBar.tsx

const TIER_COLORS: Record<number, string> = {
  1:  'bg-gray-400',
  2:  'bg-blue-500',
  3:  'bg-teal-500',
  4:  'bg-green-500',
  5:  'bg-lime-500',
  6:  'bg-purple-600',
  7:  'bg-fuchsia-600',
  8:  'bg-amber-600',
  9:  'bg-orange-600',
  10: 'bg-red-600',
  11: 'bg-gradient-to-r from-yellow-400 to-amber-500',
}

const TIER_BG: Record<number, string> = {
  1:  'bg-gray-100',
  2:  'bg-blue-50',
  3:  'bg-teal-50',
  4:  'bg-green-50',
  5:  'bg-lime-50',
  6:  'bg-purple-50',
  7:  'bg-fuchsia-50',
  8:  'bg-amber-50',
  9:  'bg-orange-50',
  10: 'bg-red-50',
  11: 'bg-yellow-50',
}

interface XPProgressBarProps {
  tierNumber: number
  xpForCurrentLevel: number
  xpToNextLevel: number
  isMaxLevel?: boolean
  className?: string
}

export function XPProgressBar({
  tierNumber,
  xpForCurrentLevel,
  xpToNextLevel,
  isMaxLevel = false,
  className = '',
}: XPProgressBarProps) {
  const total = xpForCurrentLevel + xpToNextLevel
  const pct = isMaxLevel ? 100 : total > 0 ? Math.round((xpForCurrentLevel / total) * 100) : 0
  const fillClass = TIER_COLORS[tierNumber] ?? 'bg-gray-400'
  const bgClass = TIER_BG[tierNumber] ?? 'bg-gray-100'

  return (
    <div
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      className={`relative h-3 rounded-full overflow-hidden ${bgClass} ${className}`}
    >
      <div
        data-testid="xp-bar-fill"
        className={`h-full rounded-full transition-all duration-300 ${fillClass}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
```

- [ ] **Step 3: Run tests**

```bash
cd packages/ui && pnpm vitest run
```
Expected: 4 passing

- [ ] **Step 4: Commit**

```bash
git add packages/ui/src/XPProgressBar.tsx packages/ui/src/XPProgressBar.test.tsx
git commit -m "feat(ui): XPProgressBar with 11-tier color system (D-020)"
```

---

### Task 3: TierBadge component

**Files:**
- Create: `packages/ui/src/TierBadge.tsx`
- Create: `packages/ui/src/TierBadge.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
// packages/ui/src/TierBadge.test.tsx
import { render, screen } from '@testing-library/react'
import { TierBadge } from './TierBadge'

test('renders tier name', () => {
  render(<TierBadge tierName="Journeyman" tierNumber={4} />)
  expect(screen.getByText('Journeyman')).toBeInTheDocument()
})

test('applies legend gold styling for tier 11', () => {
  const { container } = render(<TierBadge tierName="Legend" tierNumber={11} />)
  const badge = container.firstChild as HTMLElement
  expect(badge.className).toMatch(/yellow|amber|gold/)
})
```

Run: `pnpm vitest run`; Expected: FAIL

- [ ] **Step 2: Implement**

```tsx
// packages/ui/src/TierBadge.tsx

const TIER_TEXT: Record<number, string> = {
  1: 'text-gray-600 bg-gray-100',
  2: 'text-blue-700 bg-blue-50',
  3: 'text-teal-700 bg-teal-50',
  4: 'text-green-700 bg-green-50',
  5: 'text-lime-700 bg-lime-50',
  6: 'text-purple-700 bg-purple-50',
  7: 'text-fuchsia-700 bg-fuchsia-50',
  8: 'text-amber-700 bg-amber-50',
  9: 'text-orange-700 bg-orange-50',
  10: 'text-red-700 bg-red-50',
  11: 'text-yellow-700 bg-yellow-100 font-bold',
}

interface TierBadgeProps {
  tierName: string
  tierNumber: number
  className?: string
}

export function TierBadge({ tierName, tierNumber, className = '' }: TierBadgeProps) {
  const colorClass = TIER_TEXT[tierNumber] ?? 'text-gray-600 bg-gray-100'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colorClass} ${className}`}>
      {tierName}
    </span>
  )
}
```

- [ ] **Step 3: Run tests + commit**

```bash
cd packages/ui && pnpm vitest run
git add packages/ui/src/TierBadge.tsx packages/ui/src/TierBadge.test.tsx
git commit -m "feat(ui): TierBadge component with tier color system"
```

---

### Task 4: SkillCard component

**Files:**
- Create: `packages/ui/src/SkillCard.tsx`
- Create: `packages/ui/src/SkillCard.test.tsx`

Shows skill name, tier badge, level, XP progress bar, and a `+ Log` button. The `+ Log` button triggers the quick-log bottom sheet (passed as `onLogXP` prop — parent controls the sheet). Includes a blocker gate indicator when a gate is active (D-021 — shows lock icon, not the full gate section).

- [ ] **Step 1: Write failing test**

```tsx
// packages/ui/src/SkillCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { SkillCard } from './SkillCard'
import type { SkillDetail } from '@rpgtracker/api-client'

const mockSkill: SkillDetail = {
  id: 'abc-123',
  user_id: 'user-1',
  name: 'Running',
  description: '',
  unit: 'km',
  preset_id: null,
  starting_level: 1,
  current_xp: 200,
  current_level: 2,
  effective_level: 2,
  quick_log_chips: [50, 100, 250, 500],
  tier_name: 'Novice',
  tier_number: 1,
  gates: [],
  recent_logs: [],
  xp_to_next_level: 700,
  xp_for_current_level: 100,
  created_at: '',
  updated_at: '',
}

test('renders skill name and tier', () => {
  render(<SkillCard skill={mockSkill} onLogXP={vi.fn()} onClick={vi.fn()} />)
  expect(screen.getByText('Running')).toBeInTheDocument()
  expect(screen.getByText('Novice')).toBeInTheDocument()
  expect(screen.getByText('Level 2')).toBeInTheDocument()
})

test('calls onLogXP when + Log is clicked', () => {
  const onLogXP = vi.fn()
  render(<SkillCard skill={mockSkill} onLogXP={onLogXP} onClick={vi.fn()} />)
  fireEvent.click(screen.getByRole('button', { name: /log/i }))
  expect(onLogXP).toHaveBeenCalledWith('abc-123')
})

test('shows lock icon when gate is active', () => {
  const skillWithGate = {
    ...mockSkill,
    effective_level: 9,
    current_level: 10,
    gates: [{ id: 'g1', skill_id: 'abc-123', gate_level: 9, title: 'Test Gate',
               description: '', first_notified_at: '2026-01-01', is_cleared: false, cleared_at: null }],
  }
  render(<SkillCard skill={skillWithGate} onLogXP={vi.fn()} onClick={vi.fn()} />)
  expect(screen.getByRole('img', { name: /gate locked/i })).toBeInTheDocument()
})
```

Run: `pnpm vitest run`; Expected: FAIL

- [ ] **Step 2: Implement**

```tsx
// packages/ui/src/SkillCard.tsx
import { XPProgressBar } from './XPProgressBar'
import { TierBadge } from './TierBadge'
import type { SkillDetail, BlockerGate } from '@rpgtracker/api-client'

interface SkillCardProps {
  skill: SkillDetail
  onLogXP: (skillId: string) => void
  onClick: (skillId: string) => void
}

function activeGate(skill: SkillDetail): BlockerGate | undefined {
  return skill.gates.find(g => !g.is_cleared && skill.current_level >= g.gate_level)
}

export function SkillCard({ skill, onLogXP, onClick }: SkillCardProps) {
  const gate = activeGate(skill)

  return (
    <div
      className="relative bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-800 cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => onClick(skill.id)}
    >
      {/* Tier color accent bar — left edge */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl tier-accent-${skill.tier_number}`} />

      <div className="flex items-start justify-between gap-2 pl-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-gray-900 dark:text-white truncate">{skill.name}</h3>
            <TierBadge tierName={skill.tier_name} tierNumber={skill.tier_number} />
          </div>
          <p className="text-sm text-gray-500 mt-0.5">Level {skill.effective_level}</p>
        </div>

        {gate && (
          <span role="img" aria-label="gate locked" className="text-amber-500 text-lg flex-shrink-0">🔒</span>
        )}
      </div>

      <div className="pl-2 mt-3">
        <XPProgressBar
          tierNumber={skill.tier_number}
          xpForCurrentLevel={skill.xp_for_current_level}
          xpToNextLevel={skill.xp_to_next_level}
          className="mb-1"
        />
        <p className="text-xs text-gray-400">
          {skill.xp_for_current_level.toLocaleString()} / {(skill.xp_for_current_level + skill.xp_to_next_level).toLocaleString()} XP to next level
        </p>
      </div>

      <div className="flex justify-end mt-3 pl-2">
        <button
          aria-label="Log XP"
          onClick={(e) => { e.stopPropagation(); onLogXP(skill.id) }}
          className="flex items-center gap-1 text-sm font-medium px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors min-h-[44px]"
        >
          + Log
        </button>
      </div>
    </div>
  )
}
```

Note: `tier-accent-N` classes should be defined in `tokens.css` or `globals.css`. Add these utility classes to `apps/rpg-tracker/tokens.css`:
```css
.tier-accent-1 { background-color: theme(colors.gray.400); }
.tier-accent-2 { background-color: theme(colors.blue.500); }
/* ... etc for all 11 tiers */
.tier-accent-11 { background: linear-gradient(to bottom, theme(colors.yellow.400), theme(colors.amber.500)); }
```

- [ ] **Step 3: Run tests + commit**

```bash
cd packages/ui && pnpm vitest run
git add packages/ui/src/SkillCard.tsx packages/ui/src/SkillCard.test.tsx
git commit -m "feat(ui): SkillCard with XP bar, tier badge, and + Log button"
```

---

### Task 5: BottomTabBar + Sidebar navigation components

**Files:**
- Create: `packages/ui/src/BottomTabBar.tsx`
- Create: `packages/ui/src/BottomTabBar.test.tsx`
- Create: `packages/ui/src/Sidebar.tsx`
- Create: `packages/ui/src/Sidebar.test.tsx`

Navigation spec (D-017): 4 tabs — Dashboard, LifeQuest, NutriLog (Coming Soon), Account. Active tab is highlighted. Bottom tab bar hidden during multi-step flows (controlled by `hideNav` prop in parent layout). Desktop: left sidebar, collapsible on 768–1024px.

- [ ] **Step 1: Write failing tests**

```tsx
// packages/ui/src/BottomTabBar.test.tsx
import { render, screen } from '@testing-library/react'
import { BottomTabBar } from './BottomTabBar'

test('renders four tabs', () => {
  render(<BottomTabBar currentPath="/dashboard" />)
  expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /lifequest/i })).toBeInTheDocument()
  expect(screen.getByText(/coming soon/i)).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /account/i })).toBeInTheDocument()
})

test('marks dashboard as active on /dashboard', () => {
  render(<BottomTabBar currentPath="/dashboard" />)
  const link = screen.getByRole('link', { name: /dashboard/i })
  expect(link).toHaveAttribute('aria-current', 'page')
})

test('NutriLog tab is not a link (coming soon)', () => {
  render(<BottomTabBar currentPath="/dashboard" />)
  // NutriLog should not be an <a> tag — it's a disabled placeholder
  expect(screen.queryByRole('link', { name: /nutrilog/i })).not.toBeInTheDocument()
})
```

Run: `pnpm vitest run`; Expected: FAIL

- [ ] **Step 2: Implement BottomTabBar**

```tsx
// packages/ui/src/BottomTabBar.tsx
'use client'

import Link from 'next/link'

interface NavTab {
  label: string
  href: string | null   // null = coming soon (not navigable)
  icon: string          // emoji placeholder; replace with SVG icons in Phase 3
  matchPrefix: string
}

const TABS: NavTab[] = [
  { label: 'Dashboard', href: '/dashboard',   icon: '🏠', matchPrefix: '/dashboard' },
  { label: 'LifeQuest', href: '/skills',       icon: '⚔️', matchPrefix: '/skills' },
  { label: 'NutriLog',  href: null,            icon: '🥗', matchPrefix: '/nutri' },
  { label: 'Account',   href: '/account',      icon: '👤', matchPrefix: '/account' },
]

interface BottomTabBarProps {
  currentPath: string
}

export function BottomTabBar({ currentPath }: BottomTabBarProps) {
  return (
    <nav
      aria-label="Main navigation"
      className="fixed bottom-0 inset-x-0 z-50 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 safe-area-inset-bottom md:hidden"
    >
      <div className="flex items-stretch h-16">
        {TABS.map((tab) => {
          const isActive = currentPath.startsWith(tab.matchPrefix)
          const isComingSoon = tab.href === null

          if (isComingSoon) {
            return (
              <div
                key={tab.label}
                className="flex-1 flex flex-col items-center justify-center gap-0.5 opacity-40 select-none"
                aria-disabled="true"
              >
                <span className="text-xl">{tab.icon}</span>
                <span className="text-[10px] font-medium text-gray-500">{tab.label}</span>
                <span className="text-[9px] text-gray-400">Coming soon</span>
              </div>
            )
          }

          return (
            <Link
              key={tab.label}
              href={tab.href!}
              aria-label={tab.label}
              aria-current={isActive ? 'page' : undefined}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors min-h-[44px]
                ${isActive
                  ? 'text-[var(--color-accent,theme(colors.blue.600))]'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                }`}
            >
              <span className="text-xl">{tab.icon}</span>
              <span className="text-[10px] font-medium">{tab.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
```

- [ ] **Step 3: Implement Sidebar**

```tsx
// packages/ui/src/Sidebar.tsx
'use client'

import Link from 'next/link'

interface SidebarProps {
  currentPath: string
}

export function Sidebar({ currentPath }: SidebarProps) {
  return (
    <aside className="hidden md:flex flex-col w-64 min-h-screen bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 p-4">
      <div className="mb-8">
        <span className="text-xl font-bold text-[var(--color-accent,theme(colors.blue.600))]">LifeQuest</span>
      </div>
      <nav className="flex-1 space-y-1">
        {[
          { label: 'Dashboard', href: '/dashboard', prefix: '/dashboard' },
          { label: 'Skills',    href: '/skills',    prefix: '/skills' },
        ].map(({ label, href, prefix }) => (
          <Link
            key={href}
            href={href}
            aria-current={currentPath.startsWith(prefix) ? 'page' : undefined}
            className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors
              ${currentPath.startsWith(prefix)
                ? 'bg-[var(--color-accent-muted,theme(colors.blue.50))] text-[var(--color-accent,theme(colors.blue.600))]'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
          >
            {label}
          </Link>
        ))}
        <div className="px-3 py-2 text-sm text-gray-400 flex justify-between items-center">
          <span>NutriLog</span>
          <span className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">Soon</span>
        </div>
        <Link
          href="/account"
          aria-current={currentPath.startsWith('/account') ? 'page' : undefined}
          className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors
            ${currentPath.startsWith('/account')
              ? 'bg-[var(--color-accent-muted,theme(colors.blue.50))] text-[var(--color-accent,theme(colors.blue.600))]'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
        >
          Account
        </Link>
      </nav>
    </aside>
  )
}
```

- [ ] **Step 4: Add Sidebar test**

```tsx
// packages/ui/src/Sidebar.test.tsx
import { render, screen } from '@testing-library/react'
import { Sidebar } from './Sidebar'

test('renders navigation links', () => {
  render(<Sidebar currentPath="/dashboard" />)
  expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Skills' })).toBeInTheDocument()
})

test('marks current section as active', () => {
  render(<Sidebar currentPath="/skills/new" />)
  expect(screen.getByRole('link', { name: 'Skills' })).toHaveAttribute('aria-current', 'page')
})
```

- [ ] **Step 5: Run tests + commit**

```bash
cd packages/ui && pnpm vitest run
git add packages/ui/src/BottomTabBar.tsx packages/ui/src/BottomTabBar.test.tsx \
        packages/ui/src/Sidebar.tsx packages/ui/src/Sidebar.test.tsx
git commit -m "feat(ui): BottomTabBar and Sidebar navigation components (D-017)"
```

---

### Task 6: QuickLogSheet component

**Files:**
- Create: `packages/ui/src/QuickLogSheet.tsx`
- Create: `packages/ui/src/QuickLogSheet.test.tsx`

Bottom sheet (mobile) / modal (desktop) for quick XP logging (D-019). Shows 4 tier-scaled XP chips + Custom chip. Default selection: second chip (100 XP equivalent). Three-tap path: sheet open → chip tap → Log XP tap.

- [ ] **Step 1: Write failing tests**

```tsx
// packages/ui/src/QuickLogSheet.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { QuickLogSheet } from './QuickLogSheet'

const chips: [number, number, number, number] = [50, 100, 250, 500]

test('renders all four chip amounts', () => {
  render(<QuickLogSheet skillName="Running" chips={chips} isOpen onClose={vi.fn()} onSubmit={vi.fn()} isLoading={false} />)
  expect(screen.getByRole('button', { name: '50 XP' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '100 XP' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '250 XP' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '500 XP' })).toBeInTheDocument()
})

test('second chip is selected by default', () => {
  render(<QuickLogSheet skillName="Running" chips={chips} isOpen onClose={vi.fn()} onSubmit={vi.fn()} isLoading={false} />)
  expect(screen.getByRole('button', { name: '100 XP' })).toHaveAttribute('aria-pressed', 'true')
})

test('calls onSubmit with selected XP amount', () => {
  const onSubmit = vi.fn()
  render(<QuickLogSheet skillName="Running" chips={chips} isOpen onClose={vi.fn()} onSubmit={onSubmit} isLoading={false} />)
  fireEvent.click(screen.getByRole('button', { name: '250 XP' }))
  fireEvent.click(screen.getByRole('button', { name: /log xp/i }))
  expect(onSubmit).toHaveBeenCalledWith({ xpDelta: 250, logNote: '' })
})

test('Log XP button is disabled while loading', () => {
  render(<QuickLogSheet skillName="Running" chips={chips} isOpen onClose={vi.fn()} onSubmit={vi.fn()} isLoading />)
  expect(screen.getByRole('button', { name: /log xp/i })).toBeDisabled()
})
```

Run: `pnpm vitest run`; Expected: FAIL

- [ ] **Step 2: Implement**

```tsx
// packages/ui/src/QuickLogSheet.tsx
'use client'

import { useState } from 'react'

interface QuickLogSheetProps {
  skillName: string
  chips: [number, number, number, number]
  isOpen: boolean
  isLoading: boolean
  onClose: () => void
  onSubmit: (data: { xpDelta: number; logNote: string }) => void
}

export function QuickLogSheet({ skillName, chips, isOpen, isLoading, onClose, onSubmit }: QuickLogSheetProps) {
  const [selected, setSelected] = useState<number | 'custom'>(chips[1]) // second chip default
  const [customAmount, setCustomAmount] = useState('')
  const [logNote, setLogNote] = useState('')

  if (!isOpen) return null

  const effectiveAmount = selected === 'custom'
    ? parseInt(customAmount, 10) || 0
    : selected

  function handleSubmit() {
    if (effectiveAmount <= 0) return
    onSubmit({ xpDelta: effectiveAmount, logNote })
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40 md:flex md:items-center md:justify-center"
        onClick={onClose}
      />

      {/* Sheet / Modal */}
      <div
        role="dialog"
        aria-label={`${skillName} — Quick Log`}
        className="fixed bottom-0 inset-x-0 z-50 bg-white dark:bg-gray-900 rounded-t-2xl p-6 safe-area-inset-bottom
                   md:bottom-auto md:top-1/2 md:-translate-y-1/2 md:left-1/2 md:-translate-x-1/2 md:w-[480px] md:rounded-2xl md:max-h-[80vh]"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900 dark:text-white">{skillName} — Quick Log</h2>
          <button onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        {/* XP chips */}
        <div className="flex gap-2 flex-wrap mb-4">
          {chips.map((amount) => (
            <button
              key={amount}
              aria-label={`${amount} XP`}
              aria-pressed={selected === amount}
              onClick={() => setSelected(amount)}
              className={`flex-1 min-w-[60px] py-3 rounded-xl text-sm font-semibold transition-colors min-h-[44px]
                ${selected === amount
                  ? 'bg-[var(--color-accent,theme(colors.blue.600))] text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                }`}
            >
              {amount} XP
            </button>
          ))}
          <button
            aria-label="Custom amount"
            aria-pressed={selected === 'custom'}
            onClick={() => setSelected('custom')}
            className={`flex-1 min-w-[60px] py-3 rounded-xl text-sm font-semibold transition-colors min-h-[44px]
              ${selected === 'custom'
                ? 'bg-[var(--color-accent,theme(colors.blue.600))] text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
              }`}
          >
            Custom
          </button>
        </div>

        {selected === 'custom' && (
          <input
            type="number"
            inputMode="numeric"
            placeholder="Enter XP amount"
            value={customAmount}
            onChange={(e) => setCustomAmount(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm mb-4 dark:bg-gray-800 dark:border-gray-700"
          />
        )}

        {/* Note field (optional, always visible) */}
        <input
          type="text"
          placeholder="What did you do? (optional)"
          value={logNote}
          onChange={(e) => setLogNote(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm mb-4 dark:bg-gray-800 dark:border-gray-700"
        />

        <button
          onClick={handleSubmit}
          disabled={isLoading || effectiveAmount <= 0}
          className="w-full py-4 rounded-xl font-semibold text-white bg-[var(--color-accent,theme(colors.blue.600))]
                     hover:bg-[var(--color-accent-dark,theme(colors.blue.700))] disabled:opacity-50 disabled:cursor-not-allowed
                     transition-colors min-h-[48px]"
        >
          {isLoading ? 'Logging…' : 'Log XP'}
        </button>
      </div>
    </>
  )
}
```

- [ ] **Step 3: Run tests + commit**

```bash
cd packages/ui && pnpm vitest run
git add packages/ui/src/QuickLogSheet.tsx packages/ui/src/QuickLogSheet.test.tsx
git commit -m "feat(ui): QuickLogSheet with XP chips, custom amount, and 3-tap path (D-019)"
```

---

### Task 7: BlockerGateSection + TierTransitionModal + update packages/ui exports

**Files:**
- Create: `packages/ui/src/BlockerGateSection.tsx`
- Create: `packages/ui/src/BlockerGateSection.test.tsx`
- Create: `packages/ui/src/TierTransitionModal.tsx`
- Create: `packages/ui/src/TierTransitionModal.test.tsx`
- Modify: `packages/ui/src/index.ts`

- [ ] **Step 1: Write failing tests**

```tsx
// packages/ui/src/BlockerGateSection.test.tsx
import { render, screen } from '@testing-library/react'
import { BlockerGateSection } from './BlockerGateSection'

test('shows gate title and description', () => {
  render(
    <BlockerGateSection
      gateLevel={9}
      title="Novice Gate"
      description="Complete 10 sessions to unlock Apprentice."
      currentXP={8500}
      rawLevel={10}
    />
  )
  expect(screen.getByText('Novice Gate')).toBeInTheDocument()
  expect(screen.getByText(/complete 10 sessions/i)).toBeInTheDocument()
  expect(screen.getByText(/gate locked/i)).toBeInTheDocument()
})

test('shows XP accruing value', () => {
  render(
    <BlockerGateSection
      gateLevel={9} title="Gate" description="Desc"
      currentXP={9000} rawLevel={10}
    />
  )
  expect(screen.getByText(/9,000/)).toBeInTheDocument()
})
```

```tsx
// packages/ui/src/TierTransitionModal.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { TierTransitionModal } from './TierTransitionModal'

test('shows new tier name', () => {
  render(<TierTransitionModal newTierName="Apprentice" newTierNumber={2} isOpen onContinue={vi.fn()} />)
  expect(screen.getByText(/apprentice/i)).toBeInTheDocument()
})

test('calls onContinue when dismissed', () => {
  const onContinue = vi.fn()
  render(<TierTransitionModal newTierName="Apprentice" newTierNumber={2} isOpen onContinue={onContinue} />)
  fireEvent.click(screen.getByRole('button', { name: /continue/i }))
  expect(onContinue).toHaveBeenCalled()
})
```

Run: `pnpm vitest run`; Expected: FAIL

- [ ] **Step 2: Implement BlockerGateSection**

```tsx
// packages/ui/src/BlockerGateSection.tsx

interface BlockerGateSectionProps {
  gateLevel: number
  title: string
  description: string
  currentXP: number
  rawLevel: number
}

export function BlockerGateSection({ gateLevel, title, description, currentXP, rawLevel }: BlockerGateSectionProps) {
  return (
    <div className="rounded-xl border-2 border-amber-300 bg-amber-50 dark:bg-amber-950/20 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-amber-500 text-xl">🔒</span>
        <span className="font-bold text-amber-700 dark:text-amber-400 uppercase text-sm tracking-wider">Gate Locked</span>
      </div>
      <p className="text-sm text-amber-800 dark:text-amber-300 font-medium">Level {gateLevel} — Progression Paused</p>
      <div className="border-t border-amber-200 pt-3">
        <p className="font-semibold text-gray-900 dark:text-white mb-1">"{title}"</p>
        <p className="text-sm text-gray-600 dark:text-gray-300">{description}</p>
      </div>
      <div className="border-t border-amber-200 pt-3 space-y-1">
        <p className="text-sm text-gray-500">
          XP Accruing: <span className="font-semibold text-gray-900 dark:text-white">{currentXP.toLocaleString()}</span>
        </p>
        <p className="text-xs text-gray-400">
          Level shown: {gateLevel} (actual level: {rawLevel})
        </p>
      </div>
      <p className="text-xs text-amber-700 dark:text-amber-400 italic">
        Your XP keeps growing. You'll advance to Level {gateLevel + 1} when this challenge is complete.
        Gate completion is coming in a future update.
      </p>
    </div>
  )
}
```

- [ ] **Step 3: Implement TierTransitionModal (D-022)**

```tsx
// packages/ui/src/TierTransitionModal.tsx
import { TierBadge } from './TierBadge'

const TIER_DESCRIPTIONS: Record<number, string> = {
  2:  "You've mastered the basics and are building real consistency.",
  3:  "Solid competence — you're tackling harder challenges with confidence.",
  4:  "Consistent practice has made you genuinely skilled.",
  5:  "Focused dedication sets you apart from casual practitioners.",
  6:  "Deep experience and advanced technique define your practice.",
  7:  "Years of dedication have made you truly skilled. Keep going.",
  8:  "Elite-level mastery. Only a handful of practitioners reach this tier.",
  9:  "You are approaching the absolute peak of your practice.",
  10: "Near-peak mastery. Grandmaster-level achievement.",
  11: "Legend. This is exceptional. Fewer than a fraction of practitioners ever reach this level. The journey continues — there are 100 more levels ahead.",
}

interface TierTransitionModalProps {
  newTierName: string
  newTierNumber: number
  isOpen: boolean
  onContinue: () => void
}

export function TierTransitionModal({ newTierName, newTierNumber, isOpen, onContinue }: TierTransitionModalProps) {
  if (!isOpen) return null

  const description = TIER_DESCRIPTIONS[newTierNumber] ?? `You've reached ${newTierName}.`
  const isLegend = newTierNumber === 11

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative w-full md:max-w-md bg-white dark:bg-gray-900 rounded-t-3xl md:rounded-3xl p-8 text-center space-y-4">
        <div className="flex justify-center">
          <TierBadge tierName={newTierName} tierNumber={newTierNumber} className="text-base px-4 py-1.5" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          {isLegend ? `You've reached Legend.` : `You've reached ${newTierName}!`}
        </h2>
        <p className="text-gray-600 dark:text-gray-300">{description}</p>
        <p className="text-xs text-gray-400 mt-2">
          The next tier requires more XP per level. This reflects the reality that advanced mastery takes greater effort.
        </p>
        <button
          onClick={onContinue}
          className="w-full py-4 mt-4 rounded-xl font-semibold text-white bg-[var(--color-accent,theme(colors.blue.600))] min-h-[48px] hover:opacity-90 transition-opacity"
        >
          Continue
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Update packages/ui/src/index.ts**

```typescript
// packages/ui/src/index.ts — add all new exports
export { ThemeProvider } from './ThemeProvider'
export type { Theme } from './ThemeProvider'
export { XPProgressBar } from './XPProgressBar'
export { TierBadge } from './TierBadge'
export { SkillCard } from './SkillCard'
export { BottomTabBar } from './BottomTabBar'
export { Sidebar } from './Sidebar'
export { QuickLogSheet } from './QuickLogSheet'
export { BlockerGateSection } from './BlockerGateSection'
export { TierTransitionModal } from './TierTransitionModal'
```

- [ ] **Step 5: Run all packages/ui tests**

```bash
cd packages/ui && pnpm vitest run
```
Expected: all tests pass

- [ ] **Step 6: Commit**

```bash
git add packages/ui/src/
git commit -m "feat(ui): BlockerGateSection, TierTransitionModal, update exports (D-021, D-022)"
```

---

## Chunk 2: App Shell + Account Screens

### Task 8: Wire navigation into the authenticated layout

**Files:**
- Modify: `apps/rpg-tracker/app/(app)/layout.tsx`

The authenticated layout renders `BottomTabBar` (mobile) and `Sidebar` (desktop) around the page content. Navigation is hidden during skill creation (detected by `pathname.startsWith('/skills/new')`).

- [ ] **Step 1: Write test**

```tsx
// apps/rpg-tracker/app/__tests__/app-layout.test.tsx
// next/navigation is mocked automatically via apps/rpg-tracker/__mocks__/next/navigation.ts
// (usePathname returns vi.fn(() => '/')). Override per-test using vi.mocked.
import { render, screen } from '@testing-library/react'
import { usePathname } from 'next/navigation'
import AppLayout from '../(app)/layout'

test('renders navigation', () => {
  vi.mocked(usePathname).mockReturnValue('/dashboard')
  render(<AppLayout><div>content</div></AppLayout>)
  // BottomTabBar is md:hidden; Sidebar is hidden md:flex — check nav links are present
  expect(screen.getAllByRole('link', { name: /dashboard/i }).length).toBeGreaterThan(0)
})
```

- [ ] **Step 2: Update layout.tsx**

```tsx
// apps/rpg-tracker/app/(app)/layout.tsx
'use client'

import { usePathname } from 'next/navigation'
import { BottomTabBar, Sidebar } from '@rpgtracker/ui'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const hideNav = pathname.startsWith('/skills/new') // hide nav during multi-step flow

  return (
    <div className="flex min-h-screen">
      {!hideNav && <Sidebar currentPath={pathname} />}
      <main className={`flex-1 ${!hideNav ? 'pb-20 md:pb-0' : ''}`}>
        {children}
      </main>
      {!hideNav && <BottomTabBar currentPath={pathname} />}
    </div>
  )
}
```

- [ ] **Step 3: Run tests + commit**

```bash
pnpm turbo test
git add apps/rpg-tracker/app/(app)/layout.tsx apps/rpg-tracker/app/__tests__/app-layout.test.tsx
git commit -m "feat(rpg-tracker): wire BottomTabBar and Sidebar into authenticated layout (D-017)"
```

---

### Task 9: Account screens (overview + API key + password change)

**Files:**
- Create: `apps/rpg-tracker/app/(app)/account/page.tsx`
- Create: `apps/rpg-tracker/app/(app)/account/api-key/page.tsx`
- Create: `apps/rpg-tracker/app/(app)/account/password/page.tsx`

These are React implementations of the account screens from ux-spec Section 7. They call the existing `/api/account`, `/api/account/api-key` Go endpoints via the BFF proxy.

- [ ] **Step 1: Write failing test for account page**

```tsx
// apps/rpg-tracker/app/__tests__/account.test.tsx
import { render, screen } from '@testing-library/react'
import AccountPage from '../(app)/account/page'

// AccountPage must not have server-only imports (it uses 'use client')
test('renders account heading', () => {
  render(<AccountPage />)
  expect(screen.getByRole('heading', { name: /account/i })).toBeInTheDocument()
})
```

Run: `pnpm vitest run --run`; Expected: FAIL

- [ ] **Step 2: Implement account/page.tsx**

```tsx
// apps/rpg-tracker/app/(app)/account/page.tsx
'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { getAccount, getAPIKeyStatus, signOut } from '@rpgtracker/api-client'

export default function AccountPage() {
  const { data: account } = useQuery({ queryKey: ['account'], queryFn: getAccount })
  const { data: keyStatus } = useQuery({ queryKey: ['api-key-status'], queryFn: getAPIKeyStatus })

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Account</h1>

      <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-5 space-y-3">
        <div>
          <label className="text-xs text-gray-500 uppercase tracking-wider">Display name</label>
          <p className="font-medium text-gray-900 dark:text-white">{account?.display_name ?? '—'}</p>
        </div>
        <div>
          <label className="text-xs text-gray-500 uppercase tracking-wider">Email</label>
          <p className="font-medium text-gray-900 dark:text-white">{account?.email ?? '—'}</p>
        </div>
      </section>

      <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-5 space-y-3">
        <h2 className="font-semibold text-gray-900 dark:text-white">Claude API Key</h2>
        <p className="text-sm text-gray-500">
          {keyStatus?.has_key ? `Key saved (ending in ****${keyStatus.key_hint ?? ''})` : 'No key saved'}
        </p>
        <Link
          href="/account/api-key"
          className="inline-block text-sm font-medium text-[var(--color-accent,theme(colors.blue.600))] hover:underline"
        >
          {keyStatus?.has_key ? 'Update or remove key' : 'Add API key'}
        </Link>
      </section>

      <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-5 space-y-3">
        <h2 className="font-semibold text-gray-900 dark:text-white">Security</h2>
        <Link href="/account/password" className="text-sm text-[var(--color-accent,theme(colors.blue.600))] hover:underline block">
          Change Password
        </Link>
        <button
          onClick={() => signOut().then(() => { window.location.href = '/login' })}
          className="text-sm text-red-500 hover:text-red-600 font-medium"
        >
          Sign Out
        </button>
      </section>
    </div>
  )
}
```

Note: `getAccount`, `getAPIKeyStatus`, `signOut` must exist in `packages/api-client/src/client.ts`. These were scaffolded in Plan A. Verify signatures match and add `key_hint` to `APIKeyStatus` type if missing.

- [ ] **Step 3: Implement account/api-key/page.tsx**

```tsx
// apps/rpg-tracker/app/(app)/account/api-key/page.tsx
'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { saveAPIKey, deleteAPIKey } from '@rpgtracker/api-client'

export default function APIKeyPage() {
  const [key, setKey] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const qc = useQueryClient()
  const router = useRouter()

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await saveAPIKey(key)
      await qc.invalidateQueries({ queryKey: ['api-key-status'] })
      router.push('/account')
    } catch {
      setError("This doesn't look like a valid Claude API key. Check your key and try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto p-4 md:p-8 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Add Claude API Key</h1>
      <form onSubmit={handleSave} className="space-y-4">
        <input
          type="password"
          placeholder="sk-ant-..."
          value={key}
          onChange={(e) => setKey(e.target.value)}
          required
          className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 dark:bg-gray-800"
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
        <p className="text-xs text-gray-400">Your key is encrypted and stored securely. It is never visible in the browser.</p>
        <button
          type="submit"
          disabled={saving || !key}
          className="w-full py-4 rounded-xl font-semibold text-white bg-[var(--color-accent,theme(colors.blue.600))] disabled:opacity-50 min-h-[48px]"
        >
          {saving ? 'Saving…' : 'Verify and Save'}
        </button>
        <button type="button" onClick={() => router.back()} className="w-full text-sm text-gray-500 hover:text-gray-700 py-2">
          Cancel
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 4: Implement account/password/page.tsx**

```tsx
// apps/rpg-tracker/app/(app)/account/password/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function PasswordPage() {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/account/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ current_password: current, new_password: next }).toString(),
      })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error ?? 'Failed to change password')
      }
      router.push('/account')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto p-4 md:p-8 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Change Password</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input type="password" placeholder="Current password" value={current}
          onChange={(e) => setCurrent(e.target.value)} required
          className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 dark:bg-gray-800" />
        <input type="password" placeholder="New password" value={next}
          onChange={(e) => setNext(e.target.value)} required minLength={8}
          className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 dark:bg-gray-800" />
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button type="submit" disabled={saving}
          className="w-full py-4 rounded-xl font-semibold text-white bg-[var(--color-accent,theme(colors.blue.600))] disabled:opacity-50 min-h-[48px]">
          {saving ? 'Saving…' : 'Change Password'}
        </button>
        <button type="button" onClick={() => router.back()} className="w-full text-sm text-gray-500 py-2">Cancel</button>
      </form>
    </div>
  )
}
```

- [ ] **Step 5: NutriLog placeholder page (D-004)**

```tsx
// apps/rpg-tracker/app/(app)/nutri/page.tsx
export default function NutriPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center space-y-4">
      <span className="text-5xl">🥗</span>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">NutriLog</h1>
      <p className="text-gray-500 max-w-sm">
        Nutrition tracking is coming in a future update. LifeQuest is fully available now.
      </p>
    </div>
  )
}
```

- [ ] **Step 6: Run tests + commit**

```bash
pnpm turbo test
git add apps/rpg-tracker/app/(app)/account/ apps/rpg-tracker/app/(app)/nutri/
git commit -m "feat(rpg-tracker): account screens (overview, API key, password) + NutriLog placeholder"
```

---

## Chunk 3: Skill Screens

### Task 10: Skills list screen + dashboard with real skills

**Files:**
- Create: `apps/rpg-tracker/app/(app)/skills/page.tsx`
- Modify: `apps/rpg-tracker/app/(app)/dashboard/page.tsx`
- Create: `apps/rpg-tracker/app/__tests__/skills-list.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
// apps/rpg-tracker/app/__tests__/skills-list.test.tsx
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import SkillsPage from '../(app)/skills/page'

// vi.mock is hoisted by Vitest's AST transform — do NOT use jest.mock here
vi.mock('@rpgtracker/api-client', () => ({
  listSkills: vi.fn().mockResolvedValue([]),
}))

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      {children}
    </QueryClientProvider>
  )
}

test('shows empty state when no skills', async () => {
  render(<SkillsPage />, { wrapper })
  // After loading, should show empty state CTA
  await screen.findByRole('link', { name: /create your first skill/i })
})
```

Run: `pnpm vitest run`; Expected: FAIL

- [ ] **Step 2: Implement skills/page.tsx**

```tsx
// apps/rpg-tracker/app/(app)/skills/page.tsx
'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { listSkills, logXP } from '@rpgtracker/api-client'
import { SkillCard, QuickLogSheet, TierTransitionModal } from '@rpgtracker/ui'
import type { SkillDetail } from '@rpgtracker/api-client'

export default function SkillsPage() {
  const router = useRouter()
  const qc = useQueryClient()
  const { data: skills = [], isLoading } = useQuery({ queryKey: ['skills'], queryFn: listSkills })

  const [logSheetSkill, setLogSheetSkill] = useState<SkillDetail | null>(null)
  const [tierTransition, setTierTransition] = useState<{ tierName: string; tierNumber: number } | null>(null)

  const logMutation = useMutation({
    mutationFn: ({ skillId, xpDelta, logNote }: { skillId: string; xpDelta: number; logNote: string }) =>
      logXP(skillId, xpDelta, logNote),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['skills'] })
      setLogSheetSkill(null)
      if (result.tier_crossed) {
        setTierTransition({ tierName: result.tier_name, tierNumber: result.tier_number })
      }
    },
  })

  if (isLoading) return <div className="p-8 text-gray-400">Loading…</div>

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Skills</h1>
        <Link
          href="/skills/new"
          className="px-4 py-2 rounded-xl font-semibold text-white bg-[var(--color-accent,theme(colors.blue.600))] text-sm"
        >
          + Add Skill
        </Link>
      </div>

      {skills.length === 0 ? (
        <div className="text-center py-16 space-y-4">
          <p className="text-gray-500">No skills yet. Start tracking your progress.</p>
          <Link
            href="/skills/new"
            className="inline-block px-6 py-3 rounded-xl font-semibold text-white bg-[var(--color-accent,theme(colors.blue.600))]"
          >
            Create your first skill
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {skills.map((skill) => (
            <SkillCard
              key={skill.id}
              skill={skill}
              onLogXP={(id) => setLogSheetSkill(skills.find(s => s.id === id) ?? null)}
              onClick={(id) => router.push(`/skills/${id}`)}
            />
          ))}
        </div>
      )}

      {/* Floating Add button on mobile */}
      <Link
        href="/skills/new"
        aria-label="Add new skill"
        className="fixed bottom-20 right-4 w-14 h-14 rounded-full bg-[var(--color-accent,theme(colors.blue.600))] text-white text-2xl flex items-center justify-center shadow-lg md:hidden"
      >
        +
      </Link>

      {logSheetSkill && (
        <QuickLogSheet
          skillName={logSheetSkill.name}
          chips={logSheetSkill.quick_log_chips}
          isOpen
          isLoading={logMutation.isPending}
          onClose={() => setLogSheetSkill(null)}
          onSubmit={({ xpDelta, logNote }) =>
            logMutation.mutate({ skillId: logSheetSkill.id, xpDelta, logNote })
          }
        />
      )}

      {tierTransition && (
        <TierTransitionModal
          newTierName={tierTransition.tierName}
          newTierNumber={tierTransition.tierNumber}
          isOpen
          onContinue={() => setTierTransition(null)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 3: Update dashboard/page.tsx with real skill cards**

```tsx
// apps/rpg-tracker/app/(app)/dashboard/page.tsx
'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { listSkills, logXP } from '@rpgtracker/api-client'
import { SkillCard, QuickLogSheet, TierTransitionModal } from '@rpgtracker/ui'
import type { SkillDetail } from '@rpgtracker/api-client'

export default function DashboardPage() {
  const router = useRouter()
  const qc = useQueryClient()
  const { data: skills = [] } = useQuery({ queryKey: ['skills'], queryFn: listSkills })
  const [logSheetSkill, setLogSheetSkill] = useState<SkillDetail | null>(null)
  const [tierTransition, setTierTransition] = useState<{ tierName: string; tierNumber: number } | null>(null)

  const logMutation = useMutation({
    mutationFn: ({ skillId, xpDelta, logNote }: { skillId: string; xpDelta: number; logNote: string }) =>
      logXP(skillId, xpDelta, logNote),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['skills'] })
      setLogSheetSkill(null)
      if (result.tier_crossed) {
        setTierTransition({ tierName: result.tier_name, tierNumber: result.tier_number })
      }
    },
  })

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Dashboard</h1>
      {skills.length === 0 ? (
        <div className="text-center py-12 space-y-3">
          <p className="text-gray-500">No skills yet.</p>
          <Link href="/skills/new" className="inline-block px-5 py-2.5 rounded-xl font-semibold text-white bg-[var(--color-accent,theme(colors.blue.600))] text-sm">
            Create your first skill
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {skills.map((skill) => (
            <SkillCard key={skill.id} skill={skill}
              onLogXP={(id) => setLogSheetSkill(skills.find(s => s.id === id) ?? null)}
              onClick={(id) => router.push(`/skills/${id}`)}
            />
          ))}
        </div>
      )}

      {logSheetSkill && (
        <QuickLogSheet skillName={logSheetSkill.name} chips={logSheetSkill.quick_log_chips}
          isOpen isLoading={logMutation.isPending}
          onClose={() => setLogSheetSkill(null)}
          onSubmit={({ xpDelta, logNote }) => logMutation.mutate({ skillId: logSheetSkill.id, xpDelta, logNote })}
        />
      )}
      {tierTransition && (
        <TierTransitionModal newTierName={tierTransition.tierName} newTierNumber={tierTransition.tierNumber}
          isOpen onContinue={() => setTierTransition(null)} />
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run tests + commit**

```bash
pnpm turbo test
git add apps/rpg-tracker/app/(app)/skills/page.tsx \
        apps/rpg-tracker/app/(app)/dashboard/page.tsx \
        apps/rpg-tracker/app/__tests__/skills-list.test.tsx
git commit -m "feat(rpg-tracker): skills list screen + real dashboard with XP logging"
```

---

### Task 11: Skill detail screen (F-008, F-009)

**Files:**
- Create: `apps/rpg-tracker/app/(app)/skills/[id]/page.tsx`
- Create: `apps/rpg-tracker/app/__tests__/skill-detail.test.tsx`

Shows: tier name + level, XP bar OR blocker gate section (D-021), Log XP button, recent logs, skill description. Full spec: ux-spec Section 5.

- [ ] **Step 1: Write failing test**

```tsx
// apps/rpg-tracker/app/__tests__/skill-detail.test.tsx
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import SkillDetailPage from '../(app)/skills/[id]/page'

const mockSkillDetail = {
  id: 'skill-1', name: 'Running', description: 'Running practice', unit: 'km',
  user_id: 'u1', preset_id: null, starting_level: 1, current_xp: 500, current_level: 3,
  effective_level: 3, quick_log_chips: [50, 100, 250, 500] as [number, number, number, number],
  tier_name: 'Novice', tier_number: 1, gates: [], recent_logs: [],
  xp_to_next_level: 800, xp_for_current_level: 100, created_at: '', updated_at: '',
}

vi.mock('@rpgtracker/api-client', () => ({
  getSkill: vi.fn().mockResolvedValue(mockSkillDetail),
  logXP: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'skill-1' }),
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
}))

function wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{children}</QueryClientProvider>
}

test('renders skill name and tier', async () => {
  render(<SkillDetailPage />, { wrapper })
  await screen.findByText('Running')
  expect(screen.getByText(/novice/i)).toBeInTheDocument()
  expect(screen.getByText(/level 3/i)).toBeInTheDocument()
})

test('shows Log XP button', async () => {
  render(<SkillDetailPage />, { wrapper })
  await screen.findByRole('button', { name: /log xp/i })
})
```

Run: `pnpm vitest run`; Expected: FAIL

- [ ] **Step 2: Implement skills/[id]/page.tsx**

```tsx
// apps/rpg-tracker/app/(app)/skills/[id]/page.tsx
'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { getSkill, logXP, deleteSkill } from '@rpgtracker/api-client'
import type { BlockerGate } from '@rpgtracker/api-client'
import { XPProgressBar, TierBadge, BlockerGateSection, QuickLogSheet, TierTransitionModal } from '@rpgtracker/ui'

export default function SkillDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const qc = useQueryClient()

  const { data: skill, isLoading } = useQuery({
    queryKey: ['skill', id],
    queryFn: () => getSkill(id),
  })

  const [logSheetOpen, setLogSheetOpen] = useState(false)
  const [tierTransition, setTierTransition] = useState<{ tierName: string; tierNumber: number } | null>(null)
  const [gateFirstHit, setGateFirstHit] = useState<BlockerGate | null>(null)

  const logMutation = useMutation({
    mutationFn: ({ xpDelta, logNote }: { xpDelta: number; logNote: string }) =>
      logXP(id, xpDelta, logNote),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['skill', id] })
      qc.invalidateQueries({ queryKey: ['skills'] })
      setLogSheetOpen(false)
      if (result.gate_first_hit) setGateFirstHit(result.gate_first_hit)
      else if (result.tier_crossed) setTierTransition({ tierName: result.tier_name, tierNumber: result.tier_number })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteSkill(id),
    onSuccess: () => router.push('/skills'),
  })

  if (isLoading || !skill) return <div className="p-8 text-gray-400">Loading…</div>

  const activeGate = skill.gates.find(g => !g.is_cleared && skill.current_level >= g.gate_level)
  const isMaxLevel = skill.xp_to_next_level === 0

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link href="/skills" className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
          ← Skills
        </Link>
        <Link href={`/skills/${id}/edit`} className="text-sm text-gray-500 hover:text-gray-700">
          Edit
        </Link>
      </div>

      {/* Skill name + tier */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{skill.name}</h1>
        <div className="flex items-center gap-3 mt-1">
          <TierBadge tierName={skill.tier_name} tierNumber={skill.tier_number} />
          <span className="text-lg text-gray-600 dark:text-gray-300">Level {skill.effective_level}</span>
        </div>
      </div>

      {/* XP bar OR blocker gate section (D-021: gate replaces bar) */}
      {activeGate ? (
        <BlockerGateSection
          gateLevel={activeGate.gate_level}
          title={activeGate.title}
          description={activeGate.description}
          currentXP={skill.current_xp}
          rawLevel={skill.current_level}
        />
      ) : (
        <div className="space-y-2">
          <XPProgressBar
            tierNumber={skill.tier_number}
            xpForCurrentLevel={skill.xp_for_current_level}
            xpToNextLevel={skill.xp_to_next_level}
            isMaxLevel={isMaxLevel}
            className="h-3"
          />
          {isMaxLevel ? (
            <p className="text-sm text-gray-500 text-center">Maximum Level Reached</p>
          ) : (
            <p className="text-sm text-gray-500">
              {skill.xp_for_current_level.toLocaleString()} / {(skill.xp_for_current_level + skill.xp_to_next_level).toLocaleString()} XP to level {skill.effective_level + 1}
            </p>
          )}
        </div>
      )}

      {/* Log XP button */}
      <button
        onClick={() => setLogSheetOpen(true)}
        className="w-full py-4 rounded-xl font-semibold text-white bg-[var(--color-accent,theme(colors.blue.600))] min-h-[48px] hover:opacity-90 transition-opacity"
      >
        Log XP
      </button>

      {/* Description */}
      {skill.description && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">{skill.description}</p>
        </div>
      )}

      {/* Recent logs */}
      {skill.recent_logs.length > 0 && (
        <div>
          <h2 className="font-semibold text-gray-900 dark:text-white mb-3">Recent Logs</h2>
          <div className="space-y-2">
            {skill.recent_logs.map((log) => (
              <div key={log.id} className="flex justify-between text-sm text-gray-600 dark:text-gray-400 py-2 border-b border-gray-100 dark:border-gray-800">
                <span>{log.log_note || 'Session'}</span>
                <span className="font-medium text-gray-900 dark:text-white">+{log.xp_delta} XP</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Delete */}
      <button
        onClick={() => { if (confirm('Delete this skill? This cannot be undone.')) deleteMutation.mutate() }}
        className="text-sm text-red-500 hover:text-red-600 w-full text-center py-2"
      >
        Delete skill
      </button>

      {logSheetOpen && (
        <QuickLogSheet
          skillName={skill.name}
          chips={skill.quick_log_chips}
          isOpen
          isLoading={logMutation.isPending}
          onClose={() => setLogSheetOpen(false)}
          onSubmit={({ xpDelta, logNote }) => logMutation.mutate({ xpDelta, logNote })}
        />
      )}

      {tierTransition && (
        <TierTransitionModal
          newTierName={tierTransition.tierName}
          newTierNumber={tierTransition.tierNumber}
          isOpen
          onContinue={() => setTierTransition(null)}
        />
      )}

      {/* First-hit gate modal */}
      {gateFirstHit && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative w-full md:max-w-md bg-white dark:bg-gray-900 rounded-t-3xl md:rounded-3xl p-8 space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🔒</span>
              <h2 className="font-bold text-lg text-gray-900 dark:text-white">You've hit a gate!</h2>
            </div>
            <p className="font-semibold text-gray-800 dark:text-white">Level {gateFirstHit.gate_level} Gate: "{gateFirstHit.title}"</p>
            <p className="text-sm text-gray-600 dark:text-gray-300">{gateFirstHit.description}</p>
            <p className="text-sm text-gray-500">Your XP keeps growing, but your level display is paused here until you complete this challenge.</p>
            <button
              onClick={() => setGateFirstHit(null)}
              className="w-full py-4 rounded-xl font-semibold text-white bg-amber-500 min-h-[48px]"
            >
              Got it — see gate details
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Create skills/[id]/edit/page.tsx**

```tsx
// apps/rpg-tracker/app/(app)/skills/[id]/edit/page.tsx
'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getSkill } from '@rpgtracker/api-client'

export default function SkillEditPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const qc = useQueryClient()
  const { data: skill } = useQuery({ queryKey: ['skill', id], queryFn: () => getSkill(id) })

  const [name, setName] = useState(skill?.name ?? '')
  const [description, setDescription] = useState(skill?.description ?? '')

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/skills/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ name, description }).toString(),
      })
      if (!res.ok) throw new Error('Failed to update')
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['skill', id] })
      qc.invalidateQueries({ queryKey: ['skills'] })
      router.push(`/skills/${id}`)
    },
  })

  if (!skill) return <div className="p-8 text-gray-400">Loading…</div>

  return (
    <div className="max-w-lg mx-auto p-4 md:p-8 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Edit Skill</h1>
      <form onSubmit={(e) => { e.preventDefault(); mutation.mutate() }} className="space-y-4">
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} required maxLength={60}
          placeholder="Skill name" className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 dark:bg-gray-800" />
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={400}
          rows={4} placeholder="Description (optional)"
          className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 dark:bg-gray-800" />
        <button type="submit" disabled={mutation.isPending}
          className="w-full py-4 rounded-xl font-semibold text-white bg-[var(--color-accent,theme(colors.blue.600))] min-h-[48px] disabled:opacity-50">
          {mutation.isPending ? 'Saving…' : 'Save Changes'}
        </button>
        <button type="button" onClick={() => router.back()} className="w-full text-sm text-gray-500 py-2">Cancel</button>
      </form>
    </div>
  )
}
```

- [ ] **Step 4: Run tests + commit**

```bash
pnpm turbo test
git add apps/rpg-tracker/app/(app)/skills/
git commit -m "feat(rpg-tracker): skill detail screen with XP bar, blocker gate, and quick log (F-008, F-009)"
```

---

### Task 12: 3-step skill creation flow (F-004, F-005)

**Files:**
- Create: `apps/rpg-tracker/app/(app)/skills/new/page.tsx`
- Create: `apps/rpg-tracker/app/__tests__/skill-create.test.tsx`

Three steps: Basics → Starting Level → Confirm. AI calibration optional at Step 1b (D-011). Level picker shows 1–99, capped at 99 (D-018). Step indicator at top. Bottom tab bar hidden during this flow (controlled by layout — `/skills/new` prefix already handled in Task 8).

- [ ] **Step 1: Write failing test**

```tsx
// apps/rpg-tracker/app/__tests__/skill-create.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import SkillCreatePage from '../(app)/skills/new/page'

vi.mock('@rpgtracker/api-client', () => ({
  createSkill: vi.fn().mockResolvedValue({ id: 'new-skill-1' }),
  calibrateSkill: vi.fn(),
  getAPIKeyStatus: vi.fn().mockResolvedValue({ has_key: false }),
}))

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))

function wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{children}</QueryClientProvider>
}

test('renders step 1 by default', () => {
  render(<SkillCreatePage />, { wrapper })
  expect(screen.getByText(/step 1/i)).toBeInTheDocument()
  expect(screen.getByPlaceholderText(/skill name/i)).toBeInTheDocument()
})

test('advances to step 2 on next', async () => {
  render(<SkillCreatePage />, { wrapper })
  fireEvent.change(screen.getByPlaceholderText(/skill name/i), { target: { value: 'Running' } })
  fireEvent.click(screen.getByRole('button', { name: /next/i }))
  await waitFor(() => expect(screen.getByText(/step 2/i)).toBeInTheDocument())
  expect(screen.getByText(/where are you starting/i)).toBeInTheDocument()
})

test('step 1 next button is disabled when name is empty', () => {
  render(<SkillCreatePage />, { wrapper })
  expect(screen.getByRole('button', { name: /next/i })).toBeDisabled()
})
```

Run: `pnpm vitest run`; Expected: FAIL

- [ ] **Step 2: Implement skills/new/page.tsx**

```tsx
// apps/rpg-tracker/app/(app)/skills/new/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation } from '@tanstack/react-query'
import { createSkill, calibrateSkill, getAPIKeyStatus } from '@rpgtracker/api-client'

type Step = 1 | 2 | 3

interface SkillDraft {
  name: string
  description: string
  startingLevel: number
  gateDescriptions: string[]
  aiRationale: string | null
}

export default function SkillCreatePage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [draft, setDraft] = useState<SkillDraft>({
    name: '', description: '', startingLevel: 1, gateDescriptions: [], aiRationale: null,
  })
  const [aiError, setAiError] = useState<string | null>(null)

  const { data: keyStatus } = useQuery({ queryKey: ['api-key-status'], queryFn: getAPIKeyStatus })
  const hasKey = keyStatus?.has_key ?? false

  const calibrateMutation = useMutation({
    mutationFn: () => calibrateSkill({ name: draft.name, description: draft.description }),
    onSuccess: (result) => {
      setDraft(d => ({
        ...d,
        startingLevel: result.suggested_level,
        gateDescriptions: result.gate_descriptions,
        aiRationale: result.rationale,
      }))
      setStep(2)
    },
    onError: (err: Error) => {
      const msg = err.message.includes('rate limit')
        ? 'Claude API rate limit reached. Setting level manually.'
        : err.message.includes('invalid')
        ? 'Your Claude API key appears to be invalid. Check your key in Account settings. Setting level manually.'
        : 'AI calibration is unavailable right now. Setting level manually.'
      setAiError(msg)
      setStep(2)
    },
  })

  const createMutation = useMutation({
    mutationFn: () => createSkill({
      name: draft.name,
      description: draft.description,
      starting_level: draft.startingLevel,
      gate_descriptions: draft.gateDescriptions.length > 0 ? draft.gateDescriptions : undefined,
    }),
    onSuccess: (skill) => router.push(`/skills/${skill.id}`),
  })

  // Gate levels for display in Step 3
  const gateLevels = [9, 19, 29, 39, 49, 59, 69, 79, 89, 99]

  return (
    <div className="max-w-lg mx-auto p-4 md:p-8 min-h-screen">
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {([1, 2, 3] as Step[]).map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
              ${step >= s ? 'bg-[var(--color-accent,theme(colors.blue.600))] text-white' : 'bg-gray-200 text-gray-500'}`}>
              {s}
            </div>
            {s < 3 && <div className={`flex-1 h-px w-12 ${step > s ? 'bg-[var(--color-accent,theme(colors.blue.600))]' : 'bg-gray-200'}`} />}
          </div>
        ))}
        <span className="ml-2 text-sm text-gray-500">Step {step} of 3</span>
      </div>

      {/* Step 1: Basics */}
      {step === 1 && (
        <div className="space-y-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">New Skill</h1>
          <input
            type="text"
            placeholder="Skill name (required)"
            value={draft.name}
            maxLength={60}
            onChange={(e) => setDraft(d => ({ ...d, name: e.target.value }))}
            className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 dark:bg-gray-800"
          />
          <textarea
            placeholder="Description (optional — helps AI calibrate your starting level)"
            value={draft.description}
            maxLength={400}
            rows={3}
            onChange={(e) => setDraft(d => ({ ...d, description: e.target.value }))}
            className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 dark:bg-gray-800"
          />

          {hasKey && (
            <div className="rounded-xl bg-blue-50 dark:bg-blue-950/20 p-4 space-y-3">
              <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                Want AI to help set your starting level?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => calibrateMutation.mutate()}
                  disabled={!draft.name || calibrateMutation.isPending}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 disabled:opacity-50"
                >
                  {calibrateMutation.isPending ? 'Calibrating…' : 'Yes, use AI'}
                </button>
                <button
                  onClick={() => setStep(2)}
                  disabled={!draft.name}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-gray-300 text-gray-700 dark:text-gray-300 dark:border-gray-600 disabled:opacity-50"
                >
                  No, set manually
                </button>
              </div>
            </div>
          )}

          {!hasKey && (
            <button
              onClick={() => setStep(2)}
              disabled={!draft.name}
              className="w-full py-4 rounded-xl font-semibold text-white bg-[var(--color-accent,theme(colors.blue.600))] disabled:opacity-50 min-h-[48px]"
            >
              Next
            </button>
          )}
        </div>
      )}

      {/* Step 2: Starting Level */}
      {step === 2 && (
        <div className="space-y-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Starting Level</h1>
          <p className="text-gray-500">Where are you starting? Be honest — this is for you, not a leaderboard.</p>

          {aiError && (
            <div className="rounded-xl bg-amber-50 dark:bg-amber-950/20 p-4 text-sm text-amber-700 dark:text-amber-300">
              {aiError}
            </div>
          )}

          {draft.aiRationale && (
            <div className="rounded-xl bg-blue-50 dark:bg-blue-950/20 p-4 text-sm text-blue-800 dark:text-blue-200">
              <p className="font-medium mb-1">AI suggestion: Level {draft.startingLevel}</p>
              <p>{draft.aiRationale}</p>
            </div>
          )}

          {/* Level picker: scrollable list 1–99 (D-018: max 99) */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-y-auto max-h-64">
            {Array.from({ length: 99 }, (_, i) => i + 1).map((level) => {
              const tierBoundaries: Record<number, string> = {
                10: 'Apprentice tier starts here', 20: 'Adept tier starts here',
                30: 'Journeyman tier starts here', 40: 'Practitioner tier starts here',
                50: 'Expert tier starts here', 60: 'Veteran tier starts here',
                70: 'Elite tier starts here', 80: 'Master tier starts here',
                90: 'Grandmaster tier starts here',
              }
              const boundary = tierBoundaries[level]
              return (
                <div key={level}>
                  {boundary && (
                    <div className="text-[10px] text-gray-400 text-center py-1 bg-gray-50 dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700">
                      — {boundary} —
                    </div>
                  )}
                  <button
                    onClick={() => setDraft(d => ({ ...d, startingLevel: level }))}
                    className={`w-full text-left px-4 py-3 text-sm flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors min-h-[44px]
                      ${draft.startingLevel === level ? 'bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300 font-semibold' : ''}`}
                  >
                    <span>Level {level}</span>
                    {draft.startingLevel === level && <span>✓</span>}
                  </button>
                </div>
              )
            })}
          </div>

          <div className="flex gap-2">
            <button onClick={() => setStep(1)} className="flex-1 py-3 rounded-xl border border-gray-300 text-sm text-gray-700 dark:text-gray-300 dark:border-gray-600">
              Back
            </button>
            <button
              onClick={() => setStep(3)}
              className="flex-1 py-3 rounded-xl font-semibold text-white bg-[var(--color-accent,theme(colors.blue.600))]"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Confirm */}
      {step === 3 && (
        <div className="space-y-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Confirm</h1>
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-2">
            <div><span className="text-xs text-gray-500 uppercase">Skill</span><p className="font-semibold">{draft.name}</p></div>
            {draft.description && <div><span className="text-xs text-gray-500 uppercase">Description</span><p className="text-sm">{draft.description}</p></div>}
            <div><span className="text-xs text-gray-500 uppercase">Starting Level</span><p className="font-semibold">Level {draft.startingLevel}</p></div>
          </div>

          <details className="rounded-xl border border-gray-200 dark:border-gray-700">
            <summary className="px-4 py-3 text-sm font-medium cursor-pointer">What are Blocker Gates?</summary>
            <div className="px-4 pb-4 space-y-2 text-sm text-gray-500">
              <p>Gates pause your level display at tier boundaries (levels 9, 19, 29…). Your XP keeps accruing. Complete the gate challenge to unlock the next tier.</p>
              {gateLevels.slice(0, 3).map((gl, i) => (
                <div key={gl} className="border-t border-gray-100 dark:border-gray-800 pt-2">
                  <span className="font-medium">Gate at Level {gl}:</span>{' '}
                  {draft.gateDescriptions[i] || `Default gate — ${gl === 9 ? 'Novice' : gl === 19 ? 'Apprentice' : 'Adept'} completion challenge`}
                </div>
              ))}
              <p className="text-xs text-gray-400">…and 7 more gates at levels 39–99</p>
            </div>
          </details>

          <div className="flex gap-2">
            <button onClick={() => setStep(2)} className="flex-1 py-3 rounded-xl border border-gray-300 text-sm text-gray-700 dark:text-gray-300 dark:border-gray-600">
              Back
            </button>
            <button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending}
              className="flex-1 py-3 rounded-xl font-semibold text-white bg-[var(--color-accent,theme(colors.blue.600))] disabled:opacity-50"
            >
              {createMutation.isPending ? 'Creating…' : 'Create Skill'}
            </button>
          </div>
          {createMutation.isError && (
            <p className="text-sm text-red-500 text-center">Failed to create skill. Please try again.</p>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Run tests + commit**

```bash
pnpm turbo test
git add apps/rpg-tracker/app/(app)/skills/new/
git commit -m "feat(rpg-tracker): 3-step skill creation with AI calibration path (F-004, F-005)"
```

---

## Completion Criteria

- `pnpm turbo test` passes — all unit tests green
- `cd apps/rpg-tracker && pnpm build` succeeds with no TypeScript errors
- On a 375px viewport: bottom tab bar is visible on `/skills`, hidden on `/skills/new`
- Skill creation: entering a name and stepping through all 3 steps creates a skill and redirects to skill detail
- Quick-log sheet: tapping `+ Log` on a skill card opens the sheet; tapping a chip and `Log XP` calls `logXP` and closes the sheet
- Tier transition modal appears when a tier is crossed after logging XP
- Skill detail: when `effective_level < current_level`, the `BlockerGateSection` replaces the XP bar
