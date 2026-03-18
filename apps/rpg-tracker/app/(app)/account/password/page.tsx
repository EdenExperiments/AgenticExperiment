'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function PasswordPage() {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/account/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ current_password: current, new_password: next }).toString(),
      })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error ?? 'Failed to change password')
      }
      router.push('/account')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto p-4 md:p-8 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Change Password</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input type="password" placeholder="Current password" value={current}
          onChange={(e) => setCurrent(e.target.value)} required
          className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 dark:bg-gray-800" />
        <input type="password" placeholder="New password" value={next}
          onChange={(e) => setNext(e.target.value)} required minLength={8}
          className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 dark:bg-gray-800" />
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button type="submit" disabled={saving}
          className="w-full py-4 rounded-xl font-semibold text-white bg-[var(--color-accent,theme(colors.blue.600))] disabled:opacity-50 min-h-[48px]">
          {saving ? 'Saving…' : 'Change Password'}
        </button>
        <button type="button" onClick={() => router.back()} className="w-full text-sm text-gray-500 py-2">Cancel</button>
      </form>
    </div>
  )
}
