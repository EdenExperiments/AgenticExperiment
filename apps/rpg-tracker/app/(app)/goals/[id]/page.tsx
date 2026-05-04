'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import {
  getGoal,
  listMilestones,
  listCheckIns,
  createMilestone,
  updateMilestone,
  deleteMilestone,
  createCheckIn,
  updateGoal,
  getGoalForecast,
} from '@rpgtracker/api-client'
import type { Goal, GoalStatus, Milestone, CheckIn, GoalForecast, TrackState } from '@rpgtracker/api-client'

function formatDate(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return formatDate(iso)
}

function GoalStatusBadge({ status }: { status: GoalStatus }) {
  const styles: Record<GoalStatus, React.CSSProperties> = {
    active: { background: 'var(--color-accent)', color: 'var(--color-text-on-accent, #fff)' },
    completed: { background: 'var(--color-success, #22c55e)', color: '#fff' },
    abandoned: { background: 'var(--color-muted)', color: 'var(--color-bg)' },
  }
  const labels: Record<GoalStatus, string> = { active: 'Active', completed: 'Completed', abandoned: 'Abandoned' }

  return (
    <span
      className="text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
      style={styles[status]}
    >
      {labels[status]}
    </span>
  )
}

function MilestoneItem({
  milestone,
  goalId,
  onToggle,
  onDelete,
}: {
  milestone: Milestone
  goalId: string
  onToggle: (m: Milestone) => void
  onDelete: (id: string) => void
}) {
  return (
    <li
      className="flex items-start gap-3 py-2"
      style={{ borderBottom: '1px solid var(--color-border)' }}
    >
      <button
        onClick={() => onToggle(milestone)}
        aria-label={milestone.is_done ? `Mark "${milestone.title}" incomplete` : `Mark "${milestone.title}" done`}
        aria-pressed={milestone.is_done}
        className="mt-0.5 w-5 h-5 rounded flex items-center justify-center shrink-0 border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1"
        style={{
          borderColor: milestone.is_done ? 'var(--color-accent)' : 'var(--color-border-strong)',
          background: milestone.is_done ? 'var(--color-accent)' : 'transparent',
          color: milestone.is_done ? 'var(--color-text-on-accent, #fff)' : 'transparent',
          '--tw-ring-color': 'var(--color-accent)',
        } as React.CSSProperties}
      >
        {milestone.is_done && (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none" aria-hidden="true">
            <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      <div className="flex-1 min-w-0">
        <p
          className="text-sm font-medium leading-snug"
          style={{
            color: milestone.is_done ? 'var(--color-muted)' : 'var(--color-text)',
            textDecoration: milestone.is_done ? 'line-through' : 'none',
          }}
        >
          {milestone.title}
        </p>
        {milestone.description && (
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>
            {milestone.description}
          </p>
        )}
        {milestone.due_date && (
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>
            Due {formatDate(milestone.due_date)}
          </p>
        )}
      </div>

      <button
        onClick={() => onDelete(milestone.id)}
        aria-label={`Delete milestone "${milestone.title}"`}
        className="text-xs shrink-0 mt-0.5"
        style={{ color: 'var(--color-muted)' }}
      >
        ✕
      </button>
    </li>
  )
}

function AddMilestoneForm({
  goalId,
  onSuccess,
}: {
  goalId: string
  onSuccess: () => void
}) {
  const qc = useQueryClient()
  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState('')

  const mutation = useMutation({
    mutationFn: () =>
      createMilestone(goalId, {
        title: title.trim(),
        due_date: dueDate || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['milestones', goalId] })
      setTitle('')
      setDueDate('')
      onSuccess()
    },
  })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (title.trim()) mutation.mutate()
      }}
      className="space-y-2 pt-2"
    >
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Milestone title (required)"
        maxLength={200}
        required
        className="w-full rounded-lg px-3 py-2 text-sm"
        style={{
          background: 'var(--color-surface)',
          color: 'var(--color-text)',
          border: '1px solid var(--color-border)',
          minHeight: '40px',
        }}
        aria-label="Milestone title"
      />
      <input
        type="date"
        value={dueDate}
        onChange={(e) => setDueDate(e.target.value)}
        className="w-full rounded-lg px-3 py-2 text-sm"
        style={{
          background: 'var(--color-surface)',
          color: 'var(--color-text)',
          border: '1px solid var(--color-border)',
          minHeight: '40px',
        }}
        aria-label="Due date (optional)"
      />
      {mutation.isError && (
        <p className="text-xs" style={{ color: 'var(--color-error, #ef4444)' }}>
          Failed to add milestone. Try again.
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={!title.trim() || mutation.isPending}
          aria-busy={mutation.isPending}
          className="btn btn-primary flex-1 py-2 text-sm disabled:opacity-50"
        >
          {mutation.isPending ? 'Adding…' : 'Add Milestone'}
        </button>
      </div>
    </form>
  )
}

