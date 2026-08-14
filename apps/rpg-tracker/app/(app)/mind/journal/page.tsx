'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createJournalEntry, deleteJournalEntry, listJournalEntries } from '@rpgtracker/api-client'

export default function MindJournalPage() {
  const qc = useQueryClient()
  const [body, setBody] = useState('')
  const { data: entries = [] } = useQuery({
    queryKey: ['journal-entries'],
    queryFn: listJournalEntries,
  })
  const save = useMutation({
    mutationFn: () => createJournalEntry(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['journal-entries'] })
      setBody('')
    },
  })
  const remove = useMutation({
    mutationFn: deleteJournalEntry,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['journal-entries'] }),
  })

  return (
    <div className="p-4 md:p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
          Journal
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--color-muted)' }}>
          Private pages. Not sent to an AI. Not scored.
        </p>
      </div>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault()
          save.mutate()
        }}
      >
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
          rows={6}
          placeholder="Write a page"
          className="w-full rounded-xl px-4 py-3"
          style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
        />
        <button type="submit" className="btn btn-primary px-4 py-2 min-h-[44px]" disabled={save.isPending}>
          Save page
        </button>
      </form>
      <ul className="space-y-3">
        {entries.map((entry) => (
          <li key={entry.id} data-testid="journal-row" className="rounded-xl p-4" style={{ backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}>
            <p className="whitespace-pre-wrap" style={{ color: 'var(--color-text)' }}>{entry.body}</p>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs" style={{ color: 'var(--color-muted)' }}>{new Date(entry.updated_at).toLocaleString()}</span>
              <button type="button" className="text-sm min-h-[44px]" style={{ color: 'var(--color-error)' }} onClick={() => remove.mutate(entry.id)}>
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
