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
  onEndEarly,
  onPause,
  onResume,
}: SessionTimerRetroProps) {
  const mins = Math.floor(remainingSeconds / 60)
  const secs = remainingSeconds % 60
  const isBreak = phase === 'break'

  const currentXP = computeSessionXP(workMinutesFromSeconds(elapsedWorkSeconds), tierNumber)

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center p-6"
      style={{ background: 'var(--color-bg)' }}
    >
      {/* Phase label */}
      <p
        className="text-[10px] tracking-[0.3em] uppercase mb-6"
        style={{
          fontFamily: 'var(--font-display)',
          color: isBreak ? 'var(--color-muted)' : 'var(--color-accent)',
        }}
      >
        {isBreak ? '— Rest Phase —' : '— Battle Phase —'}
      </p>

      {/* Timer display */}
      <div
        className="text-4xl tabular-nums mb-4"
        style={{
          fontFamily: 'var(--font-display)',
          color: 'var(--color-accent)',
          opacity: isBreak ? 0.5 : 1,
          textShadow: isBreak ? 'none' : '0 0 20px var(--color-accent)',
        }}
      >
        {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
      </div>

      {/* Round counter */}
      <p
        className="text-[8px] tracking-[0.2em] uppercase mb-2"
        style={{ fontFamily: 'var(--font-display)', color: 'var(--color-muted)' }}
      >
        Round {currentRound} / {totalRounds}
      </p>

      {/* XP ticking counter */}
      {!isBreak && (
        <div
          className="text-sm tabular-nums mb-6"
          style={{
            fontFamily: 'var(--font-display)',
            color: 'var(--color-accent)',
            animation: isPaused ? 'none' : `retro-pulse calc(1s * var(--motion-scale, 1)) ease-in-out infinite`,
          }}
        >
          {currentXP} XP
        </div>
      )}

      {/* Skill name */}
      <p
        className="text-xs mb-8"
        style={{
          fontFamily: 'var(--font-display)',
          color: 'var(--color-text-secondary)',
          opacity: isBreak ? 0.5 : 1,
        }}
      >
        {skillName}
      </p>

      {/* Pixel progress bar */}
      <div
        className="w-48 h-3 rounded mb-8"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
      >
        <div
          className="h-full rounded transition-all"
          style={{
            background: 'var(--color-accent)',
            width: `${Math.max(0, 100 - (remainingSeconds / (phase === 'work' ? 1500 : 300)) * 100)}%`,
          }}
        />
      </div>

      {/* Controls */}
      <div className="flex gap-3">
        <button
          onClick={isPaused ? onResume : onPause}
          className="px-5 py-3 rounded-xl font-medium min-h-[44px] border"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '10px',
            borderColor: 'var(--color-border)',
            color: 'var(--color-text-secondary)',
          }}
        >
          {isPaused ? 'Resume' : 'Pause'}
        </button>
        <button
          onClick={onEndEarly}
          className="px-5 py-3 rounded-xl font-medium min-h-[44px] border"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '10px',
            borderColor: 'var(--color-border)',
            color: 'var(--color-text-secondary)',
          }}
        >
          End Session
        </button>
      </div>

      <style>{`
        @keyframes retro-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </div>
  )
}
