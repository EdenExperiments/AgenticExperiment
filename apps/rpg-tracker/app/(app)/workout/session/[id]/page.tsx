'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import { addWorkoutSet, deleteWorkoutSet, finishWorkout, getWorkout } from '@rpgtracker/api-client'

export default function WorkoutSessionPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const qc = useQueryClient()
  const [exercise, setExercise] = useState('')
  const [reps, setReps] = useState('5')
  const [loadKg, setLoadKg] = useState('')
  const [rpe, setRpe] = useState('')
  const [error, setError] = useState<string | null>(null)

  const { data: session } = useQuery({
    queryKey: ['workout-session', id],
    queryFn: () => getWorkout(id),
    enabled: Boolean(id),
  })

  const addSet = useMutation({
    mutationFn: () => addWorkoutSet(id, {
      exercise_name: exercise,
      reps: Number(reps),
      load_kg: loadKg ? Number(loadKg) : undefined,
      rpe: rpe ? Number(rpe) : undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workout-session', id] })
      qc.invalidateQueries({ queryKey: ['workout-current'] })
      setError(null)
    },
    onError: (err: Error) => setError(err.message),
  })

  const removeSet = useMutation({
    mutationFn: deleteWorkoutSet,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workout-session', id] })
      qc.invalidateQueries({ queryKey: ['workout-current'] })
    },
  })

  const finish = useMutation({
    mutationFn: () => finishWorkout(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workout-current'] })
      qc.invalidateQueries({ queryKey: ['workout-history'] })
      router.push('/workout/history')
    },
    onError: (err: Error) => setError(err.message),
  })

  const open = Boolean(session && !session.ended_at)

  return (
    <div className="p-4 md:p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
          {session?.title ?? 'Session'}
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--color-muted)' }}>
          {session ? `${session.set_count} sets · ${session.rep_count} reps · ${session.volume_kg} kg loaded volume` : 'Loading…'}
        </p>
      </div>

      {error && <p role="alert" className="text-sm" style={{ color: 'var(--color-error)' }}>{error}</p>}

      {open && (
        <form
          className="rounded-2xl p-6 grid gap-3 sm:grid-cols-4"
          style={{ backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}
          onSubmit={(e) => {
            e.preventDefault()
            addSet.mutate()
          }}
        >
          <input
            value={exercise}
            onChange={(e) => setExercise(e.target.value)}
            placeholder="Squat"
            required
            className="rounded-xl px-4 py-3 min-h-[44px] sm:col-span-2"
            style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
          />
          <input
            value={reps}
            onChange={(e) => setReps(e.target.value)}
            type="number"
            min={1}
            required
            className="rounded-xl px-4 py-3 min-h-[44px]"
            style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
            aria-label="Reps"
          />
          <input
            value={loadKg}
            onChange={(e) => setLoadKg(e.target.value)}
            type="number"
            min={0}
            step="0.5"
            placeholder="kg"
            className="rounded-xl px-4 py-3 min-h-[44px]"
            style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
            aria-label="Load in kg"
          />
          <input
            value={rpe}
            onChange={(e) => setRpe(e.target.value)}
            type="number"
            min={1}
            max={10}
            step="0.5"
            placeholder="RPE"
            className="rounded-xl px-4 py-3 min-h-[44px]"
            style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
            aria-label="RPE"
          />
          <button type="submit" className="btn btn-primary px-4 py-2 min-h-[44px] sm:col-span-4" disabled={addSet.isPending}>
            Log set
          </button>
        </form>
      )}

      <ul className="space-y-2">
        {session?.sets.map((set) => (
          <li key={set.id} data-testid="workout-set" className="flex items-center justify-between rounded-xl px-4 py-3" style={{ backgroundColor: 'var(--color-bg-elevated)' }}>
            <span style={{ color: 'var(--color-text)' }}>
              {set.exercise_name} · {set.reps} reps
              {set.load_kg != null ? ` · ${set.load_kg} kg` : ' · bodyweight'}
              {set.rpe != null ? ` · RPE ${set.rpe}` : ''}
            </span>
            {open && (
              <button type="button" className="text-sm min-h-[44px]" style={{ color: 'var(--color-error)' }} onClick={() => removeSet.mutate(set.id)}>
                Remove
              </button>
            )}
          </li>
        ))}
      </ul>

      {open && (
        <button type="button" className="btn btn-secondary px-4 py-2 min-h-[44px]" onClick={() => finish.mutate()} disabled={finish.isPending}>
          Finish session
        </button>
      )}
    </div>
  )
}
