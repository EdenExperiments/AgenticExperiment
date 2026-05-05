'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation } from '@tanstack/react-query'
import { createSkill, calibrateSkill, getAPIKeyStatus, getPresets, listCategories, listSkills } from '@rpgtracker/api-client'
import {
  PathSelector,
  ArbiterAvatar,
  ArbiterDialogue,
  getTierForLevel,
  tierColor,
  TIER_COLOR_CSS,
} from '@rpgtracker/ui'
import { PresetPicker } from '../../../../components/PresetPicker'

type Path = 'preset' | 'custom' | null
type Step = 1 | 2

interface SkillDraft {
  name: string
  description: string
  presetId: string | null
  presetName: string | null
  categoryId: string | null
  startingLevel: number
  gateDescriptions: string[]
}

function useTheme() {
  const [theme, setTheme] = useState('minimal')
  useEffect(() => {
    const el = document.documentElement
    const update = () => setTheme(el.getAttribute('data-theme') ?? 'minimal')
    update()
    const obs = new MutationObserver(update)
    obs.observe(el, { attributes: true, attributeFilter: ['data-theme'] })
    return () => obs.disconnect()
  }, [])
  return theme
}

const INITIAL_DRAFT: SkillDraft = {
  name: '',
  description: '',
  presetId: null,
  presetName: null,
  categoryId: null,
  startingLevel: 1,
  gateDescriptions: [],
}

