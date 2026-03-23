import Link from 'next/link'
import { XPProgressBar } from './XPProgressBar'
import { TierBadge } from './TierBadge'
import type { SkillDetail } from '@rpgtracker/api-client'

export interface PrimarySkillCardProps {
  skill: SkillDetail
  isPinned: boolean
  onTogglePin: () => void
  isPinning: boolean
}

export function PrimarySkillCard({ skill, isPinned, onTogglePin, isPinning }: PrimarySkillCardProps) {
  const currentStreak = skill.current_streak ?? 0

  return (
    <div
      className="relative rounded-xl p-5 shadow-md border w-full"
      style={{
        backgroundColor: 'var(--color-bg-elevated)',
        borderColor: 'var(--color-border)',
      }}
    >
      {/* Tier accent bar — top edge */}
      <div className={`absolute left-0 top-0 right-0 h-1 rounded-t-xl tier-accent-${skill.tier_number}`} />

      <div className="flex items-start justify-between gap-3">
        {/* Left: Skill info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {skill.category_emoji && (
              <span className="text-lg" aria-hidden="true">{skill.category_emoji}</span>
            )}
            <h2
              className="text-xl font-bold truncate"
              style={{ color: 'var(--color-text)', fontFamily: 'var(--font-display, inherit)' }}
            >
              {skill.name}
            </h2>
          </div>

          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <TierBadge tierName={skill.tier_name} tierNumber={skill.tier_number} />
            <span className="text-sm" style={{ color: 'var(--color-muted)' }}>
              Level {skill.effective_level}
            </span>
            {skill.category_name && (
              <span className="text-sm" style={{ color: 'var(--color-muted)' }}>
                · {skill.category_name}
              </span>
            )}
          </div>

          {currentStreak > 0 && (
            <div
              className="inline-flex items-center gap-1 mt-2 rounded-full px-2.5 py-0.5 text-xs font-semibold"
              style={{
                backgroundColor: 'var(--color-accent-muted)',
                color: 'var(--color-accent)',
              }}
            >
              🔥 {currentStreak} day streak
            </div>
          )}
        </div>

        {/* Right: Pin button */}
        <button
          aria-label={isPinned ? `Unpin ${skill.name}` : `Pin ${skill.name} as focus`}
          onClick={onTogglePin}
          disabled={isPinning}
          className="flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg transition-colors"
          style={{
            color: isPinned ? 'var(--color-accent)' : 'var(--color-muted)',
            opacity: isPinning ? 0.5 : 1,
          }}
        >
          {isPinned ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
            </svg>
          )}
        </button>
      </div>

      {/* Suggested label when not pinned */}
      {!isPinned && (
        <div
          className="text-xs font-medium mt-1"
          style={{ color: 'var(--color-muted)' }}
        >
          Suggested
        </div>
      )}

      {/* XP progress bar */}
      <div className="mt-3">
        <XPProgressBar
          tierNumber={skill.tier_number}
          xpForCurrentLevel={skill.xp_for_current_level}
          xpToNextLevel={skill.xp_to_next_level}
          className="h-2"
        />
        <p className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>
          {skill.xp_for_current_level.toLocaleString()} / {(skill.xp_for_current_level + skill.xp_to_next_level).toLocaleString()} XP
        </p>
      </div>

      {/* Start Session button */}
      <div className="mt-4">
        <Link
          href={`/skills/${skill.id}/session`}
          className="inline-flex items-center justify-center w-full min-h-[48px] rounded-lg text-sm font-semibold transition-colors"
          style={{
            backgroundColor: 'var(--color-accent)',
            color: 'var(--color-bg)',
          }}
        >
          Start Session
        </Link>
      </div>
    </div>
  )
}
