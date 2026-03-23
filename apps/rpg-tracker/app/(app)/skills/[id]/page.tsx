'use client'

import { useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { getSkill, logXP, deleteSkill, getActivity, getXPChart, createSession, updateSkill, toggleFavourite, setSkillTags, listTags } from '@rpgtracker/api-client'
import type { BlockerGate, ActivityEvent } from '@rpgtracker/api-client'
import { XPProgressBar, TierBadge, BlockerGateSection, QuickLogSheet, TierTransitionModal, GrindOverlay, PostSessionScreen, XPBarChart, ConfirmModal, SkillEditModal } from '@rpgtracker/ui'
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

  const { data: userTags = [] } = useQuery({ queryKey: ['tags'], queryFn: listTags })

  const [logSheetOpen, setLogSheetOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [tagBuffer, setTagBuffer] = useState<string[] | null>(null) // null = not editing
  const [tagInput, setTagInput] = useState('')
  const [tagError, setTagError] = useState<string | null>(null)
  const [tierTransition, setTierTransition] = useState<{ tierName: string; tierNumber: number } | null>(null)
  const [gateFirstHit, setGateFirstHit] = useState<BlockerGate | null>(null)
  const [xpGain, setXpGain] = useState<{ amount: number; key: number }>({ amount: 0, key: 0 })
  const [grindPhase, setGrindPhase] = useState<'config' | 'work' | 'break' | 'end-early' | null>(null)
  const [postSession, setPostSession] = useState<{ elapsedSec: number } | null>(null)
  const sessionStartRef = useRef<number | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const logMutation = useMutation({
    mutationFn: ({ xpDelta, logNote }: { xpDelta: number; logNote: string; timeSpentMinutes?: number }) =>
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

  const favouriteMutation = useMutation({
    mutationFn: () => toggleFavourite(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['skill', id] })
      qc.invalidateQueries({ queryKey: ['skills'] })
    },
  })

  const tagMutation = useMutation({
    mutationFn: (tagNames: string[]) => setSkillTags(id, tagNames),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['skill', id] })
      qc.invalidateQueries({ queryKey: ['skills'] })
      qc.invalidateQueries({ queryKey: ['tags'] })
      setTagBuffer(null)
      setTagError(null)
    },
    onError: (err: Error) => {
      setTagError(err.message)
    },
  })

  function handleTagCommit() {
    if (!tagInput.trim()) return
    const name = tagInput.trim().toLowerCase()
    setTagBuffer((prev) => {
      const buf = prev ?? skill?.tags.map((t) => t.name) ?? []
      if (buf.includes(name) || buf.length >= 5) return buf
      return [...buf, name]
    })
    setTagInput('')
  }

  function handleTagRemove(name: string) {
    setTagBuffer((prev) => (prev ?? []).filter((t) => t !== name))
  }

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

  if (isLoading || !skill) return <div className="p-8 text-muted">Loading...</div>

  const activeGate = skill.gates.find(g => !g.is_cleared && skill.current_level >= g.gate_level)
  const isMaxLevel = skill.xp_to_next_level === 0
  const dateGroups = groupByDate(skillActivity)

  const currentStreak = skill.streak?.current ?? 0
  const longestStreak = skill.streak?.longest ?? 0
  const tierColor = TIER_HEX[skill.tier_number] ?? '#6366f1'

  return (
    <div
      className="p-4 md:p-8 space-y-8"
      style={{
        backgroundImage: `radial-gradient(ellipse 80% 35% at 50% 0%, ${tierColor}12 0%, transparent 100%)`,
      }}
    >
      {/* ── Hero Section — "The Character Sheet" ──────────── */}
      <div data-testid="hero-section" className="space-y-6">
        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Link href="/skills" className="link-muted text-sm flex items-center gap-1">
            &larr; Skills
          </Link>
          {skill.is_custom && (
            <button
              onClick={() => setEditModalOpen(true)}
              className="link-muted text-sm"
            >
              Edit
            </button>
          )}
        </div>

        {/* Skill identity — name, category, level, tier badge, streak, favourite */}
        <div>
          <div className="flex items-start justify-between gap-2">
            <h1 className="heading text-3xl font-bold">
              {skill.name}
            </h1>
            <button
              aria-label={skill.is_favourite ? 'Remove from favourites' : 'Add to favourites'}
              aria-pressed={skill.is_favourite}
              onClick={() => favouriteMutation.mutate()}
              className="flex items-center justify-center w-[44px] h-[44px] rounded-lg text-xl shrink-0"
              style={{ color: skill.is_favourite ? 'var(--color-accent)' : 'var(--color-muted)' }}
            >
              {skill.is_favourite ? '★' : '☆'}
            </button>
          </div>

          {/* Category display */}
          {skill.category_name && (
            <p
              className="text-sm mt-1"
              style={{ fontFamily: 'var(--font-body)', color: 'var(--color-muted)' }}
            >
              {skill.category_emoji} {skill.category_name}
            </p>
          )}

          <div className="flex items-center gap-3 mt-3 flex-wrap">
            <TierBadge tierName={skill.tier_name} tierNumber={skill.tier_number} />
            <span className="heading text-2xl font-bold text-gradient">
              Level {skill.effective_level}
            </span>

            {currentStreak > 0 ? (
              <span
                data-testid="streak-badge"
                className="badge-accent flex items-center gap-1.5 px-3 py-1"
              >
                <span role="img" aria-label="streak fire">&#x1F525;</span>
                <span className="text-accent font-semibold">{currentStreak}</span>
                {longestStreak > currentStreak && (
                  <span className="text-muted text-xs ml-1">best: {longestStreak}</span>
                )}
              </span>
            ) : (
              <span
                data-testid="streak-zero-prompt"
                className="text-muted text-sm italic"
              >
                Log today to start your streak
              </span>
            )}
          </div>
        </div>

        {/* Tags display + management (AC-V5, AC-V7, AC-V8) */}
        <div>
          {/* Current tags */}
          {(skill.tags.length > 0 || tagBuffer !== null) && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {(tagBuffer ?? skill.tags.map((t) => t.name)).map((name) => (
                <span
                  key={name}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs"
                  style={{
                    fontFamily: 'var(--font-body)',
                    backgroundColor: 'var(--color-surface)',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  {name}
                  {tagBuffer !== null && (
                    <button
                      aria-label={`Remove tag ${name}`}
                      onClick={() => handleTagRemove(name)}
                      className="ml-0.5 hover:opacity-70"
                      style={{ color: 'var(--color-muted)' }}
                    >
                      ✕
                    </button>
                  )}
                </span>
              ))}
            </div>
          )}

          {/* Tag editing controls */}
          {tagBuffer !== null ? (
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault()
                      handleTagCommit()
                    }
                  }}
                  onBlur={() => handleTagCommit()}
                  placeholder={tagBuffer.length >= 5 ? 'Max 5 tags' : 'Add a tag...'}
                  disabled={tagBuffer.length >= 5}
                  list="tag-suggestions"
                  className="flex-1 rounded-lg px-3 py-2 text-sm border-none"
                  style={{
                    fontFamily: 'var(--font-body)',
                    backgroundColor: 'var(--color-surface)',
                    color: 'var(--color-text)',
                    minHeight: 'var(--tap-target-min, 44px)',
                  }}
                />
                <datalist id="tag-suggestions">
                  {userTags
                    .filter((t) => !tagBuffer.includes(t.name))
                    .map((t) => (
                      <option key={t.id} value={t.name} />
                    ))}
                </datalist>
                <button
                  onClick={() => tagMutation.mutate(tagBuffer)}
                  disabled={tagMutation.isPending}
                  className="px-4 py-2 rounded-lg text-sm font-medium min-h-[44px]"
                  style={{ backgroundColor: 'var(--color-accent)', color: 'white' }}
                >
                  {tagMutation.isPending ? '...' : 'Save'}
                </button>
                <button
                  onClick={() => { setTagBuffer(null); setTagError(null) }}
                  className="px-3 py-2 rounded-lg text-sm min-h-[44px]"
                  style={{ color: 'var(--color-muted)' }}
                >
                  Cancel
                </button>
              </div>
              {tagBuffer.length >= 5 && (
                <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
                  Maximum 5 tags per skill
                </p>
              )}
              {tagError && (
                <p className="text-xs" style={{ color: 'var(--color-error)' }}>
                  {tagError}
                </p>
              )}
            </div>
          ) : (
            <button
              onClick={() => setTagBuffer(skill.tags.map((t) => t.name))}
              className="text-xs underline"
              style={{ color: 'var(--color-accent)', fontFamily: 'var(--font-body)' }}
            >
              {skill.tags.length > 0 ? 'Edit tags' : '+ Add tags'}
            </button>
          )}
        </div>

        {/* Gate / XP progress — protected components */}
        {activeGate ? (
          <div className="gate-section">
          <BlockerGateSection
            gateLevel={activeGate.gate_level}
            title={activeGate.title}
            description={activeGate.description}
            currentXP={skill.current_xp}
            rawLevel={skill.current_level}
            firstNotifiedAt={activeGate.first_notified_at}
            isCleared={activeGate.is_cleared}
            activeGateSubmission={skill.active_gate_submission ?? null}
          />
          </div>
        ) : (
          <div className="card p-5 space-y-2">
            <XPProgressBar
              tierNumber={skill.tier_number}
              xpForCurrentLevel={skill.xp_for_current_level}
              xpToNextLevel={skill.xp_to_next_level}
              isMaxLevel={isMaxLevel}
              className="h-3"
            />
            {isMaxLevel ? (
              <p className="text-muted text-sm text-center">
                Maximum Level Reached
              </p>
            ) : (
              <p className="text-muted text-sm">
                {skill.xp_for_current_level.toLocaleString()} / {(skill.xp_for_current_level + skill.xp_to_next_level).toLocaleString()} XP to level {skill.effective_level + 1}
              </p>
            )}
          </div>
        )}

        {/* Action buttons — game menu style */}
        <div className="relative flex gap-3">
          <Link
            data-testid="start-session-btn"
            data-variant="primary"
            href={`/skills/${id}/session?from=skill`}
            className="btn btn-primary flex-1 py-4 text-center"
          >
            Start Session
          </Link>
          <div className="relative flex-1">
            <button
              data-testid="log-xp-btn"
              data-variant="secondary"
              onClick={() => setLogSheetOpen(true)}
              className="btn btn-secondary w-full py-4"
            >
              Log XP
            </button>
            <div className="absolute -top-2 left-1/2 -translate-x-1/2">
              <XPGainAnimation xpAmount={xpGain.amount} animationKey={xpGain.key} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Section divider ───────────────────────────────── */}
      <div className="section-divider">
        <div className="section-rule" />
        <span className="section-label">Progress</span>
        <div className="section-rule" />
      </div>

      {/* ── Content grid — chart + history ─────────────────── */}
      <div data-testid="detail-grid" className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: XP Progress Chart */}
        {xpChart && (
          <section>
            <h2 className="heading section-label mb-3">
              Last 30 Days
            </h2>
            <div className="card p-4">
              <XPBarChart data={xpChart.data} tierColor={tierColor} />
            </div>
          </section>
        )}

        {/* Right: Description + XP History */}
        <div data-testid="history-section" className={xpChart ? '' : 'md:col-span-2'}>
          {skill.description && (
            <div className="card p-4 mb-6">
              <p className="text-body text-sm leading-relaxed">
                {skill.description}
              </p>
            </div>
          )}

          <section>
            <h2 className="heading section-label mb-3">
              XP History
            </h2>
            <div className="activity-history">
            {dateGroups.length === 0 ? (
              <p
                className="activity-history__empty text-muted text-sm py-8 text-center"
                data-empty-minimal="No activity yet. Log some XP to get started."
                data-empty-retro="Your chronicle awaits... Begin your journey."
                data-empty-modern="No data recorded. Initiate a session to begin logging."
              >
                No activity yet. Log some XP to get started.
              </p>
            ) : (
              <div className="space-y-5">
                {dateGroups.map((group) => (
                  <div key={group.label}>
                    <h3 className="activity-history__date-header label-date text-xs mb-2">
                      {group.label}
                    </h3>
                    <div className="space-y-1">
                      {group.items.map((log) => (
                        <div
                          key={log.id}
                          className="activity-history__entry history-row flex justify-between text-sm py-2.5 px-3"
                        >
                          <span className="text-body">
                            {log.log_note || 'Session'}
                          </span>
                          <span className="text-accent font-semibold">
                            +{log.xp_delta} XP
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            </div>
          </section>
        </div>
      </div>

      {/* ── Page footer ───────────────────────────────────── */}
      <div className="space-y-4">
        <div className="gold-rule" />
        <button
          onClick={() => setConfirmDelete(true)}
          className="btn btn-danger text-sm w-full py-2"
        >
          Delete skill
        </button>
      </div>

      {/* ── Modals & overlays ─────────────────────────────── */}
      {editModalOpen && skill && (
        <SkillEditModal
          skillId={skill.id}
          skillName={skill.name}
          skillDescription={skill.description ?? ''}
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          onUpdate={async (name, description) => {
            await updateSkill(id, { name, description })
            qc.invalidateQueries({ queryKey: ['skill', id] })
            qc.invalidateQueries({ queryKey: ['skills'] })
          }}
        />
      )}

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

      {gateFirstHit && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center md:pl-64">
          <div className="absolute inset-0 modal-backdrop" />
          <div className="modal-panel relative w-full md:max-w-md rounded-t-3xl md:rounded-3xl p-8 space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl" role="img" aria-label="locked">&#x1F512;</span>
              <h2 className="heading font-bold text-lg">
                You have hit a gate!
              </h2>
            </div>
            <p className="heading font-semibold">
              Level {gateFirstHit.gate_level} Gate: &quot;{gateFirstHit.title}&quot;
            </p>
            <p className="text-body text-sm">
              {gateFirstHit.description}
            </p>
            <p className="text-muted text-sm">
              Your XP keeps growing, but your level display is paused here until you complete this challenge.
            </p>
            <button
              onClick={() => setGateFirstHit(null)}
              className="btn w-full py-4 font-semibold"
              style={{ backgroundColor: 'var(--color-warning)', color: 'var(--color-text-inverse)' }}
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
