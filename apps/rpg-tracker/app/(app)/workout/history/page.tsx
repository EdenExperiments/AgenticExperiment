'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { listWorkoutHistory } from '@rpgtracker/api-client'

export default function WorkoutHistoryPage() {
  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['workout-history'],
    queryFn: listWorkoutHistory,
  })

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
          History
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--color-muted)' }}>
          Finished sessions only. Rest days are gaps, not red squares.
        </p>
      </div>
      {isLoading ? (
        <p className="text-sm" style={{ color: 'var(--color-muted)' }}>Loading…</p>
      ) : sessions.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--color-muted)' }}>No finished sessions yet.</p>
      ) : (
        <ul className="space-y-3">
          {sessions.map((session) => (
            <li key={session.id}>
              <Link
                href={`/workout/session/${session.id}`}
                className="block rounded-xl p-4"
                style={{ backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}
              >
                <p className="font-semibold" style={{ color: 'var(--color-text)' }}>{session.title}</p>
                <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
                  {session.set_count} sets · {session.volume_kg} kg loaded · {new Date(session.ended_at ?? session.started_at).toLocaleString()}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
