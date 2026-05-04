'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { createGoal, listSkills } from '@rpgtracker/api-client'

interface GoalDraft {
  title: string
  description: string
  skillId: string
  targetDate: string
  currentValue: string
  targetValue: string
  unit: string
}

const INITIAL_DRAFT: GoalDraft = {
  title: '',
  description: '',
  skillId: '',
  targetDate: '',
  currentValue: '',
  targetValue: '',
  unit: '',
}

function fieldStyle(): React.CSSProperties {
  return {
    background: 'var(--color-surface)',
    color: 'var(--color-text)',
    border: '1px solid var(--color-border)',
  }
}

export default function GoalCreatePage() {
  const router = useRouter()
  const qc = useQueryClient()
  const [draft, setDraft] = useState<GoalDraft>({ ...INITIAL_DRAFT })

  const { data: skills = [] } = useQuery({
    queryKey: ['skills'],
    queryFn: listSkills,
    staleTime: 30_000,
  })

  const createMutation = useMutation({
    mutationFn: () =>
      createGoal({
        title: draft.title.trim(),
        description: draft.description.trim() || undefined,
        skill_id: draft.skillId || undefined,
        target_date: draft.targetDate || undefined,
        current_value: draft.currentValue ? Number(draft.currentValue) : undefined,
        target_value: draft.targetValue ? Number(draft.targetValue) : undefined,
        unit: draft.unit.trim() || undefined,
      }),
    onSuccess: (goal) => {
      qc.invalidateQueries({ queryKey: ['goals'] })
      router.push(`/goals/${goal.id}`)
    },
  })

  const hasValueTracking = draft.targetValue !== ''
  const canSubmit = draft.title.trim().length > 0 && !createMutation.isPending

  return (
    <div className="max-w-xl mx-auto p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/goals"
          className="text-sm"
          style={{ color: 'var(--color-muted)' }}
          aria-label="Back to Goals"
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
          New Goal
        </h1>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (canSubmit) createMutation.mutate()
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
            onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
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
            onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
            placeholder="Why does this matter to you? (optional)"
            maxLength={1000}
            rows={3}
            className="w-full rounded-xl px-4 py-3 text-sm resize-none"
            style={fieldStyle()}
          />
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
              onChange={(e) => setDraft((d) => ({ ...d, skillId: e.target.value }))}
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
            onChange={(e) => setDraft((d) => ({ ...d, targetDate: e.target.value }))}
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
          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            Track measurable progress — e.g. run 100km, read 12 books.
          </p>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label
                htmlFor="goal-current-value"
                className="text-xs"
                style={{ color: 'var(--color-muted)' }}
              >
                Starting value
              </label>
              <input
                id="goal-current-value"
                type="number"
                value={draft.currentValue}
                onChange={(e) => setDraft((d) => ({ ...d, currentValue: e.target.value }))}
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
                onChange={(e) => setDraft((d) => ({ ...d, targetValue: e.target.value }))}
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
                onChange={(e) => setDraft((d) => ({ ...d, unit: e.target.value }))}
                placeholder="km"
                maxLength={30}
                className="w-full rounded-lg px-3 py-2 text-sm"
                style={{ ...fieldStyle(), minHeight: '40px' }}
              />
            </div>
          )}
        </div>

        {createMutation.isError && (
          <p
            className="text-sm text-center"
            style={{ color: 'var(--color-error, #ef4444)' }}
            role="alert"
          >
            Failed to create goal. Please try again.
          </p>
        )}

        <div className="flex gap-3 pt-2">
          <Link href="/goals" className="btn btn-ghost flex-1 py-3 text-sm text-center">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={!canSubmit}
            aria-busy={createMutation.isPending}
            className="btn btn-primary flex-1 py-3 disabled:opacity-50"
          >
            {createMutation.isPending ? 'Creating…' : 'Create Goal'}
          </button>
        </div>
      </form>
    </div>
  )
}
