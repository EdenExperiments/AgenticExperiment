'use client'

interface XPBarChartProps {
  data: { date: string; xp_total: number }[]
  tierColor: string
}

export function XPBarChart({ data, tierColor }: XPBarChartProps) {
  const allZero = data.every((d) => d.xp_total === 0)

  if (allZero) {
    return (
      <div data-testid="xp-chart-empty-state" className="text-center py-8 text-gray-400">
        <p>Start logging to see your progress here</p>
      </div>
    )
  }

  const maxXP = Math.max(...data.map((d) => d.xp_total), 1)

  return (
    <div data-testid="xp-bar-chart" className="flex items-end gap-1 h-32">
      {data.map((entry) => {
        const height = (entry.xp_total / maxXP) * 100
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
            title={`${entry.date}: ${entry.xp_total} XP`}
          />
        )
      })}
    </div>
  )
}
