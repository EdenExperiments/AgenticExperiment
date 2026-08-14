'use client'

import { usePathname } from 'next/navigation'
import { BottomTabBar, Sidebar, type NavItem } from '@rpgtracker/ui'

const WORKOUT_NAV: NavItem[] = [
  { label: 'History', href: '/workout', icon: '🏋️', matchPrefix: '/workout' },
  { label: 'Account', href: '/account', icon: '👤', matchPrefix: '/account' },
]

export default function WorkoutLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div
      data-theme="workout-strength"
      className="min-h-screen"
      style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
    >
      <div className="nav-panel hidden md:block fixed top-0 left-0 h-screen w-64 z-30">
        <Sidebar title="Workout" items={WORKOUT_NAV} currentPath={pathname} />
      </div>
      <main className="md:ml-64 pb-20 md:pb-0">
        <div className="max-w-3xl w-full mx-auto px-4 py-6">
          {children}
        </div>
      </main>
      <BottomTabBar currentPath={pathname} items={WORKOUT_NAV} />
    </div>
  )
}
