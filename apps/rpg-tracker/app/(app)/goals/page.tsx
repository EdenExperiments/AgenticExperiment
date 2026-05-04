'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { listGoals, deleteGoal } from '@rpgtracker/api-client'
import type { Goal, GoalStatus } from '@rpgtracker/api-client'

const STATUS_TABS: { value: GoalStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'abandoned', label: 'Abandoned' },
]

function formatDate(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function GoalStatusBadge({ status }: { status: GoalStatus }) {
  const styles: Record<GoalStatus, React.CSSProperties> = {
    active: { background: 'var(--color-accent)', color: 'var(--color-text-on-accent, #fff)' },
    completed: { background: 'var(--color-success, #22c55e)', color: '#fff' },
    abandoned: { background: 'var(--color-muted)', color: 'var(--color-bg)' },
  }
  const labels: Record<GoalStatus, string> = {
    active: 'Active',
    completed: 'Completed',
    abandoned: 'Abandoned',
  }

  return (
    <span
      className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
      style={styles[status]}
    >
      {labels[status]}
    </span>
  )
}

function GoalCard({ goal, onDelete }: { goal: Goal; onDelete: (id: string) => void }) {
  const router = useRouter()
  const hasProgress = goal.current_value != null && goal.target_value != null && goal.target_value > 0
  const progress = hasProgress ? Math.min(100, ((goal.current_value ?? 0) / (goal.target_value ?? 1)) * 100) : null

  return (
    <div
      className="rounded-xl p-4 space-y-3 cursor-pointer transition-colors"
      style={{
        background: 'var(--color-bg-elevated)',
        border: '1px solid var(--color-border)',
      }}
      onClick={() => router.push(`/goals/${goal.id}`)}
      role="article"
      aria-label={goal.title}
    >
      <div className="flex items-start justify-between gap-2">
        <h2
          className="font-semibold text-base leading-snug flex-1"
          style={{ color: 'var(--color-text)', fontFamily: 'var(--font-display, var(--font-body))' }}
        >
          {goal.title}
        </h2>
        <GoalStatusBadge status={goal.status} />
      </div>

      {goal.description && (
        <p className="text-sm line-clamp-2" style={{ color: 'var(--color-text-secondary)' }}>
          {goal.description}
        </p>
      )}

      {progress !== null && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs" style={{ color: 'var(--color-muted)' }}>
            <span>
              {goal.current_value} / {goal.target_value}{goal.unit ? ` ${goal.unit}` : ''}
            </span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div
            className="h-1.5 rounded-full overflow-hidden"
            style={{ background: 'var(--color-surface)' }}
            role="progressbar"
            aria-valuenow={Math.round(progress)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${goal.title} progress`}
          >
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${progress}%`, background: 'var(--color-accent)' }}
            />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <div className="text-xs" style={{ color: 'var(--color-muted)' }}>
          {goal.target_date ? (
            <span>Due {formatDate(goal.target_date)}</span>
          ) : (
            <span>No due date</span>
          )}
        </div>

        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <Link
            href={`/goals/${goal.id}/edit`}
            className="chip text-xs px-2 py-1 min-h-[32px] flex items-center"
            aria-label={`Edit ${goal.title}`}
          >
            Edit
          </Link>
          <button
            onClick={() => onDelete(goal.id)}
            className="chip text-xs px-2 py-1 min-h-[32px]"
            aria-label={`Delete ${goal.title}`}
            style={{ color: 'var(--color-error, #ef4444)' }}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

export default function GoalsPage() {
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<GoalStatus | 'all'>('all')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const { data: goals = [], isLoading, isError } = useQuery({
    queryKey: ['goals', statusFilter],
    queryFn: () => listGoals(statusFilter !== 'all' ? { status: statusFilter } : undefined),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteGoal(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['goals'] })
      setDeletingId(null)
    },
  })

  const handleDeleteRequest = (id: string) => {
    setDeletingId(id)
  }

  const handleDeleteConfirm = () => {
    if (deletingId) deleteMutation.mutate(deletingId)
  }

  const goalToDelete = goals.find((g) => g.id === deletingId)

  if (isLoading) {
    return <div className="p-8" style={{ color: 'var(--color-muted)' }}>Loading...</div>
  }

  if (isError) {
    return (
      <div className="p-8 text-center">
        <p style={{ color: 'var(--color-error, #ef4444)' }}>Failed to load goals. Please try again.</p>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <h1
          className="text-2xl font-bold"
          style={{
            fontFamily: 'var(--font-display, var(--font-body, Inter, system-ui, sans-serif))',
            color: 'var(--color-text)',
          }}
        >
          Goals
        </h1>
        <Link
          href="/goals/new"
          className="btn btn-primary px-4 py-2 text-sm min-h-[44px] flex items-center"
        >
          + New Goal
        </Link>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1 mb-6 overflow-x-auto pb-1" role="tablist" aria-label="Filter goals by status">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            role="tab"
            aria-selected={statusFilter === tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={`chip text-sm px-3 py-1.5 shrink-0${statusFilter === tab.value ? ' chip-active' : ''}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {goals.length === 0 ? (
        <div className="text-center py-16 space-y-4">
          <div
            className="mx-auto w-16 h-16 rounded-full flex items-center justify-center"
            style={{ background: 'var(--color-bg-elevated)', border: '2px solid var(--color-accent)' }}
            aria-hidden="true"
          >
            <span className="text-2xl">🎯</span>
          </div>
          <h2
            className="text-xl font-bold"
            style={{ fontFamily: 'var(--font-display, var(--font-body))', color: 'var(--color-text)' }}
          >
            {statusFilter === 'all' ? 'No goals yet' : `No ${statusFilter} goals`}
          </h2>
          <p style={{ color: 'var(--color-text-secondary)' }}>
            {statusFilter === 'all'
              ? 'Set a goal and track your progress toward it.'
              : `You have no ${statusFilter} goals right now.`}
          </p>
          {statusFilter === 'all' && (
            <Link
              href="/goals/new"
              className="btn btn-primary inline-block px-6 py-3 min-h-[48px]"
            >
              Create your first goal
            </Link>
          )}
        </div>
      ) : (
        <div
          data-testid="goals-list"
          className="grid grid-cols-1 md:grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-4"
        >
          {goals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} onDelete={handleDeleteRequest} />
          ))}
        </div>
      )}

      {/* Floating Add button on mobile */}
      <Link
        href="/goals/new"
        aria-label="Add new goal"
        className="btn btn-primary fixed bottom-20 right-4 w-14 h-14 !rounded-full text-2xl shadow-lg md:hidden"
      >
        +
      </Link>

      {/* Delete confirmation modal */}
      {deletingId && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40"
            onClick={() => !deleteMutation.isPending && setDeletingId(null)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-modal-title"
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 rounded-2xl p-6 max-w-sm mx-auto"
            style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-strong)' }}
          >
            <h2
              id="delete-modal-title"
              className="text-lg font-bold mb-2"
              style={{ color: 'var(--color-text)', fontFamily: 'var(--font-display)' }}
            >
              Delete goal?
            </h2>
            <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              &ldquo;{goalToDelete?.title}&rdquo; and all its milestones and check-ins will be permanently removed.
            </p>
            {deleteMutation.isError && (
              <p className="text-sm mb-3" style={{ color: 'var(--color-error, #ef4444)' }}>
                Failed to delete. Please try again.
              </p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setDeletingId(null)}
                disabled={deleteMutation.isPending}
                className="btn btn-ghost flex-1 py-3"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleteMutation.isPending}
                aria-busy={deleteMutation.isPending}
                className="btn btn-danger flex-1 py-3 disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
