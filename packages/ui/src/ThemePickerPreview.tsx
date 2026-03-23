'use client'

import { useState, useEffect } from 'react'
import { type Theme, VALID_THEMES, setTheme } from './ThemeProvider'

interface ThemeOption {
  id: Theme
  name: string
  description: string
  /** CSS colour values representing this theme's palette — used as dot swatches */
  palette: string[]
}

const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Clean, data-forward, productivity-tool aesthetic.',
    palette: ['#ffffff', '#1a1a2e', '#6b7280', '#3b82f6'],
  },
  {
    id: 'retro',
    name: 'Retro',
    description: 'Full RPG immersion. Dark, warm, narrative, tactile.',
    palette: ['#0a0a12', '#1a1a2e', '#d4a853', '#6b21a8'],
  },
  {
    id: 'modern',
    name: 'Modern',
    description: 'Sci-fi command centre. Dark, sharp, atmospheric, fluid.',
    palette: ['#0a0e1a', '#0f172a', '#00d4ff', '#e040fb'],
  },
]

interface ThemePickerPreviewProps {
  className?: string
}

/**
 * ThemePickerPreview — visual theme selection component.
 *
 * - Three theme cards: stacked on mobile (<640px), side-by-side on desktop
 * - Each card shows theme name, description, and colour palette dots
 * - Active card has an accent-coloured highlight border
 * - Keyboard-accessible radiogroup pattern
 * - Clicking immediately switches theme via setTheme()
 */
export function ThemePickerPreview({ className = '' }: ThemePickerPreviewProps) {
  const [activeTheme, setActiveTheme] = useState<Theme>('minimal')

  useEffect(() => {
    function readTheme() {
      const attr = document.documentElement.getAttribute('data-theme') as Theme | null
      setActiveTheme(attr && VALID_THEMES.includes(attr) ? attr : 'minimal')
    }
    readTheme()
    const observer = new MutationObserver(readTheme)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
  }, [])

  function handleSelect(theme: Theme) {
    setTheme(theme)
    setActiveTheme(theme)
  }

  function handleKeyDown(e: React.KeyboardEvent, theme: Theme, index: number) {
    let next: Theme | undefined
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault()
      next = VALID_THEMES[(index + 1) % VALID_THEMES.length]
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault()
      next = VALID_THEMES[(index - 1 + VALID_THEMES.length) % VALID_THEMES.length]
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleSelect(theme)
    }
    if (next) {
      handleSelect(next)
      // Move focus to the newly selected card
      const el = document.querySelector<HTMLElement>(`[data-theme-card="${next}"]`)
      el?.focus()
    }
  }

  return (
    <>
      <style>{`
        .theme-picker-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 0.75rem;
        }
        @media (min-width: 640px) {
          .theme-picker-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }
      `}</style>
      <div
        role="radiogroup"
        aria-label="Choose theme"
        className={`theme-picker-grid${className ? ` ${className}` : ''}`}
      >
        {THEME_OPTIONS.map((option, index) => {
          const isActive = option.id === activeTheme
          return (
            <div
              key={option.id}
              role="radio"
              aria-checked={isActive}
              aria-label={`${option.name} theme`}
              tabIndex={isActive ? 0 : -1}
              data-theme-card={option.id}
              onClick={() => handleSelect(option.id)}
              onKeyDown={(e) => handleKeyDown(e, option.id, index)}
              style={{
                position: 'relative',
                padding: '1rem',
                borderRadius: 'var(--radius-md, 12px)',
                border: isActive
                  ? '2px solid var(--color-accent)'
                  : '2px solid var(--color-border)',
                backgroundColor: 'var(--color-surface)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.625rem',
                transition: [
                  'border-color calc(150ms * var(--motion-scale, 0.3))',
                  'box-shadow calc(150ms * var(--motion-scale, 0.3))',
                ].join(', '),
                boxShadow: isActive
                  ? '0 0 0 1px var(--color-accent), 0 4px 12px rgba(0,0,0,0.1)'
                  : '0 1px 3px rgba(0,0,0,0.05)',
                outline: 'none',
              }}
              // Focus ring via pseudo-class workaround (focus-visible not available inline)
              onFocus={(e) => {
                e.currentTarget.style.outline = '2px solid var(--color-accent)'
                e.currentTarget.style.outlineOffset = '2px'
              }}
              onBlur={(e) => {
                e.currentTarget.style.outline = 'none'
              }}
            >
              {/* Active indicator dot */}
              {isActive && (
                <div
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    top: '0.75rem',
                    right: '0.75rem',
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    backgroundColor: 'var(--color-accent)',
                  }}
                />
              )}

              {/* Theme name */}
              <span
                style={{
                  fontFamily: 'var(--font-display, var(--font-body, Inter, system-ui, sans-serif))',
                  fontWeight: 700,
                  fontSize: '0.9375rem',
                  color: isActive ? 'var(--color-accent)' : 'var(--color-text)',
                  transition: 'color calc(150ms * var(--motion-scale, 0.3))',
                }}
              >
                {option.name}
              </span>

              {/* Description */}
              <span
                style={{
                  fontSize: '0.8125rem',
                  color: 'var(--color-muted)',
                  lineHeight: 1.4,
                }}
              >
                {option.description}
              </span>

              {/* Colour palette dots */}
              <div
                style={{
                  display: 'flex',
                  gap: '0.375rem',
                  alignItems: 'center',
                  marginTop: '0.25rem',
                }}
                aria-label={`${option.name} colour palette`}
              >
                {option.palette.map((colour, i) => (
                  <div
                    key={i}
                    aria-hidden="true"
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: '50%',
                      backgroundColor: colour,
                      border: '1px solid rgba(0,0,0,0.15)',
                      flexShrink: 0,
                    }}
                    title={colour}
                  />
                ))}
              </div>

              {/* Active badge */}
              {isActive && (
                <span
                  style={{
                    display: 'inline-block',
                    padding: '0.2rem 0.5rem',
                    borderRadius: 'var(--radius-sm, 4px)',
                    backgroundColor: 'var(--color-accent)',
                    color: 'var(--color-bg, #fff)',
                    fontSize: '0.6875rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    alignSelf: 'flex-start',
                  }}
                >
                  Active
                </span>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}
