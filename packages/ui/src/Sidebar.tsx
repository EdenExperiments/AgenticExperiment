'use client'

import Link from 'next/link'
import { DefaultAvatar } from './DefaultAvatar'
import type { NavItem } from './nav'

export type { NavItem }

interface SidebarProps {
  title: string
  items: NavItem[]
  currentPath: string
  displayName?: string | null
  avatarUrl?: string | null
}

export function Sidebar({ title, items, currentPath, displayName, avatarUrl }: SidebarProps) {
  return (
    <aside
      className="nav-panel sidebar flex flex-col w-64 h-full border-r p-4"
      style={{ background: 'var(--color-bg-elevated)', borderColor: 'var(--color-border)' }}
    >
      <div className="mb-8">
        <span
          className="text-xl font-bold"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--color-accent)' }}
        >
          {title}
        </span>
      </div>
      <nav className="flex-1 space-y-1">
        {items.map(({ label, href, matchPrefix, icon }) => {
          if (href === null) {
            return (
              <div
                key={label}
                className="flex items-center gap-3 px-3 py-2.5 text-sm"
                style={{ color: 'var(--color-muted)' }}
              >
                <span className="text-lg" aria-hidden="true">{icon}</span>
                <span className="flex-1">{label}</span>
                <span
                  className="text-xs px-1.5 py-0.5 rounded"
                  style={{ background: 'var(--color-surface)', color: 'var(--color-muted)' }}
                >
                  Soon
                </span>
              </div>
            )
          }

          const active = currentPath.startsWith(matchPrefix)
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={`sidebar__item flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors${active ? ' sidebar__item--active' : ''}`}
              style={{
                background: active ? 'var(--color-accent-muted)' : undefined,
                color: active ? 'var(--color-accent)' : 'var(--color-text-secondary)',
              }}
            >
              <span className="sidebar__item-icon text-lg" aria-hidden="true">{icon}</span>
              {label}
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
