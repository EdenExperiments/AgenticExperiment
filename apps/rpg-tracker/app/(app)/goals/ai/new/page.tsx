'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { planGoal, createGoal, createMilestone } from '@rpgtracker/api-client'
import type { PlanGoalResponse, GoalPlanMilestone } from '@rpgtracker/api-client'
import { useAIEntitlement, isEntitlementError } from '../../../../../lib/useAIEntitlement'
import { PaywallCTA } from '../../../../../components/PaywallCTA'
import { trackEvent } from '@/lib/analytics'

type WizardStep = 'input' | 'preview' | 'accepting'

interface EditableMilestone extends GoalPlanMilestone {
  enabled: boolean
}

function fieldStyle(): React.CSSProperties {
  return {
    background: 'var(--color-surface)',
    color: 'var(--color-text)',
    border: '1px solid var(--color-border)',
  }
}

function DegradedBanner() {
  return (
    <div
      role="alert"
      className="rounded-xl px-4 py-3 text-sm flex items-start gap-2"
      style={{
        background: 'var(--color-bg-elevated)',
        border: '1px solid var(--color-border)',
        color: 'var(--color-text-secondary)',
      }}
    >
      <span aria-hidden="true" className="shrink-0 text-base">⚠️</span>
      <span>
        AI planning is running in <strong>basic mode</strong> — the plan is a simplified template.
        You can still edit milestones below before accepting.
      </span>
    </div>
  )
}

function AiErrorMessage({ error }: { error: Error }) {
  const msg = error.message ?? ''

  if (isEntitlementError(error) || msg.includes('402') || msg.toLowerCase().includes('no ai key') || msg.toLowerCase().includes('api key')) {
    return (
      <div role="alert" className="rounded-xl p-4 space-y-2" style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}>
        <p className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>AI key not configured</p>
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          Set up your AI API key in{' '}
          <Link href="/account" className="underline" style={{ color: 'var(--color-accent)' }}>
            Account settings
          </Link>{' '}
          to enable smart goal planning.
        </p>
        <Link href="/goals/new" className="btn btn-ghost text-sm px-3 py-2 inline-block mt-1">
          Create manually instead
        </Link>
      </div>
    )
  }

  if (msg.includes('429') || msg.toLowerCase().includes('rate limit')) {
    return (
      <div role="alert" className="rounded-xl p-4 space-y-2" style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}>
        <p className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>Rate limit reached</p>
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          Too many requests. Please wait a moment and try again.
        </p>
      </div>
    )
  }

  if (msg.includes('502') || msg.toLowerCase().includes('upstream')) {
    return (
      <div role="alert" className="rounded-xl p-4 space-y-2" style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}>
        <p className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>AI service unavailable</p>
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          The AI planning service is temporarily unavailable. Try again in a minute, or{' '}
          <Link href="/goals/new" className="underline" style={{ color: 'var(--color-accent)' }}>
            create a goal manually
          </Link>.
        </p>
      </div>
    )
  }

  if (msg.includes('422') || msg.toLowerCase().includes('empty')) {
    return (
      <div role="alert" className="text-sm" style={{ color: 'var(--color-error, #ef4444)' }}>
        Please describe your goal in a few words before generating a plan.
      </div>
    )
  }

  return (
    <div role="alert" className="text-sm" style={{ color: 'var(--color-error, #ef4444)' }}>
      Failed to generate a plan. Please try again.
    </div>
  )
}

