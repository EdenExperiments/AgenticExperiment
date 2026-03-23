'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { listSkills, getAccount, getActivity, logXP, setPrimarySkill } from '@rpgtracker/api-client'
import type { SkillDetail, ActivityEvent } from '@rpgtracker/api-client'
import {
  SkillCard,
  QuickLogPanel,
  TierTransitionModal,
  StatCard,
  ActivityFeedItem,
  TierBadge,
  PrimarySkillCard,
  computeFocusSkill,
  HubPlaceholderCard,
} from '@rpgtracker/ui'
import { XPGainAnimation } from '@/components/XPGainAnimation'

/** Compute the count of active (uncleared) gates at or below each skill's current level */
function countActiveGates(skills: SkillDetail[]): number {
  let count = 0
  for (const skill of skills) {
    for (const gate of skill.gates ?? []) {
      if (!gate.is_cleared && skill.current_level >= gate.gate_level) {
        count++
      }
    }
  }
  return count
}

/** Sum XP logged today from activity events */
function xpToday(events: ActivityEvent[]): number {
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  return events
    .filter((e) => new Date(e.created_at) >= todayStart)
    .reduce((sum, e) => sum + e.xp_delta, 0)
}

/** Find the highest-tier skill */
function highestTierSkill(skills: SkillDetail[]): SkillDetail | null {
  if (skills.length === 0) return null
  return skills.reduce((best, s) =>
    s.tier_number > best.tier_number ? s : best
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const qc = useQueryClient()

  const { data: skills = [], isLoading: skillsLoading } = useQuery({
    queryKey: ['skills'],
    queryFn: listSkills,
  })

  const { data: account } = useQuery({
    queryKey: ['account'],
    queryFn: getAccount,
  })

  const { data: activity = [], isLoading: activityLoading } = useQuery({
    queryKey: ['activity'],
    queryFn: () => getActivity(10),
  })

  const [quickLogExpanded, setQuickLogExpanded] = useState(false)
  const [quickLogSkillOverride, setQuickLogSkillOverride] = useState<SkillDetail | null>(null)
  const [tierTransition, setTierTransition] = useState<{
    tierName: string
    tierNumber: number
  } | null>(null)
  const [xpGain, setXpGain] = useState<{ amount: number; key: number }>({ amount: 0, key: 0 })

  const logMutation = useMutation({
    mutationFn: ({
      skillId,
      xpDelta,
      logNote,
    }: {
      skillId: string
      xpDelta: number
      logNote: string
      timeSpentMinutes?: number
    }) => logXP(skillId, xpDelta, logNote),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['skills'] })
      qc.invalidateQueries({ queryKey: ['activity'] })
      setQuickLogExpanded(false)
      setQuickLogSkillOverride(null)
      setXpGain({ amount: result.xp_added, key: Date.now() })
      if (result.tier_crossed) {
        setTierTransition({
          tierName: result.tier_name,
          tierNumber: result.tier_number,
        })
      }
    },
  })

  const pinMutation = useMutation({
    mutationFn: (skillId: string) => setPrimarySkill(skillId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['account'] })
    },
  })

  // Compute the focus skill
  const focusSkill = computeFocusSkill(skills, account?.primary_skill_id ?? null)
  const isPinned = !!(account?.primary_skill_id && focusSkill && account.primary_skill_id === focusSkill.id)

  // Loading state
  if (skillsLoading) {
    return (
      <div className="p-4 md:p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-40 rounded" style={{ backgroundColor: 'var(--color-bg-elevated)' }} />
          {/* AC-V9: Focus card skeleton placeholder */}
          <div className="h-40 rounded-xl" style={{ backgroundColor: 'var(--color-bg-elevated)' }} />
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 rounded-xl" style={{ backgroundColor: 'var(--color-bg-elevated)' }} />
            ))}
          </div>
          <div className="h-32 rounded-xl" style={{ backgroundColor: 'var(--color-bg-elevated)' }} />
          <div className="h-48 rounded-xl" style={{ backgroundColor: 'var(--color-bg-elevated)' }} />
        </div>
      </div>
    )
  }

  // Empty state — no skills yet (AC-V8: no focus card when 0 skills)
  if (skills.length === 0) {
    return (
      <div className="p-4 md:p-8">
        <div className="text-center py-16 space-y-6">
          {/* CSS-based shield illustration */}
          <div className="mx-auto w-24 h-28 relative" aria-hidden="true">
            <div
              className="absolute inset-0 rounded-t-full rounded-b-[50%]"
              style={{
                backgroundColor: 'var(--color-bg-elevated)',
                border: '3px solid var(--color-accent)',
              }}
            />
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-3xl"
              style={{ color: 'var(--color-accent)' }}
            >
              +
            </div>
          </div>

          <h2
            className="text-2xl font-bold"
            style={{
              fontFamily: 'var(--font-display, var(--font-body, Inter, system-ui, sans-serif))',
              color: 'var(--color-text)',
            }}
          >
            Begin Your Quest
          </h2>
          <p
            className="max-w-sm mx-auto"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Track your real-world skills like an RPG. Earn XP, level up, and
            break through tier gates as you grow.
          </p>
          <Link
            href="/skills/new"
            className="btn btn-primary inline-block px-6 py-3 min-h-[48px]"
          >
            Create your first skill
          </Link>
        </div>
      </div>
    )
  }

  // Dashboard with data
  const activeGatesCount = countActiveGates(skills)
  const todayXP = xpToday(activity)
  const topSkill = highestTierSkill(skills)

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header */}
      <h1
        className="text-2xl font-bold"
        style={{
          fontFamily: 'var(--font-display, var(--font-body, Inter, system-ui, sans-serif))',
          color: 'var(--color-text)',
        }}
      >
        Dashboard
      </h1>

      {/* AC-V1: Focus Card — above stats, below header */}
      {focusSkill && (
        <div className="max-w-2xl">
          <PrimarySkillCard
            skill={focusSkill}
            isPinned={isPinned}
            onTogglePin={() => pinMutation.mutate(focusSkill.id)}
            isPinning={pinMutation.isPending}
          />
        </div>
      )}

      {/* Stats Row */}
      <div data-testid="stats-grid" className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3" role="region" aria-label="Stats">
        <StatCard label="Total Skills" value={skills.length} />
        <StatCard label="Active Gates" value={activeGatesCount} />
        <StatCard label="XP Today" value={todayXP.toLocaleString()} />
        <StatCard
          label="Highest Tier"
          value={topSkill?.tier_name ?? 'None'}
          icon={
            topSkill ? (
              <TierBadge
                tierName={topSkill.tier_name}
                tierNumber={topSkill.tier_number}
              />
            ) : undefined
          }
        />
      </div>

      {/* Quick Log — collapsible panel between stats and skill grid (P4-5) */}
      {(() => {
        const panelSkill = quickLogSkillOverride ?? focusSkill ?? skills[0] ?? null
        if (!panelSkill) return null
        return (
          <div className="relative max-w-xl">
            <QuickLogPanel
              skillName={panelSkill.name}
              tierNumber={panelSkill.tier_number}
              isLoading={logMutation.isPending}
              expanded={quickLogExpanded}
              onToggleExpanded={setQuickLogExpanded}
              onSubmit={({ xpDelta, logNote, timeSpentMinutes }) =>
                logMutation.mutate({
                  skillId: panelSkill.id,
                  xpDelta,
                  logNote,
                  timeSpentMinutes,
                })
              }
            />
            <div className="absolute -top-2 left-1/2 -translate-x-1/2">
              <XPGainAnimation xpAmount={xpGain.amount} animationKey={xpGain.key} />
            </div>
          </div>
        )
      })()}

      {/* Two-column layout: skills left, activity right */}
      <div className="dashboard-main-grid gap-6">
        {/* Left column — Skills */}
        <div className="space-y-4">
          <h2
            className="text-lg font-semibold"
            style={{
              fontFamily: 'var(--font-display, var(--font-body, Inter, system-ui, sans-serif))',
              color: 'var(--color-text)',
            }}
          >
            Your Skills
          </h2>
          <div
            data-testid="skills-grid"
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            {skills.map((skill) => (
              <SkillCard
                key={skill.id}
                skill={skill}
                onLogXP={(id) => {
                  setQuickLogSkillOverride(skills.find((s) => s.id === id) ?? null)
                  setQuickLogExpanded(true)
                }}
                onClick={(id) => router.push(`/skills/${id}`)}
              />
            ))}
          </div>

        </div>

        {/* Right column — Activity Feed */}
        <section
          data-testid="activity-feed"
          className="rounded-xl p-4 self-start lg:sticky lg:top-8"
          style={{
            backgroundColor: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border)',
          }}
        >
          <h2
            className="text-lg font-semibold mb-3"
            style={{
              fontFamily: 'var(--font-display, var(--font-body, Inter, system-ui, sans-serif))',
              color: 'var(--color-text)',
            }}
          >
            Recent Activity
          </h2>
          {activityLoading ? (
            <div className="animate-pulse space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 rounded-lg" style={{ backgroundColor: 'var(--color-surface)' }} />
              ))}
            </div>
          ) : activity.length === 0 ? (
            <p
              className="text-sm py-4 text-center"
              style={{ color: 'var(--color-muted)' }}
            >
              No activity yet. Log some XP to see your progress here.
            </p>
          ) : (
            <div className="space-y-1">
              {activity.map((event) => (
                <ActivityFeedItem
                  key={event.id}
                  skillName={event.skill_name}
                  xpDelta={event.xp_delta}
                  logNote={event.log_note || undefined}
                  createdAt={event.created_at}
                  onClick={() => router.push(`/skills/${event.skill_id}`)}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Hub Stat Placeholders — P4-6 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <HubPlaceholderCard
          appName="NutriLog"
          tagline="Nutrition tracking, gamified"
          icon="🥗"
          metrics={[
            { label: 'Calories', value: '—' },
            { label: 'Streak', value: '—' },
            { label: 'Score', value: '—' },
          ]}
        />
        <HubPlaceholderCard
          appName="MindTrack"
          tagline="Mental health check-ins"
          icon="🧠"
          metrics={[
            { label: 'Mood', value: '—' },
            { label: 'Streak', value: '—' },
            { label: 'Entries', value: '—' },
          ]}
        />
      </div>

      {/* Tier Transition Modal */}
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
