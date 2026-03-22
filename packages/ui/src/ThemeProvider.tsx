'use client'

import { useEffect, type ReactNode } from 'react'

export type Theme = 'minimal' | 'retro' | 'modern'

export const VALID_THEMES: Theme[] = ['minimal', 'retro', 'modern']

interface ThemeProviderProps {
  theme: Theme
  children: ReactNode
}

/**
 * Applies `data-theme="<theme>"` to the `<html>` element.
 * Must be rendered in a Client Component so useEffect runs in the browser.
 * In SSR (Next.js), the initial theme is applied by middleware via cookie
 * before this component hydrates — no flash of wrong theme.
 *
 * Cookie migration: if the stored `rpgt-theme` cookie holds an old value
 * (e.g. `rpg-game`, `rpg-clean`, or other legacy values) that is not in VALID_THEMES, the caller
 * (layout.tsx) already falls back to `'minimal'`. ThemeProvider additionally
 * overwrites any invalid cookie it detects on the client to prevent stale
 * values persisting across hard navigations.
 */
export function ThemeProvider({ theme, children }: ThemeProviderProps) {
  useEffect(() => {
    // Resolve to a valid theme — migrate any stale cookie value
    const resolved: Theme = VALID_THEMES.includes(theme) ? theme : 'minimal'

    document.documentElement.setAttribute('data-theme', resolved)

    // Overwrite cookie if the received value was invalid
    if (resolved !== theme) {
      const oneYear = 60 * 60 * 24 * 365
      document.cookie = `rpgt-theme=${resolved}; path=/; max-age=${oneYear}; SameSite=Lax`
    }
  }, [theme])

  return <>{children}</>
}

/**
 * Immediately applies a theme to the page and persists it in the
 * `rpgt-theme` cookie (1-year expiry). Silently ignores invalid values.
 *
 * Use this in the ThemeSwitcher component and anywhere else that needs
 * to change the active theme at runtime without a page reload.
 */
export function setTheme(theme: Theme): void {
  if (!VALID_THEMES.includes(theme)) return

  document.documentElement.setAttribute('data-theme', theme)

  const oneYear = 60 * 60 * 24 * 365
  document.cookie = `rpgt-theme=${theme}; path=/; max-age=${oneYear}; SameSite=Lax`
}
