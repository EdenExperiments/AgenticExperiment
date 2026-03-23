'use client'

import { useEffect, useState } from 'react'

export interface ArbiterAvatarProps {
  state: 'idle' | 'thinking' | 'speaking'
  size?: 'sm' | 'md' | 'lg'
}

const SIZE_MAP = { sm: 48, md: 72, lg: 96 } as const

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

export function ArbiterAvatar({ state, size = 'md' }: ArbiterAvatarProps) {
  const theme = useTheme()
  const px = SIZE_MAP[size]

  return (
    <div
      aria-hidden="true"
      className="shrink-0"
      style={{ width: px, height: px }}
    >
      {theme === 'retro' ? (
        <RetroAvatar size={px} state={state} />
      ) : theme === 'modern' ? (
        <ModernAvatar size={px} state={state} />
      ) : (
        <MinimalAvatar size={px} state={state} />
      )}
    </div>
  )
}

/** Minimal: Clean circular icon with subtle pulse on thinking */
function MinimalAvatar({ size, state }: { size: number; state: string }) {
  return (
    <div
      className="rounded-full flex items-center justify-center"
      style={{
        width: size,
        height: size,
        backgroundColor: 'var(--color-surface)',
        border: '2px solid var(--color-border)',
        animation: state === 'thinking'
          ? `arbiter-pulse calc(1500ms * var(--motion-scale, 0.3)) ease-in-out infinite`
          : undefined,
      }}
    >
      <svg
        width={size * 0.5}
        height={size * 0.5}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ color: 'var(--color-accent)' }}
      >
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="3" />
        <line x1="12" y1="2" x2="12" y2="6" />
        <line x1="12" y1="18" x2="12" y2="22" />
        <line x1="2" y1="12" x2="6" y2="12" />
        <line x1="18" y1="12" x2="22" y2="12" />
      </svg>
      <style>{`
        @keyframes arbiter-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.05); }
        }
        @media (prefers-reduced-motion: reduce) {
          [style*="arbiter-pulse"] { animation: none !important; }
        }
      `}</style>
    </div>
  )
}

/** Retro: Pixel-art sage silhouette with amber glow and gold border */
function RetroAvatar({ size, state }: { size: number; state: string }) {
  return (
    <div
      className="flex items-center justify-center"
      style={{
        width: size,
        height: size,
        border: '3px solid var(--color-accent)',
        borderRadius: '4px',
        backgroundColor: 'var(--color-surface)',
        animation: state === 'thinking'
          ? `retro-glow calc(1500ms * var(--motion-scale, 0.7)) ease-in-out infinite`
          : undefined,
        boxShadow: state !== 'thinking'
          ? '0 0 4px color-mix(in srgb, var(--color-accent) 20%, transparent)'
          : undefined,
        imageRendering: 'pixelated' as React.CSSProperties['imageRendering'],
      }}
    >
      {/* Pixel-art sage: hood/robe silhouette via SVG */}
      <svg
        width={size * 0.65}
        height={size * 0.65}
        viewBox="0 0 16 16"
        fill="none"
        style={{ imageRendering: 'pixelated' }}
      >
        {/* Hood — accent colour */}
        <rect x="5" y="1" width="6" height="2" fill="var(--color-accent)" />
        <rect x="4" y="3" width="8" height="1" fill="var(--color-accent)" />
        {/* Face area — muted */}
        <rect x="5" y="4" width="6" height="3" fill="var(--color-muted)" />
        {/* Eyes — accent */}
        <rect x="6" y="5" width="1" height="1" fill="var(--color-accent)" />
        <rect x="9" y="5" width="1" height="1" fill="var(--color-accent)" />
        {/* Robe — secondary */}
        <rect x="4" y="7" width="8" height="1" fill="var(--color-secondary, var(--color-accent))" />
        <rect x="3" y="8" width="10" height="5" fill="var(--color-secondary, var(--color-accent))" />
        <rect x="4" y="13" width="8" height="2" fill="var(--color-secondary, var(--color-accent))" />
      </svg>
      <style>{`
        @keyframes retro-glow {
          0%, 100% { box-shadow: 0 0 4px color-mix(in srgb, var(--color-accent) 20%, transparent); }
          50% { box-shadow: 0 0 16px color-mix(in srgb, var(--color-accent) 60%, transparent); }
        }
        @media (prefers-reduced-motion: reduce) {
          [style*="retro-glow"] { animation: none !important; }
        }
      `}</style>
    </div>
  )
}

/** Modern: Holographic wireframe geometric shape with accent glow */
function ModernAvatar({ size, state }: { size: number; state: string }) {
  return (
    <div
      className="flex items-center justify-center rounded-lg"
      style={{
        width: size,
        height: size,
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        boxShadow: state === 'thinking'
          ? `0 0 20px color-mix(in srgb, var(--color-accent) 40%, transparent),
             inset 0 0 20px color-mix(in srgb, var(--color-secondary, var(--color-accent)) 10%, transparent)`
          : `0 0 8px color-mix(in srgb, var(--color-accent) 15%, transparent)`,
        transition: `box-shadow calc(400ms * var(--motion-scale, 1))`,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Wireframe geometric head */}
      <svg
        width={size * 0.6}
        height={size * 0.6}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        style={{ color: 'var(--color-accent)' }}
      >
        <polygon points="12,2 22,8 22,16 12,22 2,16 2,8" />
        <line x1="12" y1="2" x2="12" y2="22" />
        <line x1="2" y1="8" x2="22" y2="16" />
        <line x1="22" y1="8" x2="2" y2="16" />
        <circle cx="12" cy="12" r="2" fill="currentColor" opacity="0.5" />
      </svg>

      {/* Scan line on thinking */}
      {state === 'thinking' && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '2px',
            background: `linear-gradient(90deg, transparent, var(--color-accent), transparent)`,
            animation: `arbiter-scan calc(1500ms * var(--motion-scale, 1)) linear infinite`,
          }}
        />
      )}
      <style>{`
        @keyframes arbiter-scan {
          0% { top: 0; }
          100% { top: 100%; }
        }
        @media (prefers-reduced-motion: reduce) {
          [style*="arbiter-scan"] { animation: none !important; }
        }
      `}</style>
    </div>
  )
}