function InputStep({
  statement,
  deadline,
  context,
  onStatementChange,
  onDeadlineChange,
  onContextChange,
  onGenerate,
  isPending,
  error,
}: {
  statement: string
  deadline: string
  context: string
  onStatementChange: (v: string) => void
  onDeadlineChange: (v: string) => void
  onContextChange: (v: string) => void
  onGenerate: () => void
  isPending: boolean
  error: Error | null
}) {
  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <label
          htmlFor="ai-goal-statement"
          className="text-xs font-medium uppercase tracking-wider block"
          style={{ color: 'var(--color-muted)' }}
        >
          What do you want to achieve? <span aria-hidden="true">*</span>
        </label>
        <textarea
          id="ai-goal-statement"
          value={statement}
          onChange={(e) => onStatementChange(e.target.value)}
          placeholder="e.g. Run a 5km race without stopping by the end of the year"
          maxLength={500}
          rows={3}
          required
          className="w-full rounded-xl px-4 py-3 text-sm resize-none"
          style={{ ...fieldStyle() }}
          aria-label="Goal statement"
        />
        <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
          Be as specific as possible — the more detail you give, the better the plan.
        </p>
      </div>

      <div className="space-y-1">
        <label
          htmlFor="ai-goal-deadline"
          className="text-xs font-medium uppercase tracking-wider block"
          style={{ color: 'var(--color-muted)' }}
        >
          Target date (optional)
        </label>
        <input
          id="ai-goal-deadline"
          type="date"
          value={deadline}
          onChange={(e) => onDeadlineChange(e.target.value)}
          className="w-full rounded-xl px-4 py-3 text-sm"
          style={{ ...fieldStyle(), minHeight: '44px' }}
          aria-label="Target date"
        />
      </div>

      <div className="space-y-1">
        <label
          htmlFor="ai-goal-context"
          className="text-xs font-medium uppercase tracking-wider block"
          style={{ color: 'var(--color-muted)' }}
        >
          Additional context (optional)
        </label>
        <textarea
          id="ai-goal-context"
          value={context}
          onChange={(e) => onContextChange(e.target.value)}
          placeholder="e.g. I'm currently sedentary, can walk 30 min without issue, want to run 3x/week"
          maxLength={500}
          rows={2}
          className="w-full rounded-xl px-4 py-3 text-sm resize-none"
          style={{ ...fieldStyle() }}
          aria-label="Additional context"
        />
      </div>

      {error && <AiErrorMessage error={error} />}

      <div className="flex gap-3 pt-1">
        <Link href="/goals/new" className="btn btn-ghost flex-1 py-3 text-sm text-center">
          Manual instead
        </Link>
        <button
          type="button"
          onClick={onGenerate}
          disabled={!statement.trim() || isPending}
          aria-busy={isPending}
          className="btn btn-primary flex-1 py-3 disabled:opacity-50"
        >
          {isPending ? 'Generating plan…' : 'Generate plan'}
        </button>
      </div>
    </div>
  )
}