function CheckInForm({ goalId, hasValue }: { goalId: string; hasValue: boolean }) {
  const qc = useQueryClient()
  const [note, setNote] = useState('')
  const [value, setValue] = useState('')
  const [open, setOpen] = useState(false)

  const mutation = useMutation({
    mutationFn: () =>
      createCheckIn(goalId, {
        note: note.trim(),
        value: value ? Number(value) : undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['checkins', goalId] })
      qc.invalidateQueries({ queryKey: ['goal', goalId] })
      setNote('')
      setValue('')
      setOpen(false)
    },
  })

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="btn btn-primary w-full py-3 text-sm min-h-[44px]"
      >
        + Log Check-in
      </button>
    )
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (note.trim()) mutation.mutate()
      }}
      className="space-y-3 rounded-xl p-4"
      style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}
    >
      <h3
        className="font-semibold text-sm"
        style={{ color: 'var(--color-text)', fontFamily: 'var(--font-display)' }}
      >
        Log Check-in
      </h3>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="How's it going? What did you work on?"
        maxLength={1000}
        rows={3}
        required
        className="w-full rounded-lg px-3 py-2 text-sm resize-none"
        style={{
          background: 'var(--color-surface)',
          color: 'var(--color-text)',
          border: '1px solid var(--color-border)',
        }}
        aria-label="Check-in note"
      />
      {hasValue && (
        <input
          type="number"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Current value (optional)"
          step="any"
          className="w-full rounded-lg px-3 py-2 text-sm"
          style={{
            background: 'var(--color-surface)',
            color: 'var(--color-text)',
            border: '1px solid var(--color-border)',
            minHeight: '40px',
          }}
          aria-label="Progress value"
        />
      )}
      {mutation.isError && (
        <p className="text-xs" style={{ color: 'var(--color-error, #ef4444)' }}>
          Failed to save check-in. Try again.
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="btn btn-ghost flex-1 py-2 text-sm"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!note.trim() || mutation.isPending}
          aria-busy={mutation.isPending}
          className="btn btn-primary flex-1 py-2 text-sm disabled:opacity-50"
        >
          {mutation.isPending ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  )
}

function CheckInCard({ checkIn, unit }: { checkIn: CheckIn; unit: string | null }) {
  return (
    <div
      className="rounded-xl p-3 space-y-1"
      style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm" style={{ color: 'var(--color-text)' }}>
          {checkIn.note}
        </p>
        {checkIn.value != null && (
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full shrink-0"
            style={{ background: 'var(--color-accent)', color: 'var(--color-text-on-accent, #fff)' }}
          >
            {checkIn.value}{unit ? ` ${unit}` : ''}
          </span>
        )}
      </div>
      <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
        {formatRelative(checkIn.checked_in_at)}
      </p>
    </div>
  )
}

const TRACK_STATE_CONFIG: Record<TrackState, { label: string; color: string; icon: string }> = {
  on_track: { label: 'On Track', color: 'var(--color-success, #22c55e)', icon: '✓' },
  at_risk: { label: 'At Risk', color: 'var(--color-warning, #f59e0b)', icon: '⚠' },
  behind: { label: 'Behind', color: 'var(--color-error, #ef4444)', icon: '↓' },
  complete: { label: 'Complete', color: 'var(--color-success, #22c55e)', icon: '★' },
  unknown: { label: 'Not enough data', color: 'var(--color-muted)', icon: '?' },
}

