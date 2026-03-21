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
 * ActivityFeedItem — a single activity log entry row for the dashboard feed.
 */
export function ActivityFeedItem({ skillName, xpDelta, logNote, createdAt, onClick }: ActivityFeedItemProps) {
  const Wrapper = onClick ? 'button' : 'div'

  return (
    <Wrapper
      className={`w-full flex items-center justify-between py-3 px-3 rounded-lg text-left hover:bg-[var(--color-bg-elevated)] ${onClick ? 'cursor-pointer' : ''}`}
      style={{
        backgroundColor: 'var(--color-bg-surface, #1f2937)',
        transition: 'background-color calc(var(--duration-fast, 150ms) * var(--motion-scale, 1))',
      }}
      onClick={onClick}
      {...(onClick ? { type: 'button' as const } : {})}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className="font-medium text-sm truncate"
            style={{ color: 'var(--color-text-primary, #f9fafb)' }}
          >
            {skillName}
          </span>
          <span
            className="text-sm font-semibold shrink-0"
            style={{ color: 'var(--color-accent, #6366f1)' }}
          >
            +{xpDelta} XP
          </span>
        </div>
        {logNote && (
          <p
            className="text-xs truncate mt-0.5"
            style={{ color: 'var(--color-text-muted, #6b7280)' }}
          >
            {logNote}
          </p>
        )}
      </div>
      <span
        className="text-xs shrink-0 ml-3"
        style={{ color: 'var(--color-text-muted, #6b7280)' }}
        data-testid="relative-time"
      >
        {formatRelativeTime(createdAt)}
      </span>
    </Wrapper>
  )
}
