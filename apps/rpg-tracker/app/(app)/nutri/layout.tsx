'use client'

import { usePathname } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { getAccount } from '@rpgtracker/api-client'
import { ProductShell } from '@/components/ProductShell'
import { NUTRI_NAV } from '@/lib/nav'

export default function NutriLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { data: account } = useQuery({ queryKey: ['account'], queryFn: getAccount })

  return (
    <ProductShell
      brand="NutriLog"
      theme="nutri-saas"
      items={NUTRI_NAV}
      currentPath={pathname}
      displayName={account?.display_name}
      avatarUrl={account?.avatar_url}
    >
      {children}
    </ProductShell>
  )
}
