'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { getAccount } from '@rpgtracker/api-client'
import { ProductShell } from '@/components/ProductShell'
import { MIND_NAV } from '@/lib/nav'

export default function MindLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { data: account } = useQuery({ queryKey: ['account'], queryFn: getAccount })

  return (
    <ProductShell
      brand="MindTrack"
      theme="mental-calm"
      items={MIND_NAV}
      currentPath={pathname}
      displayName={account?.display_name}
      avatarUrl={account?.avatar_url}
    >
      <div className="min-h-screen flex flex-col">
        <div className="flex-1">{children}</div>
        <footer className="px-4 md:px-8 py-6 text-sm" style={{ color: 'var(--color-muted)', borderTop: '1px solid var(--color-border)' }}>
          <p>MindTrack is not therapy, a diagnosis, or a crisis service. Notes stay private. Nothing here is sent to an AI.</p>
          <p className="mt-2">
            Need urgent help? Immediate danger: call{' '}
            <a href="tel:999" className="underline">999</a>
            {' '}or go to A&E. Urgent mental health help:{' '}
            <a href="https://111.nhs.uk/" className="underline">NHS 111</a>
            . Someone to talk to: Samaritans{' '}
            <a href="tel:116123" className="underline">116 123</a>
            .
          </p>
          <p className="mt-2">
            <Link href="/dashboard" className="underline">Back to suite</Link>
          </p>
        </footer>
      </div>
    </ProductShell>
  )
}
