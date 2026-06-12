'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { trackEvent } from '@/lib/analytics'
import type { AnalyticsEventPayloads } from '@/lib/analytics'

type PaywallGate = 'api_key' | 'subscription'
type PaywallSurface = AnalyticsEventPayloads['paywall_viewed']['surface']

const GATE_PRESETS: Record<
  PaywallGate,
  { title: string; description: string; ctaLabel: string; ctaHref: string; trigger: 'feature_gate' | 'upgrade_prompt' }
> = {
  api_key: {
    title: 'AI features require an API key',
    description: 'Set up your AI API key to unlock smart goal planning, forecasts, and coaching.',
    ctaLabel: 'Set up AI in Account',
    ctaHref: '/account/api-key',
    trigger: 'feature_gate',
  },
  subscription: {
    title: 'AI Goal Coach requires Pro',
    description: 'Upgrade to Pro to unlock AI goal planning — describe your goal in plain language and get an actionable plan.',
    ctaLabel: 'Upgrade to Pro',
    ctaHref: '/account#subscription',
    trigger: 'upgrade_prompt',
  },
}

export interface PaywallCTAProps {
  gate?: PaywallGate
  surface?: PaywallSurface
  title?: string
  description?: string
  ctaLabel?: string
  ctaHref?: string
  onCtaClick?: () => void
  variant?: 'inline' | 'page'
  testId?: string
}

export function PaywallCTA({
  gate = 'api_key',
  surface = 'ai_goal_coach',
  title,
  description,
  ctaLabel,
  ctaHref,
  onCtaClick,
  variant = 'inline',
  testId = 'paywall-cta',
}: PaywallCTAProps) {
  const preset = GATE_PRESETS[gate]
  const resolvedTitle = title ?? preset.title
  const resolvedDescription = description ?? preset.description
  const resolvedCtaLabel = ctaLabel ?? preset.ctaLabel
  const resolvedCtaHref = ctaHref ?? preset.ctaHref
  const isPage = variant === 'page'

  useEffect(() => {
    trackEvent('paywall_viewed', {
      surface,
      trigger: preset.trigger,
    })
  }, [surface, preset.trigger])

  const handleUpgradeClick = () => {
    trackEvent('upgrade_clicked', {
      surface,
      trigger: 'paywall',
    })
    onCtaClick?.()
  }

  return (
    <div
      data-testid={testId}
      role="region"
      aria-label="AI feature locked"
      className={isPage ? 'max-w-md mx-auto text-center py-16 px-4 space-y-6' : 'rounded-xl p-5 space-y-4'}
      style={{
        background: 'var(--color-bg-elevated)',
        border: '1px solid var(--color-border)',
      }}
    >
      <div
        className={`${isPage ? 'mx-auto ' : ''}w-12 h-12 rounded-full flex items-center justify-center shrink-0`}
        style={{
          background: 'var(--color-surface)',
          border: '2px solid var(--color-border-strong)',
        }}
        aria-hidden="true"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ color: 'var(--color-muted)' }}
        >
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      </div>

      <div className={`space-y-1.5 ${isPage ? '' : 'flex-1'}`}>
        <p
          className={`font-semibold ${isPage ? 'text-xl' : 'text-sm'}`}
          style={{ color: 'var(--color-text)', fontFamily: 'var(--font-display)' }}
        >
          {resolvedTitle}
        </p>
        <p
          className={isPage ? 'text-base' : 'text-sm'}
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {resolvedDescription}
        </p>
      </div>

      <div className={`flex flex-col gap-2 ${isPage ? 'items-center' : ''}`}>
        {onCtaClick ? (
          <button
            type="button"
            onClick={handleUpgradeClick}
            className="btn btn-primary px-6 py-3 text-sm min-h-[44px]"
            data-testid="paywall-upgrade-btn"
          >
            {resolvedCtaLabel}
          </button>
        ) : (
          <Link
            href={resolvedCtaHref}
            onClick={handleUpgradeClick}
            className="btn btn-primary px-6 py-3 text-sm min-h-[44px] inline-flex items-center justify-center"
            data-testid="paywall-upgrade-btn"
          >
            {resolvedCtaLabel}
          </Link>
        )}
        <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
          Manual goals are always free — no key required.
        </p>
      </div>
    </div>
  )
}
