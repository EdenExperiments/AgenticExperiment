'use client'

import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiRequestError, getNutriGoals, upsertNutriGoals } from '@rpgtracker/api-client'

export default function NutriGoalsPage() {
  const qc = useQueryClient()
  const [calorie, setCalorie] = useState('2000')
  const [protein, setProtein] = useState('')
  const [carbs, setCarbs] = useState('')
  const [fat, setFat] = useState('')
  const [targetWeight, setTargetWeight] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  const { data: goals } = useQuery({
    queryKey: ['nutri-goals'],
    queryFn: async () => {
      try {
        return await getNutriGoals()
      } catch (err) {
        if (err instanceof ApiRequestError && err.status === 404) {
          return null
        }
        throw err
      }
    },
  })

  useEffect(() => {
    if (!goals) return
    setCalorie(String(goals.calorie_goal))
    setProtein(goals.protein_g != null ? String(goals.protein_g) : '')
    setCarbs(goals.carbs_g != null ? String(goals.carbs_g) : '')
    setFat(goals.fat_g != null ? String(goals.fat_g) : '')
    setTargetWeight(goals.target_weight_kg != null ? String(goals.target_weight_kg) : '')
  }, [goals])

  const save = useMutation({
    mutationFn: () => {
      const calorieGoal = parseInt(calorie, 10)
      if (!Number.isInteger(calorieGoal) || calorieGoal <= 0) {
        throw new Error('Calorie goal must be a positive integer')
      }
      const data: {
        calorie_goal: number
        protein_g?: number
        carbs_g?: number
        fat_g?: number
        target_weight_kg?: number
      } = { calorie_goal: calorieGoal }
      if (protein.trim()) data.protein_g = parseInt(protein, 10)
      if (carbs.trim()) data.carbs_g = parseInt(carbs, 10)
      if (fat.trim()) data.fat_g = parseInt(fat, 10)
      if (targetWeight.trim()) data.target_weight_kg = parseFloat(targetWeight)
      return upsertNutriGoals(data)
    },
    onSuccess: () => {
      setFormError(null)
      qc.invalidateQueries({ queryKey: ['nutri-goals'] })
    },
    onError: (err: Error) => setFormError(err.message),
  })

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
          Daily goals
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--color-muted)' }}>
          Calorie and optional macro targets live on NutriLog tables, not LifeQuest goals.
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          save.mutate()
        }}
        className="rounded-2xl p-6 space-y-4"
        style={{ backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}
      >
        <label className="block text-sm">
          Daily calories
          <input
            aria-label="Daily calories"
            value={calorie}
            onChange={(e) => setCalorie(e.target.value)}
            className="mt-1 w-full rounded-xl px-4 py-3"
            style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-sm">
            Protein g
            <input aria-label="Protein grams" value={protein} onChange={(e) => setProtein(e.target.value)} className="mt-1 w-full rounded-xl px-4 py-3" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }} />
          </label>
          <label className="text-sm">
            Carbs g
            <input aria-label="Carbs grams" value={carbs} onChange={(e) => setCarbs(e.target.value)} className="mt-1 w-full rounded-xl px-4 py-3" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }} />
          </label>
          <label className="text-sm">
            Fat g
            <input aria-label="Fat grams" value={fat} onChange={(e) => setFat(e.target.value)} className="mt-1 w-full rounded-xl px-4 py-3" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }} />
          </label>
        </div>
        <label className="block text-sm">
          Target weight kg (optional)
          <input
            aria-label="Target weight kg"
            value={targetWeight}
            onChange={(e) => setTargetWeight(e.target.value)}
            className="mt-1 w-full rounded-xl px-4 py-3"
            style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          />
        </label>
        {formError && (
          <p role="alert" className="text-sm" style={{ color: 'var(--color-error)' }}>{formError}</p>
        )}
        <button type="submit" className="btn btn-primary px-6 py-3" disabled={save.isPending}>
          {save.isPending ? 'Saving…' : 'Save goals'}
        </button>
      </form>
    </div>
  )
}
