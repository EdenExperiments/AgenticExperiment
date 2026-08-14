'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import {
  getWorkoutVolumeChart,
  listWorkoutSessions,
  startWorkoutSession,
} from '@rpgtracker/api-client'
import type { WorkoutSession } from '@rpgtracker/api-client'

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function WorkoutHistoryPage() {
  const router = useRouter()
  const qc = useQueryClient()

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['workout-sessions'],
    queryFn: () => listWorkoutSessions({ limit: 50 }),
  })

  const { data: chart } = useQuery({
    queryKey: ['workout-volume-chart'],
    queryFn: () => getWorkoutVolumeChart(30),
  })

  const startMutation = useMutation({
    mutationFn: startWorkoutSession,
    onSuccess: (sess) => {
      qc.invalidateQueries({ queryKey: ['workout-sessions'] })
      router.push(`/workout/session?id=${sess.id}`)
    },
  })

  const inProgress = sessions.find((s) => s.status === 'in_progress')

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
            Workout
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-muted)' }}>
            Log sets, then see history and volume. Not a PT.
          </p>
        </div>
        {inProgress ? (
          <button
            type="button"
            className="btn btn-primary px-4 py-2 min-h-[44px]"
            onClick={() => router.push(`/workout/session?id=${inProgress.id}`)}
          >
            Continue session
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-primary px-4 py-2 min-h-[44px]"
            disabled={startMutation.isPending}
            onClick={() => startMutation.mutate()}
          >
            {startMutation.isPending ? 'Starting…' : 'Start session'}
          </button>
        )}
      </div>

      <section className="rounded-2xl p-6" style={{ backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}>
        <h2 className="text-lg font-semibold mb-4">30-day volume</h2>
        {chart ? (
          <VolumeBars data={chart.data} />
        ) : (
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>Loading chart…</p>
        )}
      </section>

      <section className="rounded-2xl p-6" style={{ backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}>
        <h2 className="text-lg font-semibold mb-4">History</h2>
        {isLoading ? (
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>Loading sessions…</p>
        ) : sessions.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>No sessions yet.</p>
        ) : (
          <ul className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
            {sessions.map((s: WorkoutSession) => (
              <li key={s.id} data-testid="workout-session-row" className="py-3 flex justify-between gap-4">
                <div>
                  <p className="font-medium capitalize">{s.status.replace('_', ' ')}</p>
                  <p className="text-sm" style={{ color: 'var(--color-muted)' }}>{formatWhen(s.started_at)}</p>
                </div>
                <p className="tabular-nums">{s.volume_kg.toFixed(0)} kg</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function VolumeBars({ data }: { data: { date: string; volume_kg: number | null }[] }) {
  const values = data.map((d) => d.volume_kg).filter((v): v is number => v !== null)
  const max = Math.max(1, ...values)
  return (
    <div data-testid="workout-volume-chart" className="flex items-end gap-0.5" style={{ height: 120 }}>
      {data.map((d) => {
        const h = d.volume_kg == null ? 0 : (d.volume_kg / max) * 100
        return (
          <div
            key={d.date}
            title={d.volume_kg == null ? d.date : `${d.date}: ${d.volume_kg} kg`}
            className="flex-1 rounded-t"
            style={{ height: `${h}%`, backgroundColor: 'var(--color-accent)', opacity: d.volume_kg == null ? 0.15 : 1 }}
          />
        )
      })}
    </div>
  )
}
