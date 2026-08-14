'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ApiRequestError,
  createNutriFood,
  deleteNutriDiary,
  getNutriRemaining,
  listNutriDiary,
  logNutriDiary,
  searchNutriFoods,
} from '@rpgtracker/api-client'
import type { NutriFood } from '@rpgtracker/api-client'

export default function NutriDiaryPage() {
  const qc = useQueryClient()
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<NutriFood[]>([])
  const [source, setSource] = useState<'off' | 'cache' | null>(null)
  const [qty, setQty] = useState('1')
  const [customName, setCustomName] = useState('')
  const [customCal, setCustomCal] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  const { data: remaining } = useQuery({
    queryKey: ['nutri-remaining'],
    queryFn: async () => {
      try {
        return await getNutriRemaining()
      } catch (err) {
        if (err instanceof ApiRequestError && err.status === 404) return null
        throw err
      }
    },
  })

  const { data: entries = [] } = useQuery({
    queryKey: ['nutri-diary'],
    queryFn: () => listNutriDiary(),
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['nutri-diary'] })
    qc.invalidateQueries({ queryKey: ['nutri-remaining'] })
  }

  const search = useMutation({
    mutationFn: () => searchNutriFoods(query),
    onSuccess: (res) => {
      setHits(res.foods)
      setSource(res.source)
      setFormError(null)
    },
    onError: (err: Error) => setFormError(err.message),
  })

  const logFood = useMutation({
    mutationFn: (food: NutriFood) => {
      const servingQty = parseFloat(qty)
      if (!Number.isFinite(servingQty) || servingQty <= 0) {
        throw new Error('Serving quantity must be positive')
      }
      return logNutriDiary({
        name: food.name,
        calories: food.calories,
        protein_g: food.protein_g,
        carbs_g: food.carbs_g,
        fat_g: food.fat_g,
        serving_qty: servingQty,
        off_id: food.off_id ?? undefined,
        serving_label: food.serving_label,
      })
    },
    onSuccess: () => {
      setFormError(null)
      invalidate()
    },
    onError: (err: Error) => setFormError(err.message),
  })

  const custom = useMutation({
    mutationFn: async () => {
      const calories = parseInt(customCal, 10)
      if (!customName.trim() || !Number.isInteger(calories) || calories < 0) {
        throw new Error('Custom food needs a name and calories')
      }
      const food = await createNutriFood({
        name: customName.trim(),
        calories,
        protein_g: 0,
        carbs_g: 0,
        fat_g: 0,
      })
      return logFood.mutateAsync(food)
    },
    onSuccess: () => {
      setCustomName('')
      setCustomCal('')
    },
    onError: (err: Error) => setFormError(err.message),
  })

  const del = useMutation({
    mutationFn: deleteNutriDiary,
    onSuccess: invalidate,
  })

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>Diary</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--color-muted)' }}>
          Search Open Food Facts, or your cache if it is down. Macros snapshot when you log.
        </p>
      </div>

      <section data-testid="remaining-today" className="rounded-2xl p-6" style={{ backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}>
        {remaining ? (
          <p className="text-lg font-semibold">
            {remaining.calories_remaining} kcal remaining of {remaining.calorie_goal}
          </p>
        ) : (
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>Set a calorie goal to see remaining today.</p>
        )}
      </section>

      <section className="rounded-2xl p-6 space-y-3" style={{ backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            search.mutate()
          }}
          className="flex gap-2"
        >
          <input
            aria-label="Search foods"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Oats"
            className="flex-1 rounded-xl px-4 py-3"
            style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          />
          <input
            aria-label="Serving quantity"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            className="w-20 rounded-xl px-3 py-3"
            style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          />
          <button type="submit" className="btn btn-primary px-4" disabled={search.isPending}>Search</button>
        </form>
        {source && <p className="text-xs" style={{ color: 'var(--color-muted)' }}>Source: {source}</p>}
        <ul className="space-y-2">
          {hits.map((food, i) => (
            <li key={`${food.off_id ?? food.name}-${i}`} className="flex justify-between gap-3">
              <span>{food.name} · {food.calories} kcal / {food.serving_label || 'serving'}</span>
              <button type="button" onClick={() => logFood.mutate(food)}>Log</button>
            </li>
          ))}
        </ul>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            custom.mutate()
          }}
          className="flex gap-2"
        >
          <input aria-label="Custom food name" value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="Custom food" className="flex-1 rounded-xl px-4 py-3" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }} />
          <input aria-label="Custom calories" value={customCal} onChange={(e) => setCustomCal(e.target.value)} placeholder="kcal" className="w-24 rounded-xl px-3 py-3" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }} />
          <button type="submit">Add custom</button>
        </form>
        {formError && <p role="alert" className="text-sm" style={{ color: 'var(--color-error)' }}>{formError}</p>}
      </section>

      <section className="rounded-2xl p-6" style={{ backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}>
        <h2 className="text-lg font-semibold mb-3">Today</h2>
        <ul>
          {entries.map((e) => (
            <li key={e.id} data-testid="diary-row" className="flex justify-between py-2">
              <span>{e.name} · {e.calories} kcal</span>
              <button type="button" onClick={() => del.mutate(e.id)} aria-label={`Delete ${e.name}`}>Delete</button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
