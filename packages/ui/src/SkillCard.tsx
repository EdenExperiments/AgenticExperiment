import { XPProgressBar } from './XPProgressBar'
import { TierBadge } from './TierBadge'
import type { SkillDetail, BlockerGate } from '@rpgtracker/api-client'

interface SkillCardProps {
  skill: SkillDetail
  onLogXP: (skillId: string) => void
  onClick: (skillId: string) => void
}

function activeGate(skill: SkillDetail): BlockerGate | undefined {
  return skill.gates.find(g => !g.is_cleared && skill.current_level >= g.gate_level)
}

export function SkillCard({ skill, onLogXP, onClick }: SkillCardProps) {
  const gate = activeGate(skill)

  return (
    <div
      className="relative bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-800 cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => onClick(skill.id)}
    >
      {/* Tier color accent bar — left edge */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl tier-accent-${skill.tier_number}`} />

      <div className="flex items-start justify-between gap-2 pl-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-gray-900 dark:text-white truncate">{skill.name}</h3>
            <TierBadge tierName={skill.tier_name} tierNumber={skill.tier_number} />
          </div>
          <p className="text-sm text-gray-500 mt-0.5">Level {skill.effective_level}</p>
        </div>

        {gate && (
          <span role="img" aria-label="gate locked" className="text-amber-500 text-lg flex-shrink-0">🔒</span>
        )}
      </div>

      <div className="pl-2 mt-3">
        <XPProgressBar
          tierNumber={skill.tier_number}
          xpForCurrentLevel={skill.xp_for_current_level}
          xpToNextLevel={skill.xp_to_next_level}
          className="mb-1"
        />
        <p className="text-xs text-gray-400">
          {skill.xp_for_current_level.toLocaleString()} / {(skill.xp_for_current_level + skill.xp_to_next_level).toLocaleString()} XP to next level
        </p>
      </div>

      <div className="flex justify-end mt-3 pl-2">
        <button
          aria-label="Log XP"
          onClick={(e) => { e.stopPropagation(); onLogXP(skill.id) }}
          className="flex items-center gap-1 text-sm font-medium px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors min-h-[44px]"
        >
          + Log
        </button>
      </div>
    </div>
  )
}
