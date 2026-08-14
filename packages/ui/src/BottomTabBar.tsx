'use client'

import Link from 'next/link'
import { isNavItemActive, type NavItem } from './nav'

export type { NavItem }

interface BottomTabBarProps {
  currentPath: string
  items: NavItem[]
}

export function BottomTabBar({ currentPath, items }: BottomTabBarProps) {
  return (
    <nav
      aria-label="Main navigation"
      className="bottom-tabs fixed bottom-0 inset-x-0 z-50 border-t safe-area-inset-bottom md:hidden"
      style={{ background: 'var(--color-bg-elevated)', borderColor: 'var(--color-border)' }}
    >
      <div className="flex items-stretch h-16">
        {items.map((tab) => {
          const isActive = isNavItemActive(tab, currentPath, items)

          if (tab.href === null) {
            return (
              <div
                key={tab.label}
                className="flex-1 flex flex-col items-center justify-center gap-0.5 opacity-40 select-none"
                role="presentation"
              >
                <span className="text-xl">{tab.icon}</span>
                <span className="text-[10px] font-medium" style={{ color: 'var(--color-muted)' }}>{tab.label}</span>
                <span className="text-[9px]" style={{ color: 'var(--color-muted)' }}>Coming soon</span>
              </div>
            )
          }

          return (
            <Link
              key={tab.label}
              href={tab.href}
              aria-label={tab.label}
              aria-current={isActive ? 'page' : undefined}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors min-h-[44px]${isActive ? ' bottom-tabs__item--active' : ''}`}
              style={{ color: isActive ? 'var(--color-accent)' : 'var(--color-muted)' }}
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
