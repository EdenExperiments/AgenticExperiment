'use client'

import { WeightLogPanel } from '../components/WeightLogPanel'

export default function NutriWeightPage() {
  return (
    <div className="p-4 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
          Weight tracking
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--color-muted)' }}>
          Log your weight in kg. Trends use the last 30 days.
        </p>
      </div>
      <WeightLogPanel />
    </div>
  )
}
