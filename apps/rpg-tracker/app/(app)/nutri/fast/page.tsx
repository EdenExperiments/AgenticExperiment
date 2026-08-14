'use client'

import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { closeFast, getCurrentFast, listFasts, startFast } from '@rpgtracker/api-client'
import { fastProgress, formatElapsed } from '@/lib/suiteStatus'

const TARGETS = [12, 14, 16, 18, 20, 24, 36]

export default function NutriFastPage() {
  const qc = useQueryClient()
  const [now, setNow] = useState(() => Date.now())
  const [targetHours, setTargetHours] = useState(16)

  const { data: current } = useQuery({
    queryKey: ['fast-current'],
    queryFn: getCurrentFast,
  })
  const { data: history = [] } = useQuery({
    queryKey: ['fasts'],
    queryFn: listFasts,
  })

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30000)
    return () => window.clearInterval(id)
  }, [])

  const elapsed = useMemo(() => {
    if (!current?.started_at) return null
    void now
    return formatElapsed(current.started_at)
  }, [current, now])

  const progressPct = useMemo(() => {
    if (!current?.started_at) return 0
    void now
    return Math.round(fastProgress({ startedAt: current.started_at, targetHours: current.target_hours }) * 100)
  }, [current, now])

  const startMutation = useMutation({
    mutationFn: () => startFast(targetHours),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fast-current'] })
      qc.invalidateQueries({ queryKey: ['fasts'] })
    },
  })
  const closeMutation = useMutation({
    mutationFn: (reason: 'completed' | 'stopped') => closeFast(current!.id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fast-current'] })
      qc.invalidateQueries({ queryKey: ['fasts'] })
    },
  })

  return (
    <div className="p-4 md:p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
          Fasting
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--color-muted)' }}>
          One open clock. Closing it writes a duration. Targets stop at 36 hours.
        </p>
      </div>

      <section
        className="rounded-2xl p-6 space-y-4"
        style={{ backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}
      >
        {current ? (
          <>
            <p className="text-3xl font-bold tabular-nums" style={{ color: 'var(--color-text)' }}>
              {elapsed}
            </p>
            <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
              Target {current.target_hours} hours. Started {new Date(current.started_at).toLocaleString()}.
            </p>
            <div
              role="progressbar"
              aria-label="Fast progress toward target"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progressPct}
              className="h-2 rounded-full overflow-hidden"
              style={{ backgroundColor: 'var(--color-surface)' }}
            >
              <div
                className="h-full"
                style={{
                  width: `${progressPct}%`,
                  backgroundColor: 'var(--color-accent)',
                }}
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                className="btn btn-primary px-4 py-2 min-h-[44px]"
                onClick={() => closeMutation.mutate('completed')}
                disabled={closeMutation.isPending}
              >
                Complete
              </button>
              <button
                type="button"
                className="btn btn-secondary px-4 py-2 min-h-[44px]"
                onClick={() => closeMutation.mutate('stopped')}
                disabled={closeMutation.isPending}
              >
                Stop early
              </button>
            </div>
          </>
        ) : (
          <>
            <label className="block text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
              Target hours
              <select
                className="mt-2 w-full rounded-xl px-4 py-3"
                value={targetHours}
                onChange={(e) => setTargetHours(Number(e.target.value))}
                style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
              >
                {TARGETS.map((hours) => (
                  <option key={hours} value={hours}>{hours} hours</option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="btn btn-primary px-4 py-2 min-h-[44px]"
              onClick={() => startMutation.mutate()}
              disabled={startMutation.isPending}
            >
              Start fast
            </button>
          </>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--color-text)' }}>Closed fasts</h2>
        {history.filter((fast) => fast.ended_at).length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>No closed fasts yet. Rest is a gap, not a failure.</p>
        ) : (
          <ul className="space-y-2">
            {history.filter((fast) => fast.ended_at).map((fast) => (
              <li key={fast.id} className="rounded-xl px-4 py-3" style={{ backgroundColor: 'var(--color-bg-elevated)' }}>
                <p className="font-medium" style={{ color: 'var(--color-text)' }}>
                  {fast.duration_min != null ? `${Math.floor(fast.duration_min / 60)}h ${fast.duration_min % 60}m` : 'Closed'}
                  {fast.end_reason ? ` · ${fast.end_reason}` : ''}
                </p>
                <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
                  Target {fast.target_hours}h
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
