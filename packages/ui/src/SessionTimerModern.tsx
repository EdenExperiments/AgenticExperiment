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
  totalBreakSec: number
  isSimple?: boolean
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
  elapsedWorkSeconds,
  isPaused,
  totalWorkSec,
  totalBreakSec,
  isSimple,
  onEndEarly,
  onPause,
  onResume,
}: SessionTimerModernProps) {
  const displaySeconds = isSimple ? elapsedWorkSeconds : remainingSeconds
  const mins = Math.floor(displaySeconds / 60)
  const secs = displaySeconds % 60
  const isBreak = phase === 'break'
  const phaseClass = isBreak ? 'session-page--break' : 'session-page--work'

  const radius = 90
  const circumference = 2 * Math.PI * radius
  const phaseDuration = isBreak ? totalBreakSec : totalWorkSec
  const progress = isSimple
    ? Math.min(elapsedWorkSeconds / 3600, 1)
    : phaseDuration > 0
      ? 1 - remainingSeconds / phaseDuration
      : 0
  const strokeDashoffset = circumference * (1 - progress)

  return (
    <div
      className={`session-page ${phaseClass} fixed inset-0 z-50 flex flex-col items-center justify-center p-6${isPaused ? ' session-page--paused' : ''}`}
      style={{ background: 'var(--color-bg)' }}
    >
      <p className="session-page__phase text-xs md:text-sm tracking-[0.3em] uppercase mb-8">
        {isSimple ? 'Focus Mode' : isBreak ? 'Standby' : 'Operation Active'}
      </p>

      <div className="session-page__timer-ring relative w-56 h-56 md:w-72 md:h-72 lg:w-96 lg:h-96 mb-6">
        <svg className="w-full h-full" viewBox="0 0 200 200" aria-hidden="true">
          <circle
            cx="100"
            cy="100"
            r={radius}
            fill="none"
            stroke="var(--color-surface)"
            strokeWidth="4"
          />
          <circle
            className="session-page__timer-ring-progress"
            cx="100"
            cy="100"
            r={radius}
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            transform="rotate(-90 100 100)"
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="session-page__timer text-4xl md:text-5xl lg:text-6xl font-bold tabular-nums">
            {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
          </span>
          {!isSimple && (
            <span className="session-page__round text-[10px] md:text-xs uppercase tracking-wider">
              Round {currentRound}/{totalRounds}
            </span>
          )}
        </div>

        <div className="session-page__timer-glow absolute inset-0 rounded-full pointer-events-none" />
      </div>

      <p className="session-page__skill text-sm md:text-base mb-8">{skillName}</p>

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
