'use client'

import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getAccount, getAPIKeyStatus } from '@rpgtracker/api-client'
import { createBrowserClient } from '@rpgtracker/auth/client'

export default function AccountPage() {
  const router = useRouter()
  const { data: account } = useQuery({ queryKey: ['account'], queryFn: getAccount })
  const { data: keyStatus } = useQuery({ queryKey: ['api-key-status'], queryFn: getAPIKeyStatus })

  async function handleSignOut() {
    const supabase = createBrowserClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <h1
        className="text-2xl font-bold"
        style={{
          fontFamily: 'var(--font-display, var(--font-body, Inter, system-ui, sans-serif))',
          color: 'var(--color-text-primary, #f9fafb)',
        }}
      >
        Account
      </h1>

      <div data-testid="settings-grid" className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <section
          className="rounded-xl p-5 space-y-3"
          style={{
            backgroundColor: 'var(--color-bg-elevated, #1a1a2e)',
            border: '1px solid var(--color-border, #374151)',
          }}
        >
          <div>
            <label className="text-xs uppercase tracking-wider" style={{ color: 'var(--color-text-muted, #6b7280)' }}>
              Display name
            </label>
            <p className="font-medium" style={{ color: 'var(--color-text-primary, #f9fafb)' }}>
              {account?.display_name ?? '—'}
            </p>
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider" style={{ color: 'var(--color-text-muted, #6b7280)' }}>
              Email
            </label>
            <p className="font-medium" style={{ color: 'var(--color-text-primary, #f9fafb)' }}>
              {account?.email ?? '—'}
            </p>
          </div>
        </section>

        <section
          className="rounded-xl p-5 space-y-3"
          style={{
            backgroundColor: 'var(--color-bg-elevated, #1a1a2e)',
            border: '1px solid var(--color-border, #374151)',
          }}
        >
          <h2
            className="font-semibold"
            style={{
              fontFamily: 'var(--font-display, var(--font-body, Inter, system-ui, sans-serif))',
              color: 'var(--color-text-primary, #f9fafb)',
            }}
          >
            Claude API Key
          </h2>
          <p className="text-sm" style={{ color: 'var(--color-text-muted, #6b7280)' }}>
            {keyStatus?.has_key ? `Key saved (ending in ****${keyStatus.key_hint ?? ''})` : 'No key saved'}
          </p>
          <Link
            href="/account/api-key"
            className="inline-block text-sm font-medium hover:underline"
            style={{ color: 'var(--color-accent, #6366f1)' }}
          >
            {keyStatus?.has_key ? 'Update or remove key' : 'Add API key'}
          </Link>
        </section>

        <section
          className="rounded-xl p-5 space-y-3"
          style={{
            backgroundColor: 'var(--color-bg-elevated, #1a1a2e)',
            border: '1px solid var(--color-border, #374151)',
          }}
        >
          <h2
            className="font-semibold"
            style={{
              fontFamily: 'var(--font-display, var(--font-body, Inter, system-ui, sans-serif))',
              color: 'var(--color-text-primary, #f9fafb)',
            }}
          >
            Security
          </h2>
          <Link
            href="/account/password"
            className="text-sm hover:underline block"
            style={{ color: 'var(--color-accent, #6366f1)' }}
          >
            Change Password
          </Link>
          <button
            onClick={handleSignOut}
            className="text-sm font-medium"
            style={{ color: 'var(--color-danger, #ef4444)' }}
          >
            Sign Out
          </button>
        </section>
      </div>
    </div>
  )
}
