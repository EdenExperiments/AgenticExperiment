'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}>
      <header
        className="sticky top-0 z-20 border-b px-4 py-3"
        style={{
          backgroundColor: 'var(--color-bg-elevated)',
          borderColor: 'var(--color-border)',
        }}
      >
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <span
            className="text-lg font-bold"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
          >
            NutriLog
          </span>
          <nav aria-label="Main">
            <Link
              href="/dashboard"
              className="text-sm font-medium px-3 py-2 rounded-lg transition-colors"
              style={{
                color: pathname === '/dashboard' ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                backgroundColor: pathname === '/dashboard' ? 'var(--color-surface)' : 'transparent',
              }}
            >
              Dashboard
            </Link>
          </nav>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  )
}
