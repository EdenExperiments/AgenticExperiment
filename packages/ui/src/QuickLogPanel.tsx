'use client'

import { useState } from 'react'

const BASE_XP_PER_MIN = 3
const TIME_CHIPS = [15, 30, 45, 60] as const

function computeXP(minutes: number, tierNumber: number): number {
  const rate = BASE_XP_PER_MIN * (1 + 0.4 * (tierNumber - 1))
  return Math.max(1, Math.round(minutes * rate))
}

interface QuickLogPanelProps {
  skillName: string
  tierNumber: number
  isLoading: boolean
  onSubmit: (data: { xpDelta: number; logNote: string; timeSpentMinutes?: number }) => void
  /** Controlled mode: external expanded state */
  expanded?: boolean
  /** Controlled mode: callback when panel toggles */
  onToggleExpanded?: (expanded: boolean) => void
}

export function QuickLogPanel({ skillName, tierNumber, isLoading, onSubmit, expanded: controlledExpanded, onToggleExpanded }: QuickLogPanelProps) {
  const [internalExpanded, setInternalExpanded] = useState(false)
  const isControlled = controlledExpanded !== undefined
  const expanded = isControlled ? controlledExpanded : internalExpanded
  const setExpanded = (v: boolean) => {
    if (isControlled) {
      onToggleExpanded?.(v)
    } else {
      setInternalExpanded(v)
    }
  }
  const [selected, setSelected] = useState<number | 'custom'>(30)
  const [customMinutes, setCustomMinutes] = useState('')
  const [logNote, setLogNote] = useState('')

  const effectiveMinutes = selected === 'custom'
    ? Math.min(480, Math.max(0, parseInt(customMinutes, 10) || 0))
    : selected

  const previewXP = effectiveMinutes > 0 ? computeXP(effectiveMinutes, tierNumber) : null

  function handleSubmit() {
    if (!previewXP || effectiveMinutes <= 0) return
    onSubmit({ xpDelta: previewXP, logNote, timeSpentMinutes: effectiveMinutes })
    setLogNote('')
    setExpanded(false)
  }

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="btn btn-primary w-full py-3 min-h-[48px]"
      >
        Log XP — {skillName}
      </button>
    )
  }

  return (
    <div
      className="rounded-xl p-5 border"
      style={{
        backgroundColor: 'var(--color-bg-elevated)',
        borderColor: 'var(--color-border)',
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3
          className="font-semibold text-sm"
          style={{ color: 'var(--color-text)' }}
        >
          {skillName} — Quick Log
        </h3>
        <button
          onClick={() => setExpanded(false)}
          aria-label="Collapse"
          className="text-lg leading-none min-h-[44px] min-w-[44px] flex items-center justify-center"
          style={{ color: 'var(--color-muted)' }}
        >
          ×
        </button>
      </div>

      {/* Time chips */}
      <p className="text-xs mb-2 uppercase tracking-wider" style={{ color: 'var(--color-muted)' }}>
        How long did you practice?
      </p>
      <div className="flex gap-2 flex-wrap mb-2">
        {TIME_CHIPS.map((mins) => (
          <button
            key={mins}
            aria-label={`${mins} min`}
            aria-pressed={selected === mins}
            onClick={() => setSelected(mins)}
            className={`chip flex-1 min-w-[60px] py-2.5 min-h-[44px]${selected === mins ? ' chip-active' : ''}`}
          >
            {mins} min
          </button>
        ))}
        <button
          aria-label="Custom duration"
          aria-pressed={selected === 'custom'}
          onClick={() => setSelected('custom')}
          className={`chip flex-1 min-w-[60px] py-2.5 min-h-[44px]${selected === 'custom' ? ' chip-active' : ''}`}
        >
          Custom
        </button>
      </div>

      {selected === 'custom' && (
        <input
          type="number"
          inputMode="numeric"
          placeholder="Minutes (1–480)"
          min={1}
          max={480}
          value={customMinutes}
          onChange={(e) => setCustomMinutes(e.target.value)}
          className="w-full rounded-lg px-3 py-2.5 text-sm mb-2"
          style={{
            background: 'var(--color-surface)',
            color: 'var(--color-text)',
            border: '1px solid var(--color-border)',
          }}
        />
      )}

      {/* XP preview */}
      <div className="h-6 flex items-center mb-3">
        {previewXP !== null && (
          <span className="text-sm" style={{ color: 'var(--color-muted)' }}>
            ≈ <span style={{ color: 'var(--color-accent)' }}>{previewXP} XP</span>
          </span>
        )}
      </div>

      {/* Note + submit row */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="What did you work on? (optional)"
          value={logNote}
          onChange={(e) => setLogNote(e.target.value)}
          className="flex-1 rounded-lg px-3 py-2.5 text-sm"
          style={{
            background: 'var(--color-surface)',
            color: 'var(--color-text)',
            border: '1px solid var(--color-border)',
          }}
        />
        <button
          aria-label="Log XP"
          onClick={handleSubmit}
          disabled={isLoading || effectiveMinutes <= 0}
          className="btn btn-primary px-5 py-2.5 text-sm min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Logging…' : 'Log'}
        </button>
      </div>
    </div>
  )
}
