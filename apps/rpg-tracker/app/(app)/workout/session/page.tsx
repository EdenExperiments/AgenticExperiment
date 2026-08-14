'use client'

import { Suspense, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  addWorkoutExercise,
  addWorkoutSet,
  abandonWorkoutSession,
  finishWorkoutSession,
  getWorkoutSession,
} from '@rpgtracker/api-client'

export default function WorkoutSessionPage() {
  return (
    <Suspense fallback={<p style={{ color: 'var(--color-muted)' }}>Loading session…</p>}>
      <WorkoutSessionInner />
    </Suspense>
  )
}

function WorkoutSessionInner() {
  const router = useRouter()
  const params = useSearchParams()
  const id = params.get('id') ?? ''
  const qc = useQueryClient()
  const [exerciseName, setExerciseName] = useState('')
  const [reps, setReps] = useState('5')
  const [loadKg, setLoadKg] = useState('')
  const [rpe, setRpe] = useState('')
  const [activeExerciseId, setActiveExerciseId] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const { data: session, isLoading } = useQuery({
    queryKey: ['workout-session', id],
    queryFn: () => getWorkoutSession(id),
    enabled: Boolean(id),
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['workout-session', id] })
    qc.invalidateQueries({ queryKey: ['workout-sessions'] })
    qc.invalidateQueries({ queryKey: ['workout-volume-chart'] })
  }

  const addEx = useMutation({
    mutationFn: (name: string) => addWorkoutExercise(id, name),
    onSuccess: (ex) => {
      setExerciseName('')
      setActiveExerciseId(ex.id)
      invalidate()
    },
  })

  const addSet = useMutation({
    mutationFn: (exerciseId: string) => {
      const parsedReps = parseInt(reps, 10)
      if (!Number.isInteger(parsedReps) || parsedReps <= 0) {
        throw new Error('Reps must be a positive integer')
      }
      const data: { reps: number; load_kg?: number; rpe?: number } = { reps: parsedReps }
      if (loadKg.trim()) {
        const load = parseFloat(loadKg)
        if (!Number.isFinite(load) || load <= 0) throw new Error('Load must be positive')
        data.load_kg = load
      }
      if (rpe.trim()) {
        const parsedRpe = parseInt(rpe, 10)
        if (!Number.isInteger(parsedRpe) || parsedRpe < 1 || parsedRpe > 10) {
          throw new Error('RPE must be an integer from 1 to 10')
        }
        data.rpe = parsedRpe
      }
      if (!exerciseId) throw new Error('Pick an exercise')
      return addWorkoutSet(exerciseId, data)
    },
    onSuccess: () => {
      setFormError(null)
      invalidate()
    },
    onError: (err: Error) => setFormError(err.message),
  })

  const finish = useMutation({
    mutationFn: () => finishWorkoutSession(id),
    onSuccess: () => {
      invalidate()
      router.push('/workout')
    },
  })

  const abandon = useMutation({
    mutationFn: () => abandonWorkoutSession(id),
    onSuccess: () => {
      invalidate()
      router.push('/workout')
    },
  })

  if (!id) {
    return <p>Missing session id.</p>
  }
  if (isLoading || !session) {
    return <p style={{ color: 'var(--color-muted)' }}>Loading session…</p>
  }

  const exercises = session.exercises ?? []
  const currentEx = activeExerciseId ?? exercises[exercises.length - 1]?.id ?? null

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>Session</h1>
        <p className="text-sm capitalize" style={{ color: 'var(--color-muted)' }}>{session.status.replace('_', ' ')}</p>
      </div>

      <section className="rounded-2xl p-6 space-y-4" style={{ backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}>
        <h2 className="text-lg font-semibold">Exercises</h2>
        {exercises.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>Add an exercise to start logging sets.</p>
        ) : (
          <ul className="space-y-4">
            {exercises.map((ex) => (
              <li key={ex.id} data-testid="workout-exercise">
                <button
                  type="button"
                  onClick={() => setActiveExerciseId(ex.id)}
                  className="font-medium"
                  style={{ color: currentEx === ex.id ? 'var(--color-accent)' : 'var(--color-text)' }}
                >
                  {ex.position + 1}. {ex.name}
                </button>
                <ul className="mt-1 text-sm" style={{ color: 'var(--color-muted)' }}>
                  {ex.sets.map((st) => (
                    <li key={st.id}>
                      {st.reps} reps
                      {st.load_kg != null ? ` × ${st.load_kg} kg` : ' (bodyweight)'}
                      {st.rpe != null ? ` @ RPE ${st.rpe}` : ''}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}

        {session.status === 'in_progress' && (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (!exerciseName.trim()) return
              addEx.mutate(exerciseName.trim())
            }}
            className="flex gap-2"
          >
            <input
              aria-label="Exercise name"
              value={exerciseName}
              onChange={(e) => setExerciseName(e.target.value)}
              placeholder="Squat"
              className="flex-1 rounded-xl px-4 py-3"
              style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
            />
            <button type="submit" className="btn btn-primary px-4" disabled={addEx.isPending}>Add</button>
          </form>
        )}
      </section>

      {session.status === 'in_progress' && currentEx && (
        <section className="rounded-2xl p-6 space-y-4" style={{ backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}>
          <h2 className="text-lg font-semibold">Log set</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              setActiveExerciseId(currentEx)
              addSet.mutate(currentEx)
            }}
            className="grid gap-3 sm:grid-cols-3"
          >
            <label className="text-sm">
              Reps
              <input
                aria-label="Reps"
                value={reps}
                onChange={(e) => setReps(e.target.value)}
                className="mt-1 w-full rounded-xl px-4 py-3"
                style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
              />
            </label>
            <label className="text-sm">
              Load kg (optional)
              <input
                aria-label="Load kg"
                value={loadKg}
                onChange={(e) => setLoadKg(e.target.value)}
                className="mt-1 w-full rounded-xl px-4 py-3"
                style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
              />
            </label>
            <label className="text-sm">
              RPE (optional)
              <input
                aria-label="RPE"
                value={rpe}
                onChange={(e) => setRpe(e.target.value)}
                className="mt-1 w-full rounded-xl px-4 py-3"
                style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
              />
            </label>
            {formError && <p role="alert" className="sm:col-span-3 text-sm" style={{ color: 'var(--color-error)' }}>{formError}</p>}
            <button type="submit" className="btn btn-primary px-4 py-3 sm:col-span-3" disabled={addSet.isPending}>
              Save set
            </button>
          </form>
        </section>
      )}

      {session.status === 'in_progress' && (
        <div className="flex gap-3">
          <button type="button" className="btn btn-primary px-4 py-3" onClick={() => finish.mutate()} disabled={finish.isPending}>
            Finish
          </button>
          <button type="button" className="px-4 py-3 rounded-xl" onClick={() => abandon.mutate()} disabled={abandon.isPending} style={{ color: 'var(--color-error)' }}>
            Abandon
          </button>
        </div>
      )}
    </div>
  )
}
