'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { getAccount, getAPIKeyStatus, signOut } from '@rpgtracker/api-client'

export default function AccountPage() {
  const { data: account } = useQuery({ queryKey: ['account'], queryFn: getAccount })
  const { data: keyStatus } = useQuery({ queryKey: ['api-key-status'], queryFn: getAPIKeyStatus })

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Account</h1>

      <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-5 space-y-3">
        <div>
          <label className="text-xs text-gray-500 uppercase tracking-wider">Display name</label>
          <p className="font-medium text-gray-900 dark:text-white">{account?.display_name ?? '—'}</p>
        </div>
        <div>
          <label className="text-xs text-gray-500 uppercase tracking-wider">Email</label>
          <p className="font-medium text-gray-900 dark:text-white">{account?.email ?? '—'}</p>
        </div>
      </section>

      <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-5 space-y-3">
        <h2 className="font-semibold text-gray-900 dark:text-white">Claude API Key</h2>
        <p className="text-sm text-gray-500">
          {keyStatus?.has_key ? `Key saved (ending in ****${keyStatus.key_hint ?? ''})` : 'No key saved'}
        </p>
        <Link
          href="/account/api-key"
          className="inline-block text-sm font-medium text-[var(--color-accent,theme(colors.blue.600))] hover:underline"
        >
          {keyStatus?.has_key ? 'Update or remove key' : 'Add API key'}
        </Link>
      </section>

      <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-5 space-y-3">
        <h2 className="font-semibold text-gray-900 dark:text-white">Security</h2>
        <Link href="/account/password" className="text-sm text-[var(--color-accent,theme(colors.blue.600))] hover:underline block">
          Change Password
        </Link>
        <button
          onClick={() => signOut().then(() => { window.location.href = '/login' })}
          className="text-sm text-red-500 hover:text-red-600 font-medium"
        >
          Sign Out
        </button>
      </section>
    </div>
  )
}
