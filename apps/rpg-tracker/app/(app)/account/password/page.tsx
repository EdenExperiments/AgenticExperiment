'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { changePassword } from '@rpgtracker/api-client'

export default function PasswordPage() {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (next.length < 8) {
      setError('New password must be at least 8 characters.')
      return
    }
    if (confirm && confirm !== next) {
      setError('Passwords do not match.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await changePassword({
        current_password: current,
        new_password: next,
        confirm_new_password: confirm || undefined,
      })
      router.push('/account')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  const inputStyle = {
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text)',
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
        <input
          type="password"
          placeholder="Current password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          required
          className="w-full rounded-xl px-4 py-3"
          style={inputStyle}
        />
        <input
          type="password"
          placeholder="New password (min 8 characters)"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          required
          minLength={8}
          className="w-full rounded-xl px-4 py-3"
          style={inputStyle}
        />
        <input
          type="password"
          placeholder="Confirm new password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="w-full rounded-xl px-4 py-3"
          style={inputStyle}
        />
        {error && (
          <p className="text-sm" style={{ color: 'var(--color-error)' }} role="alert">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={saving}
          className="btn btn-primary w-full py-4 disabled:opacity-50 min-h-[48px]"
        >
          {saving ? 'Saving…' : 'Change Password'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="btn btn-ghost w-full text-sm py-2"
        >
          Cancel
        </button>
      </form>
    </div>
  )
}
