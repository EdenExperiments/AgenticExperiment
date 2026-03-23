'use client'

import { TIERS, getTierForLevel } from './tierConstants'
import type { Tier } from './tierConstants'

export interface ProgressionPreviewProps {
  highlightLevel?: number
}

export function ProgressionPreview({ highlightLevel }: ProgressionPreviewProps) {
  const activeTier = highlightLevel != null ? getTierForLevel(highlightLevel) : null

  return (
    <div
      className="rounded-xl p-4 space-y-3"
      style={{
        backgroundColor: 'var(--color-bg-elevated, var(--color-surface))',
        border: '1px solid var(--color-border)',
      }}
    >
      <h3
        className="text-xs font-semibold uppercase tracking-wider"
        style={{
          color: 'var(--color-muted)',
          fontFamily: 'var(--font-body, Inter, system-ui, sans-serif)',
        }}
      >
        Progression Timeline
      </h3>
      <div className="space-y-1">
        {TIERS.map((tier) => (
          <TierRow
            key={tier.number}
            tier={tier}
            isActive={activeTier?.number === tier.number}
            highlightLevel={activeTier?.number === tier.number ? highlightLevel : undefined}
          />
        ))}
      </div>
    </div>
  )
}

function TierRow({
  tier,
  isActive,
  highlightLevel,
}: {
  tier: Tier
  isActive: boolean
  highlightLevel?: number
}) {
  const levelRange = tier.maxLevel === 200
    ? `L${tier.minLevel}+`
    : `L${tier.minLevel}–${tier.maxLevel}`

  return (
    <div
      className="flex items-center gap-3 rounded-lg px-3 py-1.5 transition-colors"
      style={{
        backgroundColor: isActive ? `${tier.color}15` : undefined,
        border: isActive ? `1px solid ${tier.color}40` : '1px solid transparent',
      }}
    >
      {/* Tier dot */}
      <div
        className="w-2.5 h-2.5 rounded-full shrink-0"
        style={{ backgroundColor: tier.color }}
      />

      {/* Tier name */}
      <span
        className="text-sm font-medium flex-1"
        style={{
          color: isActive ? tier.color : 'var(--color-text)',
          fontFamily: 'var(--font-body, Inter, system-ui, sans-serif)',
        }}
      >
        {tier.name}
      </span>

      {/* Level range */}
      <span
        className="text-xs tabular-nums"
        style={{ color: isActive ? tier.color : 'var(--color-muted)' }}
      >
        {levelRange}
      </span>

      {/* Gate marker */}
      {tier.gateLevel != null && (
        <span
          className="text-[10px] px-1.5 py-0.5 rounded"
          style={{
            backgroundColor: `${tier.color}20`,
            color: tier.color,
          }}
        >
          Gate L{tier.gateLevel}
        </span>
      )}

      {/* Active level indicator */}
      {isActive && highlightLevel != null && (
        <span
          className="text-xs font-bold"
          style={{ color: tier.color }}
        >
          ← L{highlightLevel}
        </span>
      )}
    </div>
  )
}
