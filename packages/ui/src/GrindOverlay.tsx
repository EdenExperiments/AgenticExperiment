'use client'

import { useState, useEffect, useRef } from 'react'
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
  const workStartRef = useRef<number | null>(null)
  const [elapsedSec, setElapsedSec] = useState(0)

  // Sync with controlled phase
  useEffect(() => {
    setInternalPhase(controlledPhase)
  }, [controlledPhase])

  // Track elapsed time during work phase
  useEffect(() => {
    if (internalPhase !== 'work') return
    if (workStartRef.current === null) {
      workStartRef.current = Date.now()
    }
    const interval = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - (workStartRef.current ?? Date.now())) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [internalPhase])

  // Reset timer when leaving work phase
  useEffect(() => {
    if (internalPhase !== 'work') {
      workStartRef.current = null
    }
  }, [internalPhase])

  // Listen for popstate during work phase
  useEffect(() => {
    function handlePopState() {
      if (internalPhase === 'work') {
        setInternalPhase('end-early')
      }
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [internalPhase])

  const phase = internalPhase

  const elapsedMins = Math.floor(elapsedSec / 60)
  const elapsedSecsRemainder = elapsedSec % 60

  function handleSessionEnd(status: 'completed' | 'abandoned') {
    onSessionEnd?.({ status, elapsedSeconds: elapsedSec })
  }

  // ── Config phase — RPG start menu ──────────────────────────────
  if (phase === 'config') {
    return (
      <div
        data-testid="grind-overlay"
        className="fixed inset-0 z-50 flex flex-col items-center justify-center p-6"
        style={{ background: 'var(--color-bg)' }}
      >
        {/* Subtle vignette border */}
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
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-muted)' }}
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

          {/* Divider */}
          <div className="h-px" style={{ background: 'var(--color-border)' }} />

          {/* Session details */}
          <div className="space-y-2 text-sm text-center">
            <p style={{ color: 'var(--color-text-secondary)' }}>25 min work · 5 min break</p>
            {requiresActiveUse && (
              <p className="flex items-center justify-center gap-1.5" style={{ color: 'var(--color-warning)' }}>
                <span>⚡</span>
                <span>Active Use Mode</span>
                <span title="This skill requires active engagement during the session" className="cursor-help">ⓘ</span>
              </p>
            )}
            <p style={{ color: 'var(--color-text-muted)' }}>
              50%+ of target duration qualifies for bonus XP
            </p>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <button
              data-testid="session-begin"
              onClick={onBegin}
              className="w-full py-4 rounded-xl font-semibold tracking-wide min-h-[48px] transition-opacity hover:opacity-90"
              style={{
                fontFamily: 'var(--font-display)',
                background: tierColor,
                color: '#fff',
                letterSpacing: '0.05em',
              }}
            >
              Begin Session
            </button>
            <button
              onClick={onCancel}
              className="w-full py-3 rounded-xl font-medium min-h-[44px] border transition-colors"
              style={{
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-secondary)',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── End-early confirmation ─────────────────────────────────────
  if (phase === 'end-early') {
    return (
      <div
        data-testid="grind-overlay"
        className="fixed inset-0 z-50 flex flex-col items-center justify-center p-6"
        style={{ background: 'var(--color-bg)' }}
      >
        <div
          className="w-full max-w-xs rounded-2xl p-6 space-y-4 border"
          style={{ background: 'var(--color-bg-elevated)', borderColor: 'var(--color-border-strong)' }}
        >
          <h2 className="text-xl font-bold text-center" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)' }}>
            End Session Early?
          </h2>
          <p className="text-sm text-center" style={{ color: 'var(--color-text-secondary)' }}>
            {elapsedSec > 0 ? `${elapsedMins}m ${elapsedSecsRemainder}s elapsed` : 'Choose what to do with your progress'}
          </p>
          <div className="flex flex-col gap-3 pt-2">
            <button
              data-testid="option-keep-going"
              onClick={() => setInternalPhase('work')}
              className="w-full py-3 rounded-xl font-medium min-h-[44px]"
              style={{ background: 'var(--color-bg-surface)', color: 'var(--color-text-primary)' }}
            >
              Keep Going
            </button>
            <button
              data-testid="option-claim"
              onClick={() => handleSessionEnd('completed')}
              className="w-full py-3 rounded-xl font-semibold min-h-[44px] transition-opacity hover:opacity-90"
              style={{ background: tierColor, color: '#fff' }}
            >
              Claim Session
            </button>
            <button
              data-testid="option-abandon"
              onClick={() => handleSessionEnd('abandoned')}
              className="w-full py-3 rounded-xl font-medium min-h-[44px] border"
              style={{ borderColor: 'var(--color-error)', color: 'var(--color-error)' }}
            >
              Abandon
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Work phase ─────────────────────────────────────────────────
  if (phase === 'work') {
    return (
      <div
        data-testid="grind-overlay"
        className="fixed inset-0 z-50 flex flex-col items-center justify-center p-6"
        style={{ background: 'var(--color-bg)' }}
      >
        <GrindAnimation theme={animationTheme} phase="work" tierColor={tierColor} tierNumber={tierNumber} />
        <p className="mt-4 text-lg font-medium" style={{ color: 'var(--color-text-primary)' }}>
          {skillName} — Work Phase
        </p>
        {elapsedSec > 0 && (
          <p className="text-sm mt-1 tabular-nums" style={{ color: 'var(--color-text-muted)' }}>
            {elapsedMins}m {String(elapsedSecsRemainder).padStart(2, '0')}s
          </p>
        )}
        <button
          onClick={() => setInternalPhase('end-early')}
          className="mt-8 px-6 py-3 rounded-xl font-medium border min-h-[44px]"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
        >
          End Session
        </button>
      </div>
    )
  }

  // ── Break phase ────────────────────────────────────────────────
  if (phase === 'break') {
    return (
      <div
        data-testid="grind-overlay"
        className="fixed inset-0 z-50 flex flex-col items-center justify-center p-6"
        style={{ background: 'var(--color-bg)' }}
      >
        <GrindAnimation theme={animationTheme} phase="break" tierColor={tierColor} tierNumber={tierNumber} />
        <p className="mt-4 text-lg font-medium" style={{ color: 'var(--color-text-primary)' }}>
          Break Time
        </p>
        <button
          onClick={() => handleSessionEnd('completed')}
          className="mt-8 px-6 py-3 rounded-xl font-medium border min-h-[44px]"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
        >
          Skip Break
        </button>
      </div>
    )
  }

  return null
}
