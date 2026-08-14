'use client'

import { usePathname } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { getAccount } from '@rpgtracker/api-client'
import { ProductShell } from '@/components/ProductShell'
import { WORKOUT_NAV } from '@/lib/nav'

export default function WorkoutLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { data: account } = useQuery({ queryKey: ['account'], queryFn: getAccount })

  return (
    <ProductShell
      brand="Workout"
      theme="workout-forge"
      items={WORKOUT_NAV}
      currentPath={pathname}
      displayName={account?.display_name}
      avatarUrl={account?.avatar_url}
    >
      {children}
    </ProductShell>
  )
}
