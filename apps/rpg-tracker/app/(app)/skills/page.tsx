'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { listSkills, logXP } from '@rpgtracker/api-client'
import { SkillCard, QuickLogSheet, TierTransitionModal } from '@rpgtracker/ui'
import type { SkillDetail } from '@rpgtracker/api-client'

type SortOption = 'recent' | 'name' | 'level' | 'tier'

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'recent', label: 'Recent' },
  { value: 'name', label: 'Name' },
  { value: 'level', label: 'Level' },
  { value: 'tier', label: 'Tier' },
]

const TIER_NAMES = [
  'All',
  'Novice',
  'Apprentice',
  'Journeyman',
  'Adept',
  'Expert',
  'Master',
  'Grandmaster',
  'Legendary',
  'Mythic',
  'Transcendent',
  'Legend',
]

function sortSkills(skills: SkillDetail[], sort: SortOption): SkillDetail[] {
  const sorted = [...skills]
  switch (sort) {
    case 'name':
      return sorted.sort((a, b) => a.name.localeCompare(b.name))
    case 'level':
      return sorted.sort((a, b) => b.effective_level - a.effective_level)
    case 'tier':
      return sorted.sort((a, b) => b.tier_number - a.tier_number || b.effective_level - a.effective_level)
    case 'recent':
    default:
      return sorted.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
  }
}

export default function SkillsPage() {
  const router = useRouter()
  const qc = useQueryClient()
  const { data: skills = [], isLoading } = useQuery({ queryKey: ['skills'], queryFn: listSkills })

  const [logSheetSkill, setLogSheetSkill] = useState<SkillDetail | null>(null)
  const [tierTransition, setTierTransition] = useState<{ tierName: string; tierNumber: number } | null>(null)
  const [sortBy, setSortBy] = useState<SortOption>('recent')
  const [tierFilter, setTierFilter] = useState<string>('All')

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

  const filteredAndSorted = useMemo(() => {
    let result = skills
    if (tierFilter !== 'All') {
      result = result.filter((s) => s.tier_name === tierFilter)
    }
    return sortSkills(result, sortBy)
  }, [skills, sortBy, tierFilter])

  if (isLoading) return <div className="p-8" style={{ color: 'var(--color-text-muted)' }}>Loading...</div>

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <h1
          className="text-2xl font-bold"
          style={{
            fontFamily: 'var(--font-display, var(--font-body, Inter, system-ui, sans-serif))',
            color: 'var(--color-text-primary, #f9fafb)',
          }}
        >
          Skills
        </h1>
        <Link
          href="/skills/new"
          className="px-4 py-2 rounded-xl font-semibold text-white text-sm min-h-[44px] flex items-center"
          style={{ backgroundColor: 'var(--color-accent, #6366f1)' }}
        >
          + Add Skill
        </Link>
      </div>

      {skills.length === 0 ? (
        <div className="text-center py-16 space-y-6">
          {/* CSS-based illustration */}
          <div className="mx-auto w-20 h-24 relative" aria-hidden="true">
            <div
              className="absolute inset-0 rounded-t-full rounded-b-[50%]"
              style={{
                backgroundColor: 'var(--color-bg-elevated, #1a1a2e)',
                border: '3px solid var(--color-accent, #6366f1)',
              }}
            />
            <div
              className="absolute top-1/3 left-1/2 -translate-x-1/2 w-6 h-10"
              style={{
                borderLeft: '2px solid var(--color-accent, #6366f1)',
                borderRight: '2px solid var(--color-accent, #6366f1)',
                borderBottom: '2px solid var(--color-accent, #6366f1)',
              }}
            />
          </div>

          <h2
            className="text-xl font-bold"
            style={{
              fontFamily: 'var(--font-display, var(--font-body, Inter, system-ui, sans-serif))',
              color: 'var(--color-text-primary, #f9fafb)',
            }}
          >
            No skills yet
          </h2>
          <p style={{ color: 'var(--color-text-secondary, #9ca3af)' }}>
            Start tracking your real-world skills like an RPG character.
          </p>
          <Link
            href="/skills/new"
            className="inline-block px-6 py-3 rounded-xl font-semibold text-white min-h-[48px]"
            style={{ backgroundColor: 'var(--color-accent, #6366f1)' }}
          >
            Create your first skill
          </Link>
        </div>
      ) : (
        <>
          {/* Sort & Filter controls */}
          <div className="flex items-center gap-3 mb-4 overflow-x-auto pb-1" role="toolbar" aria-label="Sort and filter">
            {/* Sort pills */}
            <div className="flex gap-1.5 shrink-0">
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setSortBy(opt.value)}
                  aria-pressed={sortBy === opt.value}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors min-h-[36px] ${
                    sortBy === opt.value
                      ? 'text-white'
                      : ''
                  }`}
                  style={{
                    backgroundColor:
                      sortBy === opt.value
                        ? 'var(--color-accent, #6366f1)'
                        : 'var(--color-bg-surface, #1f2937)',
                    color:
                      sortBy === opt.value
                        ? 'white'
                        : 'var(--color-text-secondary, #9ca3af)',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Tier filter */}
            <select
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value)}
              aria-label="Filter by tier"
              className="text-xs rounded-lg px-2 py-1.5 min-h-[36px] border-none"
              style={{
                backgroundColor: 'var(--color-bg-surface, #1f2937)',
                color: 'var(--color-text-secondary, #9ca3af)',
              }}
            >
              {TIER_NAMES.map((tier) => (
                <option key={tier} value={tier}>
                  {tier === 'All' ? 'All Tiers' : tier}
                </option>
              ))}
            </select>
          </div>

          {/* Skill cards */}
          {filteredAndSorted.length === 0 ? (
            <p
              className="text-center py-8 text-sm"
              style={{ color: 'var(--color-text-muted, #6b7280)' }}
            >
              No skills match this filter.
            </p>
          ) : (
            <div data-testid="skills-grid" className="grid grid-cols-1 md:grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-4">
              {filteredAndSorted.map((skill) => (
                <SkillCard
                  key={skill.id}
                  skill={skill}
                  onLogXP={(id) => setLogSheetSkill(skills.find((s) => s.id === id) ?? null)}
                  onClick={(id) => router.push(`/skills/${id}`)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Floating Add button on mobile */}
      <Link
        href="/skills/new"
        aria-label="Add new skill"
        className="fixed bottom-20 right-4 w-14 h-14 rounded-full text-white text-2xl flex items-center justify-center shadow-lg md:hidden"
        style={{ backgroundColor: 'var(--color-accent, #6366f1)' }}
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
