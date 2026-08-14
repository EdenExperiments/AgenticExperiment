'use client'

import Link from 'next/link'
import { DefaultAvatar } from './DefaultAvatar'
import { navItemIsActive, type NavItem } from './nav'

export type { NavItem }

interface SidebarProps {
  currentPath: string
  items: readonly NavItem[]
  brand?: string
  brandHref?: string
  displayName?: string | null
  avatarUrl?: string | null
}

export function Sidebar({
  currentPath,
  items,
  brand = 'LifeQuest',
  brandHref,
  displayName,
  avatarUrl,
}: SidebarProps) {
  const brandStyle = {
    fontFamily: 'var(--font-display)',
    color: 'var(--color-accent)',
  } as const

  return (
    <aside
      className="nav-panel sidebar flex flex-col w-64 h-full border-r p-4"
      style={{ background: 'var(--color-bg-elevated)', borderColor: 'var(--color-border)' }}
    >
      <div className="mb-8">
        {brandHref ? (
          <Link href={brandHref} className="text-xl font-bold" style={brandStyle}>
            {brand}
          </Link>
        ) : (
          <span className="text-xl font-bold" style={brandStyle}>
            {brand}
          </span>
        )}
      </div>
      <nav className="flex-1 space-y-1">
        {items.map((item) => {
          const active = navItemIsActive(currentPath, item, items)
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={`sidebar__item flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors${active ? ' sidebar__item--active' : ''}`}
              style={{
                background: active ? 'var(--color-accent-muted)' : undefined,
                color: active ? 'var(--color-accent)' : 'var(--color-text-secondary)',
              }}
            >
              <span className="sidebar__item-icon text-lg" aria-hidden="true">{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div
        className="mt-auto pt-4 border-t flex items-center gap-3 px-1"
        style={{ borderColor: 'var(--color-border)' }}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={displayName ?? 'Avatar'}
            className="w-9 h-9 rounded-full object-cover shrink-0"
          />
        ) : (
          <DefaultAvatar displayName={displayName ?? null} size="sm" />
        )}
        <span
          className="text-sm truncate"
          style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)' }}
        >
          {displayName || 'Adventurer'}
        </span>
      </div>
    </aside>
  )
}
