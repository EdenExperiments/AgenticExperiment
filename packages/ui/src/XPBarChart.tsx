'use client'

interface XPBarChartProps {
  data: { date: string; xp_total: number }[]
  tierColor: string
}

export function XPBarChart({ data, tierColor }: XPBarChartProps) {
  const allZero = data.every((d) => d.xp_total === 0)

  if (allZero) {
    return (
      <div
        data-testid="xp-chart-empty-state"
        className="flex items-center justify-center"
        style={{ minHeight: '192px' }}
      >
        <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
          Start logging to see your progress here
        </p>
      </div>
    )
  }

  const maxXP = Math.max(...data.map((d) => d.xp_total), 1)
  const stride = Math.max(1, Math.ceil(data.length / 7))

  const formatLabel = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  const formatBarLabel = (dateStr: string, xp: number) =>
    `${formatLabel(dateStr)} — ${xp} XP`

  return (
    <div data-testid="xp-bar-chart" style={{ minHeight: '192px' }}>
      {/* Max XP reference label */}
      <div className="flex justify-end mb-1">
        <span
          className="text-[10px] tabular-nums"
          style={{ color: 'var(--color-muted)' }}
        >
          {maxXP.toLocaleString()} XP
        </span>
      </div>

      {/* Bars row */}
      <div className="flex items-end gap-[3px]" style={{ height: '148px' }}>
        {data.map((entry) => {
          const height = (entry.xp_total / maxXP) * 100
          const label = formatBarLabel(entry.date, entry.xp_total)
          return (
            <div
              key={entry.date}
              data-testid="xp-bar"
              className="flex-1 rounded-t transition-opacity hover:opacity-80"
              style={{
                height: `${height}%`,
                backgroundColor: tierColor,
                minHeight: entry.xp_total > 0 ? '4px' : '0px',
                boxShadow: entry.xp_total > 0 ? `0 0 4px ${tierColor}30` : 'none',
              }}
              title={label}
              aria-label={label}
            />
          )
        })}
      </div>

      {/* X-axis labels row */}
      <div className="flex gap-[3px] mt-2">
        {data.map((entry, i) => (
          <div
            key={entry.date}
            data-testid="xp-chart-label"
            className="flex-1 text-center overflow-hidden"
            style={{
              fontSize: '10px',
              color: 'var(--color-muted)',
              whiteSpace: 'nowrap',
            }}
          >
            {i % stride === 0 ? formatLabel(entry.date) : ''}
          </div>
        ))}
      </div>
    </div>
  )
}
