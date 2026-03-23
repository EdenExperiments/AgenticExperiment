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
        stroke="var(--color-accent)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Simple compass/calibration icon */}
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
        border: '3px solid #d4a853',
        borderRadius: '4px',
        backgroundColor: '#1a1a2e',
        boxShadow: state === 'thinking'
          ? '0 0 12px rgba(212, 168, 83, 0.6)'
          : '0 0 4px rgba(212, 168, 83, 0.2)',
        transition: `box-shadow calc(400ms * var(--motion-scale, 0.7))`,
        imageRendering: 'pixelated' as React.CSSProperties['imageRendering'],
      }}
    >
      {/* Pixel-art sage: simple hood/robe silhouette via SVG */}
      <svg
        width={size * 0.65}
        height={size * 0.65}
        viewBox="0 0 16 16"
        fill="none"
        style={{ imageRendering: 'pixelated' }}
      >
        {/* Hood */}
        <rect x="5" y="1" width="6" height="2" fill="#d4a853" />
        <rect x="4" y="3" width="8" height="1" fill="#d4a853" />
        {/* Face area */}
        <rect x="5" y="4" width="6" height="3" fill="#8b7e6a" />
        {/* Eyes */}
        <rect x="6" y="5" width="1" height="1" fill="#d4a853" />
        <rect x="9" y="5" width="1" height="1" fill="#d4a853" />
        {/* Robe */}
        <rect x="4" y="7" width="8" height="1" fill="#6b21a8" />
        <rect x="3" y="8" width="10" height="5" fill="#6b21a8" />
        <rect x="4" y="13" width="8" height="2" fill="#6b21a8" />
      </svg>
      {state === 'thinking' && (
        <style>{`
          @keyframes retro-glow {
            0%, 100% { box-shadow: 0 0 4px rgba(212, 168, 83, 0.2); }
            50% { box-shadow: 0 0 16px rgba(212, 168, 83, 0.8); }
          }
          @media (prefers-reduced-motion: reduce) {
            [style*="retro-glow"] { animation: none !important; }
          }
        `}</style>
      )}
    </div>
  )
}

/** Modern: Holographic wireframe geometric shape with cyan/magenta glow */
function ModernAvatar({ size, state }: { size: number; state: string }) {
  return (
    <div
      className="flex items-center justify-center rounded-lg"
      style={{
        width: size,
        height: size,
        backgroundColor: 'rgba(15, 23, 42, 0.8)',
        border: '1px solid rgba(0, 212, 255, 0.3)',
        boxShadow: state === 'thinking'
          ? '0 0 20px rgba(0, 212, 255, 0.4), inset 0 0 20px rgba(224, 64, 251, 0.1)'
          : '0 0 8px rgba(0, 212, 255, 0.15)',
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
        stroke="#00d4ff"
        strokeWidth="1"
      >
        {/* Hexagonal wireframe */}
        <polygon points="12,2 22,8 22,16 12,22 2,16 2,8" />
        <line x1="12" y1="2" x2="12" y2="22" />
        <line x1="2" y1="8" x2="22" y2="16" />
        <line x1="22" y1="8" x2="2" y2="16" />
        {/* Center node */}
        <circle cx="12" cy="12" r="2" fill="#00d4ff" opacity="0.5" />
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
            background: 'linear-gradient(90deg, transparent, #00d4ff, transparent)',
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
