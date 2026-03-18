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
