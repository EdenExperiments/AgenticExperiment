'use client'

import { useEffect, type ReactNode } from 'react'
import {
  type Theme,
  type LifeQuestTheme,
  type VisualMode,
  type Atmosphere,
  isLifeQuestTheme,
  isResolvableTheme,
  isAtmosphere,
  VALID_MODES,
} from './themeConstants'

export type { Theme, VisualMode, LifeQuestTheme, ProductTheme, Atmosphere } from './themeConstants'
export {
  VALID_THEMES,
  VALID_MODES,
  VALID_ATMOSPHERES,
  PRODUCT_THEMES,
  isResolvableTheme,
  isLifeQuestTheme,
  isAtmosphere,
} from './themeConstants'

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365

interface ThemeProviderProps {
  theme: Theme
  mode?: VisualMode
  atmosphere?: Atmosphere
  children: ReactNode
}

export function ThemeProvider({
  theme,
  mode = 'clean',
  atmosphere = 'none',
  children,
}: ThemeProviderProps) {
  useEffect(() => {
    const resolved: Theme = isResolvableTheme(theme) ? theme : 'minimal'
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

  useEffect(() => {
    const resolved: Atmosphere = isAtmosphere(atmosphere) ? atmosphere : 'none'
    document.documentElement.setAttribute('data-atmosphere', resolved)
    if (resolved !== atmosphere) {
      document.cookie = `rpgt-atmosphere=${resolved}; path=/; max-age=${ONE_YEAR_SECONDS}; SameSite=Lax`
    }
  }, [atmosphere])

  return <>{children}</>
}

export function setTheme(theme: LifeQuestTheme): void {
  if (!isLifeQuestTheme(theme)) return
  document.documentElement.setAttribute('data-theme', theme)
  document.cookie = `rpgt-theme=${theme}; path=/; max-age=${ONE_YEAR_SECONDS}; SameSite=Lax`
}

export function setMode(mode: VisualMode): void {
  if (!VALID_MODES.includes(mode)) return
  document.documentElement.setAttribute('data-mode', mode)
  document.cookie = `rpgt-mode=${mode}; path=/; max-age=${ONE_YEAR_SECONDS}; SameSite=Lax`
}

export function setAtmosphere(atmosphere: Atmosphere): void {
  if (!isAtmosphere(atmosphere)) return
  document.documentElement.setAttribute('data-atmosphere', atmosphere)
  document.cookie = `rpgt-atmosphere=${atmosphere}; path=/; max-age=${ONE_YEAR_SECONDS}; SameSite=Lax`
}
