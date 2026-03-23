'use client'

import { useState, useEffect, useRef } from 'react'
import { type Theme, VALID_THEMES } from './ThemeProvider'
import { DefaultAvatar } from './DefaultAvatar'

interface CategoryCount {
  category: string
  count: number
}

interface AccountStats {
  total_xp: number
  longest_streak: number
  skill_count: number
  category_distribution: CategoryCount[]
}

export interface PlayerCardProps {
  displayName: string | null
  avatarUrl: string | null
  stats: AccountStats | null
  onAvatarClick?: () => void
  onRemoveAvatar?: () => void
  onSaveDisplayName?: (name: string) => Promise<void>
  isRemovingAvatar?: boolean
}

function formatXP(xp: number): string {
  return xp.toLocaleString()
}

/** Skeleton shimmer block */
function Skeleton({ width, height = '1rem', className = '' }: { width: string; height?: string; className?: string }) {
  return (
    <div
      className={`animate-pulse rounded ${className}`}
      style={{
        width,
        height,
        backgroundColor: 'var(--color-border)',
        borderRadius: 'var(--radius-sm, 4px)',
      }}
      aria-hidden="true"
    />
  )
}

/** Stat value display */
function StatBlock({
  label,
  value,
  isLoading,
}: {
  label: string
  value: string | number
  isLoading: boolean
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
      {isLoading ? (
        <Skeleton width="3rem" height="1.75rem" />
      ) : (
        <span
          style={{
            fontFamily: 'var(--font-display, var(--font-body, Inter, system-ui, sans-serif))',
            fontWeight: 700,
            fontSize: '1.25rem',
            color: 'var(--color-accent)',
          }}
        >
          {value}
        </span>
      )}
      <span
        style={{
          fontSize: '0.7rem',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: 'var(--color-muted)',
        }}
      >
        {label}
      </span>
    </div>
  )
}

/** Category pill */
function CategoryPill({ label }: { label: string }) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '0.2rem 0.6rem',
        borderRadius: 'var(--radius-sm, 4px)',
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        fontSize: '0.7rem',
        color: 'var(--color-text)',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  )
}

/** Truncate display name at the given character limit */
function truncateName(name: string | null, limit: number): string {
  if (!name) return ''
  return name.length > limit ? name.slice(0, limit) + '…' : name
}

/**
 * PlayerCard — Identity card for the account page.
 *
 * Theme treatments:
 * - Minimal: compact info block, bold stat numbers, flat surface
 * - Retro: character-sheet framing, gold border, RPG stat block
 * - Modern: glass-effect background, holographic avatar, glowing stats
 */
