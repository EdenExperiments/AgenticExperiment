'use client'

import { TIERS, getTierForLevel, tierColor, TIER_COLOR_CSS } from './tierConstants'
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
      {/* Inject tier colour tokens */}
      <style>{TIER_COLOR_CSS}</style>

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
  const color = tierColor(tier)
  const levelRange = tier.maxLevel === 200
    ? `L${tier.minLevel}+`
    : `L${tier.minLevel}–${tier.maxLevel}`

  return (
    <div
      className="flex items-center gap-3 rounded-lg px-3 py-1.5 transition-colors"
      style={{
        backgroundColor: isActive ? `color-mix(in srgb, ${color} 10%, transparent)` : undefined,
        border: isActive ? `1px solid color-mix(in srgb, ${color} 25%, transparent)` : '1px solid transparent',
      }}
    >
      {/* Tier dot */}
      <div
        className="w-2.5 h-2.5 rounded-full shrink-0"
        style={{ backgroundColor: color }}
      />

      {/* Tier name */}
      <span
        className="text-sm font-medium flex-1"
        style={{
          color: isActive ? color : 'var(--color-text)',
          fontFamily: 'var(--font-body, Inter, system-ui, sans-serif)',
        }}
      >
        {tier.name}
      </span>

      {/* Level range */}
      <span
        className="text-xs tabular-nums"
        style={{ color: isActive ? color : 'var(--color-muted)' }}
      >
        {levelRange}
      </span>

      {/* Gate marker */}
      {tier.gateLevel != null && (
        <span
          className="text-[10px] px-1.5 py-0.5 rounded"
          style={{
            backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`,
            color: color,
          }}
        >
          Gate L{tier.gateLevel}
        </span>
      )}

      {/* Active level indicator */}
      {isActive && highlightLevel != null && (
        <span
          className="text-xs font-bold"
          style={{ color: color }}
        >
          ← L{highlightLevel}
        </span>
      )}
    </div>
  )
}
