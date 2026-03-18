'use client'

import { useState } from 'react'

interface QuickLogSheetProps {
  skillName: string
  chips: [number, number, number, number]
  isOpen: boolean
  isLoading: boolean
  onClose: () => void
  onSubmit: (data: { xpDelta: number; logNote: string }) => void
}

export function QuickLogSheet({ skillName, chips, isOpen, isLoading, onClose, onSubmit }: QuickLogSheetProps) {
  const [selected, setSelected] = useState<number | 'custom'>(chips[1]) // second chip default
  const [customAmount, setCustomAmount] = useState('')
  const [logNote, setLogNote] = useState('')

  if (!isOpen) return null

  const effectiveAmount = selected === 'custom'
    ? parseInt(customAmount, 10) || 0
    : selected

  function handleSubmit() {
    if (effectiveAmount <= 0) return
    onSubmit({ xpDelta: effectiveAmount, logNote })
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40 md:flex md:items-center md:justify-center"
        onClick={onClose}
      />

      {/* Sheet / Modal */}
      <div
        role="dialog"
        aria-label={`${skillName} — Quick Log`}
        className="fixed bottom-0 inset-x-0 z-50 bg-white dark:bg-gray-900 rounded-t-2xl p-6 safe-area-inset-bottom
                   md:bottom-auto md:top-1/2 md:-translate-y-1/2 md:left-1/2 md:-translate-x-1/2 md:w-[480px] md:rounded-2xl md:max-h-[80vh]"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900 dark:text-white">{skillName} — Quick Log</h2>
          <button onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        {/* XP chips */}
        <div className="flex gap-2 flex-wrap mb-4">
          {chips.map((amount) => (
            <button
              key={amount}
              aria-label={`${amount} XP`}
              aria-pressed={selected === amount}
              onClick={() => setSelected(amount)}
              className={`flex-1 min-w-[60px] py-3 rounded-xl text-sm font-semibold transition-colors min-h-[44px]
                ${selected === amount
                  ? 'bg-[var(--color-accent,theme(colors.blue.600))] text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                }`}
            >
              {amount} XP
            </button>
          ))}
          <button
            aria-label="Custom amount"
            aria-pressed={selected === 'custom'}
            onClick={() => setSelected('custom')}
            className={`flex-1 min-w-[60px] py-3 rounded-xl text-sm font-semibold transition-colors min-h-[44px]
              ${selected === 'custom'
                ? 'bg-[var(--color-accent,theme(colors.blue.600))] text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
              }`}
          >
            Custom
          </button>
        </div>

        {selected === 'custom' && (
          <input
            type="number"
            inputMode="numeric"
            placeholder="Enter XP amount"
            value={customAmount}
            onChange={(e) => setCustomAmount(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm mb-4 dark:bg-gray-800 dark:border-gray-700"
          />
        )}

        {/* Note field (optional, always visible) */}
        <input
          type="text"
          placeholder="What did you do? (optional)"
          value={logNote}
          onChange={(e) => setLogNote(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm mb-4 dark:bg-gray-800 dark:border-gray-700"
        />

        <button
          aria-label="Log XP"
          onClick={handleSubmit}
          disabled={isLoading || effectiveAmount <= 0}
          className="w-full py-4 rounded-xl font-semibold text-white bg-[var(--color-accent,theme(colors.blue.600))]
                     hover:bg-[var(--color-accent-dark,theme(colors.blue.700))] disabled:opacity-50 disabled:cursor-not-allowed
                     transition-colors min-h-[48px]"
        >
          {isLoading ? 'Logging…' : 'Log XP'}
        </button>
      </div>
    </>
  )
}
