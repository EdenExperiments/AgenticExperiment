'use client'

interface MonthlySummaryProps {
  monthlyXP: number
  trackedMinutes: number
  daysActive: number
}

export function MonthlySummary({ monthlyXP, trackedMinutes, daysActive }: MonthlySummaryProps) {
  return (
    <div className="rounded-xl p-4 space-y-3" style={{ backgroundColor: 'var(--color-bg-surface, #1f2937)' }}>
      <h3 className="font-semibold text-sm uppercase tracking-wider" style={{ color: 'var(--color-text-muted, #6b7280)' }}>
        This Month
      </h3>
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center">
          <p className="text-lg font-bold" style={{ color: 'var(--color-accent, #6366f1)' }}>{monthlyXP.toLocaleString()}</p>
          <p className="text-xs" style={{ color: 'var(--color-text-muted, #6b7280)' }}>XP Earned</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold" style={{ color: 'var(--color-accent, #6366f1)' }}>{trackedMinutes}</p>
          <p className="text-xs" style={{ color: 'var(--color-text-muted, #6b7280)' }}>Minutes</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold" style={{ color: 'var(--color-accent, #6366f1)' }}>{daysActive}</p>
          <p className="text-xs" style={{ color: 'var(--color-text-muted, #6b7280)' }}>Days Active</p>
        </div>
      </div>
    </div>
  )
}
