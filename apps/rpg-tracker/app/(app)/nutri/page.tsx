'use client'

import Link from 'next/link'
import { WeightLogPanel } from './components/WeightLogPanel'

export default function NutriTodayPage() {
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
      <div className="flex flex-wrap gap-3">
        <Link href="/nutri/fast" className="btn btn-secondary px-4 py-2 min-h-[44px]">
          Fasting
        </Link>
        <Link href="/nutri/cook" className="btn btn-secondary px-4 py-2 min-h-[44px]">
          Cook from pantry
        </Link>
      </div>
      <WeightLogPanel />
    </div>
  )
}
