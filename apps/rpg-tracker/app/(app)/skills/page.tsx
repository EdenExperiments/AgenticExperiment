'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { listSkills, logXP } from '@rpgtracker/api-client'
import { SkillCard, QuickLogSheet, TierTransitionModal } from '@rpgtracker/ui'
import type { SkillDetail } from '@rpgtracker/api-client'

export default function SkillsPage() {
  const router = useRouter()
  const qc = useQueryClient()
  const { data: skills = [], isLoading } = useQuery({ queryKey: ['skills'], queryFn: listSkills })

  const [logSheetSkill, setLogSheetSkill] = useState<SkillDetail | null>(null)
  const [tierTransition, setTierTransition] = useState<{ tierName: string; tierNumber: number } | null>(null)

  const logMutation = useMutation({
    mutationFn: ({ skillId, xpDelta, logNote }: { skillId: string; xpDelta: number; logNote: string }) =>
      logXP(skillId, xpDelta, logNote),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['skills'] })
      setLogSheetSkill(null)
      if (result.tier_crossed) {
        setTierTransition({ tierName: result.tier_name, tierNumber: result.tier_number })
      }
    },
  })

  if (isLoading) return <div className="p-8 text-gray-400">Loading…</div>

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Skills</h1>
        <Link
          href="/skills/new"
          className="px-4 py-2 rounded-xl font-semibold text-white bg-[var(--color-accent,theme(colors.blue.600))] text-sm"
        >
          + Add Skill
        </Link>
      </div>

      {skills.length === 0 ? (
        <div className="text-center py-16 space-y-4">
          <p className="text-gray-500">No skills yet. Start tracking your progress.</p>
          <Link
            href="/skills/new"
            className="inline-block px-6 py-3 rounded-xl font-semibold text-white bg-[var(--color-accent,theme(colors.blue.600))]"
          >
            Create your first skill
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {skills.map((skill) => (
            <SkillCard
              key={skill.id}
              skill={skill}
              onLogXP={(id) => setLogSheetSkill(skills.find(s => s.id === id) ?? null)}
              onClick={(id) => router.push(`/skills/${id}`)}
            />
          ))}
        </div>
      )}

      {/* Floating Add button on mobile */}
      <Link
        href="/skills/new"
        aria-label="Add new skill"
        className="fixed bottom-20 right-4 w-14 h-14 rounded-full bg-[var(--color-accent,theme(colors.blue.600))] text-white text-2xl flex items-center justify-center shadow-lg md:hidden"
      >
        +
      </Link>

      {logSheetSkill && (
        <QuickLogSheet
          skillName={logSheetSkill.name}
          chips={logSheetSkill.quick_log_chips}
          isOpen
          isLoading={logMutation.isPending}
          onClose={() => setLogSheetSkill(null)}
          onSubmit={({ xpDelta, logNote }) =>
            logMutation.mutate({ skillId: logSheetSkill.id, xpDelta, logNote })
          }
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
    </div>
  )
}
