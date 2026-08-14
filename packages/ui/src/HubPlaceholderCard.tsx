'use client'

import Link from 'next/link'

interface HubPlaceholderCardProps {
  appName: string
  tagline: string
  icon: string
  href?: string
  metrics: { label: string; value: string }[]
}

export function HubPlaceholderCard({ appName, tagline, icon, href, metrics }: HubPlaceholderCardProps) {
  const inner = (
    <>
      {!href && (
        <div
          className="absolute top-3 right-3 text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full"
          style={{
            backgroundColor: 'var(--color-surface)',
            color: 'var(--color-muted)',
          }}
        >
          Coming Soon
        </div>
      )}

      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl" aria-hidden="true">{icon}</span>
        <div>
          <h3
            className="text-sm font-semibold leading-tight"
            style={{
              fontFamily: 'var(--font-display, var(--font-body, Inter, system-ui, sans-serif))',
              color: 'var(--color-text)',
            }}
          >
            {appName}
          </h3>
          <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
            {tagline}
          </p>
        </div>
      </div>

      <div className="flex gap-3">
        {metrics.map((m) => (
          <div key={m.label} className="flex-1 text-center">
            <div
              className="text-lg font-bold tabular-nums"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {m.value}
            </div>
            <div
              className="text-[10px] uppercase tracking-wider"
              style={{ color: 'var(--color-muted)' }}
            >
              {m.label}
            </div>
          </div>
        ))}
      </div>
    </>
  )

  const className = 'rounded-xl p-4 relative overflow-hidden'
  const style = {
    backgroundColor: 'var(--color-bg-elevated)',
    border: '1px solid var(--color-border)',
  } as const

  if (href) {
    return (
      <Link href={href} className={`${className} block hover:opacity-95`} style={style} aria-label={`Open ${appName}`}>
        {inner}
      </Link>
    )
  }

  return (
    <div className={`${className} opacity-75`} style={style}>
      {inner}
    </div>
  )
}
