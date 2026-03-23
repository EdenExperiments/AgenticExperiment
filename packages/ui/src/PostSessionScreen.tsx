'use client'

import { useState } from 'react'

interface PostSessionScreenProps {
  sessionDurationSeconds: number
  /** XP earned from this session — computed by the parent from elapsed time × rate × tier × bonus. */
  earnedXP: number
  bonusPercentage: number
  onSubmit: (data: {
    reflectionWhat?: string
    reflectionHow?: string
    reflectionFeeling?: string
  }) => void
  onDismiss: () => void
}

export function PostSessionScreen({
  sessionDurationSeconds,
  earnedXP,
  bonusPercentage,
  onSubmit,
  onDismiss,
}: PostSessionScreenProps) {
  const [reflectionWhat, setReflectionWhat] = useState('')
  const [reflectionHow, setReflectionHow] = useState('')
  const [reflectionFeeling, setReflectionFeeling] = useState('')

  const mins = Math.floor(sessionDurationSeconds / 60)
  const secs = sessionDurationSeconds % 60

  function handleSubmit() {
    onSubmit({ reflectionWhat, reflectionHow, reflectionFeeling })
  }

  return (
    <div
      className="flex flex-col min-h-screen"
      style={{ background: 'var(--color-bg)', color: 'var(--color-text)' }}
    >
      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        {/* Header */}
        <div>
          <h2
            className="text-2xl font-bold mb-1"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-accent)' }}
          >
            Session Complete!
          </h2>
          <p style={{ color: 'var(--color-text-secondary)' }}>
            {mins}m {secs}s
          </p>
        </div>

        {/* XP earned summary */}
        <div
          className="rounded-2xl p-5 text-center border"
          style={{ background: 'var(--color-bg-elevated)', borderColor: 'var(--color-border)' }}
        >
          <p className="text-4xl font-bold" style={{ color: 'var(--color-accent)' }}>
            +{earnedXP} XP
          </p>
          {bonusPercentage > 0 && (
            <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>
              includes +{bonusPercentage}% session bonus
            </p>
          )}
        </div>

        {/* Reflection textareas */}
        <div className="space-y-4">
          <p className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
            Reflection (optional)
          </p>
          <div>
            <label
              className="block text-sm mb-1"
              htmlFor="reflection-what"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              What did you work on?
            </label>
            <textarea
              id="reflection-what"
              data-testid="reflection-what"
              value={reflectionWhat}
              onChange={(e) => setReflectionWhat(e.target.value)}
              placeholder="What did you focus on this session?"
              className="w-full rounded-xl p-3 text-sm resize-none"
              style={{
                background: 'var(--color-bg-elevated)',
                color: 'var(--color-text)',
                border: '1px solid var(--color-border)',
              }}
              rows={3}
            />
          </div>
          <div>
            <label
              className="block text-sm mb-1"
              htmlFor="reflection-how"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              How did it feel?
            </label>
            <textarea
              id="reflection-how"
              data-testid="reflection-how"
              value={reflectionHow}
              onChange={(e) => setReflectionHow(e.target.value)}
              placeholder="How was the session?"
              className="w-full rounded-xl p-3 text-sm resize-none"
              style={{
                background: 'var(--color-bg-elevated)',
                color: 'var(--color-text)',
                border: '1px solid var(--color-border)',
              }}
              rows={3}
            />
          </div>
          <div>
            <label
              className="block text-sm mb-1"
              htmlFor="reflection-feeling"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Overall feeling
            </label>
            <textarea
              id="reflection-feeling"
              data-testid="reflection-feeling"
              value={reflectionFeeling}
              onChange={(e) => setReflectionFeeling(e.target.value)}
              placeholder="Rate your overall feeling"
              className="w-full rounded-xl p-3 text-sm resize-none"
              style={{
                background: 'var(--color-bg-elevated)',
                color: 'var(--color-text)',
                border: '1px solid var(--color-border)',
              }}
              rows={2}
            />
          </div>
        </div>
      </div>

      {/* Sticky footer */}
      <div
        data-testid="post-session-footer"
        data-sticky="true"
        className="sticky bottom-0 border-t p-4 space-y-3"
        style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)' }}
      >
        <button
          data-testid="log-session-btn"
          onClick={handleSubmit}
          className="btn btn-primary w-full py-4 min-h-[48px]"
        >
          Log Session (+{earnedXP} XP)
        </button>
        <button
          data-testid="dismiss-log-later"
          onClick={onDismiss}
          className="btn btn-ghost w-full py-2 text-sm"
        >
          Dismiss / Log Later
        </button>
      </div>
    </div>
  )
}
