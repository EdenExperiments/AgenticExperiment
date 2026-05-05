'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { getGoal, updateGoal, listSkills } from '@rpgtracker/api-client'
import type { GoalStatus } from '@rpgtracker/api-client'

interface GoalDraft {
  title: string
  description: string
  skillId: string
  status: GoalStatus
  targetDate: string
  currentValue: string
  targetValue: string
  unit: string
}

function fieldStyle(): React.CSSProperties {
  return {
    background: 'var(--color-surface)',
    color: 'var(--color-text)',
    border: '1px solid var(--color-border)',
  }
}

const STATUS_OPTIONS: { value: GoalStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'abandoned', label: 'Abandoned' },
]

export default function GoalEditPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const qc = useQueryClient()
  const [draft, setDraft] = useState<GoalDraft | null>(null)

  const { data: goal, isLoading, isError } = useQuery({
    queryKey: ['goal', id],
    queryFn: () => getGoal(id),
  })

  const { data: skills = [] } = useQuery({
    queryKey: ['skills'],
    queryFn: listSkills,
    staleTime: 30_000,
  })

  useEffect(() => {
    if (goal && !draft) {
      setDraft({
        title: goal.title,
        description: goal.description ?? '',
        skillId: goal.skill_id ?? '',
        status: goal.status,
        targetDate: goal.target_date ?? '',
        currentValue: goal.current_value != null ? String(goal.current_value) : '',
        targetValue: goal.target_value != null ? String(goal.target_value) : '',
        unit: goal.unit ?? '',
      })
    }
  }, [goal, draft])

  const updateMutation = useMutation({
    mutationFn: () => {
      if (!draft) throw new Error('No draft')
      return updateGoal(id, {
        title: draft.title.trim(),
        description: draft.description.trim() || undefined,
        skill_id: draft.skillId || null,
        status: draft.status,
        target_date: draft.targetDate || null,
        current_value: draft.currentValue !== '' ? Number(draft.currentValue) : null,
        target_value: draft.targetValue !== '' ? Number(draft.targetValue) : null,
        unit: draft.unit.trim() || null,
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['goal', id] })
      qc.invalidateQueries({ queryKey: ['goals'] })
      router.push(`/goals/${id}`)
    },
  })

  if (isError) {
    return (
      <div className="p-8 text-center space-y-4">
        <p style={{ color: 'var(--color-error, #ef4444)' }}>Failed to load goal.</p>
        <button onClick={() => router.back()} className="btn btn-ghost px-4 py-2">
          Go back
        </button>
      </div>
    )
  }

  if (isLoading || !draft) {
    return <div className="p-8" style={{ color: 'var(--color-muted)' }}>Loading...</div>
  }

  if (!goal) {
    return (
      <div className="p-8 text-center space-y-4">
        <p style={{ color: 'var(--color-error, #ef4444)' }}>Goal not found.</p>
        <button onClick={() => router.back()} className="btn btn-ghost px-4 py-2">
          Go back
        </button>
      </div>
    )
  }

  const hasValueTracking = draft.targetValue !== ''
  const canSubmit = draft.title.trim().length > 0 && !updateMutation.isPending

  return (
    <div className="max-w-xl mx-auto p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href={`/goals/${id}`}
          className="text-sm"
          style={{ color: 'var(--color-muted)' }}
          aria-label="Back to Goal"
        >
          ←
        </Link>
        <h1
          className="text-2xl font-bold"
          style={{
            fontFamily: 'var(--font-display, var(--font-body, Inter, system-ui, sans-serif))',
            color: 'var(--color-text)',
          }}
        >
          Edit Goal
        </h1>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (canSubmit) updateMutation.mutate()
        }}
        className="space-y-4"
        noValidate
      >
        {/* Title */}
        <div className="space-y-1">
          <label
            htmlFor="goal-title"
            className="text-xs font-medium uppercase tracking-wider block"
            style={{ color: 'var(--color-muted)' }}
          >
            Title <span aria-hidden="true">*</span>
          </label>
          <input
            id="goal-title"
            type="text"
            value={draft.title}
            onChange={(e) => setDraft((d) => d ? { ...d, title: e.target.value } : d)}
            placeholder="What do you want to achieve?"
            maxLength={200}
            required
            className="w-full rounded-xl px-4 py-3 text-sm"
            style={{ ...fieldStyle(), minHeight: '44px' }}
          />
        </div>

        {/* Description */}
        <div className="space-y-1">
          <label
            htmlFor="goal-description"
            className="text-xs font-medium uppercase tracking-wider block"
            style={{ color: 'var(--color-muted)' }}
          >
            Description
          </label>
          <textarea
            id="goal-description"
            value={draft.description}
            onChange={(e) => setDraft((d) => d ? { ...d, description: e.target.value } : d)}
            placeholder="Why does this matter to you? (optional)"
            maxLength={1000}
            rows={3}
            className="w-full rounded-xl px-4 py-3 text-sm resize-none"
            style={fieldStyle()}
          />
        </div>

        {/* Status */}
        <div className="space-y-1">
          <label
            htmlFor="goal-status"
            className="text-xs font-medium uppercase tracking-wider block"
            style={{ color: 'var(--color-muted)' }}
          >
            Status
          </label>
          <select
            id="goal-status"
            value={draft.status}
            onChange={(e) => setDraft((d) => d ? { ...d, status: e.target.value as GoalStatus } : d)}
            className="w-full rounded-xl px-4 py-3 text-sm"
            style={{ ...fieldStyle(), minHeight: '44px' }}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Linked skill (optional) */}
        {skills.length > 0 && (
          <div className="space-y-1">
            <label
              htmlFor="goal-skill"
              className="text-xs font-medium uppercase tracking-wider block"
              style={{ color: 'var(--color-muted)' }}
            >
              Linked Skill (optional)
            </label>
            <select
              id="goal-skill"
              value={draft.skillId}
              onChange={(e) => setDraft((d) => d ? { ...d, skillId: e.target.value } : d)}
              className="w-full rounded-xl px-4 py-3 text-sm"
              style={{ ...fieldStyle(), minHeight: '44px' }}
            >
              <option value="">No linked skill</option>
              {skills.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Target date */}
        <div className="space-y-1">
          <label
            htmlFor="goal-target-date"
            className="text-xs font-medium uppercase tracking-wider block"
            style={{ color: 'var(--color-muted)' }}
          >
            Target Date (optional)
          </label>
          <input
            id="goal-target-date"
            type="date"
            value={draft.targetDate}
            onChange={(e) => setDraft((d) => d ? { ...d, targetDate: e.target.value } : d)}
            className="w-full rounded-xl px-4 py-3 text-sm"
            style={{ ...fieldStyle(), minHeight: '44px' }}
          />
        </div>

        {/* Value tracking section */}
        <div
          className="rounded-xl p-4 space-y-3"
          style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}
        >
          <p
            className="text-xs font-medium uppercase tracking-wider"
            style={{ color: 'var(--color-muted)' }}
          >
            Value Tracking (optional)
          </p>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label
                htmlFor="goal-current-value"
                className="text-xs"
                style={{ color: 'var(--color-muted)' }}
              >
                Current value
              </label>
              <input
                id="goal-current-value"
                type="number"
                value={draft.currentValue}
                onChange={(e) => setDraft((d) => d ? { ...d, currentValue: e.target.value } : d)}
                placeholder="0"
                step="any"
                min="0"
                className="w-full rounded-lg px-3 py-2 text-sm"
                style={{ ...fieldStyle(), minHeight: '40px' }}
              />
            </div>
            <div className="space-y-1">
              <label
                htmlFor="goal-target-value"
                className="text-xs"
                style={{ color: 'var(--color-muted)' }}
              >
                Target value
              </label>
              <input
                id="goal-target-value"
                type="number"
                value={draft.targetValue}
                onChange={(e) => setDraft((d) => d ? { ...d, targetValue: e.target.value } : d)}
                placeholder="e.g. 100"
                step="any"
                min="0"
                className="w-full rounded-lg px-3 py-2 text-sm"
                style={{ ...fieldStyle(), minHeight: '40px' }}
              />
            </div>
          </div>

          {hasValueTracking && (
            <div className="space-y-1">
              <label
                htmlFor="goal-unit"
                className="text-xs"
                style={{ color: 'var(--color-muted)' }}
              >
                Unit (e.g. km, books, hours)
              </label>
              <input
                id="goal-unit"
                type="text"
                value={draft.unit}
                onChange={(e) => setDraft((d) => d ? { ...d, unit: e.target.value } : d)}
                placeholder="km"
                maxLength={30}
                className="w-full rounded-lg px-3 py-2 text-sm"
                style={{ ...fieldStyle(), minHeight: '40px' }}
              />
            </div>
          )}
        </div>

        {updateMutation.isError && (
          <p
            className="text-sm text-center"
            style={{ color: 'var(--color-error, #ef4444)' }}
            role="alert"
          >
            Failed to save changes. Please try again.
          </p>
        )}

        <div className="flex gap-3 pt-2">
          <Link
            href={`/goals/${id}`}
            className="btn btn-ghost flex-1 py-3 text-sm text-center"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={!canSubmit}
            aria-busy={updateMutation.isPending}
            className="btn btn-primary flex-1 py-3 disabled:opacity-50"
          >
            {updateMutation.isPending ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}
