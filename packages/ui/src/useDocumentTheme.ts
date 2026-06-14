'use client'

import { useEffect, useState } from 'react'
import type { Theme, VisualMode } from './themeConstants'
import { VALID_MODES, isResolvableTheme } from './themeConstants'

export interface DocumentThemeState {
  theme: Theme
  mode: VisualMode
}

function readDocumentTheme(): DocumentThemeState {
  if (typeof document === 'undefined') {
    return { theme: 'minimal', mode: 'clean' }
  }

  const themeAttr = document.documentElement.getAttribute('data-theme') as Theme | null
  const modeAttr = document.documentElement.getAttribute('data-mode') as VisualMode | null

  return {
    theme: themeAttr && isResolvableTheme(themeAttr) ? themeAttr : 'minimal',
    mode: modeAttr && VALID_MODES.includes(modeAttr) ? modeAttr : 'clean',
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
      attributeFilter: ['data-theme', 'data-mode'],
    })
    return () => observer.disconnect()
  }, [])

  return state
}
