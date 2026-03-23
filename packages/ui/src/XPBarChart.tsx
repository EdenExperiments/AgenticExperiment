'use client'

interface XPBarChartProps {
  data: { date: string; xp_total: number }[]
  tierColor: string
}

/** Compute a rolling average with the given window size */
function rollingAverage(values: number[], window: number): (number | null)[] {
  return values.map((_, i) => {
    if (i < window - 1) return null
    let sum = 0
    for (let j = i - window + 1; j <= i; j++) sum += values[j]
    return sum / window
  })
}

export function XPBarChart({ data, tierColor }: XPBarChartProps) {
  const allZero = data.every((d) => d.xp_total === 0)

  if (allZero) {
    return (
      <div
        data-testid="xp-chart-empty-state"
        className="flex flex-col items-center justify-center text-center space-y-3"
        style={{ minHeight: '192px' }}
      >
        <div className="text-3xl" style={{ color: 'var(--color-muted)', opacity: 0.5 }} aria-hidden="true">
          &#x1F4CA;
        </div>
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

  // Rolling average (3-point window)
  const windowSize = Math.min(3, data.length)
  const avgValues = rollingAverage(data.map((d) => d.xp_total), windowSize)
  const n = data.length

  // Build SVG polyline points: x = bar center %, y = inverted value %
  const linePoints = avgValues
    .map((avg, i) => {
      if (avg === null) return null
      const x = ((i + 0.5) / n) * 100
      const y = 100 - (avg / maxXP) * 100
      return `${x},${y}`
    })
    .filter(Boolean)
    .join(' ')

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

      {/* Bars row with rolling average overlay */}
      <div className="relative" style={{ height: '148px' }}>
        <div className="flex items-end gap-[3px] h-full">
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

        {/* Rolling average trend line */}
        {linePoints && (
          <svg
            data-testid="xp-trend-line"
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-label="Rolling average trend line"
          >
            <polyline
              points={linePoints}
              fill="none"
              stroke="var(--color-text-secondary)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        )}
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
