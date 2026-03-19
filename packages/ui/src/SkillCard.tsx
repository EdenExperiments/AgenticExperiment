import { XPProgressBar } from './XPProgressBar'
import { TierBadge } from './TierBadge'
import type { SkillDetail, BlockerGate } from '@rpgtracker/api-client'

interface SkillCardProps {
  skill: SkillDetail
  onLogXP: (skillId: string) => void
  onClick: (skillId: string) => void
}

function activeGate(skill: SkillDetail): BlockerGate | undefined {
  return skill.gates
    .filter(g => !g.is_cleared && skill.current_level >= g.gate_level)
    .sort((a, b) => a.gate_level - b.gate_level)[0]
}

export function SkillCard({ skill, onLogXP, onClick }: SkillCardProps) {
  const gate = activeGate(skill)

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={skill.name}
      className="skill-card relative rounded-xl p-4 shadow-sm border cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      style={{
        backgroundColor: 'var(--color-bg-elevated, #1a1a2e)',
        borderColor: 'var(--color-border, rgba(75, 85, 99, 0.5))',
        transition: 'transform calc(var(--duration-fast, 150ms) * var(--motion-scale, 0)), box-shadow calc(var(--duration-fast, 150ms) * var(--motion-scale, 0))',
      }}
      onClick={() => onClick(skill.id)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(skill.id) } }}
    >
      {/* Tier color accent bar — left edge */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl tier-accent-${skill.tier_number}`} />

      <div className="flex items-start justify-between gap-2 pl-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3
              className="font-semibold truncate"
              style={{ color: 'var(--color-text-primary, #f9fafb)' }}
            >
              {skill.name}
            </h3>
            <TierBadge tierName={skill.tier_name} tierNumber={skill.tier_number} />
          </div>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted, #6b7280)' }}>
            Level {skill.effective_level}
          </p>
        </div>

        {gate && (
          <span role="img" aria-label="gate locked" className="text-amber-500 text-lg flex-shrink-0">&#x1F512;</span>
        )}
      </div>

      <div className="pl-2 mt-3">
        <XPProgressBar
          tierNumber={skill.tier_number}
          xpForCurrentLevel={skill.xp_for_current_level}
          xpToNextLevel={skill.xp_to_next_level}
          className="mb-1"
        />
        <p className="text-xs" style={{ color: 'var(--color-text-muted, #6b7280)' }}>
          {skill.xp_for_current_level.toLocaleString()} / {(skill.xp_for_current_level + skill.xp_to_next_level).toLocaleString()} XP to next level
        </p>
      </div>

      <div className="flex justify-end mt-3 pl-2">
        <button
          aria-label="Log XP"
          onClick={(e) => { e.stopPropagation(); onLogXP(skill.id) }}
          className="flex items-center gap-1 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors min-h-[44px]"
          style={{
            backgroundColor: 'var(--color-bg-surface, #1f2937)',
            color: 'var(--color-text-secondary, #9ca3af)',
          }}
        >
          + Log
        </button>
      </div>

      {/* Micro-interaction CSS — motion-scale gates the hover/press transforms */}
      <style>{`
        .skill-card:hover {
          transform: scale(calc(1 + 0.02 * var(--motion-scale, 0)));
          box-shadow: 0 0 calc(12px * var(--motion-scale, 0)) var(--color-border, rgba(75, 85, 99, 0.5));
        }
        .skill-card:active {
          transform: scale(calc(1 - 0.02 * var(--motion-scale, 0)));
        }
      `}</style>
    </div>
  )
}
