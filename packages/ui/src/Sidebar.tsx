'use client'

import Link from 'next/link'

interface SidebarProps {
  currentPath: string
}

export function Sidebar({ currentPath }: SidebarProps) {
  return (
    <aside
      className="nav-panel sidebar hidden md:flex flex-col w-64 h-full border-r p-4"
      style={{ background: 'var(--color-bg-elevated)', borderColor: 'var(--color-border)' }}
    >
      <div className="mb-8">
        <span
          className="text-xl font-bold"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--color-accent)' }}
        >
          LifeQuest
        </span>
      </div>
      <nav className="flex-1 space-y-1">
        {[
          { label: 'Dashboard', href: '/dashboard', prefix: '/dashboard' },
          { label: 'Skills',    href: '/skills',    prefix: '/skills' },
        ].map(({ label, href, prefix }) => {
          const active = currentPath.startsWith(prefix)
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={`sidebar__item flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors${active ? ' sidebar__item--active' : ''}`}
              style={{
                background: active ? 'var(--color-accent-muted)' : undefined,
                color: active ? 'var(--color-accent)' : 'var(--color-text-secondary)',
              }}
            >
              {label}
            </Link>
          )
        })}
        <div className="px-3 py-2 text-sm flex justify-between items-center" style={{ color: 'var(--color-muted)' }}>
          <span>NutriLog</span>
          <span
            className="text-xs px-1.5 py-0.5 rounded"
            style={{ background: 'var(--color-surface)', color: 'var(--color-muted)' }}
          >
            Soon
          </span>
        </div>
        {(() => {
          const active = currentPath.startsWith('/account')
          return (
            <Link
              href="/account"
              aria-current={active ? 'page' : undefined}
              className={`sidebar__item flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors${active ? ' sidebar__item--active' : ''}`}
              style={{
                background: active ? 'var(--color-accent-muted)' : undefined,
                color: active ? 'var(--color-accent)' : 'var(--color-text-secondary)',
              }}
            >
              Account
            </Link>
          )
        })()}
      </nav>
    </aside>
  )
}
