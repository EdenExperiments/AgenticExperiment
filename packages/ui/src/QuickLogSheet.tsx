'use client'

import { useState } from 'react'

// Base XP rate per minute at tier 1 (D-034).
const BASE_XP_PER_MIN = 3

// TIME_CHIPS are the fixed presets shown as quick-select buttons.
const TIME_CHIPS = [15, 30, 45, 60] as const

/** Compute XP earned for a given duration and tier (D-034). */
function computeXP(minutes: number, tierNumber: number): number {
  const rate = BASE_XP_PER_MIN * (1 + 0.4 * (tierNumber - 1))
  return Math.max(1, Math.round(minutes * rate))
}

interface QuickLogSheetProps {
  skillName: string
  /** Current tier number (1–11) — used to preview XP earned per minute. */
  tierNumber: number
  isOpen: boolean
  isLoading: boolean
  onClose: () => void
  onSubmit: (data: { xpDelta: number; logNote: string; timeSpentMinutes?: number }) => void
}

export function QuickLogSheet({ skillName, tierNumber, isOpen, isLoading, onClose, onSubmit }: QuickLogSheetProps) {
  const [selected, setSelected] = useState<number | 'custom'>(30) // 30 min default
  const [customMinutes, setCustomMinutes] = useState('')
  const [logNote, setLogNote] = useState('')

  if (!isOpen) return null

  const effectiveMinutes = selected === 'custom'
    ? Math.min(480, Math.max(0, parseInt(customMinutes, 10) || 0))
    : selected

  const previewXP = effectiveMinutes > 0 ? computeXP(effectiveMinutes, tierNumber) : null

  function handleSubmit() {
    if (!previewXP || effectiveMinutes <= 0) return
    onSubmit({ xpDelta: previewXP, logNote, timeSpentMinutes: effectiveMinutes })
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
      />

      {/* Sheet / Modal */}
      <div
        role="dialog"
        aria-label={`${skillName} — Quick Log`}
        className="fixed bottom-0 inset-x-0 z-50 rounded-t-2xl p-6 safe-area-inset-bottom border
                   md:bottom-auto md:top-1/2 md:-translate-y-1/2 md:left-[calc(50%+8rem)] md:-translate-x-1/2 md:w-[480px] md:rounded-2xl md:max-h-[80vh] md:inset-x-auto"
        style={{
          background: 'var(--color-bg-elevated)',
          borderColor: 'var(--color-border-strong)',
          color: 'var(--color-text)',
        }}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold">{skillName} — Quick Log</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-2xl leading-none"
            style={{ color: 'var(--color-muted)' }}
          >×</button>
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
              className={`chip flex-1 min-w-[60px] py-3 min-h-[44px]${selected === mins ? ' chip-active' : ''}`}
            >
              {mins} min
            </button>
          ))}
          <button
            aria-label="Custom duration"
            aria-pressed={selected === 'custom'}
            onClick={() => setSelected('custom')}
            className={`chip flex-1 min-w-[60px] py-3 min-h-[44px]${selected === 'custom' ? ' chip-active' : ''}`}
          >
            Custom
          </button>
        </div>

        {/* Custom minutes input */}
        {selected === 'custom' && (
          <input
            type="number"
            inputMode="numeric"
            placeholder="Minutes (1–480)"
            min={1}
            max={480}
            value={customMinutes}
            onChange={(e) => setCustomMinutes(e.target.value)}
            className="w-full rounded-xl px-4 py-3 text-sm mb-2"
            style={{
              background: 'var(--color-surface)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border)',
            }}
          />
        )}

        {/* XP preview */}
        <div className="h-7 flex items-center justify-center mb-4">
          {previewXP !== null && (
            <span className="text-sm" style={{ color: 'var(--color-muted)' }}>
              ≈ <span style={{ color: 'var(--color-accent)' }}>{previewXP} XP</span>
            </span>
          )}
        </div>

        {/* Note field */}
        <input
          type="text"
          placeholder="What did you work on? (optional)"
          value={logNote}
          onChange={(e) => setLogNote(e.target.value)}
          className="w-full rounded-xl px-4 py-3 text-sm mb-4"
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
          className="btn btn-primary w-full py-4 min-h-[48px] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Logging…' : `Log ${effectiveMinutes > 0 ? effectiveMinutes + ' min' : ''}`}
        </button>
      </div>
    </>
  )
}
