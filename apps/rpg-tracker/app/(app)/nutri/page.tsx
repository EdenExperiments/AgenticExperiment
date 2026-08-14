'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { getCurrentFast, listDiary, listPantry } from '@rpgtracker/api-client'
import { formatElapsed, hubPantryValue } from '@/lib/suiteStatus'
import { WeightLogPanel } from './components/WeightLogPanel'

export default function NutriTodayPage() {
  const { data: current } = useQuery({
    queryKey: ['fast-current'],
    queryFn: getCurrentFast,
  })
  const { data: pantry = [] } = useQuery({
    queryKey: ['pantry'],
    queryFn: listPantry,
  })
  const { data: diary = [] } = useQuery({
    queryKey: ['diary'],
    queryFn: listDiary,
  })
  const lastMeal = diary[0]

  return (
    <div className="p-4 md:p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
          Today
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--color-muted)' }}>
          Weight, fasting, and cooking live here. Rest days still count as showing up.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Link
          href="/nutri/fast"
          className="rounded-2xl p-4 min-h-[44px]"
          style={{ backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}
        >
          <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--color-muted)' }}>Fast</p>
          <p className="mt-1 text-xl font-semibold tabular-nums" style={{ color: 'var(--color-text)' }}>
            {current ? formatElapsed(current.started_at) : 'None'}
          </p>
        </Link>
        <Link
          href="/nutri/cook"
          className="rounded-2xl p-4 min-h-[44px]"
          style={{ backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}
        >
          <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--color-muted)' }}>Pantry</p>
          <p className="mt-1 text-xl font-semibold tabular-nums" style={{ color: 'var(--color-text)' }}>
            {hubPantryValue(pantry.length)}
          </p>
        </Link>
        <Link
          href="/nutri/cook"
          className="rounded-2xl p-4 min-h-[44px]"
          style={{ backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}
        >
          <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--color-muted)' }}>Last meal</p>
          <p className="mt-1 text-xl font-semibold" style={{ color: 'var(--color-text)' }}>
            {lastMeal?.title ?? 'None'}
          </p>
        </Link>
      </div>
      <WeightLogPanel />
    </div>
  )
}
