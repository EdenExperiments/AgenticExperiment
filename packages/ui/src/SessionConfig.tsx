'use client'

import { useState } from 'react'

export interface SessionConfigResult {
  type: 'pomodoro' | 'simple'
  workSec: number
  breakSec: number
  rounds: number
}

interface SessionConfigProps {
  skillName: string
  tierColor: string
  onBegin: (config: SessionConfigResult) => void
  onCancel: () => void
}

const WORK_PRESETS = [
  { label: '15m', value: 900 },
  { label: '25m', value: 1500 },
  { label: '45m', value: 2700 },
]

const BREAK_PRESETS = [
  { label: '5m', value: 300 },
  { label: '10m', value: 600 },
]

const ROUND_PRESETS = [
  { label: '2', value: 2 },
  { label: '4', value: 4 },
  { label: '6', value: 6 },
]

export function SessionConfig({ skillName, tierColor, onBegin, onCancel }: SessionConfigProps) {
  const [sessionType, setSessionType] = useState<'pomodoro' | 'simple'>('pomodoro')
  const [workSec, setWorkSec] = useState(1500)
  const [breakSec, setBreakSec] = useState(300)
  const [rounds, setRounds] = useState(4)

  function handleBegin() {
    onBegin({ type: sessionType, workSec, breakSec, rounds })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center p-6"
      style={{ background: 'var(--color-bg)' }}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-8 space-y-6 border"
        style={{
          background: 'var(--color-bg-elevated)',
          borderColor: 'var(--color-border-strong)',
        }}
      >
        {/* Header */}
        <div className="text-center space-y-1">
          <p
            className="text-[10px] tracking-[0.25em] uppercase"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-muted)' }}
          >
            Session Start
          </p>
          <h2
            className="text-2xl font-bold"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-accent)' }}
          >
            {skillName}
          </h2>
        </div>

        <div className="h-px" style={{ background: 'var(--color-border)' }} />

        {/* Session type toggle */}
        <div className="flex gap-2">
          {(['simple', 'pomodoro'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setSessionType(t)}
              className={`chip flex-1 py-2 min-h-[44px]${sessionType === t ? ' chip-active' : ''}`}
            >
              {t === 'simple' ? 'Simple' : 'Pomodoro'}
            </button>
          ))}
        </div>

        {/* Pomodoro config */}
        {sessionType === 'pomodoro' && (
          <div className="space-y-4">
            {/* Work duration */}
            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: 'var(--color-muted)' }}>
                Work
              </label>
              <div className="flex gap-2">
                {WORK_PRESETS.map((p) => (
                  <button
                    key={p.value}
                    onClick={() => setWorkSec(p.value)}
                    className={`chip flex-1 py-2${workSec === p.value ? ' chip-active' : ''}`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Break duration */}
            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: 'var(--color-muted)' }}>
                Break
              </label>
              <div className="flex gap-2">
                {BREAK_PRESETS.map((p) => (
                  <button
                    key={p.value}
                    onClick={() => setBreakSec(p.value)}
                    className={`chip flex-1 py-2${breakSec === p.value ? ' chip-active' : ''}`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Rounds */}
            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: 'var(--color-muted)' }}>
                Rounds
              </label>
              <div className="flex gap-2">
                {ROUND_PRESETS.map((p) => (
                  <button
                    key={p.value}
                    onClick={() => setRounds(p.value)}
                    className={`chip flex-1 py-2${rounds === p.value ? ' chip-active' : ''}`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {sessionType === 'simple' && (
          <p className="text-sm text-center" style={{ color: 'var(--color-text-secondary)' }}>
            Count-up timer — end when you&apos;re done.
          </p>
        )}

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={handleBegin}
            className="btn btn-primary w-full py-4 tracking-wide min-h-[48px]"
          >
            Begin Session
          </button>
          <button
            onClick={onCancel}
            className="btn btn-ghost w-full py-3 min-h-[44px]"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
