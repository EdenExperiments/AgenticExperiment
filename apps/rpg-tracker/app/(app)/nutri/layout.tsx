'use client'

import { usePathname } from 'next/navigation'
import { BottomTabBar, Sidebar, type NavItem } from '@rpgtracker/ui'

const NUTRI_NAV: NavItem[] = [
  { label: 'Weight', href: '/nutri', icon: '⚖️', matchPrefix: '/nutri' },
  { label: 'Diary', href: '/nutri/diary', icon: '📓', matchPrefix: '/nutri/diary' },
  { label: 'Goals', href: '/nutri/goals', icon: '🎯', matchPrefix: '/nutri/goals' },
  { label: 'Account', href: '/account', icon: '👤', matchPrefix: '/account' },
]

export default function NutriLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div
      data-theme="nutri-saas"
      className="min-h-screen"
      style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
    >
      <div className="nav-panel hidden md:block fixed top-0 left-0 h-screen w-64 z-30">
        <Sidebar title="NutriLog" items={NUTRI_NAV} currentPath={pathname} />
      </div>
      <main className="md:ml-64 pb-20 md:pb-0">
        <div className="max-w-3xl w-full mx-auto px-4 py-6">
          {children}
        </div>
      </main>
      <BottomTabBar currentPath={pathname} items={NUTRI_NAV} />
    </div>
  )
}
