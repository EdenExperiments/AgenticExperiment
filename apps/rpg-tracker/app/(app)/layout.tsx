'use client'

import { usePathname } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { getAccount } from '@rpgtracker/api-client'
import { BottomTabBar, Sidebar } from '@rpgtracker/ui'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const hideNav = pathname.startsWith('/skills/new') // hide nav during multi-step flow
  const { data: account } = useQuery({ queryKey: ['account'], queryFn: getAccount })

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}>
      {!hideNav && (
        <div className="nav-panel hidden md:block fixed top-0 left-0 h-screen w-64 z-30">
          <Sidebar
            currentPath={pathname}
            displayName={account?.display_name}
            avatarUrl={account?.avatar_url}
          />
        </div>
      )}
      <main className={`${!hideNav ? 'md:ml-64 pb-20 md:pb-0' : ''}`}>
        <div className="max-w-[1500px] w-full mx-auto">
          {children}
        </div>
      </main>
      {!hideNav && <BottomTabBar currentPath={pathname} />}
    </div>
  )
}
