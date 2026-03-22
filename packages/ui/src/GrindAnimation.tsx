'use client'

interface GrindAnimationProps {
  theme: string
  phase: 'work' | 'break'
  tierColor?: string
  tierNumber?: number
}

export function GrindAnimation({ theme, phase, tierColor, tierNumber }: GrindAnimationProps) {
  const isWork = phase === 'work'

  const workStyle = isWork
    ? {
        '--tier-ring-color': tierColor ?? 'var(--color-accent, #6366f1)',
        borderColor: tierColor ?? 'var(--color-accent, #6366f1)',
      } as React.CSSProperties
    : {
        borderColor: 'var(--color-break)',
      } as React.CSSProperties

  return (
    <div
      data-testid="grind-animation"
      data-phase={phase}
      data-tier={isWork ? (tierNumber ?? 1) : undefined}
      data-break-color={!isWork ? 'true' : undefined}
      className={`grind-animation theme-${theme} ${isWork ? 'phase-work' : 'phase-break'}`}
      style={workStyle}
    >
      <div className="grind-animation__inner">
        {isWork ? (
          <span className="grind-animation__icon">⚔️</span>
        ) : (
          <span className="grind-animation__icon">🌊</span>
        )}
      </div>
    </div>
  )
}
