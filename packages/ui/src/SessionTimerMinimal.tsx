'use client'

interface SessionTimerMinimalProps {
  phase: 'work' | 'break'
  remainingSeconds: number
  currentRound: number
  totalRounds: number
  skillName: string
  elapsedWorkSeconds: number
  isPaused: boolean
  onEndEarly: () => void
  onPause: () => void
  onResume: () => void
}

export function SessionTimerMinimal({
  phase,
  remainingSeconds,
  currentRound,
  totalRounds,
  skillName,
  isPaused,
  onEndEarly,
  onPause,
  onResume,
}: SessionTimerMinimalProps) {
  const mins = Math.floor(remainingSeconds / 60)
  const secs = remainingSeconds % 60

  const isBreak = phase === 'break'
  const opacity = isBreak ? 0.6 : 1

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center p-6"
      style={{ background: 'var(--color-bg)' }}
    >
      {/* Breathing circle */}
      <div
        className="w-48 h-48 md:w-64 md:h-64 lg:w-80 lg:h-80 rounded-full flex items-center justify-center mb-8"
        style={{
          border: `3px solid var(--color-accent)`,
          opacity,
          animation: isPaused ? 'none' : `minimal-breathe calc(4s * var(--motion-scale, 1)) ease-in-out infinite`,
        }}
      >
        <span
          className="text-5xl md:text-6xl lg:text-7xl font-bold tabular-nums"
          style={{
            fontFamily: 'var(--font-body)',
            color: 'var(--color-text)',
          }}
        >
          {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
        </span>
      </div>

      {/* Phase + round info */}
      <p className="text-sm md:text-base mb-1" style={{ color: 'var(--color-muted)' }}>
        {isBreak ? 'Break' : 'Work'} · Round {currentRound} of {totalRounds}
      </p>
      <p className="text-lg md:text-xl font-medium mb-8" style={{ color: 'var(--color-text)', opacity }}>
        {skillName}
      </p>

      {/* Controls */}
      <div className="flex gap-3">
        <button
          onClick={isPaused ? onResume : onPause}
          className="btn btn-ghost px-6 py-3 min-h-[44px]"
        >
          {isPaused ? 'Resume' : 'Pause'}
        </button>
        <button
          onClick={onEndEarly}
          className="btn btn-ghost px-6 py-3 min-h-[44px]"
        >
          End Session
        </button>
      </div>

      <style>{`
        @keyframes minimal-breathe {
          0%, 100% { transform: scale(1); opacity: ${isBreak ? 0.4 : 0.8}; }
          50% { transform: scale(1.05); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
