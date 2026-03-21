'use client'

import { useState } from 'react'

interface PostSessionScreenProps {
  skillId: string
  sessionDurationSeconds: number
  tierNumber: number
  quickLogChips: number[]
  bonusPercentage: number
  onSubmit: (data: {
    xpDelta: number
    reflectionWhat?: string
    reflectionHow?: string
    reflectionFeeling?: string
  }) => void
  onDismiss: () => void
}

export function PostSessionScreen({
  skillId,
  sessionDurationSeconds,
  tierNumber,
  quickLogChips,
  bonusPercentage,
  onSubmit,
  onDismiss,
}: PostSessionScreenProps) {
  const [selectedXP, setSelectedXP] = useState(quickLogChips[1] ?? quickLogChips[0])
  const [reflectionWhat, setReflectionWhat] = useState('')
  const [reflectionHow, setReflectionHow] = useState('')
  const [reflectionFeeling, setReflectionFeeling] = useState('')

  function handleQuickLog() {
    onSubmit({ xpDelta: selectedXP })
  }

  function handleLogReflect() {
    onSubmit({
      xpDelta: selectedXP,
      reflectionWhat,
      reflectionHow,
      reflectionFeeling,
    })
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-900 text-white">
      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        <h2 className="text-2xl font-bold">Session Complete!</h2>
        <p className="text-gray-400">
          Duration: {Math.floor(sessionDurationSeconds / 60)}m {sessionDurationSeconds % 60}s
          {bonusPercentage > 0 && ` · +${bonusPercentage}% bonus XP`}
        </p>

        {/* XP Chip selector */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-300">Select XP</p>
          <div className="flex gap-2 flex-wrap">
            {quickLogChips.map((chip) => (
              <button
                key={chip}
                onClick={() => setSelectedXP(chip)}
                aria-pressed={selectedXP === chip}
                className={`px-4 py-2 rounded-xl text-sm font-semibold min-h-[44px] transition-colors ${
                  selectedXP === chip
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300'
                }`}
              >
                {chip} XP
              </button>
            ))}
          </div>
        </div>

        {/* Reflection textareas */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1" htmlFor="reflection-what">
              What did you work on?
            </label>
            <textarea
              id="reflection-what"
              data-testid="reflection-what"
              value={reflectionWhat}
              onChange={(e) => setReflectionWhat(e.target.value)}
              placeholder="What did you focus on this session?"
              className="w-full rounded-xl p-3 bg-gray-800 text-white text-sm resize-none"
              rows={3}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1" htmlFor="reflection-how">
              How did it feel?
            </label>
            <textarea
              id="reflection-how"
              data-testid="reflection-how"
              value={reflectionHow}
              onChange={(e) => setReflectionHow(e.target.value)}
              placeholder="How was the session?"
              className="w-full rounded-xl p-3 bg-gray-800 text-white text-sm resize-none"
              rows={3}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1" htmlFor="reflection-feeling">
              Overall feeling
            </label>
            <textarea
              id="reflection-feeling"
              data-testid="reflection-feeling"
              value={reflectionFeeling}
              onChange={(e) => setReflectionFeeling(e.target.value)}
              placeholder="Rate your overall feeling"
              className="w-full rounded-xl p-3 bg-gray-800 text-white text-sm resize-none"
              rows={2}
            />
          </div>
        </div>
      </div>

      {/* Sticky footer */}
      <div
        data-testid="post-session-footer"
        data-sticky="true"
        className="sticky bottom-0 bg-gray-900 border-t border-gray-700 p-4 space-y-3"
      >
        <button
          data-testid="quick-log-btn"
          onClick={handleQuickLog}
          className="w-full py-4 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-700 min-h-[48px]"
        >
          Quick Log ({selectedXP} XP)
        </button>
        <button
          onClick={handleLogReflect}
          className="w-full py-3 rounded-xl font-medium border border-gray-600 text-gray-300 hover:text-white"
        >
          Log + Reflect
        </button>
        <button
          data-testid="dismiss-log-later"
          onClick={onDismiss}
          className="w-full py-2 text-sm text-gray-500 hover:text-gray-300"
        >
          Dismiss / Log Later
        </button>
      </div>
    </div>
  )
}
