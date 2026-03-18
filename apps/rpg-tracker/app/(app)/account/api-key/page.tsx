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
    <div className="max-w-lg mx-auto p-4 md:p-8 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Add Claude API Key</h1>
      <form onSubmit={handleSave} className="space-y-4">
        <input
          type="password"
          placeholder="sk-ant-..."
          value={key}
          onChange={(e) => setKey(e.target.value)}
          required
          className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 dark:bg-gray-800"
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
        <p className="text-xs text-gray-400">Your key is encrypted and stored securely. It is never visible in the browser.</p>
        <button
          type="submit"
          disabled={saving || !key}
          className="w-full py-4 rounded-xl font-semibold text-white bg-[var(--color-accent,theme(colors.blue.600))] disabled:opacity-50 min-h-[48px]"
        >
          {saving ? 'Saving…' : 'Verify and Save'}
        </button>
        <button type="button" onClick={() => router.back()} className="w-full text-sm text-gray-500 hover:text-gray-700 py-2">
          Cancel
        </button>
      </form>
    </div>
  )
}