function MilestoneEditor({
  milestones,
  onChange,
}: {
  milestones: EditableMilestone[]
  onChange: (updated: EditableMilestone[]) => void
}) {
  const toggle = (i: number) => {
    const next = milestones.map((m, idx) => (idx === i ? { ...m, enabled: !m.enabled } : m))
    onChange(next)
  }

  const updateTitle = (i: number, title: string) => {
    const next = milestones.map((m, idx) => (idx === i ? { ...m, title } : m))
    onChange(next)
  }

  return (
    <ul className="space-y-2" aria-label="Plan milestones">
      {milestones.map((m, i) => (
        <li
          key={i}
          className="flex items-start gap-3 rounded-xl px-3 py-2"
          style={{
            background: m.enabled ? 'var(--color-bg-elevated)' : 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            opacity: m.enabled ? 1 : 0.5,
          }}
        >
          <button
            type="button"
            onClick={() => toggle(i)}
            aria-label={m.enabled ? `Deselect milestone "${m.title}"` : `Select milestone "${m.title}"`}
            aria-pressed={m.enabled}
            className="mt-1 w-5 h-5 rounded shrink-0 border-2 flex items-center justify-center transition-colors"
            style={{
              borderColor: m.enabled ? 'var(--color-accent)' : 'var(--color-border-strong)',
              background: m.enabled ? 'var(--color-accent)' : 'transparent',
              color: m.enabled ? 'var(--color-text-on-accent, #fff)' : 'transparent',
            }}
          >
            {m.enabled && (
              <svg width="10" height="8" viewBox="0 0 10 8" fill="none" aria-hidden="true">
                <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
          <input
            type="text"
            value={m.title}
            onChange={(e) => updateTitle(i, e.target.value)}
            disabled={!m.enabled}
            className="flex-1 bg-transparent text-sm py-0.5 border-b focus:outline-none"
            style={{
              color: 'var(--color-text)',
              borderColor: 'transparent',
            }}
            aria-label={`Milestone ${i + 1} title`}
          />
          {m.due_date && (
            <span className="text-xs shrink-0 mt-1" style={{ color: 'var(--color-muted)' }}>
              {new Date(m.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </span>
          )}
        </li>
      ))}
    </ul>
  )
}

function PreviewStep({
  planResponse,
  milestones,
  onMilestonesChange,
  onAccept,
  onBack,
  isAccepting,
  acceptError,
}: {
  planResponse: PlanGoalResponse
  milestones: EditableMilestone[]
  onMilestonesChange: (m: EditableMilestone[]) => void
  onAccept: () => void
  onBack: () => void
  isAccepting: boolean
  acceptError: Error | null
}) {
  const { plan } = planResponse
  const enabledCount = milestones.filter((m) => m.enabled).length

  return (
    <div className="space-y-5">
      {planResponse.degraded_response && <DegradedBanner />}

      {/* Objective */}
      <div
        className="rounded-xl p-4 space-y-1"
        style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}
      >
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-muted)' }}>
          Objective
        </p>
        <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
          {plan.objective}
        </p>
      </div>

      {/* Milestones */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-muted)' }}>
          Milestones ({enabledCount} selected)
        </p>
        <MilestoneEditor milestones={milestones} onChange={onMilestonesChange} />
        <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
          Uncheck milestones you don&apos;t want. Edit titles inline.
        </p>
      </div>

      {/* Weekly cadence */}
      {plan.weekly_cadence.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-muted)' }}>
            Weekly cadence
          </p>
          <ul className="space-y-1">
            {plan.weekly_cadence.map((item, i) => (
              <li key={i} className="text-sm flex items-start gap-2" style={{ color: 'var(--color-text-secondary)' }}>
                <span aria-hidden="true" style={{ color: 'var(--color-accent)' }}>•</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Risks */}
      {plan.risks.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-muted)' }}>
            Risks to watch
          </p>
          <ul className="space-y-1">
            {plan.risks.map((risk, i) => (
              <li key={i} className="text-sm flex items-start gap-2" style={{ color: 'var(--color-text-secondary)' }}>
                <span aria-hidden="true">⚠</span>
                {risk}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Fallback */}
      {plan.fallback_plan && (
        <div
          className="rounded-xl p-3 text-sm"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
        >
          <span className="font-medium" style={{ color: 'var(--color-text)' }}>Fallback: </span>
          {plan.fallback_plan}
        </div>
      )}

      {acceptError && (
        <p className="text-sm" role="alert" style={{ color: 'var(--color-error, #ef4444)' }}>
          Failed to create goal. Please try again.
        </p>
      )}

      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={onBack}
          disabled={isAccepting}
          className="btn btn-ghost flex-1 py-3 text-sm"
        >
          ← Edit
        </button>
        <button
          type="button"
          onClick={onAccept}
          disabled={isAccepting || enabledCount === 0}
          aria-busy={isAccepting}
          className="btn btn-primary flex-1 py-3 disabled:opacity-50"
        >
          {isAccepting ? 'Creating goal…' : `Accept plan (${enabledCount} milestone${enabledCount !== 1 ? 's' : ''})`}
        </button>
      </div>
    </div>
  )
}

export default function AiGoalWizardPage() {
  const router = useRouter()
  const qc = useQueryClient()
  const { entitled, isLoading: entitlementLoading } = useAIEntitlement()

  const [step, setStep] = useState<WizardStep>('input')
  const [statement, setStatement] = useState('')
  const [deadline, setDeadline] = useState('')
  const [context, setContext] = useState('')
  const [planResponse, setPlanResponse] = useState<PlanGoalResponse | null>(null)
  const [milestones, setMilestones] = useState<EditableMilestone[]>([])

  const planMutation = useMutation({
    mutationFn: () =>
      planGoal({
        goal_statement: statement.trim(),
        deadline: deadline ? new Date(deadline).toISOString() : undefined,
        context: context.trim() || undefined,
      }),
    onSuccess: (data) => {
      setPlanResponse(data)
      setMilestones(data.plan.milestones.map((m) => ({ ...m, enabled: true })))
      setStep('preview')
      trackEvent('ai_plan_generated', {
        degraded_response: data.degraded_response,
        has_deadline: Boolean(deadline),
        has_context: Boolean(context.trim()),
        milestone_count: data.plan.milestones.length,
        weekly_cadence_count: data.plan.weekly_cadence.length,
        risk_count: data.plan.risks.length,
      })
    },
  })

  const acceptMutation = useMutation({
    mutationFn: async () => {
      if (!planResponse) throw new Error('no plan')
      const enabledMilestones = milestones.filter((m) => m.enabled && m.title.trim())
      const goal = await createGoal({
        title: planResponse.plan.objective,
        description: statement.trim(),
        target_date: deadline || undefined,
      })
      await Promise.all(
        enabledMilestones.map((m, i) =>
          createMilestone(goal.id, {
            title: m.title.trim(),
            description: m.description,
            position: i,
            due_date: m.due_date,
          })
        )
      )
      return goal
    },
    onSuccess: (goal) => {
      if (planResponse) {
        const enabledMilestones = milestones.filter((m) => m.enabled && m.title.trim())
        trackEvent('goal_created', {
          goal_id: goal.id,
          source: 'ai_plan',
          has_target_date: Boolean(deadline),
          has_linked_skill: false,
          has_value_tracking: false,
        })
        trackEvent('ai_plan_accepted', {
          goal_id: goal.id,
          degraded_response: planResponse.degraded_response,
          generated_milestone_count: planResponse.plan.milestones.length,
          selected_milestone_count: enabledMilestones.length,
          edited_milestone_count: milestones.filter((m, i) => {
            const original = planResponse.plan.milestones[i]
            return Boolean(m.enabled && m.title.trim() && original && m.title.trim() !== original.title.trim())
          }).length,
          has_deadline: Boolean(deadline),
        })
      }
      qc.invalidateQueries({ queryKey: ['goals'] })
      router.push(`/goals/${goal.id}`)
    },
  })

  if (!entitlementLoading && !entitled) {
    return (
      <div className="max-w-xl mx-auto p-4 md:p-8 space-y-6">
        <div className="flex items-center gap-3">
          <Link
            href="/goals"
            className="text-sm"
            style={{ color: 'var(--color-muted)' }}
            aria-label="Back to Goals"
          >
            ←
          </Link>
          <h1
            className="text-2xl font-bold"
            style={{
              fontFamily: 'var(--font-display, var(--font-body, Inter, system-ui, sans-serif))',
              color: 'var(--color-text)',
            }}
          >
            AI Goal Coach
          </h1>
        </div>
        <PaywallCTA
          variant="inline"
          title="AI Goal Coach requires an API key"
          description="Set up your AI API key to unlock smart goal planning — describe your goal in plain language and get an actionable plan."
          ctaLabel="Set up AI in Account"
          ctaHref="/account"
        />
        <div className="text-center">
          <Link
            href="/goals/new"
            className="text-sm underline"
            style={{ color: 'var(--color-muted)' }}
          >
            Create a goal manually instead
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/goals"
          className="text-sm"
          style={{ color: 'var(--color-muted)' }}
          aria-label="Back to Goals"
        >
          ←
        </Link>
        <div>
          <h1
            className="text-2xl font-bold"
            style={{
              fontFamily: 'var(--font-display, var(--font-body, Inter, system-ui, sans-serif))',
              color: 'var(--color-text)',
            }}
          >
            AI Goal Coach
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
            Describe your goal in plain language — AI will generate a plan.
          </p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-muted)' }} aria-label="Wizard steps">
        <span
          className="font-semibold"
          style={{ color: step === 'input' ? 'var(--color-accent)' : 'var(--color-muted)' }}
          aria-current={step === 'input' ? 'step' : undefined}
        >
          1. Describe
        </span>
        <span aria-hidden="true">→</span>
        <span
          className="font-semibold"
          style={{ color: step === 'preview' || step === 'accepting' ? 'var(--color-accent)' : 'var(--color-muted)' }}
          aria-current={step === 'preview' || step === 'accepting' ? 'step' : undefined}
        >
          2. Review plan
        </span>
        <span aria-hidden="true">→</span>
        <span style={{ color: 'var(--color-muted)' }}>3. Track</span>
      </div>

      {step === 'input' && (
        <InputStep
          statement={statement}
          deadline={deadline}
          context={context}
          onStatementChange={setStatement}
          onDeadlineChange={setDeadline}
          onContextChange={setContext}
          onGenerate={() => planMutation.mutate()}
          isPending={planMutation.isPending}
          error={planMutation.isError ? (planMutation.error as Error) : null}
        />
      )}

      {(step === 'preview' || step === 'accepting') && planResponse && (
        <PreviewStep
          planResponse={planResponse}
          milestones={milestones}
          onMilestonesChange={setMilestones}
          onAccept={() => acceptMutation.mutate()}
          onBack={() => setStep('input')}
          isAccepting={acceptMutation.isPending}
          acceptError={acceptMutation.isError ? (acceptMutation.error as Error) : null}
        />
      )}
    </div>
  )
}
