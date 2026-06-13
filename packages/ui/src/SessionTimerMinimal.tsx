'use client'

interface SessionTimerMinimalProps {
  phase: 'work' | 'break'
  remainingSeconds: number
  currentRound: number
  totalRounds: number
  skillName: string
  elapsedWorkSeconds: number
  isPaused: boolean
  isSimple?: boolean
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
  elapsedWorkSeconds,
  isPaused,
  isSimple,
  onEndEarly,
  onPause,
  onResume,
}: SessionTimerMinimalProps) {
  const displaySeconds = isSimple ? elapsedWorkSeconds : remainingSeconds
  const mins = Math.floor(displaySeconds / 60)
  const secs = displaySeconds % 60

  const isBreak = phase === 'break'
  const phaseClass = isBreak ? 'session-page--break' : 'session-page--work'

  return (
    <div
      className={`session-page ${phaseClass} fixed inset-0 z-50 flex flex-col items-center justify-center p-6${isPaused ? ' session-page--paused' : ''}`}
      style={{ background: 'var(--color-bg)' }}
    >
      <div
        className="session-page__timer-ring w-48 h-48 md:w-64 md:h-64 lg:w-80 lg:h-80 rounded-full flex items-center justify-center mb-8"
        style={{ border: '3px solid var(--color-accent)' }}
      >
        <span className="session-page__timer text-5xl md:text-6xl lg:text-7xl font-bold tabular-nums">
          {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
        </span>
      </div>

      <p className="session-page__phase text-sm md:text-base mb-1">
        {isSimple ? 'Focus' : `${isBreak ? 'Break' : 'Work'} · Round ${currentRound} of ${totalRounds}`}
      </p>
      {!isSimple && isBreak && (
        <span className="session-page__break-indicator text-xs mb-2">Rest</span>
      )}
      <p className="session-page__skill text-lg md:text-xl font-medium mb-8">{skillName}</p>

      <div className="session-page__controls flex gap-3">
        <button
          onClick={isPaused ? onResume : onPause}
          className="btn btn-ghost px-6 py-3 min-h-[44px]"
        >
          {isPaused ? 'Resume' : 'Pause'}
        </button>
        <button onClick={onEndEarly} className="btn btn-ghost px-6 py-3 min-h-[44px]">
          End Session
        </button>
      </div>
    </div>
  )
}
