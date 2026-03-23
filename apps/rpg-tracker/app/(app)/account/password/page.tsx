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
    <div className="max-w-xl mx-auto p-4 md:p-8 space-y-6">
      <h1
        className="text-2xl font-bold"
        style={{
          fontFamily: 'var(--font-display, var(--font-body, Inter, system-ui, sans-serif))',
          color: 'var(--color-text)',
        }}
      >
        Change Password
      </h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input type="password" placeholder="Current password" value={current}
          onChange={(e) => setCurrent(e.target.value)} required
          className="w-full rounded-xl px-4 py-3"
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text)',
          }} />
        <input type="password" placeholder="New password" value={next}
          onChange={(e) => setNext(e.target.value)} required minLength={8}
          className="w-full rounded-xl px-4 py-3"
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text)',
          }} />
        {error && <p className="text-sm" style={{ color: 'var(--color-error)' }}>{error}</p>}
        <button type="submit" disabled={saving}
          className="btn btn-primary w-full py-4 disabled:opacity-50 min-h-[48px]">
          {saving ? 'Saving…' : 'Change Password'}
        </button>
        <button type="button" onClick={() => router.back()}
          className="btn btn-ghost w-full text-sm py-2">
          Cancel
        </button>
      </form>
    </div>
  )
}