function GoalForecastSection({ goalId }: { goalId: string }) {
  const { data: forecast, isLoading, isError } = useQuery<GoalForecast>({
    queryKey: ['forecast', goalId],
    queryFn: () => getGoalForecast(goalId),
    staleTime: 5 * 60 * 1000,
  })

  if (isLoading) {
    return (
      <div
        className="rounded-xl p-4 animate-pulse"
        style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}
        aria-label="Loading forecast"
        aria-busy="true"
      >
        <div className="h-4 w-24 rounded mb-3" style={{ background: 'var(--color-surface)' }} />
        <div className="h-8 w-32 rounded" style={{ background: 'var(--color-surface)' }} />
      </div>
    )
  }

  if (isError || !forecast) {
    return (
      <div
        className="rounded-xl p-4 text-sm"
        style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', color: 'var(--color-muted)' }}
        role="status"
      >
        Forecast unavailable — check back after logging more check-ins.
      </div>
    )
  }

  const config = TRACK_STATE_CONFIG[forecast.track_state] ?? TRACK_STATE_CONFIG.unknown
  const confidencePct = Math.round(forecast.confidence_score * 100)
  const driftAbs = Math.abs(forecast.drift_pct)
  const driftLabel =
    forecast.drift_direction === 'ahead'
      ? `${driftAbs}% ahead`
      : forecast.drift_direction === 'behind'
      ? `${driftAbs}% behind`
      : 'On pace'

  return (
    <div
      className="rounded-xl p-4 space-y-4"
      style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}
      aria-label="Weekly review"
    >
      <div className="flex items-center justify-between">
        <h2
          className="text-sm font-semibold uppercase tracking-wider"
          style={{ color: 'var(--color-muted)', fontFamily: 'var(--font-display)' }}
        >
          Weekly Review
        </h2>
        {forecast.days_remaining > 0 && (
          <span className="text-xs" style={{ color: 'var(--color-muted)' }}>
            {forecast.days_remaining}d remaining
          </span>
        )}
      </div>

      {/* Track state */}
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-base font-bold shrink-0"
          style={{ background: config.color, color: '#fff' }}
          aria-hidden="true"
        >
          {config.icon}
        </div>
        <div>
          <p
            className="font-semibold text-base"
            style={{ color: config.color, fontFamily: 'var(--font-display)' }}
            data-testid="track-state-label"
          >
            {config.label}
          </p>
          <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
            {driftLabel} · {confidencePct}% confidence
          </p>
        </div>
      </div>

      {/* Progress comparison */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs" style={{ color: 'var(--color-muted)' }}>
          <span>Expected: {Math.round(forecast.expected_progress)}%</span>
          <span>Actual: {Math.round(forecast.actual_progress)}%</span>
        </div>
        <div
          className="relative h-2 rounded-full overflow-hidden"
          style={{ background: 'var(--color-surface)' }}
          role="img"
          aria-label={`Expected ${Math.round(forecast.expected_progress)}% actual ${Math.round(forecast.actual_progress)}%`}
        >
          {/* Expected marker */}
          <div
            className="absolute top-0 bottom-0 w-0.5 rounded"
            style={{
              left: `${Math.min(100, forecast.expected_progress)}%`,
              background: 'var(--color-muted)',
            }}
            aria-hidden="true"
          />
          {/* Actual progress */}
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${Math.min(100, forecast.actual_progress)}%`, background: config.color }}
          />
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-base font-bold" style={{ color: 'var(--color-text)' }}>
            {forecast.checkin_count}
          </p>
          <p className="text-[10px]" style={{ color: 'var(--color-muted)' }}>check-ins</p>
        </div>
        <div>
          <p className="text-base font-bold" style={{ color: 'var(--color-text)' }}>
            {Math.round(forecast.milestone_done_ratio * 100)}%
          </p>
          <p className="text-[10px]" style={{ color: 'var(--color-muted)' }}>milestones done</p>
        </div>
        <div>
          <p className="text-base font-bold" style={{ color: 'var(--color-text)' }}>
            {confidencePct}%
          </p>
          <p className="text-[10px]" style={{ color: 'var(--color-muted)' }}>confidence</p>
        </div>
      </div>

      {/* Recommendations */}
      {(forecast.recommend_checkin || forecast.recommend_review || forecast.recommend_stretch) && (
        <div className="space-y-1.5 pt-1">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-muted)' }}>
            Recommendations
          </p>
          <ul className="space-y-1" aria-label="AI recommendations">
            {forecast.recommend_checkin && (
              <li className="text-sm flex items-start gap-2" style={{ color: 'var(--color-text-secondary)' }}>
                <span aria-hidden="true" style={{ color: 'var(--color-accent)' }}>→</span>
                Log a check-in to keep your streak going.
              </li>
            )}
            {forecast.recommend_review && (
              <li className="text-sm flex items-start gap-2" style={{ color: 'var(--color-text-secondary)' }}>
                <span aria-hidden="true" style={{ color: 'var(--color-accent)' }}>→</span>
                Review your milestones — you may need to adjust the plan.
              </li>
            )}
            {forecast.recommend_stretch && (
              <li className="text-sm flex items-start gap-2" style={{ color: 'var(--color-text-secondary)' }}>
                <span aria-hidden="true" style={{ color: 'var(--color-accent)' }}>→</span>
                You&apos;re ahead of pace — consider stretching your goal.
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}

export default function GoalDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const qc = useQueryClient()
  const [showAddMilestone, setShowAddMilestone] = useState(false)
  const [deletingMilestoneId, setDeletingMilestoneId] = useState<string | null>(null)

  const { data: goal, isLoading, isError } = useQuery({
    queryKey: ['goal', id],
    queryFn: () => getGoal(id),
  })

  const { data: milestones = [] } = useQuery({
    queryKey: ['milestones', id],
    queryFn: () => listMilestones(id),
    enabled: !!id,
  })

  const { data: checkIns = [] } = useQuery({
    queryKey: ['checkins', id],
    queryFn: () => listCheckIns(id),
    enabled: !!id,
  })

  const toggleMilestoneMutation = useMutation({
    mutationFn: (m: Milestone) =>
      updateMilestone(id, m.id, { is_done: !m.is_done }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['milestones', id] })
    },
  })

  const deleteMilestoneMutation = useMutation({
    mutationFn: (milestoneId: string) => deleteMilestone(id, milestoneId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['milestones', id] })
      setDeletingMilestoneId(null)
    },
  })

  const markGoalCompleteMutation = useMutation({
    mutationFn: () => updateGoal(id, { status: 'completed' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['goal', id] })
      qc.invalidateQueries({ queryKey: ['goals'] })
    },
  })

  if (isLoading) {
    return <div className="p-8" style={{ color: 'var(--color-muted)' }}>Loading...</div>
  }

  if (isError || !goal) {
    return (
      <div className="p-8 text-center space-y-4">
        <p style={{ color: 'var(--color-error, #ef4444)' }}>Failed to load goal.</p>
        <button onClick={() => router.back()} className="btn btn-ghost px-4 py-2">
          Go back
        </button>
      </div>
    )
  }

  const hasProgress = goal.current_value != null && goal.target_value != null && goal.target_value > 0
  const progress = hasProgress ? Math.min(100, ((goal.current_value ?? 0) / (goal.target_value ?? 1)) * 100) : null
  const doneMilestones = milestones.filter((m) => m.is_done).length
  const milestoneProgress = milestones.length > 0 ? (doneMilestones / milestones.length) * 100 : null

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8 space-y-6">
      {/* Back link */}
      <Link
        href="/goals"
        className="inline-flex items-center gap-1 text-sm"
        style={{ color: 'var(--color-muted)' }}
        aria-label="Back to Goals"
      >
        ← Goals
      </Link>

      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <h1
            className="text-2xl font-bold leading-tight flex-1"
            style={{
              fontFamily: 'var(--font-display, var(--font-body))',
              color: 'var(--color-text)',
            }}
          >
            {goal.title}
          </h1>
          <div className="flex items-center gap-2 shrink-0">
            <GoalStatusBadge status={goal.status} />
          </div>
        </div>

        {goal.description && (
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            {goal.description}
          </p>
        )}

        <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--color-muted)' }}>
          {goal.target_date && <span>Due {formatDate(goal.target_date)}</span>}
          <span>Created {formatDate(goal.created_at)}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        <Link
          href={`/goals/${id}/edit`}
          className="btn btn-ghost px-4 py-2 text-sm min-h-[44px] flex items-center"
        >
          Edit Goal
        </Link>
        {goal.status === 'active' && (
          <button
            onClick={() => markGoalCompleteMutation.mutate()}
            disabled={markGoalCompleteMutation.isPending}
            aria-busy={markGoalCompleteMutation.isPending}
            className="btn btn-primary px-4 py-2 text-sm min-h-[44px] disabled:opacity-50"
          >
            {markGoalCompleteMutation.isPending ? 'Completing…' : 'Mark Complete'}
          </button>
        )}
      </div>

      {/* Numeric progress */}
      {hasProgress && progress !== null && (
        <div
          className="rounded-xl p-4 space-y-3"
          style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}
        >
          <div className="flex items-center justify-between">
            <h2
              className="text-sm font-semibold uppercase tracking-wider"
              style={{ color: 'var(--color-muted)', fontFamily: 'var(--font-display)' }}
            >
              Progress
            </h2>
            <span
              className="text-sm font-bold"
              style={{ color: 'var(--color-accent)' }}
            >
              {Math.round(progress)}%
            </span>
          </div>
          <div
            className="h-2 rounded-full overflow-hidden"
            style={{ background: 'var(--color-surface)' }}
            role="progressbar"
            aria-valuenow={Math.round(progress)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Goal numeric progress"
          >
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${progress}%`, background: 'var(--color-accent)' }}
            />
          </div>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            {goal.current_value} / {goal.target_value}{goal.unit ? ` ${goal.unit}` : ''}
          </p>
        </div>
      )}

      {/* Milestones section */}
      <div
        className="rounded-xl p-4 space-y-3"
        style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}
      >
        <div className="flex items-center justify-between">
          <h2
            className="text-sm font-semibold uppercase tracking-wider"
            style={{ color: 'var(--color-muted)', fontFamily: 'var(--font-display)' }}
          >
            Milestones
            {milestones.length > 0 && (
              <span className="ml-1 font-normal">({doneMilestones}/{milestones.length})</span>
            )}
          </h2>
          {!showAddMilestone && (
            <button
              onClick={() => setShowAddMilestone(true)}
              className="text-sm"
              style={{ color: 'var(--color-accent)' }}
            >
              + Add
            </button>
          )}
        </div>

        {milestoneProgress !== null && (
          <div
            className="h-1.5 rounded-full overflow-hidden"
            style={{ background: 'var(--color-surface)' }}
            role="progressbar"
            aria-valuenow={Math.round(milestoneProgress)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Milestone completion progress"
          >
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${milestoneProgress}%`, background: 'var(--color-accent)' }}
            />
          </div>
        )}

        {milestones.length === 0 && !showAddMilestone && (
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
            No milestones yet. Break your goal into steps.
          </p>
        )}

        {milestones.length > 0 && (
          <ul className="space-y-0" aria-label="Milestones">
            {milestones.map((m) => (
              <MilestoneItem
                key={m.id}
                milestone={m}
                goalId={id}
                onToggle={(m) => toggleMilestoneMutation.mutate(m)}
                onDelete={(mid) => setDeletingMilestoneId(mid)}
              />
            ))}
          </ul>
        )}

        {showAddMilestone && (
          <AddMilestoneForm
            goalId={id}
            onSuccess={() => setShowAddMilestone(false)}
          />
        )}
        {showAddMilestone && (
          <button
            onClick={() => setShowAddMilestone(false)}
            className="text-xs"
            style={{ color: 'var(--color-muted)' }}
          >
            Cancel
          </button>
        )}
      </div>

      {/* Forecast / Weekly Review */}
      {goal.status === 'active' && <GoalForecastSection goalId={id} />}

      {/* Check-ins section */}
      <div className="space-y-3">
        <h2
          className="text-sm font-semibold uppercase tracking-wider"
          style={{ color: 'var(--color-muted)', fontFamily: 'var(--font-display)' }}
        >
          Check-ins
        </h2>

        <CheckInForm goalId={id} hasValue={goal.target_value != null} />

        {checkIns.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
            No check-ins yet. Log your first update above.
          </p>
        ) : (
          <div className="space-y-2">
            {checkIns.map((c) => (
              <CheckInCard key={c.id} checkIn={c} unit={goal.unit} />
            ))}
          </div>
        )}
      </div>

      {/* Delete milestone confirmation */}
      {deletingMilestoneId && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40"
            onClick={() => !deleteMilestoneMutation.isPending && setDeletingMilestoneId(null)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-milestone-title"
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 rounded-2xl p-6 max-w-sm mx-auto"
            style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-strong)' }}
          >
            <h2
              id="delete-milestone-title"
              className="text-lg font-bold mb-2"
              style={{ color: 'var(--color-text)', fontFamily: 'var(--font-display)' }}
            >
              Delete milestone?
            </h2>
            <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              This milestone will be permanently removed.
            </p>
            {deleteMilestoneMutation.isError && (
              <p className="text-sm mb-3" style={{ color: 'var(--color-error, #ef4444)' }}>
                Failed to delete. Try again.
              </p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setDeletingMilestoneId(null)}
                disabled={deleteMilestoneMutation.isPending}
                className="btn btn-ghost flex-1 py-3"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMilestoneMutation.mutate(deletingMilestoneId)}
                disabled={deleteMilestoneMutation.isPending}
                aria-busy={deleteMilestoneMutation.isPending}
                className="btn btn-danger flex-1 py-3 disabled:opacity-50"
              >
                {deleteMilestoneMutation.isPending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
