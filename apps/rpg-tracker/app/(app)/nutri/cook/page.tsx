'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  addPantryItem,
  ApiRequestError,
  cookRecipe,
  createRecipe,
  deletePantryItem,
  listDiary,
  listPantry,
  listRecipes,
} from '@rpgtracker/api-client'

export default function NutriCookPage() {
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [title, setTitle] = useState('')
  const [steps, setSteps] = useState('')
  const [error, setError] = useState<string | null>(null)

  const { data: pantry = [] } = useQuery({ queryKey: ['pantry'], queryFn: listPantry })
  const { data: recipes = [] } = useQuery({ queryKey: ['recipes'], queryFn: listRecipes })
  const { data: diary = [] } = useQuery({ queryKey: ['diary'], queryFn: listDiary })

  const addItem = useMutation({
    mutationFn: () => addPantryItem({ name, amount_text: amount }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pantry'] })
      setName('')
      setAmount('')
    },
  })
  const removeItem = useMutation({
    mutationFn: deletePantryItem,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pantry'] }),
  })
  const saveRecipe = useMutation({
    mutationFn: () => createRecipe({
      title,
      servings: 1,
      ingredients: pantry.map((item) => ({ name: item.name, amount_text: item.amount_text })),
      steps: steps.split('\n').map((line) => line.trim()).filter(Boolean),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recipes'] })
      setTitle('')
      setSteps('')
      setError(null)
    },
  })
  const cook = useMutation({
    mutationFn: (recipeId: string) => cookRecipe({ recipe_id: recipeId, servings: 1 }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['diary'] })
      setError(null)
    },
    onError: (err: Error) => {
      if (err instanceof ApiRequestError && err.message === 'empty_pantry') {
        setError('Add something to the pantry before cooking. Empty pantry does not invent a meal.')
        return
      }
      setError(err.message)
    },
  })

  return (
    <div className="p-4 md:p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
          Cook from pantry
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--color-muted)' }}>
          Write what you have. Cook writes a meal receipt. Nutrition stays blank unless you entered it.
        </p>
      </div>

      {error && (
        <p role="alert" className="text-sm" style={{ color: 'var(--color-error)' }}>{error}</p>
      )}

      <section className="rounded-2xl p-6 space-y-4" style={{ backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}>
        <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>Pantry</h2>
        <form
          className="flex flex-col sm:flex-row gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            addItem.mutate()
          }}
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Eggs"
            required
            className="flex-1 rounded-xl px-4 py-3 min-h-[44px]"
            style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
          />
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="6"
            className="sm:w-32 rounded-xl px-4 py-3 min-h-[44px]"
            style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
          />
          <button type="submit" className="btn btn-primary px-4 py-2 min-h-[44px]" disabled={addItem.isPending}>
            Add
          </button>
        </form>
        {pantry.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>Pantry is empty. Cooking is refused until you add an item.</p>
        ) : (
          <ul className="space-y-2">
            {pantry.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3">
                <span style={{ color: 'var(--color-text)' }}>{item.name}{item.amount_text ? ` · ${item.amount_text}` : ''}</span>
                <button type="button" className="text-sm min-h-[44px]" style={{ color: 'var(--color-error)' }} onClick={() => removeItem.mutate(item.id)}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl p-6 space-y-4" style={{ backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}>
        <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>Manual recipe</h2>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            saveRecipe.mutate()
          }}
        >
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Omelette"
            required
            className="w-full rounded-xl px-4 py-3 min-h-[44px]"
            style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
          />
          <textarea
            value={steps}
            onChange={(e) => setSteps(e.target.value)}
            placeholder="One step per line"
            rows={4}
            className="w-full rounded-xl px-4 py-3"
            style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
          />
          <button type="submit" className="btn btn-secondary px-4 py-2 min-h-[44px]" disabled={saveRecipe.isPending}>
            Save recipe
          </button>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>Recipes</h2>
        {recipes.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>No recipes yet.</p>
        ) : recipes.map((recipe) => (
          <div key={recipe.id} className="rounded-xl p-4 flex items-center justify-between gap-3" style={{ backgroundColor: 'var(--color-bg-elevated)' }}>
            <div>
              <p className="font-medium" style={{ color: 'var(--color-text)' }}>{recipe.title}</p>
              <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
                {recipe.calories_kcal == null ? 'Nutrition not entered' : `${recipe.calories_kcal} kcal`}
              </p>
            </div>
            <button type="button" className="btn btn-primary px-4 py-2 min-h-[44px]" onClick={() => cook.mutate(recipe.id)} disabled={cook.isPending}>
              Cook and log
            </button>
          </div>
        ))}
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--color-text)' }}>Cooked meals</h2>
        {diary.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>No meals logged.</p>
        ) : (
          <ul className="space-y-2">
            {diary.map((entry) => (
              <li key={entry.id} data-testid="diary-row" className="rounded-xl px-4 py-3" style={{ backgroundColor: 'var(--color-bg-elevated)' }}>
                <p className="font-medium" style={{ color: 'var(--color-text)' }}>{entry.title}</p>
                <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
                  {entry.calories_kcal == null ? 'Nutrition not entered' : `${entry.calories_kcal} kcal`}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
