'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { getSkill, logXP, deleteSkill } from '@rpgtracker/api-client'
import type { BlockerGate } from '@rpgtracker/api-client'
import { XPProgressBar, TierBadge, BlockerGateSection, QuickLogSheet, TierTransitionModal } from '@rpgtracker/ui'

export default function SkillDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const qc = useQueryClient()

  const { data: skill, isLoading } = useQuery({
    queryKey: ['skill', id],
    queryFn: () => getSkill(id),
  })

  const [logSheetOpen, setLogSheetOpen] = useState(false)
  const [tierTransition, setTierTransition] = useState<{ tierName: string; tierNumber: number } | null>(null)
  const [gateFirstHit, setGateFirstHit] = useState<BlockerGate | null>(null)

  const logMutation = useMutation({
    mutationFn: ({ xpDelta, logNote }: { xpDelta: number; logNote: string }) =>
      logXP(id, xpDelta, logNote),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['skill', id] })
      qc.invalidateQueries({ queryKey: ['skills'] })
      setLogSheetOpen(false)
      if (result.gate_first_hit) setGateFirstHit(result.gate_first_hit)
      else if (result.tier_crossed) setTierTransition({ tierName: result.tier_name, tierNumber: result.tier_number })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteSkill(id),
    onSuccess: () => router.push('/skills'),
  })

  if (isLoading || !skill) return <div className="p-8 text-gray-400">Loading…</div>

  const activeGate = skill.gates.find(g => !g.is_cleared && skill.current_level >= g.gate_level)
  const isMaxLevel = skill.xp_to_next_level === 0

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link href="/skills" className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
          ← Skills
        </Link>
        <Link href={`/skills/${id}/edit`} className="text-sm text-gray-500 hover:text-gray-700">
          Edit
        </Link>
      </div>

      {/* Skill name + tier */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{skill.name}</h1>
        <div className="flex items-center gap-3 mt-1">
          <TierBadge tierName={skill.tier_name} tierNumber={skill.tier_number} />
          <span className="text-lg text-gray-600 dark:text-gray-300">Level {skill.effective_level}</span>
        </div>
      </div>

      {/* XP bar OR blocker gate section (D-021: gate replaces bar) */}
      {activeGate ? (
        <BlockerGateSection
          gateLevel={activeGate.gate_level}
          title={activeGate.title}
          description={activeGate.description}
          currentXP={skill.current_xp}
          rawLevel={skill.current_level}
        />
      ) : (
        <div className="space-y-2">
          <XPProgressBar
            tierNumber={skill.tier_number}
            xpForCurrentLevel={skill.xp_for_current_level}
            xpToNextLevel={skill.xp_to_next_level}
            isMaxLevel={isMaxLevel}
            className="h-3"
          />
          {isMaxLevel ? (
            <p className="text-sm text-gray-500 text-center">Maximum Level Reached</p>
          ) : (
            <p className="text-sm text-gray-500">
              {skill.xp_for_current_level.toLocaleString()} / {(skill.xp_for_current_level + skill.xp_to_next_level).toLocaleString()} XP to level {skill.effective_level + 1}
            </p>
          )}
        </div>
      )}

      {/* Log XP button */}
      <button
        onClick={() => setLogSheetOpen(true)}
        className="w-full py-4 rounded-xl font-semibold text-white bg-[var(--color-accent,theme(colors.blue.600))] min-h-[48px] hover:opacity-90 transition-opacity"
      >
        Log XP
      </button>

      {/* Description */}
      {skill.description && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">{skill.description}</p>
        </div>
      )}

      {/* Recent logs */}
      {skill.recent_logs.length > 0 && (
        <div>
          <h2 className="font-semibold text-gray-900 dark:text-white mb-3">Recent Logs</h2>
          <div className="space-y-2">
            {skill.recent_logs.map((log) => (
              <div key={log.id} className="flex justify-between text-sm text-gray-600 dark:text-gray-400 py-2 border-b border-gray-100 dark:border-gray-800">
                <span>{log.log_note || 'Session'}</span>
                <span className="font-medium text-gray-900 dark:text-white">+{log.xp_delta} XP</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Delete */}
      <button
        onClick={() => { if (confirm('Delete this skill? This cannot be undone.')) deleteMutation.mutate() }}
        className="text-sm text-red-500 hover:text-red-600 w-full text-center py-2"
      >
        Delete skill
      </button>

      {logSheetOpen && (
        <QuickLogSheet
          skillName={skill.name}
          chips={skill.quick_log_chips}
          isOpen
          isLoading={logMutation.isPending}
          onClose={() => setLogSheetOpen(false)}
          onSubmit={({ xpDelta, logNote }) => logMutation.mutate({ xpDelta, logNote })}
        />
      )}

      {tierTransition && (
        <TierTransitionModal
          newTierName={tierTransition.tierName}
          newTierNumber={tierTransition.tierNumber}
          isOpen
          onContinue={() => setTierTransition(null)}
        />
      )}

      {/* First-hit gate modal */}
      {gateFirstHit && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative w-full md:max-w-md bg-white dark:bg-gray-900 rounded-t-3xl md:rounded-3xl p-8 space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🔒</span>
              <h2 className="font-bold text-lg text-gray-900 dark:text-white">You've hit a gate!</h2>
            </div>
            <p className="font-semibold text-gray-800 dark:text-white">Level {gateFirstHit.gate_level} Gate: "{gateFirstHit.title}"</p>
            <p className="text-sm text-gray-600 dark:text-gray-300">{gateFirstHit.description}</p>
            <p className="text-sm text-gray-500">Your XP keeps growing, but your level display is paused here until you complete this challenge.</p>
            <button
              onClick={() => setGateFirstHit(null)}
              className="w-full py-4 rounded-xl font-semibold text-white bg-amber-500 min-h-[48px]"
            >
              Got it — see gate details
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
