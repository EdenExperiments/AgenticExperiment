'use client'

import { useState, useEffect } from 'react'
import { type Theme, VALID_THEMES, setTheme } from './ThemeProvider'

interface ThemeSwitcherProps {
  className?: string
}

const THEME_LABELS: Record<Theme, string> = {
  minimal: 'Minimal',
  retro: 'Retro',
  modern: 'Modern',
}

export function ThemeSwitcher({ className }: ThemeSwitcherProps) {
  const [activeTheme, setActiveTheme] = useState<Theme>('minimal')

  useEffect(() => {
    // Read the resolved theme from the html element
    function readTheme() {
      const attr = document.documentElement.getAttribute('data-theme') as Theme | null
      if (attr && VALID_THEMES.includes(attr)) {
        setActiveTheme(attr)
      } else {
        setActiveTheme('minimal')
      }
    }

    readTheme()

    // Update when theme changes via data-theme attribute
    const observer = new MutationObserver(readTheme)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    })
    return () => observer.disconnect()
  }, [])

  function handleSelect(theme: Theme) {
    setTheme(theme)
    setActiveTheme(theme)
  }

  return (
    <div
      className={`flex gap-2${className ? ` ${className}` : ''}`}
      role="group"
      aria-label="Theme selector"
    >
      {VALID_THEMES.map((theme) => {
        const isActive = theme === activeTheme
        return (
          <button
            key={theme}
            type="button"
            onClick={() => handleSelect(theme)}
            aria-pressed={isActive}
            aria-label={`Switch to ${THEME_LABELS[theme]} theme`}
            style={{
              minWidth: '44px',
              minHeight: '44px',
              borderColor: isActive
                ? 'var(--color-accent)'
                : 'var(--color-border)',
              backgroundColor: isActive
                ? 'var(--color-accent-muted, var(--color-surface))'
                : 'var(--color-surface)',
              color: isActive ? 'var(--color-accent)' : 'var(--color-text)',
              outline: 'none',
            }}
            className={[
              'px-4 py-2 rounded-[var(--radius-md)] border-2 text-sm font-medium',
              'transition-colors duration-150',
              'focus-visible:outline-2 focus-visible:outline-[var(--color-accent)] focus-visible:outline-offset-2',
              '[@media(hover:hover)]:hover:border-[var(--color-accent)]',
            ].join(' ')}
          >
            {THEME_LABELS[theme]}
          </button>
        )
      })}
    </div>
  )
}
