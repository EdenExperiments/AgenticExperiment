'use client'

import { useState, useEffect } from 'react'
import { type VisualMode, VALID_MODES, setMode } from './ThemeProvider'

interface ModeSwitcherProps { className?: string }

const MODE_LABELS: Record<VisualMode, string> = { clean: 'Clean', stylish: 'Stylish' }

export function ModeSwitcher({ className }: ModeSwitcherProps) {
  const [activeMode, setActiveMode] = useState<VisualMode>('clean')

  useEffect(() => {
    function readMode() {
      const attr = document.documentElement.getAttribute('data-mode') as VisualMode | null
      setActiveMode(attr && VALID_MODES.includes(attr) ? attr : 'clean')
    }
    readMode()
    const observer = new MutationObserver(readMode)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-mode'] })
    return () => observer.disconnect()
  }, [])

  function handleSelect(mode: VisualMode) {
    setMode(mode)
    setActiveMode(mode)
  }

  return (
    <div className={`flex gap-2${className ? ` ${className}` : ''}`} role="group" aria-label="Visual mode">
      {VALID_MODES.map((mode) => {
        const isActive = mode === activeMode
        return (
          <button key={mode} type="button" onClick={() => handleSelect(mode)} aria-pressed={isActive}
            aria-label={`Switch to ${MODE_LABELS[mode]} mode`}
            style={{ minWidth: '44px', minHeight: '44px', borderColor: isActive ? 'var(--color-accent)' : 'var(--color-border)',
              backgroundColor: isActive ? 'var(--color-accent-muted, var(--color-surface))' : 'var(--color-surface)',
              color: isActive ? 'var(--color-accent)' : 'var(--color-text)', outline: 'none' }}
            className="px-4 py-2 rounded-[var(--radius-md)] border-2 text-sm font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-[var(--color-accent)] focus-visible:outline-offset-2 [@media(hover:hover)]:hover:border-[var(--color-accent)]">
            {MODE_LABELS[mode]}
          </button>
        )
      })}
    </div>
  )
}
