'use client'

import { computeSessionXP, workMinutesFromSeconds } from './sessionXP'

interface SessionTimerRetroProps {
  phase: 'work' | 'break'
  remainingSeconds: number
  currentRound: number
  totalRounds: number
  skillName: string
  tierNumber: number
  elapsedWorkSeconds: number
  isPaused: boolean
  isSimple?: boolean
  onEndEarly: () => void
  onPause: () => void
  onResume: () => void
}

export function SessionTimerRetro({
  phase,
  remainingSeconds,
  currentRound,
  totalRounds,
  skillName,
  tierNumber,
  elapsedWorkSeconds,
  isPaused,
  isSimple,
  onEndEarly,
  onPause,
  onResume,
}: SessionTimerRetroProps) {
  const displaySeconds = isSimple ? elapsedWorkSeconds : remainingSeconds
  const mins = Math.floor(displaySeconds / 60)
  const secs = displaySeconds % 60
  const isBreak = phase === 'break'
  const phaseClass = isBreak ? 'session-page--break' : 'session-page--work'

  const currentXP = computeSessionXP(workMinutesFromSeconds(elapsedWorkSeconds), tierNumber)
  const progressWidth = isSimple
    ? `${Math.min(elapsedWorkSeconds / 3600, 1) * 100}%`
    : `${Math.max(0, 100 - (remainingSeconds / (phase === 'work' ? 1500 : 300)) * 100)}%`

  return (
    <div
      className={`session-page ${phaseClass} fixed inset-0 z-50 flex flex-col items-center justify-center p-6${isPaused ? ' session-page--paused' : ''}`}
    >
      {/* Stylish-only beat-em-up backdrop (img_23 vision); hidden in Clean via CSS */}
      <div className="session-page__backdrop" aria-hidden="true">
        <div className="session-page__backdrop-parallax" />
        <div className="session-page__backdrop-dojo" />
        <div className="session-page__backdrop-fighters">
          <div className="session-page__fighter session-page__fighter--hero" />
          <div className="session-page__fighter session-page__fighter--dummy" />
        </div>
        <div className="session-page__backdrop-vignette" />
      </div>

      <div className="session-page__content relative z-10 flex flex-col items-center justify-center w-full">
        <p className="session-page__phase text-[10px] md:text-xs tracking-[0.3em] uppercase mb-6">
          {isSimple ? '— Grinding —' : isBreak ? '— Rest Phase —' : '— Battle Phase —'}
        </p>

        <div className="session-page__timer text-4xl md:text-6xl lg:text-7xl tabular-nums mb-4">
          {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
        </div>

        {!isSimple && (
          <p className="session-page__round text-[8px] md:text-[10px] tracking-[0.2em] uppercase mb-2">
            Round {currentRound} / {totalRounds}
          </p>
        )}

        {!isBreak && (
          <div className="session-page__xp text-sm md:text-base tabular-nums mb-6">{currentXP} XP</div>
        )}

        <p className="session-page__skill text-xs md:text-sm mb-8">{skillName}</p>

        <div
          className="session-page__progress w-48 md:w-64 lg:w-80 h-3 md:h-4 rounded mb-8"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        >
          <div
            className="session-page__progress-fill h-full rounded transition-all"
            style={{ background: 'var(--color-accent)', width: progressWidth }}
          />
        </div>

        <div className="session-page__controls flex gap-3">
          <button
            onClick={isPaused ? onResume : onPause}
            className="btn btn-ghost px-5 py-3 min-h-[44px]"
          >
            {isPaused ? 'Resume' : 'Pause'}
          </button>
          <button onClick={onEndEarly} className="btn btn-ghost px-5 py-3 min-h-[44px]">
            End Session
          </button>
        </div>
      </div>
    </div>
  )
}
