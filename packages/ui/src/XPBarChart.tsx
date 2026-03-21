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
        <p style={{ color: 'var(--color-text-muted, #6b5e4e)' }}>
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
      {/* Bars row */}
      <div className="flex items-end gap-1" style={{ height: '160px' }}>
        {data.map((entry) => {
          const height = (entry.xp_total / maxXP) * 100
          const label = formatBarLabel(entry.date, entry.xp_total)
          return (
            <div
              key={entry.date}
              data-testid="xp-bar"
              className="flex-1 rounded-t"
              style={{
                height: `${height}%`,
                backgroundColor: tierColor,
                minHeight: entry.xp_total > 0 ? '4px' : '0px',
              }}
              title={label}
              aria-label={label}
            />
          )
        })}
      </div>
      {/* X-axis labels row */}
      <div className="flex gap-1 mt-1">
        {data.map((entry, i) => (
          <div
            key={entry.date}
            data-testid="xp-chart-label"
            className="flex-1 text-center overflow-hidden"
            style={{
              fontSize: '10px',
              color: 'var(--color-text-muted, #6b5e4e)',
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
