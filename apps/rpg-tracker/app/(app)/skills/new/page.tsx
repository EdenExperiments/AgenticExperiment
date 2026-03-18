'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation } from '@tanstack/react-query'
import { createSkill, calibrateSkill, getAPIKeyStatus } from '@rpgtracker/api-client'

type Step = 1 | 2 | 3

interface SkillDraft {
  name: string
  description: string
  startingLevel: number
  gateDescriptions: string[]
  aiRationale: string | null
}

export default function SkillCreatePage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [draft, setDraft] = useState<SkillDraft>({
    name: '', description: '', startingLevel: 1, gateDescriptions: [], aiRationale: null,
  })
  const [aiError, setAiError] = useState<string | null>(null)

  const { data: keyStatus } = useQuery({ queryKey: ['api-key-status'], queryFn: getAPIKeyStatus })
  const hasKey = keyStatus?.has_key ?? false

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
        ? 'Your Claude API key appears to be invalid. Check your key in Account settings. Setting level manually.'
        : 'AI calibration is unavailable right now. Setting level manually.'
      setAiError(msg)
      setStep(2)
    },
  })

  const createMutation = useMutation({
    mutationFn: () => createSkill({
      name: draft.name,
      description: draft.description,
      starting_level: draft.startingLevel,
      gate_descriptions: draft.gateDescriptions.length > 0 ? draft.gateDescriptions : undefined,
    }),
    onSuccess: (skill) => router.push(`/skills/${skill.id}`),
  })

  // Gate levels for display in Step 3
  const gateLevels = [9, 19, 29, 39, 49]

  return (
    <div className="max-w-lg mx-auto p-4 md:p-8 min-h-screen">
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {([1, 2, 3] as Step[]).map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
              ${step >= s ? 'bg-[var(--color-accent,theme(colors.blue.600))] text-white' : 'bg-gray-200 text-gray-500'}`}>
              {s}
            </div>
            {s < 3 && <div className={`flex-1 h-px w-12 ${step > s ? 'bg-[var(--color-accent,theme(colors.blue.600))]' : 'bg-gray-200'}`} />}
          </div>
        ))}
        <span className="ml-2 text-sm text-gray-500">Step {step} of 3</span>
      </div>

      {/* Step 1: Basics */}
      {step === 1 && (
        <div className="space-y-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">New Skill</h1>
          <input
            type="text"
            placeholder="Skill name (required)"
            value={draft.name}
            maxLength={60}
            onChange={(e) => setDraft(d => ({ ...d, name: e.target.value }))}
            className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 dark:bg-gray-800"
          />
          <textarea
            placeholder="Description (optional — helps AI calibrate your starting level)"
            value={draft.description}
            maxLength={400}
            rows={3}
            onChange={(e) => setDraft(d => ({ ...d, description: e.target.value }))}
            className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 dark:bg-gray-800"
          />

          {hasKey && (
            <div className="rounded-xl bg-blue-50 dark:bg-blue-950/20 p-4 space-y-3">
              <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                Want AI to help set your starting level?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => calibrateMutation.mutate()}
                  disabled={!draft.name || calibrateMutation.isPending}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 disabled:opacity-50"
                >
                  {calibrateMutation.isPending ? 'Calibrating…' : 'Yes, use AI'}
                </button>
                <button
                  onClick={() => setStep(2)}
                  disabled={!draft.name}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-gray-300 text-gray-700 dark:text-gray-300 dark:border-gray-600 disabled:opacity-50"
                >
                  No, set manually
                </button>
              </div>
            </div>
          )}

          {!hasKey && (
            <button
              onClick={() => setStep(2)}
              disabled={!draft.name}
              className="w-full py-4 rounded-xl font-semibold text-white bg-[var(--color-accent,theme(colors.blue.600))] disabled:opacity-50 min-h-[48px]"
            >
              Next
            </button>
          )}
        </div>
      )}

      {/* Step 2: Starting Level */}
      {step === 2 && (
        <div className="space-y-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Starting Level</h1>
          <p className="text-gray-500">Where are you starting? Be honest — this is for you, not a leaderboard.</p>

          {aiError && (
            <div className="rounded-xl bg-amber-50 dark:bg-amber-950/20 p-4 text-sm text-amber-700 dark:text-amber-300">
              {aiError}
            </div>
          )}

          {draft.aiRationale && (
            <div className="rounded-xl bg-blue-50 dark:bg-blue-950/20 p-4 text-sm text-blue-800 dark:text-blue-200">
              <p className="font-medium mb-1">AI suggestion: Level {draft.startingLevel}</p>
              <p>{draft.aiRationale}</p>
            </div>
          )}

          {/* Level picker: scrollable list 1–50 (max starting level is 50) */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-y-auto max-h-64">
            {Array.from({ length: 50 }, (_, i) => i + 1).map((level) => {
              const tierBoundaries: Record<number, string> = {
                10: 'Apprentice tier starts here', 20: 'Adept tier starts here',
                30: 'Journeyman tier starts here', 40: 'Practitioner tier starts here',
              }
              const boundary = tierBoundaries[level]
              return (
                <div key={level}>
                  {boundary && (
                    <div className="text-[10px] text-gray-400 text-center py-1 bg-gray-50 dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700">
                      — {boundary} —
                    </div>
                  )}
                  <button
                    onClick={() => setDraft(d => ({ ...d, startingLevel: level }))}
                    className={`w-full text-left px-4 py-3 text-sm flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors min-h-[44px]
                      ${draft.startingLevel === level ? 'bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300 font-semibold' : ''}`}
                  >
                    <span>Level {level}</span>
                    {draft.startingLevel === level && <span>✓</span>}
                  </button>
                </div>
              )
            })}
          </div>

          <div className="flex gap-2">
            <button onClick={() => setStep(1)} className="flex-1 py-3 rounded-xl border border-gray-300 text-sm text-gray-700 dark:text-gray-300 dark:border-gray-600">
              Back
            </button>
            <button
              onClick={() => setStep(3)}
              className="flex-1 py-3 rounded-xl font-semibold text-white bg-[var(--color-accent,theme(colors.blue.600))]"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Confirm */}
      {step === 3 && (
        <div className="space-y-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Confirm</h1>
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-2">
            <div><span className="text-xs text-gray-500 uppercase">Skill</span><p className="font-semibold">{draft.name}</p></div>
            {draft.description && <div><span className="text-xs text-gray-500 uppercase">Description</span><p className="text-sm">{draft.description}</p></div>}
            <div><span className="text-xs text-gray-500 uppercase">Starting Level</span><p className="font-semibold">Level {draft.startingLevel}</p></div>
          </div>

          <details className="rounded-xl border border-gray-200 dark:border-gray-700">
            <summary className="px-4 py-3 text-sm font-medium cursor-pointer">What are Blocker Gates?</summary>
            <div className="px-4 pb-4 space-y-2 text-sm text-gray-500">
              <p>Gates pause your level display at tier boundaries (levels 9, 19, 29…). Your XP keeps accruing. Complete the gate challenge to unlock the next tier.</p>
              {gateLevels.slice(0, 3).map((gl, i) => (
                <div key={gl} className="border-t border-gray-100 dark:border-gray-800 pt-2">
                  <span className="font-medium">Gate at Level {gl}:</span>{' '}
                  {draft.gateDescriptions[i] || `Default gate — ${gl === 9 ? 'Novice' : gl === 19 ? 'Apprentice' : 'Adept'} completion challenge`}
                </div>
              ))}
              <p className="text-xs text-gray-400">…and 2 more gates at levels 39 and 49</p>
            </div>
          </details>

          <div className="flex gap-2">
            <button onClick={() => setStep(2)} className="flex-1 py-3 rounded-xl border border-gray-300 text-sm text-gray-700 dark:text-gray-300 dark:border-gray-600">
              Back
            </button>
            <button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending}
              className="flex-1 py-3 rounded-xl font-semibold text-white bg-[var(--color-accent,theme(colors.blue.600))] disabled:opacity-50"
            >
              {createMutation.isPending ? 'Creating…' : 'Create Skill'}
            </button>
          </div>
          {createMutation.isError && (
            <p className="text-sm text-red-500 text-center">Failed to create skill. Please try again.</p>
          )}
        </div>
      )}
    </div>
  )
}
