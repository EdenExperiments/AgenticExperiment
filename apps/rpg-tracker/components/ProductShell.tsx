'use client'

import { BottomTabBar, Sidebar, type NavItem, type Theme } from '@rpgtracker/ui'
import Link from 'next/link'
import type { ReactNode } from 'react'

interface ProductShellProps {
  brand: string
  theme: Theme
  items: readonly NavItem[]
  currentPath: string
  displayName?: string | null
  avatarUrl?: string | null
  children: ReactNode
}

export function ProductShell({
  brand,
  theme,
  items,
  currentPath,
  displayName,
  avatarUrl,
  children,
}: ProductShellProps) {
  return (
    <div
      data-theme={theme}
      className="min-h-screen"
      style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}
    >
      <div className="nav-panel hidden md:block fixed top-0 left-0 h-screen w-64 z-30">
        <Sidebar
          currentPath={currentPath}
          items={items}
          brand={brand}
          brandHref="/dashboard"
          displayName={displayName}
          avatarUrl={avatarUrl}
        />
      </div>
      <main className="md:ml-64 pb-20 md:pb-0">
        <div className="max-w-[1500px] w-full mx-auto">
          <div className="px-4 pt-4 md:hidden">
            <Link href="/dashboard" className="text-sm" style={{ color: 'var(--color-muted)' }}>
              Suite
            </Link>
          </div>
          {children}
        </div>
      </main>
      <BottomTabBar currentPath={currentPath} items={items} />
    </div>
  )
}
