'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getCurrentWorkout, startWorkout } from '@rpgtracker/api-client'

export default function WorkoutTodayPage() {
  const router = useRouter()
  const qc = useQueryClient()
  const [title, setTitle] = useState('')
  const { data: current, isLoading } = useQuery({
    queryKey: ['workout-current'],
    queryFn: getCurrentWorkout,
  })
  const start = useMutation({
    mutationFn: () => startWorkout(title || undefined),
    onSuccess: (session) => {
      qc.invalidateQueries({ queryKey: ['workout-current'] })
      router.push(`/workout/session/${session.id}`)
    },
  })

  return (
    <div className="p-4 md:p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
          Workout
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--color-muted)' }}>
          One open session. Finish writes a receipt. No XP.
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm" style={{ color: 'var(--color-muted)' }}>Loading…</p>
      ) : current ? (
        <section className="rounded-2xl p-6 space-y-3" style={{ backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}>
          <p className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>{current.title}</p>
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
            {current.set_count} sets · {current.rep_count} reps · {current.volume_kg} kg loaded volume
          </p>
          <Link href={`/workout/session/${current.id}`} className="btn btn-primary inline-block px-4 py-2 min-h-[44px]">
            Continue session
          </Link>
        </section>
      ) : (
        <form
          className="rounded-2xl p-6 space-y-4"
          style={{ backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}
          onSubmit={(e) => {
            e.preventDefault()
            start.mutate()
          }}
        >
          <label className="block text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
            Session name
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Lower body"
              className="mt-2 w-full rounded-xl px-4 py-3 min-h-[44px]"
              style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
            />
          </label>
          <button type="submit" className="btn btn-primary px-4 py-2 min-h-[44px]" disabled={start.isPending}>
            Start session
          </button>
        </form>
      )}
    </div>
  )
}
