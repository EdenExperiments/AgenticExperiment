'use client'

import Link from 'next/link'

interface SidebarProps {
  currentPath: string
}

export function Sidebar({ currentPath }: SidebarProps) {
  return (
    <aside className="hidden md:flex flex-col w-64 min-h-screen bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 p-4">
      <div className="mb-8">
        <span className="text-xl font-bold text-[var(--color-accent,theme(colors.blue.600))]">LifeQuest</span>
      </div>
      <nav className="flex-1 space-y-1">
        {[
          { label: 'Dashboard', href: '/dashboard', prefix: '/dashboard' },
          { label: 'Skills',    href: '/skills',    prefix: '/skills' },
        ].map(({ label, href, prefix }) => (
          <Link
            key={href}
            href={href}
            aria-current={currentPath.startsWith(prefix) ? 'page' : undefined}
            className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors
              ${currentPath.startsWith(prefix)
                ? 'bg-[var(--color-accent-muted,theme(colors.blue.50))] text-[var(--color-accent,theme(colors.blue.600))]'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
          >
            {label}
          </Link>
        ))}
        <div className="px-3 py-2 text-sm text-gray-400 flex justify-between items-center">
          <span>NutriLog</span>
          <span className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">Soon</span>
        </div>
        <Link
          href="/account"
          aria-current={currentPath.startsWith('/account') ? 'page' : undefined}
          className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors
            ${currentPath.startsWith('/account')
              ? 'bg-[var(--color-accent-muted,theme(colors.blue.50))] text-[var(--color-accent,theme(colors.blue.600))]'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
        >
          Account
        </Link>
      </nav>
    </aside>
  )
}
