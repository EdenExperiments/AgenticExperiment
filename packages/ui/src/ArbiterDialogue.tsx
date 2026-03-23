'use client'

import { useEffect, useRef, useState } from 'react'

export interface ArbiterDialogueProps {
  text: string
  animate?: boolean
  variant?: 'greeting' | 'result' | 'error'
}

function useTheme() {
  const [theme, setTheme] = useState('minimal')
  useEffect(() => {
    const el = document.documentElement
    const update = () => setTheme(el.getAttribute('data-theme') ?? 'minimal')
    update()
    const obs = new MutationObserver(update)
    obs.observe(el, { attributes: true, attributeFilter: ['data-theme'] })
    return () => obs.disconnect()
  }, [])
  return theme
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return reduced
}

/**
 * ArbiterDialogue renders the full text in the DOM immediately for screen readers.
 * Visual reveal animations are CSS-only (clip-path, opacity) — no progressive DOM insertion.
 * Container uses aria-live="polite" for screen reader announcements.
 */
export function ArbiterDialogue({ text, animate = true, variant = 'greeting' }: ArbiterDialogueProps) {
  const theme = useTheme()
  const reducedMotion = usePrefersReducedMotion()
  const [revealed, setRevealed] = useState(!animate || reducedMotion)
  const containerRef = useRef<HTMLDivElement>(null)

  // When text changes with animation enabled, trigger reveal
  useEffect(() => {
    if (!animate || reducedMotion) {
      setRevealed(true)
      return
    }
    setRevealed(false)
    // Small delay then reveal — the CSS transition handles the visual
    const timer = setTimeout(() => setRevealed(true), 50)
    return () => clearTimeout(timer)
  }, [text, animate, reducedMotion])

  const variantStyles = getVariantStyles(variant)
  const animationClass = !reducedMotion && animate ? getAnimationClass(theme) : ''

  return (
    <div
      ref={containerRef}
      aria-live="polite"
      className={`rounded-xl p-4 ${animationClass}`}
      style={{
        ...variantStyles,
        fontFamily: 'var(--font-body, Inter, system-ui, sans-serif)',
      }}
    >
      <p
        className="text-sm leading-relaxed arbiter-text"
        style={{
          color: variant === 'error' ? 'var(--color-error)' : 'var(--color-text)',
          ...getRevealStyle(theme, revealed, reducedMotion),
        }}
      >
        {text}
      </p>

      {/* Theme-specific animation styles — injected once */}
      <style>{`
        /* Minimal: fade-in */
        .arbiter-fade .arbiter-text {
          transition: opacity calc(200ms * var(--motion-scale, 0.3)) ease-in;
        }

        /* Retro: typewriter via clip-path reveal */
        .arbiter-typewriter .arbiter-text {
          transition: clip-path calc(2000ms * var(--motion-scale, 0.7)) steps(40, end);
        }

        /* Modern: scan-line reveal via clip-path */
        .arbiter-scanline .arbiter-text {
          transition: clip-path calc(800ms * var(--motion-scale, 1)) ease-out;
        }

        @media (prefers-reduced-motion: reduce) {
          .arbiter-fade .arbiter-text,
          .arbiter-typewriter .arbiter-text,
          .arbiter-scanline .arbiter-text {
            transition: none !important;
            clip-path: none !important;
            opacity: 1 !important;
          }
        }
      `}</style>
    </div>
  )
}

function getVariantStyles(variant: string): React.CSSProperties {
  switch (variant) {
    case 'error':
      return {
        backgroundColor: 'rgba(239, 68, 68, 0.08)',
        border: '1px solid rgba(239, 68, 68, 0.2)',
      }
    case 'result':
      return {
        backgroundColor: 'var(--color-accent-muted, rgba(99, 102, 241, 0.08))',
        border: '1px solid var(--color-border)',
      }
    default: // greeting
      return {
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
      }
  }
}

function getAnimationClass(theme: string): string {
  switch (theme) {
    case 'retro': return 'arbiter-typewriter'
    case 'modern': return 'arbiter-scanline'
    default: return 'arbiter-fade'
  }
}

function getRevealStyle(
  theme: string,
  revealed: boolean,
  reducedMotion: boolean,
): React.CSSProperties {
  if (reducedMotion) return {}

  switch (theme) {
    case 'retro':
      // Typewriter: horizontal clip-path reveal
      return {
        clipPath: revealed ? 'inset(0 0 0 0)' : 'inset(0 100% 0 0)',
      }
    case 'modern':
      // Scan-line: vertical clip-path reveal with glow
      return {
        clipPath: revealed ? 'inset(0 0 0 0)' : 'inset(0 0 100% 0)',
      }
    default:
      // Minimal: simple opacity fade
      return {
        opacity: revealed ? 1 : 0,
      }
  }
}
