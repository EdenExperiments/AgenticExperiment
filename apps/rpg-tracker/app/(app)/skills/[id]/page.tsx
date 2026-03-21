'use client'

import { useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { getSkill, logXP, deleteSkill, getActivity, getXPChart, createSession } from '@rpgtracker/api-client'
import type { BlockerGate, ActivityEvent } from '@rpgtracker/api-client'
import { XPProgressBar, TierBadge, BlockerGateSection, QuickLogSheet, TierTransitionModal, GrindOverlay, PostSessionScreen, XPBarChart, ConfirmModal } from '@rpgtracker/ui'
import { XPGainAnimation } from '@/components/XPGainAnimation'

const PLANNED_SESSION_SECONDS = 25 * 60

const TIER_HEX: Record<number, string> = {
  1: '#9ca3af', 2: '#3b82f6', 3: '#14b8a6', 4: '#22c55e', 5: '#84cc16',
  6: '#9333ea', 7: '#c026d3', 8: '#d97706', 9: '#ea580c', 10: '#dc2626', 11: '#facc15',
}

function computeBonusPct(elapsedSec: number, requiresActiveUse: boolean): number {
  const ratio = Math.min(elapsedSec / PLANNED_SESSION_SECONDS, 1)
  if (ratio < 0.5) return 0
  const full = requiresActiveUse ? 10 : 25
  if (ratio >= 0.95) return full
  return Math.round(full * ratio)
}

/** Group activity events by date buckets */
function groupByDate(events: ActivityEvent[]): { label: string; items: ActivityEvent[] }[] {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterdayStart = new Date(todayStart.getTime() - 86400000)
  const weekStart = new Date(todayStart.getTime() - 7 * 86400000)

  const groups: Record<string, ActivityEvent[]> = {}
  const order: string[] = []

  for (const event of events) {
    const date = new Date(event.created_at)
    let label: string

    if (date >= todayStart) {
      label = 'Today'
    } else if (date >= yesterdayStart) {
      label = 'Yesterday'
    } else if (date >= weekStart) {
      label = 'This Week'
    } else {
      label = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    }

    if (!groups[label]) {
      groups[label] = []
      order.push(label)
    }
    groups[label].push(event)
  }

  return order.map((label) => ({ label, items: groups[label] }))
}

export default function SkillDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const qc = useQueryClient()

  const { data: skill, isLoading } = useQuery({
    queryKey: ['skill', id],
    queryFn: () => getSkill(id),
  })

  const { data: skillActivity = [] } = useQuery({
    queryKey: ['activity', id],
    queryFn: () => getActivity(20, id),
    enabled: !!id,
  })

  const { data: xpChart } = useQuery({
    queryKey: ['xp-chart', id],
    queryFn: () => getXPChart(id, 30),
    enabled: !!id,
  })

  const [logSheetOpen, setLogSheetOpen] = useState(false)
  const [tierTransition, setTierTransition] = useState<{ tierName: string; tierNumber: number } | null>(null)
  const [gateFirstHit, setGateFirstHit] = useState<BlockerGate | null>(null)
  const [xpGain, setXpGain] = useState<{ amount: number; key: number }>({ amount: 0, key: 0 })
  const [grindPhase, setGrindPhase] = useState<'config' | 'work' | 'break' | 'end-early' | null>(null)
  const [postSession, setPostSession] = useState<{ elapsedSec: number } | null>(null)
  const sessionStartRef = useRef<number | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const logMutation = useMutation({
    mutationFn: ({ xpDelta, logNote }: { xpDelta: number; logNote: string }) =>
      logXP(id, xpDelta, logNote),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['skill', id] })
      qc.invalidateQueries({ queryKey: ['skills'] })
      qc.invalidateQueries({ queryKey: ['activity'] })
      setLogSheetOpen(false)
      setXpGain({ amount: result.xp_added, key: Date.now() })
      if (result.gate_first_hit) setGateFirstHit(result.gate_first_hit)
      else if (result.tier_crossed) setTierTransition({ tierName: result.tier_name, tierNumber: result.tier_number })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteSkill(id),
    onSuccess: () => router.push('/skills'),
  })

  const sessionMutation = useMutation({
    mutationFn: (body: Parameters<typeof createSession>[1]) => createSession(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['skill', id] })
      qc.invalidateQueries({ queryKey: ['skills'] })
      qc.invalidateQueries({ queryKey: ['activity'] })
      qc.invalidateQueries({ queryKey: ['xp-chart', id] })
      setGrindPhase(null)
      setPostSession(null)
    },
  })

  function handleSessionEnd({ status, elapsedSeconds }: { status: 'completed' | 'abandoned'; elapsedSeconds: number }) {
    const elapsed = elapsedSeconds > 0 ? elapsedSeconds : (sessionStartRef.current ? Math.floor((Date.now() - sessionStartRef.current) / 1000) : 0)
    if (status === 'abandoned') {
      sessionMutation.mutate({ status: 'abandoned', session_type: 'pomodoro', planned_duration_sec: PLANNED_SESSION_SECONDS, actual_duration_sec: elapsed })
      setGrindPhase(null)
    } else {
      setGrindPhase(null)
      setPostSession({ elapsedSec: elapsed })
    }
  }

  if (isLoading || !skill) return <div className="p-8 text-gray-400">Loading...</div>

  const activeGate = skill.gates.find(g => !g.is_cleared && skill.current_level >= g.gate_level)
  const isMaxLevel = skill.xp_to_next_level === 0
  const dateGroups = groupByDate(skillActivity)

  // Streak data from skill response
  const currentStreak = skill.streak?.current ?? 0
  const longestStreak = skill.streak?.longest ?? 0
  const tierColor = TIER_HEX[skill.tier_number] ?? '#6366f1'

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link href="/skills" className="text-sm hover:opacity-80 flex items-center gap-1"
          style={{ color: 'var(--color-text-muted, #6b7280)' }}>
          &larr; Skills
        </Link>
        <Link href={`/skills/${id}/edit`} className="text-sm hover:opacity-80"
          style={{ color: 'var(--color-text-muted, #6b7280)' }}>
          Edit
        </Link>
      </div>

      {/* Hero Stats — skill name + tier/level as prominent display */}
      <div>
        <h1
          className="text-3xl font-bold"
          style={{
            fontFamily: 'var(--font-display, var(--font-body, Inter, system-ui, sans-serif))',
            color: 'var(--color-text-primary, #f9fafb)',
          }}
        >
          {skill.name}
        </h1>
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          <TierBadge tierName={skill.tier_name} tierNumber={skill.tier_number} />
          <span
            className="text-2xl font-bold"
            style={{
              fontFamily: 'var(--font-display, var(--font-body, Inter, system-ui, sans-serif))',
              color: 'var(--color-accent, #6366f1)',
            }}
          >
            Level {skill.effective_level}
          </span>

          {/* Streak display */}
          {currentStreak > 0 ? (
            <span
              data-testid="streak-badge"
              className="flex items-center gap-1 bg-orange-500/20 border border-orange-500/40 rounded-full px-3 py-1"
            >
              <span role="img" aria-label="streak fire">🔥</span>
              <span className="font-semibold text-orange-400 text-sm">{currentStreak}</span>
              {longestStreak > currentStreak && (
                <span className="text-xs text-orange-300 ml-1">best: {longestStreak}</span>
              )}
            </span>
          ) : (
            <span
              data-testid="streak-zero-prompt"
              className="text-sm text-gray-500 italic"
            >
              Log today to start your streak today
            </span>
          )}
        </div>
      </div>

      {/* XP bar OR blocker gate section */}
      {activeGate ? (
        <BlockerGateSection
          gateLevel={activeGate.gate_level}
          title={activeGate.title}
          description={activeGate.description}
          currentXP={skill.current_xp}
          rawLevel={skill.current_level}
          firstNotifiedAt={activeGate.first_notified_at}
          isCleared={activeGate.is_cleared}
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
            <p className="text-sm text-center" style={{ color: 'var(--color-text-muted, #6b7280)' }}>
              Maximum Level Reached
            </p>
          ) : (
            <p className="text-sm" style={{ color: 'var(--color-text-muted, #6b7280)' }}>
              {skill.xp_for_current_level.toLocaleString()} / {(skill.xp_for_current_level + skill.xp_to_next_level).toLocaleString()} XP to level {skill.effective_level + 1}
            </p>
          )}
        </div>
      )}

      {/* Action buttons: Start Session (primary) + Log XP (secondary) */}
      <div className="relative flex gap-3">
        <button
          data-testid="start-session-btn"
          data-variant="primary"
          onClick={() => setGrindPhase('config')}
          className="flex-1 py-4 rounded-xl font-semibold text-white min-h-[48px] hover:opacity-90 transition-opacity btn-primary"
          style={{ backgroundColor: 'var(--color-accent, #6366f1)' }}
        >
          Start Session
        </button>
        <div className="relative flex-1">
          <button
            data-testid="log-xp-btn"
            data-variant="secondary"
            onClick={() => setLogSheetOpen(true)}
            className="w-full py-4 rounded-xl font-semibold min-h-[48px] hover:opacity-90 transition-opacity btn-secondary"
            style={{
              backgroundColor: 'transparent',
              border: '2px solid var(--color-accent, #6366f1)',
              color: 'var(--color-accent, #6366f1)',
            }}
          >
            Log XP
          </button>
          <div className="absolute -top-2 left-1/2 -translate-x-1/2">
            <XPGainAnimation xpAmount={xpGain.amount} animationKey={xpGain.key} />
          </div>
        </div>
      </div>

      {/* Description */}
      {skill.description && (
        <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--color-bg-surface, #1f2937)' }}>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary, #9ca3af)' }}>
            {skill.description}
          </p>
        </div>
      )}

      {/* XP Progress Chart */}
      {xpChart && (
        <section>
          <h2
            className="font-semibold mb-3"
            style={{
              fontFamily: 'var(--font-display, var(--font-body, Inter, system-ui, sans-serif))',
              color: 'var(--color-text-primary, #f9fafb)',
            }}
          >
            Last 30 Days
          </h2>
          <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--color-bg-surface, #1f2937)' }}>
            <XPBarChart data={xpChart.data} tierColor={tierColor} />
          </div>
        </section>
      )}

      {/* XP History — date grouped */}
      <section>
        <h2
          className="font-semibold mb-3"
          style={{
            fontFamily: 'var(--font-display, var(--font-body, Inter, system-ui, sans-serif))',
            color: 'var(--color-text-primary, #f9fafb)',
          }}
        >
          XP History
        </h2>
        {dateGroups.length === 0 ? (
          <p className="text-sm py-4 text-center" style={{ color: 'var(--color-text-muted, #6b7280)' }}>
            No activity yet. Log some XP to start building your history.
          </p>
        ) : (
          <div className="space-y-4">
            {dateGroups.map((group) => (
              <div key={group.label}>
                <h3
                  className="text-xs uppercase tracking-wider mb-2"
                  style={{ color: 'var(--color-text-muted, #6b7280)' }}
                >
                  {group.label}
                </h3>
                <div className="space-y-1">
                  {group.items.map((log) => (
                    <div
                      key={log.id}
                      className="flex justify-between text-sm py-2 px-3 rounded-lg"
                      style={{ backgroundColor: 'var(--color-bg-surface, #1f2937)' }}
                    >
                      <span style={{ color: 'var(--color-text-secondary, #9ca3af)' }}>
                        {log.log_note || 'Session'}
                      </span>
                      <span
                        className="font-semibold"
                        style={{ color: 'var(--color-accent, #6366f1)' }}
                      >
                        +{log.xp_delta} XP
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Delete */}
      <button
        onClick={() => setConfirmDelete(true)}
        className="text-sm w-full text-center py-2 hover:opacity-80 transition-opacity"
        style={{ color: 'var(--color-error, #f87171)' }}
      >
        Delete skill
      </button>

      {logSheetOpen && (
        <QuickLogSheet
          skillName={skill.name}
          tierNumber={skill.tier_number}
          isOpen
          isLoading={logMutation.isPending}
          onClose={() => setLogSheetOpen(false)}
          onSubmit={({ xpDelta, logNote, timeSpentMinutes }) =>
            logMutation.mutate({ xpDelta, logNote: logNote ?? '', timeSpentMinutes })
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

      {/* Grind overlay — fullscreen, shown when session is active */}
      {grindPhase && (
        <GrindOverlay
          skillId={id}
          skillName={skill.name}
          animationTheme={skill.animation_theme ?? 'general'}
          tierColor={tierColor}
          tierNumber={skill.tier_number}
          requiresActiveUse={skill.requires_active_use ?? false}
          phase={grindPhase}
          onBegin={() => {
            sessionStartRef.current = Date.now()
            setGrindPhase('work')
          }}
          onCancel={() => setGrindPhase(null)}
          onSessionEnd={handleSessionEnd}
        />
      )}

      {/* Post-session screen — shown after session ends (non-abandoned) */}
      {postSession && (() => {
        const bonusPct = computeBonusPct(postSession.elapsedSec, skill.requires_active_use ?? false)
        const baseXP = Math.round((postSession.elapsedSec / 60) * 3 * (1 + 0.4 * (skill.tier_number - 1)))
        const earnedXP = Math.max(1, Math.round(baseXP * (1 + bonusPct / 100)))
        return (
          <div className="fixed inset-0 z-50">
            <PostSessionScreen
              sessionDurationSeconds={postSession.elapsedSec}
              earnedXP={earnedXP}
              bonusPercentage={bonusPct}
              onSubmit={({ reflectionWhat, reflectionHow, reflectionFeeling }) => {
                sessionMutation.mutate({
                  session_type: 'pomodoro',
                  status: postSession.elapsedSec >= PLANNED_SESSION_SECONDS * 0.95 ? 'completed' : 'partial',
                  xp_delta: earnedXP,
                  planned_duration_sec: PLANNED_SESSION_SECONDS,
                  actual_duration_sec: postSession.elapsedSec,
                  reflection_what: reflectionWhat,
                  reflection_how: reflectionHow,
                  reflection_feeling: reflectionFeeling,
                })
              }}
              onDismiss={() => setPostSession(null)}
            />
          </div>
        )
      })()}

      {/* First-hit gate modal */}
      {gateFirstHit && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center md:pl-64">
          <div className="absolute inset-0 bg-black/60" />
          <div
            className="relative w-full md:max-w-md rounded-t-3xl md:rounded-3xl p-8 space-y-4"
            style={{ backgroundColor: 'var(--color-bg-elevated, #1a1a2e)' }}
          >
            <div className="flex items-center gap-2">
              <span className="text-2xl" role="img" aria-label="locked">&#x1F512;</span>
              <h2 className="font-bold text-lg" style={{ color: 'var(--color-text-primary, #f9fafb)' }}>
                You have hit a gate!
              </h2>
            </div>
            <p className="font-semibold" style={{ color: 'var(--color-text-primary, #f9fafb)' }}>
              Level {gateFirstHit.gate_level} Gate: &quot;{gateFirstHit.title}&quot;
            </p>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary, #9ca3af)' }}>
              {gateFirstHit.description}
            </p>
            <p className="text-sm" style={{ color: 'var(--color-text-muted, #6b7280)' }}>
              Your XP keeps growing, but your level display is paused here until you complete this challenge.
            </p>
            <button
              onClick={() => setGateFirstHit(null)}
              className="w-full py-4 rounded-xl font-semibold text-white min-h-[48px]"
              style={{ backgroundColor: 'var(--color-warning, #facc15)', color: 'var(--color-text-inverse, #0a0a0f)' }}
            >
              Got it -- see gate details
            </button>
          </div>
        </div>
      )}

      {confirmDelete && (
        <ConfirmModal
          title="Delete this skill?"
          message="All XP history and session data will be permanently removed. This cannot be undone."
          confirmLabel="Delete"
          destructive
          isLoading={deleteMutation.isPending}
          onConfirm={() => deleteMutation.mutate()}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </div>
  )
}
