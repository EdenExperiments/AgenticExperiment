import { XPProgressBar } from './XPProgressBar'
import { TierBadge } from './TierBadge'
import type { SkillDetail, BlockerGate } from '@rpgtracker/api-client'

interface SkillCardProps {
  skill: SkillDetail & { current_streak?: number }
  onLogXP: (skillId: string) => void
  onClick: (skillId: string) => void
  onToggleFavourite?: (skillId: string) => void
  dimmed?: boolean
}

function activeGate(skill: SkillDetail): BlockerGate | undefined {
  return (skill.gates ?? [])
    .filter(g => !g.is_cleared && skill.current_level >= g.gate_level)
    .sort((a, b) => a.gate_level - b.gate_level)[0]
}

export function SkillCard({ skill, onLogXP, onClick, onToggleFavourite, dimmed }: SkillCardProps) {
  const gate = activeGate(skill)
  const currentStreak = skill.current_streak ?? 0

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={skill.name}
      className="skill-card card relative rounded-xl p-4 shadow-sm border cursor-pointer focus:outline-none focus-visible:outline-2 focus-visible:outline-[var(--color-accent)] focus-visible:outline-offset-2 [@media(hover:hover)]:hover:-translate-y-0.5 [@media(hover:hover)]:hover:shadow-lg min-h-[44px]"
      style={{
        backgroundColor: 'var(--color-bg-elevated)',
        borderColor: 'var(--color-border)',
        opacity: dimmed ? 0.5 : 1,
        transition: 'transform calc(var(--duration-fast, 150ms) * var(--motion-scale, 0)), box-shadow calc(var(--duration-fast, 150ms) * var(--motion-scale, 0)), opacity 200ms ease',
      }}
      onClick={() => onClick(skill.id)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(skill.id) } }}
    >
      {/* Tier color accent bar — left edge */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl tier-accent-${skill.tier_number}`} />

      <div className="flex items-start justify-between gap-2 pl-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {skill.category_emoji && (
              <span className="text-sm" aria-hidden="true">{skill.category_emoji}</span>
            )}
            <h3
              className="font-semibold truncate"
              style={{ color: 'var(--color-text)' }}
            >
              {skill.name}
            </h3>
            <TierBadge tierName={skill.tier_name} tierNumber={skill.tier_number} />
          </div>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-muted)' }}>
            Level {skill.effective_level}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {onToggleFavourite && (
            <button
              aria-label={skill.is_favourite ? 'Remove from favourites' : 'Add to favourites'}
              aria-pressed={skill.is_favourite}
              onClick={(e) => { e.stopPropagation(); onToggleFavourite(skill.id) }}
              className="flex items-center justify-center w-[44px] h-[44px] -m-2 rounded-lg"
              style={{ color: skill.is_favourite ? 'var(--color-accent)' : 'var(--color-muted)' }}
            >
              {skill.is_favourite ? '★' : '☆'}
            </button>
          )}
          {currentStreak >= 2 && (
            <span
              data-testid="streak-badge"
              className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold"
              style={{
                backgroundColor: 'var(--color-accent-muted)',
                color: 'var(--color-accent)',
              }}
            >
              🔥 <span>{currentStreak}</span>
            </span>
          )}
          {gate && (
            <span role="img" aria-label="gate locked" className="text-lg" style={{ color: 'var(--color-accent)' }}>&#x1F512;</span>
          )}
        </div>
      </div>

      <div className="pl-2 mt-3">
        <XPProgressBar
          tierNumber={skill.tier_number}
          xpForCurrentLevel={skill.xp_for_current_level}
          xpToNextLevel={skill.xp_to_next_level}
          className="mb-1"
        />
        <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
          {skill.xp_for_current_level.toLocaleString()} / {(skill.xp_for_current_level + skill.xp_to_next_level).toLocaleString()} XP to next level
        </p>
      </div>

      <div className="flex justify-end mt-3 pl-2">
        <button
          aria-label="Log XP"
          onClick={(e) => { e.stopPropagation(); onLogXP(skill.id) }}
          className="flex items-center gap-1 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors min-h-[44px]"
          style={{
            backgroundColor: 'var(--color-surface)',
            color: 'var(--color-text-secondary)',
          }}
        >
          + Log
        </button>
      </div>

      {/* Micro-interaction CSS — motion-scale gates the hover/press transforms */}
      <style>{`
        .skill-card:hover {
          transform: scale(calc(1 + 0.02 * var(--motion-scale, 0)));
          box-shadow: 0 0 calc(12px * var(--motion-scale, 0)) var(--color-border);
        }
        .skill-card:active {
          transform: scale(calc(1 - 0.02 * var(--motion-scale, 0)));
        }
      `}</style>
    </div>
  )
}
