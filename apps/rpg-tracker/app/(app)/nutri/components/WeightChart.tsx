'use client'

import type { WeightChartPoint } from '@rpgtracker/api-client'

interface WeightChartProps {
  data: WeightChartPoint[]
}

function formatLabel(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function WeightChart({ data }: WeightChartProps) {
  const values = data.map((d) => d.weight_kg).filter((v): v is number => v !== null)
  const hasData = values.length > 0

  if (!hasData) {
    return (
      <div
        data-testid="weight-chart-empty"
        className="flex flex-col items-center justify-center text-center space-y-3"
        style={{ minHeight: '192px' }}
      >
        <div className="text-3xl" style={{ color: 'var(--color-muted)', opacity: 0.5 }} aria-hidden="true">
          &#x2696;
        </div>
        <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
          Log your weight to see trends here
        </p>
      </div>
    )
  }

  const minWeight = Math.min(...values)
  const maxWeight = Math.max(...values)
  const range = maxWeight - minWeight || 1
  const stride = Math.max(1, Math.ceil(data.length / 7))

  return (
    <div data-testid="weight-chart" style={{ minHeight: '192px' }}>
      <div className="flex justify-between mb-1">
        <span className="text-[10px] tabular-nums" style={{ color: 'var(--color-muted)' }}>
          {minWeight.toFixed(1)} kg
        </span>
        {maxWeight !== minWeight && (
          <span className="text-[10px] tabular-nums" style={{ color: 'var(--color-muted)' }}>
            {maxWeight.toFixed(1)} kg
          </span>
        )}
      </div>

      <div className="relative" style={{ height: '148px' }}>
        <svg
          data-testid="weight-chart-line"
          className="w-full h-full"
          viewBox={`0 0 ${data.length} 100`}
          preserveAspectRatio="none"
          aria-label="Weight trend line"
        >
          <polyline
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            points={data
              .map((point, i) => {
                if (point.weight_kg === null) return null
                const y = 100 - ((point.weight_kg - minWeight) / range) * 100
                return `${i},${y}`
              })
              .filter(Boolean)
              .join(' ')}
          />
          {data.map((point, i) => {
            if (point.weight_kg === null) return null
            const y = 100 - ((point.weight_kg - minWeight) / range) * 100
            const label = `${formatLabel(point.date)}, ${point.weight_kg} kg`
            return (
              <circle
                key={point.date}
                data-testid="weight-chart-point"
                cx={i}
                cy={y}
                r="1.5"
                fill="var(--color-accent)"
                aria-label={label}
              >
                <title>{label}</title>
              </circle>
            )
          })}
        </svg>
      </div>

      <div className="relative mt-2" style={{ height: '16px' }}>
        {data.map((point, i) => {
          if (i % stride !== 0) return null
          const leftPct = ((i + 0.5) / data.length) * 100
          return (
            <span
              key={point.date}
              data-testid="weight-chart-label"
              className="absolute"
              style={{
                left: `${leftPct}%`,
                transform: 'translateX(-50%)',
                fontSize: '10px',
                color: 'var(--color-muted)',
                whiteSpace: 'nowrap',
              }}
            >
              {formatLabel(point.date)}
            </span>
          )
        })}
      </div>
    </div>
  )
}
