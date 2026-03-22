'use client'

import { usePathname } from 'next/navigation'
import { BottomTabBar, Sidebar } from '@rpgtracker/ui'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const hideNav = pathname.startsWith('/skills/new') // hide nav during multi-step flow

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}>
      {!hideNav && (
        <div className="nav-panel">
          <Sidebar currentPath={pathname} />
        </div>
      )}
      <main className={`flex-1 ${!hideNav ? 'pb-20 md:pb-0' : ''}`}>
        <div className="max-w-[1500px] w-[90%] mx-auto">
          {children}
        </div>
      </main>
      {!hideNav && <BottomTabBar currentPath={pathname} />}
    </div>
  )
}
