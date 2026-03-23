'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@rpgtracker/auth/client'
import SocialAuthButtons from '../components/SocialAuthButtons'
import FreeTrial from '../components/FreeTrial'
import FeaturePreview from '../components/FeaturePreview'

export default function RegisterPage() {
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
    const { error } = await supabase.auth.signUp({ email, password })

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
      className="auth-page min-h-screen flex items-center justify-center px-4 py-12"
      style={{ backgroundColor: 'var(--color-bg)' }}
    >
      <div className="w-full max-w-3xl flex flex-col lg:flex-row gap-8 items-start">
        {/* Form column */}
        <div className="w-full lg:w-1/2">
          <div className="mb-6 text-center lg:text-left">
            <h1
              className="text-3xl font-bold tracking-tight"
              style={{
                fontFamily: 'var(--font-display)',
                color: 'var(--color-text)',
              }}
            >
              RPG Tracker
            </h1>
            <p className="mt-2 text-sm" style={{ color: 'var(--color-muted)' }}>
              Start tracking your real-life skills
            </p>
          </div>

          {/* Free trial callout */}
          <div className="mb-5">
            <FreeTrial />
          </div>

          <div
            className="auth-page__card rounded-2xl p-8 shadow-sm"
            style={{
              backgroundColor: 'var(--color-bg-elevated)',
              border: '1px solid var(--color-border)',
            }}
          >
            {/* Social auth */}
            <SocialAuthButtons onError={(msg) => setError(msg)} />

            {/* Divider */}
            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px" style={{ backgroundColor: 'var(--color-border)' }} />
              <span className="text-xs" style={{ color: 'var(--color-muted)' }}>or</span>
              <div className="flex-1 h-px" style={{ backgroundColor: 'var(--color-border)' }} />
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label
                  htmlFor="email"
                  className="block text-sm font-medium"
                  style={{ color: 'var(--color-text-secondary)' }}
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
                    backgroundColor: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text)',
                    boxShadow: 'none',
                  }}
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  placeholder="••••••••"
                  className="w-full rounded-xl px-4 py-3 focus:outline-none focus:ring-2 transition-shadow"
                  style={{
                    backgroundColor: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text)',
                    boxShadow: 'none',
                  }}
                />
              </div>

              {error && (
                <p role="alert" className="text-sm rounded-lg px-3 py-2" style={{ color: 'var(--color-error)', backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary w-full py-3 disabled:opacity-50 min-h-[48px]"
              >
                {loading ? 'Creating account…' : 'Create account'}
              </button>
            </form>
          </div>

          <p className="mt-6 text-center lg:text-left text-sm" style={{ color: 'var(--color-muted)' }}>
            Already have an account?{' '}
            <Link href="/login" className="font-medium hover:underline" style={{ color: 'var(--color-accent)' }}>
              Sign in
            </Link>
          </p>
        </div>

        {/* Feature preview column — desktop: alongside, mobile: below */}
        <div className="w-full lg:w-1/2 lg:sticky lg:top-8">
          <FeaturePreview />
        </div>
      </div>
    </main>
  )
}
