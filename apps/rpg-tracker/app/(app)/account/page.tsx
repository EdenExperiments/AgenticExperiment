'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getAccount, getAPIKeyStatus, getAccountStats, uploadAvatar, deleteAvatar } from '@rpgtracker/api-client'
import { PlayerCard, AvatarCropModal, ThemePickerPreview } from '@rpgtracker/ui'
import { createBrowserClient } from '@rpgtracker/auth/client'

export default function AccountPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [showCropModal, setShowCropModal] = useState(false)

  const { data: account } = useQuery({ queryKey: ['account'], queryFn: getAccount })
  const { data: keyStatus } = useQuery({ queryKey: ['api-key-status'], queryFn: getAPIKeyStatus })
  const { data: accountStats } = useQuery({ queryKey: ['account-stats'], queryFn: getAccountStats })

  const uploadAvatarMutation = useMutation({
    mutationFn: uploadAvatar,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['account'] })
      queryClient.invalidateQueries({ queryKey: ['account-stats'] })
    },
  })

  const removeAvatarMutation = useMutation({
    mutationFn: deleteAvatar,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['account'] })
      queryClient.invalidateQueries({ queryKey: ['account-stats'] })
    },
  })

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
          color: 'var(--color-text)',
        }}
      >
        Account
      </h1>

      <PlayerCard
        displayName={account?.display_name ?? null}
        avatarUrl={account?.avatar_url ?? null}
        stats={accountStats ?? null}
        onAvatarClick={() => setShowCropModal(true)}
        onRemoveAvatar={() => removeAvatarMutation.mutate()}
        onSaveDisplayName={async (name) => {
          const body = new URLSearchParams({ display_name: name })
          const res = await fetch('/api/v1/account', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: body.toString(),
          })
          if (!res.ok) throw new Error('Failed to update display name')
          queryClient.invalidateQueries({ queryKey: ['account'] })
        }}
        isRemovingAvatar={removeAvatarMutation.isPending}
      />

      <ThemePickerPreview />

      <div data-testid="settings-grid" className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <section
          className="rounded-xl p-5 space-y-3"
          style={{
            backgroundColor: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border)',
          }}
        >
          <div>
            <label
              className="text-xs uppercase tracking-wider"
              style={{ color: 'var(--color-muted)' }}
            >
              Display name
            </label>
            <p className="font-medium" style={{ color: 'var(--color-text)' }}>
              {account?.display_name ?? '—'}
            </p>
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider" style={{ color: 'var(--color-muted)' }}>
              Email
            </label>
            <p className="font-medium" style={{ color: 'var(--color-text)' }}>
              {account?.email ?? '—'}
            </p>
          </div>
        </section>

        <section
          className="rounded-xl p-5 space-y-3"
          style={{
            backgroundColor: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border)',
          }}
        >
          <h2
            className="font-semibold"
            style={{
              fontFamily: 'var(--font-display, var(--font-body, Inter, system-ui, sans-serif))',
              color: 'var(--color-text)',
            }}
          >
            Claude API Key
          </h2>
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
            {keyStatus?.has_key
              ? keyStatus.key_hint
                ? `Key saved (…${keyStatus.key_hint})`
                : 'Key saved'
              : 'No key saved'}
          </p>
          <Link
            href="/account/api-key"
            className="inline-block text-sm font-medium hover:underline"
            style={{ color: 'var(--color-accent)' }}
          >
            {keyStatus?.has_key ? 'Update or remove key' : 'Add API key'}
          </Link>
        </section>

        <section
          className="rounded-xl p-5 space-y-3"
          style={{
            backgroundColor: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border)',
          }}
        >
          <h2
            className="font-semibold"
            style={{
              fontFamily: 'var(--font-display, var(--font-body, Inter, system-ui, sans-serif))',
              color: 'var(--color-text)',
            }}
          >
            Security
          </h2>
          <Link
            href="/account/password"
            className="text-sm hover:underline block"
            style={{ color: 'var(--color-accent)' }}
          >
            Change Password
          </Link>
          <button
            onClick={handleSignOut}
            className="btn btn-danger text-sm px-3 py-2"
          >
            Sign Out
          </button>
        </section>
      </div>

      <AvatarCropModal
        open={showCropModal}
        onClose={() => setShowCropModal(false)}
        onUpload={async (blob) => {
          const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' })
          await uploadAvatarMutation.mutateAsync(file)
          setShowCropModal(false)
        }}
        isUploading={uploadAvatarMutation.isPending}
        error={uploadAvatarMutation.error?.message ?? null}
      />
    </div>
  )
}
