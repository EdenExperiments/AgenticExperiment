'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation } from '@tanstack/react-query'
import { createSkill, calibrateSkill, getAPIKeyStatus, getPresets } from '@rpgtracker/api-client'
import type { Preset } from '@rpgtracker/api-client'

type Step = 1 | 2 | 3

interface SkillDraft {
  name: string
  description: string
  presetId: string | null
  presetName: string | null
  startingLevel: number
  gateDescriptions: string[]
  aiRationale: string | null
}

const GATE_LEVELS = [9, 19, 29, 39, 49, 59, 69, 79, 89, 99]

const CATEGORY_EMOJI: Record<string, string> = {
  fitness: '🏋️', programming: '💻', creative: '🎨', wellness: '🧘',
  learning: '📚', social: '💬', finance: '💰', nutrition: '🥗', productivity: '⚡',
}

export default function SkillCreatePage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [draft, setDraft] = useState<SkillDraft>({
    name: '', description: '', presetId: null, presetName: null,
    startingLevel: 1, gateDescriptions: [], aiRationale: null,
  })
  const [aiError, setAiError] = useState<string | null>(null)
  const [showPresets, setShowPresets] = useState(false)
  const [presetSearch, setPresetSearch] = useState('')

  const { data: keyStatus } = useQuery({ queryKey: ['api-key-status'], queryFn: getAPIKeyStatus })
  const hasKey = keyStatus?.has_key ?? false

  const { data: presets = [] } = useQuery({
    queryKey: ['presets'],
    queryFn: () => getPresets({}),
    staleTime: Infinity,
  })

  // Group presets by category
  const presetsByCategory = useMemo(() => {
    const filtered = presetSearch
      ? presets.filter(p =>
          p.name.toLowerCase().includes(presetSearch.toLowerCase()) ||
          p.category_name.toLowerCase().includes(presetSearch.toLowerCase())
        )
      : presets
    const map = new Map<string, { name: string; slug: string; presets: Preset[] }>()
    for (const p of filtered) {
      if (!map.has(p.category_name)) {
        map.set(p.category_name, { name: p.category_name, slug: p.category_slug, presets: [] })
      }
      map.get(p.category_name)!.presets.push(p)
    }
    return Array.from(map.values())
  }, [presets, presetSearch])

  function selectPreset(preset: Preset) {
    setDraft(d => ({
      ...d,
      presetId: preset.id,
      presetName: preset.name,
      name: preset.name,
      description: preset.description,
    }))
    setShowPresets(false)
    setPresetSearch('')
  }

  function clearPreset() {
    setDraft(d => ({ ...d, presetId: null, presetName: null, name: '', description: '' }))
  }

  const calibrateMutation = useMutation({
    mutationFn: () => calibrateSkill({ name: draft.name, description: draft.description }),
    onSuccess: (result) => {
      setDraft(d => ({
        ...d,
        startingLevel: result.suggested_level,
        gateDescriptions: result.gate_descriptions,
        aiRationale: result.rationale,
      }))
      setStep(2)
    },
    onError: (err: Error) => {
      const msg = err.message.includes('rate limit')
        ? 'Claude API rate limit reached. Setting level manually.'
        : err.message.includes('invalid')
        ? 'Your Claude API key appears to be invalid. Check your key in Account settings.'
        : 'AI calibration is unavailable right now. Setting level manually.'
      setAiError(msg)
      setStep(2)
    },
  })

  const createMutation = useMutation({
    mutationFn: () => createSkill({
      name: draft.name,
      description: draft.description,
      preset_id: draft.presetId ?? undefined,
      starting_level: draft.startingLevel,
      gate_descriptions: draft.gateDescriptions.length > 0 ? draft.gateDescriptions : undefined,
    }),
    onSuccess: (skill) => router.push(`/skills/${skill.id}`),
  })

  return (
    <div className="max-w-lg mx-auto p-4 md:p-8 min-h-screen">
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {([1, 2, 3] as Step[]).map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
              style={step >= s
                ? { background: 'var(--color-accent)', color: '#fff' }
                : { background: 'var(--color-bg-elevated)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }
              }
            >
              {s}
            </div>
            {s < 3 && (
              <div
                className="flex-1 h-px w-12"
                style={{ background: step > s ? 'var(--color-accent)' : 'var(--color-border)' }}
              />
            )}
          </div>
        ))}
        <span className="ml-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>Step {step} of 3</span>
      </div>

      {/* ── Step 1: Choose skill ── */}
      {step === 1 && (
        <div className="space-y-4">
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)' }}
          >
            New Skill
          </h1>

          {/* Selected preset chip */}
          {draft.presetId && (
            <div
              className="flex items-center gap-2 rounded-xl border-2 px-4 py-2"
              style={{ borderColor: 'var(--color-accent)', background: 'var(--color-accent-muted)' }}
            >
              <span className="text-sm font-medium flex-1" style={{ color: 'var(--color-accent)' }}>
                Preset: {draft.presetName}
              </span>
              <button
                onClick={clearPreset}
                className="text-xs hover:underline"
                style={{ color: 'var(--color-accent)' }}
              >
                Change
              </button>
            </div>
          )}

          {/* Browse presets toggle */}
          {!draft.presetId && (
            <button
              type="button"
              onClick={() => setShowPresets(v => !v)}
              className="w-full py-3 rounded-xl border border-dashed text-sm transition-colors"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
            >
              {showPresets ? '▴ Hide presets' : '▾ Browse presets — start from a template'}
            </button>
          )}

          {/* Preset browser */}
          {showPresets && !draft.presetId && (
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
              <div className="p-3" style={{ borderBottom: '1px solid var(--color-border)' }}>
                <input
                  type="search"
                  placeholder="Search presets…"
                  value={presetSearch}
                  onChange={e => setPresetSearch(e.target.value)}
                  className="w-full text-sm rounded-lg px-3 py-2"
                  style={{
                    background: 'var(--color-bg-surface)',
                    color: 'var(--color-text-primary)',
                    border: '1px solid var(--color-border)',
                  }}
                />
              </div>
              <div className="max-h-72 overflow-y-auto">
                {presetsByCategory.length === 0 ? (
                  <p className="text-sm text-center py-6" style={{ color: 'var(--color-text-muted)' }}>No presets match your search</p>
                ) : (
                  presetsByCategory.map(cat => (
                    <div key={cat.name}>
                      <div
                        className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider sticky top-0"
                        style={{ background: 'var(--color-bg-surface)', color: 'var(--color-text-muted)' }}
                      >
                        {CATEGORY_EMOJI[cat.slug] ?? '•'} {cat.name}
                      </div>
                      {cat.presets.map(preset => (
                        <button
                          key={preset.id}
                          onClick={() => selectPreset(preset)}
                          className="w-full text-left px-4 py-3 transition-colors"
                          style={{ borderTop: '1px solid var(--color-border)' }}
                        >
                          <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{preset.name}</p>
                          <p className="text-xs mt-0.5 line-clamp-1" style={{ color: 'var(--color-text-muted)' }}>{preset.description}</p>
                        </button>
                      ))}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Name + description */}
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Skill name (required)"
              value={draft.name}
              maxLength={60}
              onChange={(e) => setDraft(d => ({ ...d, name: e.target.value }))}
              className="w-full rounded-xl px-4 py-3"
              style={{
                background: 'var(--color-bg-elevated)',
                color: 'var(--color-text-primary)',
                border: '1px solid var(--color-border)',
              }}
            />
            <textarea
              placeholder="Description (optional — helps AI calibrate your starting level)"
              value={draft.description}
              maxLength={400}
              rows={3}
              onChange={(e) => setDraft(d => ({ ...d, description: e.target.value }))}
              className="w-full rounded-xl px-4 py-3 resize-none"
              style={{
                background: 'var(--color-bg-elevated)',
                color: 'var(--color-text-primary)',
                border: '1px solid var(--color-border)',
              }}
            />
          </div>

          {/* AI calibration */}
          {hasKey && (
            <div className="rounded-xl p-4 space-y-3" style={{ background: 'var(--color-accent-muted)', border: '1px solid var(--color-border)' }}>
              <p className="text-sm font-medium" style={{ color: 'var(--color-accent)' }}>
                Want AI to help set your starting level?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => calibrateMutation.mutate()}
                  disabled={!draft.name || calibrateMutation.isPending}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
                  style={{ background: 'var(--color-accent)', color: '#fff' }}
                >
                  {calibrateMutation.isPending ? 'Calibrating…' : 'Yes, use AI'}
                </button>
                <button
                  onClick={() => setStep(2)}
                  disabled={!draft.name}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold border disabled:opacity-50"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
                >
                  Set manually
                </button>
              </div>
            </div>
          )}

          {!hasKey && (
            <button
              onClick={() => setStep(2)}
              disabled={!draft.name}
              className="w-full py-4 rounded-xl font-semibold disabled:opacity-50 min-h-[48px]"
              style={{ background: 'var(--color-accent)', color: '#fff' }}
            >
              Next
            </button>
          )}
        </div>
      )}

      {/* ── Step 2: Starting Level ── */}
      {step === 2 && (
        <div className="space-y-4">
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)' }}
          >
            Starting Level
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Where are you starting? Be honest — this is for you, not a leaderboard.
          </p>

          {aiError && (
            <div className="rounded-xl p-4 text-sm" style={{ background: 'rgba(251,191,36,0.1)', color: 'var(--color-warning)', border: '1px solid rgba(251,191,36,0.3)' }}>
              {aiError}
            </div>
          )}

          {draft.aiRationale && (
            <div className="rounded-xl p-4 text-sm" style={{ background: 'var(--color-accent-muted)', border: '1px solid var(--color-border)' }}>
              <p className="font-medium mb-1" style={{ color: 'var(--color-accent)' }}>AI suggestion: Level {draft.startingLevel}</p>
              <p style={{ color: 'var(--color-text-secondary)' }}>{draft.aiRationale}</p>
            </div>
          )}

          {/* Level picker: scrollable list 1–50 */}
          <div className="rounded-xl overflow-y-auto max-h-64" style={{ border: '1px solid var(--color-border)' }}>
            {Array.from({ length: 50 }, (_, i) => i + 1).map((level) => {
              const tierBoundaries: Record<number, string> = {
                10: 'Apprentice tier starts here', 20: 'Adept tier starts here',
                30: 'Journeyman tier starts here', 40: 'Practitioner tier starts here',
              }
              const boundary = tierBoundaries[level]
              const selected = draft.startingLevel === level
              return (
                <div key={level}>
                  {boundary && (
                    <div
                      className="text-[10px] text-center py-1"
                      style={{
                        background: 'var(--color-bg-surface)',
                        color: 'var(--color-text-muted)',
                        borderTop: '1px solid var(--color-border)',
                      }}
                    >
                      — {boundary} —
                    </div>
                  )}
                  <button
                    onClick={() => setDraft(d => ({ ...d, startingLevel: level }))}
                    className="w-full text-left px-4 py-3 text-sm flex justify-between items-center transition-colors min-h-[44px]"
                    style={{
                      background: selected ? 'var(--color-accent-muted)' : undefined,
                      color: selected ? 'var(--color-accent)' : 'var(--color-text-primary)',
                      fontWeight: selected ? 600 : undefined,
                    }}
                  >
                    <span>Level {level}</span>
                    {selected && <span>✓</span>}
                  </button>
                </div>
              )
            })}
          </div>

          {draft.startingLevel > 9 && (() => {
            const gateBoundaries = [9, 19, 29, 39, 49, 59, 69, 79, 89, 99]
            const hit = gateBoundaries.filter(g => draft.startingLevel >= g)
            const requiredGate = hit.length > 0 ? hit[hit.length - 1] : null
            if (!requiredGate) return null
            return (
              <div className="rounded-xl bg-amber-50 dark:bg-amber-950/20 p-4 text-sm text-amber-700 dark:text-amber-300">
                <p className="font-medium mb-1">One gate challenge required</p>
                <p>
                  Starting at level {draft.startingLevel} means you&apos;ll need to submit one gate assessment
                  (Level {requiredGate} — the tier boundary you&apos;re sitting above). Lower gates are
                  auto-cleared. Your XP always keeps accruing.
                </p>
              </div>
            )
          })()}

          <div className="flex gap-2">
            <button
              onClick={() => setStep(1)}
              className="flex-1 py-3 rounded-xl border text-sm"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
            >
              Back
            </button>
            <button
              onClick={() => setStep(3)}
              className="flex-1 py-3 rounded-xl font-semibold"
              style={{ background: 'var(--color-accent)', color: '#fff' }}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Confirm ── */}
      {step === 3 && (
        <div className="space-y-4">
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)' }}
          >
            Confirm
          </h1>
          <div className="rounded-xl p-4 space-y-2" style={{ border: '1px solid var(--color-border)', background: 'var(--color-bg-elevated)' }}>
            {draft.presetId && (
              <div>
                <span className="text-xs uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Preset</span>
                <p className="text-sm font-medium" style={{ color: 'var(--color-accent)' }}>{draft.presetName}</p>
              </div>
            )}
            <div>
              <span className="text-xs uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Skill</span>
              <p className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{draft.name}</p>
            </div>
            {draft.description && (
              <div>
                <span className="text-xs uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Description</span>
                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{draft.description}</p>
              </div>
            )}
            <div>
              <span className="text-xs uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Starting Level</span>
              <p className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>Level {draft.startingLevel}</p>
            </div>
          </div>

          <details className="rounded-xl" style={{ border: '1px solid var(--color-border)' }}>
            <summary className="px-4 py-3 text-sm font-medium cursor-pointer" style={{ color: 'var(--color-text-secondary)' }}>What are Blocker Gates?</summary>
            <div className="px-4 pb-4 space-y-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              <p>Gates pause your level display at tier boundaries (levels 9, 19, 29…). Your XP keeps accruing. Complete the gate challenge to unlock the next tier.</p>
              {GATE_LEVELS.slice(0, 3).map((gl, i) => (
                <div key={gl} className="pt-2" style={{ borderTop: '1px solid var(--color-border)' }}>
                  <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>Gate at Level {gl}:</span>{' '}
                  {draft.gateDescriptions[i] || `Default gate — ${gl === 9 ? 'Novice' : gl === 19 ? 'Apprentice' : 'Adept'} completion challenge`}
                </div>
              ))}
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>…plus gates at levels 39, 49, 59, 69, 79, 89, and 99</p>
            </div>
          </details>

          <div className="flex gap-2">
            <button
              onClick={() => setStep(2)}
              className="flex-1 py-3 rounded-xl border text-sm"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
            >
              Back
            </button>
            <button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending}
              className="flex-1 py-3 rounded-xl font-semibold disabled:opacity-50"
              style={{ background: 'var(--color-accent)', color: '#fff' }}
            >
              {createMutation.isPending ? 'Creating…' : 'Create Skill'}
            </button>
          </div>
          {createMutation.isError && (
            <p className="text-sm text-center" style={{ color: 'var(--color-error)' }}>Failed to create skill. Please try again.</p>
          )}
        </div>
      )}
    </div>
  )
}
