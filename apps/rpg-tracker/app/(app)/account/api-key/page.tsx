'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { saveAPIKey } from '@rpgtracker/api-client'

export default function APIKeyPage() {
  const [key, setKey] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const qc = useQueryClient()
  const router = useRouter()

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await saveAPIKey(key)
      await qc.invalidateQueries({ queryKey: ['api-key-status'] })
      router.push('/account')
    } catch {
      setError("This doesn't look like a valid Claude API key. Check your key and try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto p-4 md:p-8 space-y-6">
      <h1
        className="text-2xl font-bold"
        style={{
          fontFamily: 'var(--font-display, var(--font-body, Inter, system-ui, sans-serif))',
          color: 'var(--color-text-primary, #f9fafb)',
        }}
      >
        Add Claude API Key
      </h1>
      <form onSubmit={handleSave} className="space-y-4">
        <input
          type="password"
          placeholder="sk-ant-..."
          value={key}
          onChange={(e) => setKey(e.target.value)}
          required
          className="w-full rounded-xl px-4 py-3"
          style={{
            backgroundColor: 'var(--color-bg-elevated, #1a1a2e)',
            border: '1px solid var(--color-border, #374151)',
            color: 'var(--color-text-primary, #f9fafb)',
          }}
        />
        {error && <p className="text-sm" style={{ color: 'var(--color-danger, #ef4444)' }}>{error}</p>}
        <p className="text-xs" style={{ color: 'var(--color-text-muted, #6b7280)' }}>
          Your key is encrypted and stored securely. It is never visible in the browser.
        </p>
        <button
          type="submit"
          disabled={saving || !key}
          className="w-full py-4 rounded-xl font-semibold text-white disabled:opacity-50 min-h-[48px]"
          style={{ backgroundColor: 'var(--color-accent, #6366f1)' }}
        >
          {saving ? 'Saving…' : 'Verify and Save'}
        </button>
        <button type="button" onClick={() => router.back()}
          className="w-full text-sm py-2"
          style={{ color: 'var(--color-text-muted, #6b7280)' }}>
          Cancel
        </button>
      </form>
    </div>
  )
}
