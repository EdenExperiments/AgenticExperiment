'use client'

import Link from 'next/link'

interface NavTab {
  label: string
  href: string | null
  icon: string
  matchPrefix: string
}

const TABS: NavTab[] = [
  { label: 'Dashboard', href: '/dashboard', icon: '🏠', matchPrefix: '/dashboard' },
  { label: 'LifeQuest', href: '/skills',    icon: '⚔️', matchPrefix: '/skills' },
  { label: 'NutriLog',  href: null,         icon: '🥗', matchPrefix: '/nutri' },
  { label: 'Account',   href: '/account',   icon: '👤', matchPrefix: '/account' },
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
