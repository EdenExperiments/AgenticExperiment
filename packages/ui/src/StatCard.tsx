import React from 'react'

export interface StatCardProps {
  label: string
  value: string | number
  icon?: React.ReactNode
  className?: string
}

/**
 * StatCard — compact metric display for dashboard stats row.
 *
 * Theme-aware via CSS custom properties:
 * - rpg-game: elevated bg, gold accent border, display font for value
 * - rpg-clean: surface bg, subtle border, body font for value
 */
export function StatCard({ label, value, icon, className = '' }: StatCardProps) {
  return (
    <div
      className={`rounded-xl border p-4 ${className}`}
      style={{
        backgroundColor: 'var(--color-bg-elevated, #1a1a2e)',
        borderColor: 'var(--color-border, rgba(75, 85, 99, 0.5))',
      }}
    >
      <div className="flex items-center gap-2 mb-1">
        {icon && <span className="text-lg">{icon}</span>}
        <span
          className="text-xs uppercase tracking-wider"
          style={{ color: 'var(--color-text-muted, #6b7280)' }}
        >
          {label}
        </span>
      </div>
      <div
        className="text-2xl font-bold"
        style={{
          color: 'var(--color-accent, #6366f1)',
          fontFamily: 'var(--font-display, var(--font-body, Inter, system-ui, sans-serif))',
        }}
        data-testid="stat-value"
      >
        {value}
      </div>
    </div>
  )
}
