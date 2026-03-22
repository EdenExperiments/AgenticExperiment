'use client'

interface MonthlySummaryProps {
  monthlyXP: number
  trackedMinutes: number
  daysActive: number
}

export function MonthlySummary({ monthlyXP, trackedMinutes, daysActive }: MonthlySummaryProps) {
  return (
    <div className="rounded-xl p-4 space-y-3" style={{ backgroundColor: 'var(--color-surface)' }}>
      <h3 className="font-semibold text-sm uppercase tracking-wider" style={{ color: 'var(--color-muted)' }}>
        This Month
      </h3>
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center">
          <p className="text-lg font-bold" style={{ color: 'var(--color-accent)' }}>{monthlyXP.toLocaleString()}</p>
          <p className="text-xs" style={{ color: 'var(--color-muted)' }}>XP Earned</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold" style={{ color: 'var(--color-accent)' }}>{trackedMinutes}</p>
          <p className="text-xs" style={{ color: 'var(--color-muted)' }}>Minutes</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold" style={{ color: 'var(--color-accent)' }}>{daysActive}</p>
          <p className="text-xs" style={{ color: 'var(--color-muted)' }}>Days Active</p>
        </div>
      </div>
    </div>
  )
}
