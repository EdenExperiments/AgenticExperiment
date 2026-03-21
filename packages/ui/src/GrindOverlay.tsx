'use client'

import { useState, useEffect } from 'react'
import { GrindAnimation } from './GrindAnimation'

interface GrindOverlayProps {
  skillId: string
  skillName: string
  animationTheme: string
  tierColor: string
  tierNumber: number
  requiresActiveUse: boolean
  phase: 'config' | 'work' | 'break' | 'end-early'
  onBegin?: () => void
  onCancel?: () => void
  onSessionEnd?: (sessionData: { status: 'completed' | 'abandoned'; elapsedSeconds: number }) => void
}

export function GrindOverlay({
  skillId,
  skillName,
  animationTheme,
  tierColor,
  tierNumber,
  requiresActiveUse,
  phase: controlledPhase,
  onBegin,
  onCancel,
  onSessionEnd,
}: GrindOverlayProps) {
  const [internalPhase, setInternalPhase] = useState<'config' | 'work' | 'break' | 'end-early'>(controlledPhase)

  // Sync with controlled phase
  useEffect(() => {
    setInternalPhase(controlledPhase)
  }, [controlledPhase])

  // Listen for popstate during work phase
  useEffect(() => {
    function handlePopState() {
      if (internalPhase === 'work') {
        setInternalPhase('end-early')
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [internalPhase])

  const phase = internalPhase

  if (phase === 'config') {
    return (
      <div data-testid="grind-overlay" className="fixed inset-0 z-50 bg-gray-900 flex flex-col items-center justify-center p-6">
        <h2 className="text-2xl font-bold text-white mb-2">{skillName}</h2>
        <p className="text-gray-400 mb-4">25 min work / 5 min break</p>
        {requiresActiveUse && (
          <p className="text-amber-400 text-sm mb-4 flex items-center gap-1">
            Active Use Mode
            <span title="This skill requires active engagement during the session">ⓘ</span>
          </p>
        )}
        <p className="text-sm text-gray-500 mb-6">
          Sessions reaching 50% or more of target duration qualify for bonus XP.
        </p>
        <div className="flex gap-4">
          <button
            onClick={onCancel}
            className="px-6 py-3 rounded-xl border border-gray-600 text-gray-300 hover:text-white"
          >
            Cancel
          </button>
          <button
            data-testid="session-begin"
            onClick={onBegin}
            className="px-6 py-3 rounded-xl font-semibold text-white btn-primary"
            style={{ backgroundColor: tierColor }}
          >
            Begin
          </button>
        </div>
      </div>
    )
  }

  if (phase === 'end-early') {
    return (
      <div data-testid="grind-overlay" className="fixed inset-0 z-50 bg-gray-900/95 flex flex-col items-center justify-center p-6">
        <h2 className="text-xl font-bold text-white mb-2">End Session Early?</h2>
        <p className="text-gray-400 mb-6">Choose what to do with your progress</p>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button
            data-testid="option-keep-going"
            onClick={() => setInternalPhase('work')}
            className="w-full py-3 rounded-xl bg-gray-700 text-white font-medium"
          >
            Keep Going
          </button>
          <button
            data-testid="option-claim"
            onClick={() => onSessionEnd?.({ status: 'completed', elapsedSeconds: 0 })}
            className="w-full py-3 rounded-xl font-semibold text-white"
            style={{ backgroundColor: tierColor }}
          >
            Claim Session
          </button>
          <button
            data-testid="option-abandon"
            onClick={() => onSessionEnd?.({ status: 'abandoned', elapsedSeconds: 0 })}
            className="w-full py-3 rounded-xl border border-red-500 text-red-400"
          >
            Abandon
          </button>
        </div>
      </div>
    )
  }

  if (phase === 'work') {
    return (
      <div data-testid="grind-overlay" className="fixed inset-0 z-50 bg-gray-900 flex flex-col items-center justify-center p-6">
        <GrindAnimation theme={animationTheme} phase="work" tierColor={tierColor} tierNumber={tierNumber} />
        <p className="text-white mt-4 text-lg">{skillName} — Work Phase</p>
        <button
          onClick={() => setInternalPhase('end-early')}
          className="mt-8 px-6 py-3 rounded-xl border border-gray-600 text-gray-300"
        >
          End Session
        </button>
      </div>
    )
  }

  if (phase === 'break') {
    return (
      <div data-testid="grind-overlay" className="fixed inset-0 z-50 bg-gray-900 flex flex-col items-center justify-center p-6">
        <GrindAnimation theme={animationTheme} phase="break" tierColor={tierColor} tierNumber={tierNumber} />
        <p className="text-white mt-4 text-lg">Break Time</p>
        <button
          onClick={() => onSessionEnd?.({ status: 'completed', elapsedSeconds: 1500 })}
          className="mt-8 px-6 py-3 rounded-xl border border-gray-600 text-gray-300"
        >
          Skip Break
        </button>
      </div>
    )
  }

  return null
}