export function PlayerCard({
  displayName,
  avatarUrl,
  stats,
  onAvatarClick,
  onRemoveAvatar,
  onSaveDisplayName,
  isRemovingAvatar = false,
}: PlayerCardProps) {
  const [theme, setThemeState] = useState<Theme>('minimal')
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState('')
  const [savingName, setSavingName] = useState(false)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const isLoading = stats === null
  const hasNoProfile = !displayName && !avatarUrl

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

  // Top 3 categories by count
  const topCategories = stats
    ? [...stats.category_distribution].sort((a, b) => b.count - a.count).slice(0, 3)
    : []

  // Theme-specific card styles
  const cardStyle: React.CSSProperties = {
    backgroundColor: 'var(--color-surface)',
    borderRadius: 'var(--radius-md, 12px)',
    border: '1px solid var(--color-border)',
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
    transition: 'box-shadow calc(200ms * var(--motion-scale, 0.3))',
  }

  if (theme === 'retro') {
    cardStyle.border = '2px solid var(--color-accent)'
    cardStyle.boxShadow = '0 0 0 2px var(--color-bg, #0a0a12), 0 0 0 4px var(--color-border)'
  } else if (theme === 'modern') {
    cardStyle.background = 'var(--color-surface)'
    cardStyle.backdropFilter = 'blur(12px)'
    cardStyle.border = '1px solid var(--color-border)'
    cardStyle.boxShadow = '0 0 24px rgba(0, 212, 255, 0.06)'
  }

  // Responsive name truncation: show shorter on mobile (24 chars), longer on desktop (32 chars)
  // We use a static 28-char limit since we can't do JS-side media queries here easily
  const truncatedName = truncateName(displayName, 28)

  return (
    <section aria-label="Player profile card" style={cardStyle}>
      {/* Header row: avatar + name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {/* Avatar */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          {avatarUrl ? (
            <button
              type="button"
              onClick={onAvatarClick}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: onAvatarClick ? 'pointer' : 'default',
                borderRadius: '50%',
                minWidth: 64,
                minHeight: 64,
                display: 'block',
              }}
              aria-label={displayName ? `Change ${displayName}'s avatar` : 'Change avatar'}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={avatarUrl}
                alt={displayName ? `${displayName}'s avatar` : 'Your avatar'}
                width={64}
                height={64}
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: theme === 'retro'
                    ? '2px solid var(--color-accent)'
                    : theme === 'modern'
                    ? '2px solid var(--color-accent)'
                    : '2px solid var(--color-border)',
                  boxShadow: theme === 'modern' ? '0 0 12px rgba(0, 212, 255, 0.3)' : undefined,
                }}
              />
            </button>
          ) : (
            <DefaultAvatar
              displayName={displayName}
              size="md"
              onClick={onAvatarClick}
            />
          )}
        </div>

        {/* Name + avatar actions */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {editingName ? (
            <form
              onSubmit={async (e) => {
                e.preventDefault()
                if (!onSaveDisplayName) return
                setSavingName(true)
                try {
                  await onSaveDisplayName(nameValue)
                  setEditingName(false)
                } finally {
                  setSavingName(false)
                }
              }}
              style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}
            >
              <input
                ref={nameInputRef}
                type="text"
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                maxLength={100}
                placeholder="Display name"
                disabled={savingName}
                style={{
                  flex: 1,
                  minWidth: 0,
                  padding: '0.375rem 0.625rem',
                  borderRadius: 'var(--radius-sm, 4px)',
                  backgroundColor: 'var(--color-bg)',
                  color: 'var(--color-text)',
                  border: '1px solid var(--color-accent)',
                  fontSize: '0.9375rem',
                  fontFamily: 'var(--font-display, var(--font-body, Inter, system-ui, sans-serif))',
                  fontWeight: 600,
                  outline: 'none',
                }}
              />
              <button
                type="submit"
                disabled={savingName}
                style={{
                  padding: '0.375rem 0.75rem',
                  borderRadius: 'var(--radius-sm, 4px)',
                  backgroundColor: 'var(--color-accent)',
                  color: 'var(--color-bg, #fff)',
                  border: 'none',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: savingName ? 'not-allowed' : 'pointer',
                  opacity: savingName ? 0.6 : 1,
                  whiteSpace: 'nowrap',
                }}
              >
                {savingName ? 'Saving…' : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => setEditingName(false)}
                disabled={savingName}
                style={{
                  padding: '0.375rem 0.5rem',
                  background: 'none',
                  border: 'none',
                  fontSize: '0.75rem',
                  color: 'var(--color-muted)',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </form>
          ) : displayName ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <button
                type="button"
                onClick={onSaveDisplayName ? () => {
                  setNameValue(displayName)
                  setEditingName(true)
                  setTimeout(() => nameInputRef.current?.focus(), 0)
                } : undefined}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: onSaveDisplayName ? 'pointer' : 'default',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                }}
              >
                <h2
                  style={{
                    fontFamily: 'var(--font-display, var(--font-body, Inter, system-ui, sans-serif))',
                    fontWeight: 700,
                    fontSize: '1.125rem',
                    color: 'var(--color-text)',
                    margin: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title={displayName}
                >
                  {truncatedName}
                </h2>
                {onSaveDisplayName && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: 0.5 }}>
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                )}
              </button>
              {/* Remove avatar link */}
              {avatarUrl && onRemoveAvatar && (
                <button
                  type="button"
                  onClick={onRemoveAvatar}
                  disabled={isRemovingAvatar}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: isRemovingAvatar ? 'not-allowed' : 'pointer',
                    color: 'var(--color-error)',
                    fontSize: '0.75rem',
                    textDecoration: 'underline',
                    textAlign: 'left',
                    opacity: isRemovingAvatar ? 0.6 : 1,
                  }}
                >
                  {isRemovingAvatar ? 'Removing…' : 'Remove avatar'}
                </button>
              )}
            </div>
          ) : (
            <p
              style={{
                fontSize: '0.875rem',
                color: 'var(--color-muted)',
                margin: 0,
                fontStyle: 'italic',
              }}
            >
              {theme === 'retro' ? 'Adventurer' : theme === 'modern' ? 'Operator' : 'No display name'}
            </p>
          )}
        </div>
      </div>

      {/* Empty profile CTA */}
      {hasNoProfile && (onAvatarClick || onSaveDisplayName) && (
        <div
          style={{
            border: '1px dashed var(--color-border)',
            borderRadius: 'var(--radius-sm, 4px)',
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            alignItems: 'flex-start',
          }}
        >
          <p style={{ fontSize: '0.875rem', color: 'var(--color-muted)', margin: 0 }}>
            Set up your profile
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {onAvatarClick && (
              <button
                type="button"
                onClick={onAvatarClick}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: 'var(--radius-sm, 4px)',
                  backgroundColor: 'var(--color-accent)',
                  color: 'var(--color-bg, #fff)',
                  border: 'none',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  minHeight: 44,
                }}
              >
                Add a photo
              </button>
            )}
            {onSaveDisplayName && (
              <button
                type="button"
                onClick={() => {
                  setNameValue('')
                  setEditingName(true)
                  setTimeout(() => nameInputRef.current?.focus(), 0)
                }}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: 'var(--radius-sm, 4px)',
                  backgroundColor: 'transparent',
                  color: 'var(--color-accent)',
                  border: '1px solid var(--color-accent)',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  minHeight: 44,
                }}
              >
                Set display name
              </button>
            )}
          </div>
        </div>
      )}

      {/* Stats row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '1rem',
          textAlign: 'center',
        }}
      >
        <StatBlock
          label="Total XP"
          value={stats ? formatXP(stats.total_xp) : ''}
          isLoading={isLoading}
        />
        <StatBlock
          label="Best Streak"
          value={stats ? `${stats.longest_streak}d` : ''}
          isLoading={isLoading}
        />
        <StatBlock
          label="Skills"
          value={stats ? stats.skill_count : ''}
          isLoading={isLoading}
        />
      </div>

      {/* Category pills */}
      {(isLoading || topCategories.length > 0) && (
        <div
          style={{
            display: 'flex',
            gap: '0.5rem',
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <span
            style={{
              fontSize: '0.7rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--color-muted)',
              flexShrink: 0,
            }}
          >
            Focus
          </span>
          {isLoading ? (
            <>
              <Skeleton width="4rem" height="1.4rem" />
              <Skeleton width="3.5rem" height="1.4rem" />
              <Skeleton width="5rem" height="1.4rem" />
            </>
          ) : (
            topCategories.map((cat) => (
              <CategoryPill key={cat.category} label={cat.category} />
            ))
          )}
        </div>
      )}

      {/* Retro flavour label */}
      {theme === 'retro' && (
        <p
          style={{
            fontSize: '0.625rem',
            fontFamily: 'var(--font-display, "Press Start 2P", monospace)',
            color: 'var(--color-muted)',
            margin: 0,
            textAlign: 'right',
            letterSpacing: '0.05em',
          }}
        >
          CHARACTER SHEET
        </p>
      )}
      {theme === 'modern' && (
        <p
          style={{
            fontSize: '0.6875rem',
            fontFamily: 'var(--font-body, "Space Grotesk", system-ui, sans-serif)',
            color: 'var(--color-muted)',
            margin: 0,
            textAlign: 'right',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
          }}
        >
          OPERATOR ID
        </p>
      )}
    </section>
  )
}
