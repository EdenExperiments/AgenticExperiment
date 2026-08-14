'use client'

import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createMoodLog, listMoodLogs } from '@rpgtracker/api-client'

const ACK_KEY = 'mh-ack-uk-v1'

function GroundingTimer() {
  const [seconds, setSeconds] = useState<number | null>(null)
  const [remaining, setRemaining] = useState(0)

  useEffect(() => {
    if (seconds == null) return
    setRemaining(seconds)
    const id = window.setInterval(() => {
      setRemaining((value) => {
        if (value <= 1) {
          window.clearInterval(id)
          return 0
        }
        return value - 1
      })
    }, 1000)
    return () => window.clearInterval(id)
  }, [seconds])

  return (
    <section className="rounded-2xl p-6 space-y-3" style={{ backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}>
      <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>Sit</h2>
      <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
        Local timer. Nothing is saved when it ends.
      </p>
      {seconds == null || remaining === 0 ? (
        <div className="flex gap-3">
          <button type="button" className="btn btn-secondary px-4 py-2 min-h-[44px]" onClick={() => setSeconds(60)}>60 seconds</button>
          <button type="button" className="btn btn-secondary px-4 py-2 min-h-[44px]" onClick={() => setSeconds(120)}>120 seconds</button>
        </div>
      ) : (
        <p className="text-3xl tabular-nums" style={{ color: 'var(--color-text)' }}>{remaining}s</p>
      )}
    </section>
  )
}

export default function MindCheckInPage() {
  const qc = useQueryClient()
  const [ack, setAck] = useState(false)
  const [valence, setValence] = useState(3)
  const [energy, setEnergy] = useState(2)
  const [note, setNote] = useState('')

  useEffect(() => {
    setAck(window.localStorage.getItem(ACK_KEY) === '1')
  }, [])

  const { data: moods = [] } = useQuery({
    queryKey: ['mood-logs'],
    queryFn: listMoodLogs,
    enabled: ack,
  })

  const save = useMutation({
    mutationFn: () => createMoodLog({ valence, energy, note: note.trim() || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mood-logs'] })
      setNote('')
    },
  })

  if (!ack) {
    return (
      <div className="p-4 md:p-8 max-w-xl space-y-4">
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
          MindTrack
        </h1>
        <p style={{ color: 'var(--color-text-secondary)' }}>
          For adults 18 and over who are generally well, or already working with a professional.
          This is a private record. It is not therapy and it is not for acute distress.
        </p>
        <button
          type="button"
          className="btn btn-primary px-4 py-2 min-h-[44px]"
          onClick={() => {
            window.localStorage.setItem(ACK_KEY, '1')
            setAck(true)
          }}
        >
          I am 18 or over, continue
        </button>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
          Check-in
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--color-muted)' }}>
          Name the weather. No score. No streak.
        </p>
      </div>

      <form
        className="rounded-2xl p-6 space-y-4"
        style={{ backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}
        onSubmit={(e) => {
          e.preventDefault()
          save.mutate()
        }}
      >
        <fieldset>
          <legend className="text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>Mood (1 low – 5 high)</legend>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={valence === value}
                className="flex-1 min-h-[44px] rounded-xl"
                style={{
                  border: valence === value ? '2px solid var(--color-accent)' : '2px solid var(--color-border)',
                  backgroundColor: 'var(--color-surface)',
                  color: 'var(--color-text)',
                }}
                onClick={() => setValence(value)}
              >
                {value}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>Energy (1 low – 3 high)</legend>
          <div className="flex gap-2">
            {[1, 2, 3].map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={energy === value}
                className="flex-1 min-h-[44px] rounded-xl"
                style={{
                  border: energy === value ? '2px solid var(--color-accent)' : '2px solid var(--color-border)',
                  backgroundColor: 'var(--color-surface)',
                  color: 'var(--color-text)',
                }}
                onClick={() => setEnergy(value)}
              >
                {value}
              </button>
            ))}
          </div>
        </fieldset>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={280}
          placeholder="Optional note"
          rows={3}
          className="w-full rounded-xl px-4 py-3"
          style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
        />
        <button type="submit" className="btn btn-primary px-4 py-2 min-h-[44px]" disabled={save.isPending}>
          Save check-in
        </button>
      </form>

      <section>
        <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--color-text)' }}>Recent</h2>
        {moods.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>No check-ins yet.</p>
        ) : (
          <ul className="space-y-2">
            {moods.slice(0, 14).map((mood) => (
              <li key={mood.id} data-testid="mood-row" className="rounded-xl px-4 py-3" style={{ backgroundColor: 'var(--color-bg-elevated)' }}>
                <p style={{ color: 'var(--color-text)' }}>Mood {mood.valence} · Energy {mood.energy}</p>
                {mood.note ? <p className="text-sm" style={{ color: 'var(--color-muted)' }}>{mood.note}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <GroundingTimer />
    </div>
  )
}
