'use client'

import { useEffect, useState } from 'react'
import type { Theme, VisualMode, Atmosphere } from './themeConstants'
import { VALID_MODES, isResolvableTheme, isAtmosphere } from './themeConstants'

export interface DocumentThemeState {
  theme: Theme
  mode: VisualMode
  atmosphere: Atmosphere
}

function readDocumentTheme(): DocumentThemeState {
  if (typeof document === 'undefined') {
    return { theme: 'minimal', mode: 'clean', atmosphere: 'none' }
  }

  const themeAttr = document.documentElement.getAttribute('data-theme') as Theme | null
  const modeAttr = document.documentElement.getAttribute('data-mode') as VisualMode | null
  const atmosphereAttr = document.documentElement.getAttribute('data-atmosphere')

  return {
    theme: themeAttr && isResolvableTheme(themeAttr) ? themeAttr : 'minimal',
    mode: modeAttr && VALID_MODES.includes(modeAttr) ? modeAttr : 'clean',
    atmosphere: atmosphereAttr && isAtmosphere(atmosphereAttr) ? atmosphereAttr : 'none',
  }
}

/** Reads `data-theme` and `data-mode` from :root; re-renders when either changes. */
export function useDocumentTheme(): DocumentThemeState {
  const [state, setState] = useState<DocumentThemeState>(() => readDocumentTheme())

  useEffect(() => {
    setState(readDocumentTheme())

    const observer = new MutationObserver(() => {
      setState(readDocumentTheme())
    })
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'data-mode', 'data-atmosphere'],
    })
    return () => observer.disconnect()
  }, [])

  return state
}
