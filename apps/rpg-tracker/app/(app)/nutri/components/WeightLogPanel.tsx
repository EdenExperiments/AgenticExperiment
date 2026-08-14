'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  listWeightLogs,
  getWeightChart,
  createWeightLog,
  deleteWeightLog,
} from '@rpgtracker/api-client'
import type { WeightLog } from '@rpgtracker/api-client'
import { WeightChart } from './WeightChart'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function WeightLogPanel() {
  const qc = useQueryClient()
  const [weightKg, setWeightKg] = useState('')
  const [note, setNote] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  const { data: logs = [], isLoading: logsLoading } = useQuery({
    queryKey: ['weight-logs'],
    queryFn: () => listWeightLogs({ limit: 20 }),
  })

  const { data: chart } = useQuery({
    queryKey: ['weight-chart'],
    queryFn: () => getWeightChart(30),
  })

  const createMutation = useMutation({
    mutationFn: (data: { weight_kg: number; note?: string }) => createWeightLog(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['weight-logs'] })
      qc.invalidateQueries({ queryKey: ['weight-chart'] })
      setWeightKg('')
      setNote('')
      setFormError(null)
    },
    onError: (err: Error) => {
      setFormError(err.message)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteWeightLog(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['weight-logs'] })
      qc.invalidateQueries({ queryKey: ['weight-chart'] })
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const parsed = parseFloat(weightKg)
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setFormError('Enter a positive weight in kg')
      return
    }
    setFormError(null)
    createMutation.mutate({ weight_kg: parsed, note: note.trim() || undefined })
  }

  return (
    <div className="space-y-8">
      <section
        aria-labelledby="log-weight-heading"
        className="rounded-2xl p-6"
        style={{
          backgroundColor: 'var(--color-bg-elevated)',
          border: '1px solid var(--color-border)',
        }}
      >
        <h2 id="log-weight-heading" className="text-lg font-semibold mb-4" style={{ color: 'var(--color-text)' }}>
          Log weight
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="weight-kg" className="block text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                Weight (kg)
              </label>
              <input
                id="weight-kg"
                type="number"
                inputMode="decimal"
                step="0.1"
                min="0"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                required
                placeholder="72.5"
                className="w-full rounded-xl px-4 py-3 focus:outline-none focus:ring-2"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text)',
                }}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="weight-note" className="block text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                Note (optional)
              </label>
              <input
                id="weight-note"
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Morning weigh-in"
                className="w-full rounded-xl px-4 py-3 focus:outline-none focus:ring-2"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text)',
                }}
              />
            </div>
          </div>

          {formError && (
            <p role="alert" className="text-sm" style={{ color: 'var(--color-error)' }}>
              {formError}
            </p>
          )}

          <button
            type="submit"
            disabled={createMutation.isPending}
            className="btn btn-primary px-6 py-3 disabled:opacity-50 min-h-[48px]"
          >
            {createMutation.isPending ? 'Saving…' : 'Log weight'}
          </button>
        </form>
      </section>

      <section
        aria-labelledby="trend-heading"
        className="rounded-2xl p-6"
        style={{
          backgroundColor: 'var(--color-bg-elevated)',
          border: '1px solid var(--color-border)',
        }}
      >
        <h2 id="trend-heading" className="text-lg font-semibold mb-4" style={{ color: 'var(--color-text)' }}>
          30-day trend
        </h2>
        {chart ? (
          <WeightChart data={chart.data} />
        ) : (
          <div data-testid="weight-chart-loading" className="text-sm" style={{ color: 'var(--color-muted)' }}>
            Loading chart…
          </div>
        )}
      </section>

      <section
        aria-labelledby="recent-heading"
        className="rounded-2xl p-6"
        style={{
          backgroundColor: 'var(--color-bg-elevated)',
          border: '1px solid var(--color-border)',
        }}
      >
        <h2 id="recent-heading" className="text-lg font-semibold mb-4" style={{ color: 'var(--color-text)' }}>
          Recent entries
        </h2>
        {logsLoading ? (
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>Loading entries…</p>
        ) : logs.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>No weight entries yet.</p>
        ) : (
          <ul className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
            {logs.map((log: WeightLog) => (
              <li
                key={log.id}
                data-testid="weight-log-row"
                className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
              >
                <div>
                  <p className="font-medium tabular-nums" style={{ color: 'var(--color-text)' }}>
                    {log.weight_kg} kg
                  </p>
                  <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
                    {formatDate(log.measured_at)}
                    {log.note ? ` · ${log.note}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => deleteMutation.mutate(log.id)}
                  disabled={deleteMutation.isPending}
                  aria-label={`Delete entry from ${formatDate(log.measured_at)}`}
                  className="text-sm px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                  style={{ color: 'var(--color-error)' }}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
