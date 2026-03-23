'use client'

import { useState, useEffect } from 'react'
import { type Theme, VALID_THEMES } from './ThemeProvider'

interface DefaultAvatarProps {
  displayName: string | null
  size: 'sm' | 'md' | 'lg'
  onClick?: () => void
  className?: string
}

const SIZE_PX: Record<'sm' | 'md' | 'lg', number> = {
  sm: 44,
  md: 64,
  lg: 96,
}

const FONT_SIZE: Record<'sm' | 'md' | 'lg', string> = {
  sm: '1rem',
  md: '1.5rem',
  lg: '2.25rem',
}

function getInitial(displayName: string | null): string {
  if (!displayName) return '?'
  return displayName.trim().charAt(0).toUpperCase()
}

/** Minimal theme: clean circle with initial */
function MinimalAvatar({ displayName, px, fontSize }: { displayName: string | null; px: number; fontSize: string }) {
  return (
    <div
      style={{
        width: px,
        height: px,
        minWidth: px,
        minHeight: px,
        borderRadius: '50%',
        backgroundColor: 'var(--color-surface)',
        border: '2px solid var(--color-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize,
        fontFamily: 'var(--font-display, var(--font-body, Inter, system-ui, sans-serif))',
        fontWeight: 700,
        color: 'var(--color-accent)',
        flexShrink: 0,
      }}
      aria-label={displayName ? `${displayName}'s avatar` : 'Your avatar'}
    >
      {getInitial(displayName)}
    </div>
  )
}

/** Retro theme: pixel-art-style silhouette */
function RetroAvatar({ displayName, px, fontSize }: { displayName: string | null; px: number; fontSize: string }) {
  const initial = getInitial(displayName)
  return (
    <div
      style={{
        width: px,
        height: px,
        minWidth: px,
        minHeight: px,
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
      aria-label={displayName ? `${displayName}'s avatar` : 'Your avatar'}
    >
      {/* Pixel-art frame: double border via box-shadow */}
      <div
        style={{
          width: px,
          height: px,
          borderRadius: 'var(--radius-sm, 4px)',
          backgroundColor: 'var(--color-surface)',
          border: '2px solid var(--color-accent)',
          boxShadow: '0 0 0 2px var(--color-bg, #0a0a12), 0 0 0 4px var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        {/* Pixel silhouette body hint */}
        <svg
          width={Math.round(px * 0.5)}
          height={Math.round(px * 0.5)}
          viewBox="0 0 20 20"
          fill="none"
          aria-hidden="true"
          style={{ position: 'absolute', opacity: 0.15 }}
        >
          <rect x="7" y="1" width="6" height="6" fill="currentColor" />
          <rect x="5" y="9" width="10" height="11" fill="currentColor" />
        </svg>
        <span
          style={{
            fontSize,
            fontFamily: 'var(--font-display, "Press Start 2P", monospace)',
            fontWeight: 700,
            color: 'var(--color-accent)',
            position: 'relative',
            zIndex: 1,
            imageRendering: 'pixelated',
          }}
        >
          {initial}
        </span>
      </div>
    </div>
  )
}

/** Modern theme: holographic frame with glow */
function ModernAvatar({ displayName, px, fontSize }: { displayName: string | null; px: number; fontSize: string }) {
  return (
    <div
      style={{
        width: px,
        height: px,
        minWidth: px,
        minHeight: px,
        borderRadius: '50%',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
      aria-label={displayName ? `${displayName}'s avatar` : 'Your avatar'}
    >
      {/* Outer glow ring */}
      <div
        style={{
          position: 'absolute',
          inset: -2,
          borderRadius: '50%',
          background: 'conic-gradient(from 0deg, var(--color-accent), var(--color-secondary, #e040fb), var(--color-accent))',
          opacity: 0.8,
        }}
        aria-hidden="true"
      />
      {/* Inner surface */}
      <div
        style={{
          position: 'absolute',
          inset: 2,
          borderRadius: '50%',
          backgroundColor: 'var(--color-surface)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span
          style={{
            fontSize,
            fontFamily: 'var(--font-display, Rajdhani, "Space Grotesk", system-ui, sans-serif)',
            fontWeight: 700,
            color: 'var(--color-accent)',
            textShadow: '0 0 8px var(--color-accent)',
          }}
        >
          {getInitial(displayName)}
        </span>
      </div>
    </div>
  )
}

/**
 * DefaultAvatar — theme-aware default avatar using CSS custom properties.
 *
 * - Minimal: clean initial circle
 * - Retro: pixel-art framed initial
 * - Modern: holographic glow ring
 *
 * Min 44x44px tap target when interactive (onClick provided).
 */
export function DefaultAvatar({ displayName, size, onClick, className = '' }: DefaultAvatarProps) {
  const [theme, setThemeState] = useState<Theme>('minimal')
  const px = SIZE_PX[size]
  const fontSize = FONT_SIZE[size]

  useEffect(() => {
    function readTheme() {
      const attr = document.documentElement.getAttribute('data-theme') as Theme | null
      setThemeState(attr && VALID_THEMES.includes(attr) ? attr : 'minimal')
    }
    readTheme()
    const observer = new MutationObserver(readTheme)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
  }, [])

  const inner =
    theme === 'retro' ? (
      <RetroAvatar displayName={displayName} px={px} fontSize={fontSize} />
    ) : theme === 'modern' ? (
      <ModernAvatar displayName={displayName} px={px} fontSize={fontSize} />
    ) : (
      <MinimalAvatar displayName={displayName} px={px} fontSize={fontSize} />
    )

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={className}
        style={{
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          minWidth: Math.max(px, 44),
          minHeight: Math.max(px, 44),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '50%',
          outline: 'none',
        }}
        aria-label={displayName ? `Change ${displayName}'s avatar` : 'Change avatar'}
        // focus ring
        onFocus={(e) => {
          e.currentTarget.style.outline = '2px solid var(--color-accent)'
          e.currentTarget.style.outlineOffset = '2px'
        }}
        onBlur={(e) => {
          e.currentTarget.style.outline = 'none'
        }}
      >
        {inner}
      </button>
    )
  }

  return <div className={className}>{inner}</div>
}