export default function SkillCreatePage() {
  const router = useRouter()
  const theme = useTheme()
  const [path, setPath] = useState<Path>(null)
  const [step, setStep] = useState<Step>(1)
  const [draft, setDraft] = useState<SkillDraft>({ ...INITIAL_DRAFT })
  const [acceptedArbiterLevel, setAcceptedArbiterLevel] = useState<number | null>(null)
  const [experience, setExperience] = useState('')

  const { data: keyStatus } = useQuery({ queryKey: ['api-key-status'], queryFn: getAPIKeyStatus })
  const hasKey = keyStatus?.has_key ?? false

  const { data: presets = [], isLoading: presetsLoading, isError: presetsError } = useQuery({
    queryKey: ['presets'],
    queryFn: () => getPresets({}),
    staleTime: Infinity,
  })

  const { data: existingSkills = [] } = useQuery({
    queryKey: ['skills'],
    queryFn: listSkills,
    staleTime: 30_000,
  })

  // Filter out presets the user already has as skills
  const availablePresets = presets.filter(
    p => !existingSkills.some(s => s.preset_id === p.id)
  )

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: listCategories,
    staleTime: Infinity,
  })

  const calibrateMutation = useMutation({
    mutationFn: () => calibrateSkill({ name: draft.name, description: draft.description, experience }),
    onSuccess: (result) => {
      // ACV-24: Arbiter's suggestion is pre-selected by default
      setAcceptedArbiterLevel(result.suggested_level)
    },
  })

  const createMutation = useMutation({
    mutationFn: () => createSkill({
      name: draft.name,
      description: draft.description,
      preset_id: draft.presetId ?? undefined,
      category_id: draft.categoryId ?? undefined,
      starting_level: getFinalLevel(),
      gate_descriptions: draft.gateDescriptions.length > 0 ? draft.gateDescriptions : undefined,
    }),
    onSuccess: (skill) => router.push(`/skills/${skill.id}`),
  })

  // Reset everything when navigating back to path selector (P6-D11)
  const resetToPathSelector = useCallback(() => {
    setPath(null)
    setStep(1)
    setDraft({ ...INITIAL_DRAFT })
    setAcceptedArbiterLevel(null)
    setExperience('')
    calibrateMutation.reset()
  }, [calibrateMutation])

  function getFinalLevel(): number {
    if (acceptedArbiterLevel != null) return acceptedArbiterLevel
    return draft.startingLevel
  }

  // Arbiter greeting text per theme
  function getArbiterGreeting(): string {
    switch (theme) {
      case 'retro': return 'Tell me of your experience with this art...'
      case 'modern': return 'Initiating proficiency scan...'
      default: return "Let's assess your starting point."
    }
  }

  function getArbiterResult(level: number, rationale: string): string {
    switch (theme) {
      case 'retro': {
        const tier = getTierForLevel(level)
        return `I sense you are of the ${tier.name} order... Level ${level} befits your experience. ${rationale}`
      }
      case 'modern':
        return `Scan complete. Proficiency level: ${level}. Analysis: ${rationale}`
      default:
        return `Based on your description, I'd suggest Level ${level}. ${rationale}`
    }
  }

  function getArbiterError(): string {
    switch (theme) {
      case 'retro': return 'The spirits are silent today... Proceed with your own judgement, adventurer.'
      case 'modern': return 'Scan interrupted — external service offline. Manual configuration active.'
      default: return 'Calibration unavailable. You can create your skill with your selected level.'
    }
  }

  // ── Path Selector ──
  if (path === null) {
    return (
      <PathSelector
        onSelectPreset={() => setPath('preset')}
        onSelectCustom={() => setPath('custom')}
        backHref="/skills"
      />
    )
  }

  // ── Step Flow (step indicator visible from here) ──
  return (
    <div className="max-w-xl mx-auto p-4 md:p-8 min-h-screen">
      {/* Inject tier colour tokens (D-020) */}
      <style>{TIER_COLOR_CSS}</style>
      {/* Step indicator — ACV-6, ACV-22 */}
      <StepIndicator currentStep={step} />

      {/* ── Step 1: Identity ── */}
      {step === 1 && (
        <div className="space-y-4">
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
          >
            {path === 'preset' ? 'Choose a Preset' : 'Define Your Skill'}
          </h1>

          {path === 'preset' ? (
            <>
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
                    type="button"
                    onClick={() => setDraft(d => ({ ...d, presetId: null, presetName: null, categoryId: null, name: '', description: '' }))}
                    className="text-xs hover:underline"
                    style={{ color: 'var(--color-accent)' }}
                  >
                    Change
                  </button>
                </div>
              )}

              {/* Category-grid preset picker */}
              {!draft.presetId && (
                <PresetPicker
                  presets={availablePresets}
                  isLoading={presetsLoading}
                  isError={presetsError}
                  onSelectPreset={(preset) => {
                    setDraft(d => ({
                      ...d,
                      presetId: preset.id,
                      presetName: preset.name,
                      categoryId: preset.category_id,
                      name: preset.name,
                      description: preset.description,
                    }))
                  }}
                  onStartFromScratch={() => {
                    setDraft({ ...INITIAL_DRAFT })
                    setPath('custom')
                  }}
                />
              )}

              {/* Editable name/description after preset selected */}
              {draft.presetId && (
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Skill name (required)"
                    value={draft.name}
                    maxLength={60}
                    onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
                    className="w-full rounded-xl px-4 py-3"
                    style={{
                      background: 'var(--color-surface)',
                      color: 'var(--color-text)',
                      border: '1px solid var(--color-border)',
                    }}
                  />
                  <textarea
                    placeholder="Description (optional)"
                    value={draft.description}
                    maxLength={400}
                    rows={3}
                    onChange={e => setDraft(d => ({ ...d, description: e.target.value }))}
                    className="w-full rounded-xl px-4 py-3 resize-none"
                    style={{
                      background: 'var(--color-surface)',
                      color: 'var(--color-text)',
                      border: '1px solid var(--color-border)',
                    }}
                  />
                </div>
              )}
            </>
          ) : (
            /* Custom path */
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Skill name (required)"
                value={draft.name}
                maxLength={60}
                onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
                className="w-full rounded-xl px-4 py-3"
                style={{
                  background: 'var(--color-surface)',
                  color: 'var(--color-text)',
                  border: '1px solid var(--color-border)',
                }}
              />
              <textarea
                placeholder="Description (optional — helps AI calibrate your starting level)"
                value={draft.description}
                maxLength={400}
                rows={3}
                onChange={e => setDraft(d => ({ ...d, description: e.target.value }))}
                className="w-full rounded-xl px-4 py-3 resize-none"
                style={{
                  background: 'var(--color-surface)',
                  color: 'var(--color-text)',
                  border: '1px solid var(--color-border)',
                }}
              />

              {/* Category picker (custom path only — ACV-17) */}
              {categories.length > 0 && (
                <div className="space-y-2">
                  <label
                    className="text-xs font-medium uppercase tracking-wider"
                    style={{ color: 'var(--color-muted)', fontFamily: 'var(--font-body)' }}
                  >
                    Category (optional)
                  </label>
                  <div className="flex flex-wrap gap-2" role="group" aria-label="Category selection">
                    <button
                      onClick={() => setDraft(d => ({ ...d, categoryId: null }))}
                      aria-pressed={draft.categoryId === null}
                      className={`chip px-3 py-1.5 text-xs${draft.categoryId === null ? ' chip-active' : ''}`}
                    >
                      None
                    </button>
                    {categories.map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => setDraft(d => ({ ...d, categoryId: cat.id }))}
                        aria-pressed={draft.categoryId === cat.id}
                        className={`chip px-3 py-1.5 text-xs${draft.categoryId === cat.id ? ' chip-active' : ''}`}
                      >
                        {cat.emoji} {cat.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Navigation */}
          <div className="flex gap-2">
            <button
              onClick={resetToPathSelector}
              className="btn btn-ghost flex-1 py-3 text-sm"
            >
              Back
            </button>
            <button
              onClick={() => setStep(2)}
              disabled={!draft.name.trim()}
              className="btn btn-primary flex-1 py-3 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* ── Step 2: Starting Level ── */}
      {step === 2 && (
        <div className="space-y-4">
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
          >
            Starting Level
          </h1>

          {hasKey ? (
            /* With API key — Arbiter-first flow */
            <ArbiterStep
              theme={theme}
              draft={draft}
              experience={experience}
              setExperience={setExperience}
              calibrateMutation={calibrateMutation}
              acceptedArbiterLevel={acceptedArbiterLevel}
              setAcceptedArbiterLevel={setAcceptedArbiterLevel}
              getArbiterGreeting={getArbiterGreeting}
              getArbiterResult={getArbiterResult}
              getArbiterError={getArbiterError}
              getFinalLevel={getFinalLevel}
              createMutation={createMutation}
              levelPicker={
                <LevelPicker
                  value={draft.startingLevel}
                  onChange={level => setDraft(d => ({ ...d, startingLevel: level }))}
                />
              }
            />
          ) : (
            /* Without API key — manual level picker */
            <div className="space-y-4">
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                Where are you starting? Be honest — this is for you, not a leaderboard.
              </p>

              <LevelPicker
                value={draft.startingLevel}
                onChange={level => setDraft(d => ({ ...d, startingLevel: level }))}
              />

              {/* Gate info banner */}
              {draft.startingLevel > 9 && (
                <div
                  className="rounded-xl p-4 text-sm"
                  style={{ backgroundColor: 'var(--color-accent-muted, color-mix(in srgb, var(--color-accent) 10%, transparent))', color: 'var(--color-text-secondary)' }}
                >
                  <p className="font-medium mb-1">One gate challenge required</p>
                  <p>
                    Starting at level {draft.startingLevel} means you&apos;ll need to submit one gate
                    assessment. Lower gates are auto-cleared. Your XP always keeps accruing.
                  </p>
                </div>
              )}

              {/* Arbiter upsell */}
              <div
                className="rounded-xl p-4 text-sm"
                style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
              >
                <p style={{ color: 'var(--color-muted)' }}>
                  Add a Claude API key to unlock The Arbiter — AI-powered level calibration.{' '}
                  <a
                    href="/account/api-key"
                    className="font-medium hover:underline"
                    style={{ color: 'var(--color-accent)' }}
                  >
                    Add API key
                  </a>
                </p>
              </div>

              <SkillSummary name={draft.name} level={draft.startingLevel} categoryId={draft.categoryId} categories={categories} />

              <button
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending}
                className="btn btn-primary w-full py-3 disabled:opacity-50"
              >
                {createMutation.isPending ? 'Creating…' : 'Create Skill'}
              </button>
            </div>
          )}

          {/* Create error */}
          {createMutation.isError && (
            <p className="text-sm text-center" style={{ color: 'var(--color-error)' }}>
              Failed to create skill. Please try again.
            </p>
          )}

          {/* Back button */}
          <button
            onClick={() => setStep(1)}
            className="btn btn-ghost w-full py-3 text-sm"
          >
            Back
          </button>
        </div>
      )}
    </div>
  )
}

/** Step indicator with narrative labels — ACV-6 */
function StepIndicator({ currentStep }: { currentStep: Step }) {
  const STEP_LABELS: Record<number, string> = { 1: 'Identity', 2: 'Starting Level' }

  return (
    <div className="flex items-end gap-2 mb-8" role="list" aria-label="Steps">
      <span className="sr-only">Step {currentStep} of 2</span>
      {([1, 2] as Step[]).map(s => (
        <div
          key={s}
          role="listitem"
          aria-current={currentStep === s ? 'step' : undefined}
          className="flex-1 flex flex-col items-center gap-1.5"
        >
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
            style={currentStep >= s
              ? { background: 'var(--color-accent)', color: 'var(--color-text-on-accent, #fff)' }
              : { background: 'var(--color-bg-elevated)', color: 'var(--color-muted)', border: '1px solid var(--color-border)' }
            }
          >
            {currentStep > s ? '✓' : s}
          </div>
          <span
            className="text-[10px] text-center leading-tight"
            style={{
              fontFamily: 'var(--font-display, var(--font-body, Inter, system-ui, sans-serif))',
              color: currentStep === s ? 'var(--color-accent)' : 'var(--color-muted)',
              fontWeight: currentStep === s ? 600 : undefined,
            }}
          >
            {STEP_LABELS[s]}
          </span>
        </div>
      ))}
    </div>
  )
}

/** Level picker — stepper with tier boundary labels */
function LevelPicker({ value, onChange }: { value: number; onChange: (level: number) => void }) {
  const tier = getTierForLevel(value)

  return (
    <div
      className="rounded-xl p-4 space-y-3"
      style={{ border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)' }}
    >
      {/* Current value display */}
      <div className="text-center">
        <div
          className="text-4xl font-bold tabular-nums"
          style={{ color: 'var(--color-accent)', fontFamily: 'var(--font-display)' }}
        >
          {value}
        </div>
        <div className="text-xs mt-1" style={{ color: tierColor(tier) }}>
          {tier.name} tier
        </div>
      </div>

      {/* Stepper controls */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={() => onChange(Math.max(1, value - 10))}
          disabled={value <= 1}
          className="w-10 h-10 rounded-lg text-sm font-bold disabled:opacity-30"
          style={{
            backgroundColor: 'var(--color-bg-elevated)',
            color: 'var(--color-text)',
            border: '1px solid var(--color-border)',
          }}
          aria-label="Decrease by 10"
        >
          −10
        </button>
        <button
          onClick={() => onChange(Math.max(1, value - 1))}
          disabled={value <= 1}
          className="w-10 h-10 rounded-lg text-lg font-bold disabled:opacity-30"
          style={{
            backgroundColor: 'var(--color-bg-elevated)',
            color: 'var(--color-text)',
            border: '1px solid var(--color-border)',
          }}
          aria-label="Decrease by 1"
        >
          −
        </button>

        {/* Range input for quick scrubbing */}
        <input
          type="range"
          min={1}
          max={50}
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="flex-1 accent-[var(--color-accent)]"
          aria-label="Starting level"
        />

        <button
          onClick={() => onChange(Math.min(50, value + 1))}
          disabled={value >= 50}
          className="w-10 h-10 rounded-lg text-lg font-bold disabled:opacity-30"
          style={{
            backgroundColor: 'var(--color-bg-elevated)',
            color: 'var(--color-text)',
            border: '1px solid var(--color-border)',
          }}
          aria-label="Increase by 1"
        >
          +
        </button>
        <button
          onClick={() => onChange(Math.min(50, value + 10))}
          disabled={value >= 50}
          className="w-10 h-10 rounded-lg text-sm font-bold disabled:opacity-30"
          style={{
            backgroundColor: 'var(--color-bg-elevated)',
            color: 'var(--color-text)',
            border: '1px solid var(--color-border)',
          }}
          aria-label="Increase by 10"
        >
          +10
        </button>
      </div>
    </div>
  )
}

/** Arbiter step — with API key */
function ArbiterStep({
  theme,
  draft,
  experience,
  setExperience,
  calibrateMutation,
  acceptedArbiterLevel,
  setAcceptedArbiterLevel,
  getArbiterGreeting,
  getArbiterResult,
  getArbiterError,
  getFinalLevel,
  createMutation,
  levelPicker,
}: {
  theme: string
  draft: SkillDraft
  experience: string
  setExperience: (v: string) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  calibrateMutation: any
  acceptedArbiterLevel: number | null
  setAcceptedArbiterLevel: (level: number | null) => void
  getArbiterGreeting: () => string
  getArbiterResult: (level: number, rationale: string) => string
  getArbiterError: () => string
  getFinalLevel: () => number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createMutation: any
  levelPicker: React.ReactNode
}) {
  const [showAdjust, setShowAdjust] = useState(false)
  const categories = useQuery({ queryKey: ['categories'], queryFn: listCategories, staleTime: Infinity }).data ?? []

  return (
    <div className="space-y-4">
      {/* Avatar + dialogue */}
      <div className="flex items-start gap-4">
        <ArbiterAvatar
          state={calibrateMutation.isPending ? 'thinking' : calibrateMutation.data ? 'speaking' : 'idle'}
          size="lg"
        />
        <div className="flex-1 space-y-3">
          <ArbiterDialogue
            text={
              calibrateMutation.isError
                ? getArbiterError()
                : calibrateMutation.data
                  ? getArbiterResult(calibrateMutation.data.suggested_level, calibrateMutation.data.rationale)
                  : getArbiterGreeting()
            }
            animate={!calibrateMutation.isPending}
            variant={
              calibrateMutation.isError ? 'error'
                : calibrateMutation.data ? 'result'
                : 'greeting'
            }
          />
        </div>
      </div>

      {/* Experience input + Consult button (before calibration) */}
      {!calibrateMutation.data && !calibrateMutation.isError && (
        <div className="space-y-3">
          <textarea
            placeholder="Describe your experience or knowledge level with this skill — e.g. 'I've been playing guitar for 3 years but mostly self-taught' or 'Complete beginner, never tried it'"
            value={experience}
            onChange={e => setExperience(e.target.value)}
            maxLength={500}
            rows={3}
            disabled={calibrateMutation.isPending}
            className="w-full text-sm rounded-xl px-4 py-3 resize-none"
            style={{
              background: 'var(--color-surface)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border)',
            }}
          />
          <button
            onClick={() => calibrateMutation.mutate()}
            disabled={calibrateMutation.isPending || !experience.trim()}
            aria-busy={calibrateMutation.isPending}
            className="btn btn-primary w-full py-3 disabled:opacity-50"
          >
            {calibrateMutation.isPending ? 'Consulting The Arbiter…' : 'Consult The Arbiter'}
          </button>
        </div>
      )}

      {/* After calibration: Accept / Adjust toggle */}
      {calibrateMutation.data && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <button
              onClick={() => {
                setAcceptedArbiterLevel(calibrateMutation.data.suggested_level)
                setShowAdjust(false)
              }}
              className={`chip flex-1 py-3 text-sm font-semibold${acceptedArbiterLevel != null && !showAdjust ? ' chip-active' : ''}`}
            >
              Accept (Level {calibrateMutation.data.suggested_level})
            </button>
            <button
              onClick={() => {
                setAcceptedArbiterLevel(null)
                setShowAdjust(true)
              }}
              className={`chip flex-1 py-3 text-sm${showAdjust ? ' chip-active' : ''}`}
            >
              Adjust manually
            </button>
          </div>

          {/* Level picker for manual adjustment */}
          {showAdjust && levelPicker}
        </div>
      )}

      {/* On error: show level picker as fallback */}
      {calibrateMutation.isError && (
        <div className="space-y-3">
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Set your starting level manually:
          </p>
          {levelPicker}
        </div>
      )}

      {/* Gate info banner */}
      {getFinalLevel() > 9 && (calibrateMutation.data || calibrateMutation.isError || showAdjust) && (
        <div
          className="rounded-xl p-4 text-sm"
          style={{ backgroundColor: 'var(--color-accent-muted, color-mix(in srgb, var(--color-accent) 10%, transparent))', color: 'var(--color-text-secondary)' }}
        >
          <p className="font-medium mb-1">One gate challenge required</p>
          <p>
            Starting at level {getFinalLevel()} means you&apos;ll need to submit one gate
            assessment. Lower gates are auto-cleared. Your XP always keeps accruing.
          </p>
        </div>
      )}

      {/* Summary + Create (shown after calibration or error) */}
      {(calibrateMutation.data || calibrateMutation.isError) && (
        <>
          <SkillSummary
            name={draft.name}
            level={getFinalLevel()}
            categoryId={draft.categoryId}
            categories={categories}
          />

          <button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending}
            className="btn btn-primary w-full py-3 disabled:opacity-50"
          >
            {createMutation.isPending ? 'Creating…' : 'Create Skill'}
          </button>
        </>
      )}
    </div>
  )
}

/** Brief summary panel showing skill name, level, category */
function SkillSummary({
  name,
  level,
  categoryId,
  categories,
}: {
  name: string
  level: number
  categoryId: string | null
  categories: Array<{ id: string; name: string; emoji: string }>
}) {
  const tier = getTierForLevel(level)
  const category = categories.find(c => c.id === categoryId)

  return (
    <div
      className="rounded-xl p-4 space-y-2"
      style={{ border: '1px solid var(--color-border)', background: 'var(--color-bg-elevated)' }}
    >
      <div>
        <span className="text-xs uppercase tracking-wider" style={{ color: 'var(--color-muted)' }}>Skill</span>
        <p className="font-semibold" style={{ color: 'var(--color-text)' }}>{name}</p>
      </div>
      <div>
        <span className="text-xs uppercase tracking-wider" style={{ color: 'var(--color-muted)' }}>Starting Level</span>
        <p className="font-semibold" style={{ color: 'var(--color-text)' }}>
          Level {level}{' '}
          <span className="text-xs font-normal" style={{ color: tierColor(tier) }}>({tier.name})</span>
        </p>
      </div>
      {category && (
        <div>
          <span className="text-xs uppercase tracking-wider" style={{ color: 'var(--color-muted)' }}>Category</span>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            {category.emoji} {category.name}
          </p>
        </div>
      )}
    </div>
  )
}
