'use client'

import { useEffect, type ReactNode } from 'react'

export type Theme =
  | 'rpg-game'
  | 'rpg-clean'
  | 'nutri-saas'
  | 'mental-calm'

interface ThemeProviderProps {
  theme: Theme
  children: ReactNode
}

/**
 * Applies `data-theme="<theme>"` to the `<html>` element.
 * Must be rendered in a Client Component so useEffect runs in the browser.
 * In SSR (Next.js), the initial theme class is applied by middleware via cookie
 * before this component hydrates — no flash of wrong theme.
 */
export function ThemeProvider({ theme, children }: ThemeProviderProps) {
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  return <>{children}</>
}
