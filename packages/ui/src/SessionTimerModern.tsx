'use client'

interface SessionTimerModernProps {
  phase: 'work' | 'break'
  remainingSeconds: number
  currentRound: number
  totalRounds: number
  skillName: string
  elapsedWorkSeconds: number
  isPaused: boolean
  totalWorkSec: number
  onEndEarly: () => void
  onPause: () => void
  onResume: () => void
}

export function SessionTimerModern({
  phase,
  remainingSeconds,
  currentRound,
  totalRounds,
  skillName,
  isPaused,
  totalWorkSec,
  onEndEarly,
  onPause,
  onResume,
}: SessionTimerModernProps) {
  const mins = Math.floor(remainingSeconds / 60)
  const secs = remainingSeconds % 60
  const isBreak = phase === 'break'

  // SVG progress ring
  const radius = 90
  const circumference = 2 * Math.PI * radius
  const phaseDuration = isBreak ? 300 : totalWorkSec
  const progress = phaseDuration > 0 ? 1 - remainingSeconds / phaseDuration : 0
  const strokeDashoffset = circumference * (1 - progress)

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center p-6"
      style={{ background: 'var(--color-bg)' }}
    >
      {/* Phase label */}
      <p
        className="text-xs tracking-[0.3em] uppercase mb-8"
        style={{
          fontFamily: 'var(--font-display)',
          color: isBreak ? 'var(--color-muted)' : 'var(--color-accent)',
        }}
      >
        {isBreak ? 'Standby' : 'Operation Active'}
      </p>

      {/* Progress ring with timer */}
      <div className="relative w-56 h-56 mb-6">
        <svg className="w-full h-full" viewBox="0 0 200 200">
          {/* Background ring */}
          <circle
            cx="100" cy="100" r={radius}
            fill="none"
            stroke="var(--color-surface)"
            strokeWidth="4"
          />
          {/* Progress ring */}
          <circle
            cx="100" cy="100" r={radius}
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            transform="rotate(-90 100 100)"
            style={{
              transition: `stroke-dashoffset calc(1s * var(--motion-scale, 1)) linear`,
              opacity: isBreak ? 0.3 : 1,
              filter: isBreak ? 'none' : 'drop-shadow(0 0 8px var(--color-accent))',
            }}
          />
        </svg>

        {/* Timer text centered in ring */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="text-4xl font-bold tabular-nums"
            style={{
              fontFamily: 'var(--font-display)',
              color: 'var(--color-text)',
              opacity: isBreak ? 0.5 : 1,
            }}
          >
            {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
          </span>
          <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--color-muted)' }}>
            Round {currentRound}/{totalRounds}
          </span>
        </div>

        {/* Ambient glow */}
        {!isBreak && !isPaused && (
          <div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              background: 'radial-gradient(circle, color-mix(in srgb, var(--color-accent) 10%, transparent) 0%, transparent 70%)',
              animation: `modern-glow calc(3s * var(--motion-scale, 1)) ease-in-out infinite`,
            }}
          />
        )}
      </div>

      {/* Skill name */}
      <p className="text-sm mb-8" style={{ color: 'var(--color-text-secondary)', opacity: isBreak ? 0.5 : 1 }}>
        {skillName}
      </p>

      {/* Controls */}
      <div className="flex gap-3">
        <button
          onClick={isPaused ? onResume : onPause}
          className="px-6 py-3 rounded-xl font-medium border min-h-[44px]"
          style={{
            borderColor: 'var(--color-border)',
            color: 'var(--color-text-secondary)',
          }}
        >
          {isPaused ? 'Resume' : 'Pause'}
        </button>
        <button
          onClick={onEndEarly}
          className="px-6 py-3 rounded-xl font-medium border min-h-[44px]"
          style={{
            borderColor: 'var(--color-border)',
            color: 'var(--color-text-secondary)',
          }}
        >
          End Session
        </button>
      </div>

      <style>{`
        @keyframes modern-glow {
          0%, 100% { opacity: 0.3; transform: scale(0.95); }
          50% { opacity: 0.7; transform: scale(1.05); }
        }
      `}</style>
    </div>
  )
}
