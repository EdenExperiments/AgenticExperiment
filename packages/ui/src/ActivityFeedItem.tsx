import React from 'react'

export interface ActivityFeedItemProps {
  skillName: string
  xpDelta: number
  logNote?: string
  createdAt: string
  onClick?: () => void
}

/**
 * Format a timestamp into a relative time string.
 * Handles: "just now", "Xm ago", "Xh ago", "Yesterday", or date string.
 */
export function formatRelativeTime(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHr = Math.floor(diffMs / 3600000)
  const diffDay = Math.floor(diffMs / 86400000)

  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24) return `${diffHr}h ago`
  if (diffDay === 1) return 'Yesterday'
  return date.toLocaleDateString()
}

/**
 * ActivityFeedItem — a single activity log entry for the dashboard feed.
 * Uses activity-history BEM classes so theme CSS in pages.css applies correctly.
 */
export function ActivityFeedItem({ skillName, xpDelta, logNote, createdAt, onClick }: ActivityFeedItemProps) {
  const Wrapper = onClick ? 'button' : 'div'
  const relativeTime = formatRelativeTime(createdAt)

  return (
    <Wrapper
      className={`activity-history__entry w-full text-left ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
      {...(onClick ? { type: 'button' as const } : {})}
    >
      <span className="activity-history__entry-icon" aria-hidden="true">
        +
      </span>
      <div className="activity-history__entry-main min-w-0 flex-1">
        <div className="activity-history__entry-head flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span
                className="activity-history__skill font-medium text-sm truncate max-w-full"
                style={{ color: 'var(--color-text)' }}
              >
                {skillName}
              </span>
              <span
                className="activity-history__xp text-sm font-semibold shrink-0"
                style={{ color: 'var(--color-accent)' }}
              >
                +{xpDelta} XP
              </span>
            </div>
            {logNote && (
              <p
                className="activity-history__note text-xs truncate mt-0.5"
                style={{ color: 'var(--color-muted)' }}
              >
                {logNote}
              </p>
            )}
          </div>
          <time
            className="activity-history__timestamp shrink-0 text-xs"
            style={{ color: 'var(--color-muted)' }}
            dateTime={createdAt}
            data-testid="relative-time"
          >
            {relativeTime}
          </time>
        </div>
      </div>
    </Wrapper>
  )
}
