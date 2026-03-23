'use client'

import { useCallback, useEffect, useState } from 'react'

export interface PathSelectorProps {
  onSelectPreset: () => void
  onSelectCustom: () => void
  backHref?: string
}

function useTheme() {
  const [theme, setTheme] = useState('minimal')
  useEffect(() => {
    const el = document.documentElement
    const update = () => setTheme(el.getAttribute('data-theme') ?? 'minimal')
    update()
    const obs = new MutationObserver(update)
    obs.observe(el, { attributes: true, attributeFilter: ['data-theme'] })
    return () => obs.disconnect()
  }, [])
  return theme
}

const THEME_CONFIG: Record<string, { heading: string; presetIcon: string; presetDesc: string; customIcon: string; customDesc: string }> = {
  minimal: {
    heading: 'Create a New Skill',
    presetIcon: '📋',
    presetDesc: 'Start from a template with predefined progression gates',
    customIcon: '✏️',
    customDesc: 'Define your own skill from scratch',
  },
  retro: {
    heading: 'Choose Your Class',
    presetIcon: '⚔️',
    presetDesc: 'Select a proven path — follow the footsteps of those who came before',
    customIcon: '🛡️',
    customDesc: 'Forge your own destiny — name your art and begin',
  },
  modern: {
    heading: 'Select Mission Type',
    presetIcon: '📡',
    presetDesc: 'Load a preset configuration with optimised progression parameters',
    customIcon: '⚙️',
    customDesc: 'Configure a custom skill module from scratch',
  },
}

export function PathSelector({ onSelectPreset, onSelectCustom, backHref = '/skills' }: PathSelectorProps) {
  const theme = useTheme()
  const config = THEME_CONFIG[theme] ?? THEME_CONFIG.minimal

  const handleKeyDown = useCallback((action: () => void) => (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      action()
    }
  }, [])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 md:p-8">
      <h1
        className="text-2xl md:text-3xl font-bold text-center mb-8"
        style={{
          fontFamily: 'var(--font-display, var(--font-body, Inter, system-ui, sans-serif))',
          color: 'var(--color-text)',
        }}
      >
        {config.heading}
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
        {/* Preset card */}
        <div
          role="button"
          tabIndex={0}
          onClick={onSelectPreset}
          onKeyDown={handleKeyDown(onSelectPreset)}
          className="rounded-xl p-6 cursor-pointer transition-all hover:scale-[1.02] focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '2px solid var(--color-border)',
            outline: 'none',
            minHeight: '160px',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--color-accent)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--color-border)'
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'var(--color-accent)'
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'var(--color-border)'
          }}
        >
          <div className="text-3xl mb-3">{config.presetIcon}</div>
          <h2
            className="text-lg font-semibold mb-2"
            style={{
              fontFamily: 'var(--font-display, var(--font-body, Inter, system-ui, sans-serif))',
              color: 'var(--color-text)',
            }}
          >
            Choose a Preset
          </h2>
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
            {config.presetDesc}
          </p>
        </div>

        {/* Custom card */}
        <div
          role="button"
          tabIndex={0}
          onClick={onSelectCustom}
          onKeyDown={handleKeyDown(onSelectCustom)}
          className="rounded-xl p-6 cursor-pointer transition-all hover:scale-[1.02] focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '2px solid var(--color-border)',
            outline: 'none',
            minHeight: '160px',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--color-accent)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--color-border)'
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'var(--color-accent)'
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'var(--color-border)'
          }}
        >
          <div className="text-3xl mb-3">{config.customIcon}</div>
          <h2
            className="text-lg font-semibold mb-2"
            style={{
              fontFamily: 'var(--font-display, var(--font-body, Inter, system-ui, sans-serif))',
              color: 'var(--color-text)',
            }}
          >
            Create Custom Skill
          </h2>
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
            {config.customDesc}
          </p>
        </div>
      </div>

      <a
        href={backHref}
        className="mt-6 text-sm hover:underline"
        style={{ color: 'var(--color-muted)' }}
      >
        ← Back to Skills
      </a>
    </div>
  )
}
