'use client'

import { useId, useState } from 'react'
import type { Preset } from '@rpgtracker/api-client'

const CATEGORY_EMOJI: Record<string, string> = {
  fitness: '\u{1F3C3}',
  music: '\u{1F3B5}',
  languages: '\u{1F30D}',
  cooking: '\u{1F373}',
  art: '\u{1F3A8}',
  tech: '\u{1F4BB}',
  writing: '\u{270D}\uFE0F',
  mindfulness: '\u{1F9D8}',
  social: '\u{1F91D}',
  crafts: '\u{1F9F5}',
  science: '\u{1F52C}',
  finance: '\u{1F4B0}',
  gaming: '\u{1F3AE}',
  reading: '\u{1F4DA}',
  outdoor: '\u{26FA}',
}

const DEFAULT_EMOJI = '\u{2B50}'

export interface PresetPickerProps {
  /** Presets available to pick from (e.g. already filtered for skills the user owns). */
  presets: Preset[]
  isLoading: boolean
  isError: boolean
  onSelectPreset: (preset: Preset) => void
  onStartFromScratch: () => void
}

interface CategoryGroup {
  slug: string
  name: string
  presets: Preset[]
}

function groupByCategory(presets: Preset[]): CategoryGroup[] {
  const map = new Map<string, CategoryGroup>()
  for (const p of presets) {
    const existing = map.get(p.category_slug)
    if (existing) {
      existing.presets.push(p)
    } else {
      map.set(p.category_slug, {
        slug: p.category_slug,
        name: p.category_name,
        presets: [p],
      })
    }
  }
  return Array.from(map.values())
}

export function PresetPicker({
  presets,
  isLoading,
  isError,
  onSelectPreset,
  onStartFromScratch,
}: PresetPickerProps) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)
  const panelId = useId()

  const categories = presets.length > 0 ? groupByCategory(presets) : []

  if (isLoading) {
    return (
      <div className="space-y-6">
        <button
          type="button"
          onClick={onStartFromScratch}
          className="w-full py-3 rounded-xl text-sm font-semibold border-2 min-h-[44px]"
          style={{
            borderColor: 'var(--color-accent, #6366f1)',
            color: 'var(--color-accent, #6366f1)',
            backgroundColor: 'transparent',
          }}
        >
          Start from scratch
        </button>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              data-testid="preset-skeleton"
              className="rounded-xl p-4 h-24 animate-pulse"
              style={{ backgroundColor: 'var(--color-bg-elevated, #1a1a2e)' }}
            />
          ))}
        </div>
      </div>
    )
  }

  if (isError || presets.length === 0) {
    return (
      <div className="space-y-4 text-center py-8">
        <p style={{ color: 'var(--color-text-muted, #6b7280)' }}>
          {isError ? 'Couldn\u2019t load templates' : 'No templates available'}
        </p>
        <button
          type="button"
          onClick={onStartFromScratch}
          className="px-6 py-3 rounded-xl text-sm font-semibold border-2 min-h-[44px]"
          style={{
            borderColor: 'var(--color-accent, #6366f1)',
            color: 'var(--color-accent, #6366f1)',
            backgroundColor: 'transparent',
          }}
        >
          Start from scratch
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={onStartFromScratch}
        className="w-full py-3 rounded-xl text-sm font-semibold border-2 min-h-[44px]"
        style={{
          borderColor: 'var(--color-accent, #6366f1)',
          color: 'var(--color-accent, #6366f1)',
          backgroundColor: 'transparent',
        }}
      >
        Start from scratch
      </button>

      <div className="space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {categories.map((cat) => {
            const emoji = CATEGORY_EMOJI[cat.slug] ?? DEFAULT_EMOJI
            const isExpanded = expandedCategory === cat.slug
            return (
              <button
                key={cat.slug}
                type="button"
                aria-expanded={isExpanded}
                aria-controls={isExpanded ? panelId : undefined}
                onClick={() =>
                  setExpandedCategory(isExpanded ? null : cat.slug)
                }
                className="rounded-xl p-4 flex flex-col items-center justify-center gap-2 min-h-[80px] transition-colors"
                style={{
                  backgroundColor: isExpanded
                    ? 'var(--color-accent, #6366f1)'
                    : 'var(--color-bg-elevated, #1a1a2e)',
                  color: isExpanded
                    ? 'white'
                    : 'var(--color-text-primary, #f9fafb)',
                }}
              >
                <span className="text-2xl" aria-hidden="true">
                  {emoji}
                </span>
                <span className="text-xs font-medium text-center leading-tight">
                  {cat.name}
                </span>
              </button>
            )
          })}
        </div>

        {expandedCategory && (
          <div
            id={panelId}
            role="region"
            aria-label="Templates in this category"
            className="rounded-xl border overflow-hidden"
            style={{
              borderColor: 'var(--color-border, #374151)',
              backgroundColor: 'var(--color-bg-surface, #1f2937)',
            }}
          >
            {categories
              .find((c) => c.slug === expandedCategory)
              ?.presets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => onSelectPreset(preset)}
                  className="w-full text-left px-4 py-3 min-h-[44px] transition-colors border-b last:border-b-0"
                  style={{
                    borderColor: 'var(--color-border, #374151)',
                  }}
                >
                  <span
                    className="block text-sm font-semibold"
                    style={{ color: 'var(--color-text-primary, #f9fafb)' }}
                  >
                    {preset.name}
                  </span>
                  <span
                    className="block text-xs mt-0.5"
                    style={{ color: 'var(--color-text-muted, #6b7280)' }}
                  >
                    {preset.description}
                  </span>
                </button>
              ))}
          </div>
        )}
      </div>
    </div>
  )
}
