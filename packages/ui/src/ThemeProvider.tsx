'use client'

import { useEffect, type ReactNode } from 'react'

export type Theme = 'minimal' | 'retro' | 'modern'
export type VisualMode = 'clean' | 'stylish'

export const VALID_THEMES: Theme[] = ['minimal', 'retro', 'modern']
export const VALID_MODES: VisualMode[] = ['clean', 'stylish']

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365

interface ThemeProviderProps {
  theme: Theme
  mode?: VisualMode
  children: ReactNode
}

export function ThemeProvider({ theme, mode = 'clean', children }: ThemeProviderProps) {
  useEffect(() => {
    const resolved: Theme = VALID_THEMES.includes(theme) ? theme : 'minimal'
    document.documentElement.setAttribute('data-theme', resolved)
    if (resolved !== theme) {
      document.cookie = `rpgt-theme=${resolved}; path=/; max-age=${ONE_YEAR_SECONDS}; SameSite=Lax`
    }
  }, [theme])

  useEffect(() => {
    const resolved: VisualMode = VALID_MODES.includes(mode) ? mode : 'clean'
    document.documentElement.setAttribute('data-mode', resolved)
    if (resolved !== mode) {
      document.cookie = `rpgt-mode=${resolved}; path=/; max-age=${ONE_YEAR_SECONDS}; SameSite=Lax`
    }
  }, [mode])

  return <>{children}</>
}

export function setTheme(theme: Theme): void {
  if (!VALID_THEMES.includes(theme)) return
  document.documentElement.setAttribute('data-theme', theme)
  document.cookie = `rpgt-theme=${theme}; path=/; max-age=${ONE_YEAR_SECONDS}; SameSite=Lax`
}

export function setMode(mode: VisualMode): void {
  if (!VALID_MODES.includes(mode)) return
  document.documentElement.setAttribute('data-mode', mode)
  document.cookie = `rpgt-mode=${mode}; path=/; max-age=${ONE_YEAR_SECONDS}; SameSite=Lax`
}
