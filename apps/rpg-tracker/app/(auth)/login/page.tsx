'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@rpgtracker/auth/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createBrowserClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <main
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: 'var(--color-bg-base, #0f0f1a)' }}
    >
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1
            className="text-3xl font-bold tracking-tight"
            style={{
              fontFamily: 'var(--font-display, var(--font-body, Inter, system-ui, sans-serif))',
              color: 'var(--color-text-primary, #f9fafb)',
            }}
          >
            RPG Tracker
          </h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--color-text-muted, #6b7280)' }}>
            Sign in to continue your journey
          </p>
        </div>

        <div
          className="rounded-2xl p-8 shadow-sm"
          style={{
            backgroundColor: 'var(--color-bg-elevated, #1a1a2e)',
            border: '1px solid var(--color-border, #374151)',
          }}
        >
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="block text-sm font-medium"
                style={{ color: 'var(--color-text-secondary, #9ca3af)' }}
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="you@example.com"
                className="w-full rounded-xl px-4 py-3 focus:outline-none focus:ring-2 transition-shadow"
                style={{
                  backgroundColor: 'var(--color-bg-surface, #1f2937)',
                  border: '1px solid var(--color-border, #374151)',
                  color: 'var(--color-text-primary, #f9fafb)',
                  boxShadow: 'none',
                }}
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="block text-sm font-medium"
                style={{ color: 'var(--color-text-secondary, #9ca3af)' }}
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full rounded-xl px-4 py-3 focus:outline-none focus:ring-2 transition-shadow"
                style={{
                  backgroundColor: 'var(--color-bg-surface, #1f2937)',
                  border: '1px solid var(--color-border, #374151)',
                  color: 'var(--color-text-primary, #f9fafb)',
                  boxShadow: 'none',
                }}
              />
            </div>

            {error && (
              <p role="alert" className="text-sm rounded-lg px-3 py-2" style={{ color: 'var(--color-danger, #ef4444)', backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity min-h-[48px]"
              style={{ backgroundColor: 'var(--color-accent, #6366f1)' }}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm" style={{ color: 'var(--color-text-muted, #6b7280)' }}>
          No account?{' '}
          <Link href="/register" className="font-medium hover:underline" style={{ color: 'var(--color-accent, #6366f1)' }}>
            Create account
          </Link>
        </p>
      </div>
    </main>
  )
}
