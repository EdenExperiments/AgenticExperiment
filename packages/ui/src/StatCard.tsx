import React from 'react'

export interface StatCardProps {
  label: string
  value: React.ReactNode
  icon?: React.ReactNode
  className?: string
}

function isMetricValue(value: React.ReactNode): value is string | number {
  return typeof value === 'string' || typeof value === 'number'
}

/**
 * StatCard — compact metric display for dashboard stats row.
 *
 * Theme-aware via CSS custom properties:
 * - retro: elevated bg, gold accent border, display font for numeric values
 * - minimal: surface bg, subtle border, body font for value
 */
export function StatCard({ label, value, icon, className = '' }: StatCardProps) {
  const metric = isMetricValue(value)

  return (
    <div
      className={`stat-card min-w-0 overflow-hidden rounded-xl border p-4 [@media(hover:hover)]:hover:-translate-y-0.5 [@media(hover:hover)]:hover:shadow-lg focus-visible:outline-2 focus-visible:outline-[var(--color-accent)] focus-visible:outline-offset-2 ${className}`}
      style={{
        backgroundColor: 'var(--color-bg-elevated)',
        borderColor: 'var(--color-border)',
        transition: 'transform calc(var(--duration-fast, 150ms) * var(--motion-scale, 1)), box-shadow calc(var(--duration-fast, 150ms) * var(--motion-scale, 1))',
      }}
    >
      <div className="flex items-center gap-2 mb-1 min-w-0">
        {icon && <span className="text-lg shrink-0">{icon}</span>}
        <span
          className="text-xs uppercase tracking-wider truncate"
          style={{ color: 'var(--color-muted)' }}
        >
          {label}
        </span>
      </div>
      <div
        className={`stat-card__value ${metric ? 'stat-card__value--metric text-2xl font-bold' : 'stat-card__value--custom'}`}
        style={
          metric
            ? {
                color: 'var(--color-accent)',
                fontFamily: 'var(--font-display, var(--font-body, Inter, system-ui, sans-serif))',
              }
            : undefined
        }
        data-testid="stat-value"
      >
        {value}
      </div>
    </div>
  )
}
