'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getSkill } from '@rpgtracker/api-client'

export default function SkillEditPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const qc = useQueryClient()
  const { data: skill } = useQuery({ queryKey: ['skill', id], queryFn: () => getSkill(id) })

  const [name, setName] = useState(skill?.name ?? '')
  const [description, setDescription] = useState(skill?.description ?? '')

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/skills/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ name, description }).toString(),
      })
      if (!res.ok) throw new Error('Failed to update')
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['skill', id] })
      qc.invalidateQueries({ queryKey: ['skills'] })
      router.push(`/skills/${id}`)
    },
  })

  if (!skill) return <div className="p-8" style={{ color: 'var(--color-muted)' }}>Loading…</div>

  return (
    <div className="max-w-xl mx-auto p-4 md:p-8 space-y-6">
      <h1
        className="text-2xl font-bold"
        style={{
          fontFamily: 'var(--font-display, var(--font-body, Inter, system-ui, sans-serif))',
          color: 'var(--color-text)',
        }}
      >
        Edit Skill
      </h1>
      <form onSubmit={(e) => { e.preventDefault(); mutation.mutate() }} className="space-y-4">
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} required maxLength={60}
          placeholder="Skill name" className="w-full rounded-xl px-4 py-3"
          style={{
            backgroundColor: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text)',
          }} />
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={400}
          rows={4} placeholder="Description (optional)"
          className="w-full rounded-xl px-4 py-3"
          style={{
            backgroundColor: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text)',
          }} />
        <button type="submit" disabled={mutation.isPending}
          className="w-full py-4 rounded-xl font-semibold text-white min-h-[48px] disabled:opacity-50"
          style={{ backgroundColor: 'var(--color-accent)' }}>
          {mutation.isPending ? 'Saving…' : 'Save Changes'}
        </button>
        <button type="button" onClick={() => router.back()}
          className="w-full text-sm py-2"
          style={{ color: 'var(--color-muted)' }}>
          Cancel
        </button>
      </form>
    </div>
  )
}
