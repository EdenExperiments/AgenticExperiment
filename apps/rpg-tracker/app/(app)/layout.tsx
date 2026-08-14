'use client'

import { usePathname } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { getAccount } from '@rpgtracker/api-client'
import { BottomTabBar, Sidebar, type NavItem } from '@rpgtracker/ui'

const LIFEQUEST_NAV: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: '🏠', matchPrefix: '/dashboard' },
  { label: 'Skills', href: '/skills', icon: '⚔️', matchPrefix: '/skills' },
  { label: 'Goals', href: '/goals', icon: '🎯', matchPrefix: '/goals' },
  { label: 'Account', href: '/account', icon: '👤', matchPrefix: '/account' },
]

const PRODUCT_PREFIXES = ['/nutri', '/workout', '/mind']

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isProductRoute = PRODUCT_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  const hideNav = pathname.startsWith('/skills/new') || isProductRoute
  const { data: account } = useQuery({ queryKey: ['account'], queryFn: getAccount })

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}>
      {!hideNav && (
        <div className="nav-panel hidden md:block fixed top-0 left-0 h-screen w-64 z-30">
          <Sidebar
            title="LifeQuest"
            items={LIFEQUEST_NAV}
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
      {!hideNav && <BottomTabBar currentPath={pathname} items={LIFEQUEST_NAV} />}
    </div>
  )
}
