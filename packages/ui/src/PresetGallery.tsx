'use client'

import { useState, useMemo } from 'react'
import { ProgressionPreview } from './ProgressionPreview'

export interface PresetItem {
  id: string
  name: string
  description: string
  category_id: string
  category_name: string
  category_slug: string
}

export interface PresetGalleryProps {
  presets: PresetItem[]
  onSelect: (preset: { id: string; name: string; description: string; category_id: string }) => void
  selectedId: string | null
  onSwitchToCustom?: () => void
  isLoading?: boolean
}

export function PresetGallery({
  presets,
  onSelect,
  selectedId,
  onSwitchToCustom,
  isLoading = false,
}: PresetGalleryProps) {
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const grouped = useMemo(() => {
    const filtered = search
      ? presets.filter(p =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.category_name.toLowerCase().includes(search.toLowerCase())
        )
      : presets
    const map = new Map<string, { name: string; presets: PresetItem[] }>()
    for (const p of filtered) {
      if (!map.has(p.category_name)) {
        map.set(p.category_name, { name: p.category_name, presets: [] })
      }
      map.get(p.category_name)!.presets.push(p)
    }
    return Array.from(map.values())
  }, [presets, search])

  // Loading state: skeleton cards
  if (isLoading) {
    return (
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
        <div className="p-3" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <div
            className="w-full h-10 rounded-lg animate-pulse"
            style={{ backgroundColor: 'var(--color-surface)' }}
          />
        </div>
        <div className="space-y-0">
          {Array.from({ length: 4 }, (_, i) => (
            <div
              key={i}
              className="px-4 py-4 animate-pulse"
              style={{ borderTop: i > 0 ? '1px solid var(--color-border)' : undefined }}
            >
              <div className="h-4 rounded w-2/3 mb-2" style={{ backgroundColor: 'var(--color-surface)' }} />
              <div className="h-3 rounded w-1/2" style={{ backgroundColor: 'var(--color-surface)' }} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Empty state: no presets at all
  if (presets.length === 0) {
    return (
      <div
        className="rounded-xl p-8 text-center"
        style={{ border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)' }}
      >
        <p className="text-sm mb-3" style={{ color: 'var(--color-muted)' }}>
          No presets available yet
        </p>
        {onSwitchToCustom && (
          <button
            onClick={onSwitchToCustom}
            className="text-sm font-medium hover:underline"
            style={{ color: 'var(--color-accent)' }}
          >
            Create Custom Skill instead
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
      {/* Search */}
      <div className="p-3" style={{ borderBottom: '1px solid var(--color-border)' }}>
        <input
          type="search"
          placeholder="Search presets…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full text-sm rounded-lg px-3 py-2"
          style={{
            background: 'var(--color-surface)',
            color: 'var(--color-text)',
            border: '1px solid var(--color-border)',
          }}
        />
      </div>

      {/* Results */}
      <div className="max-h-80 overflow-y-auto">
        {grouped.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm mb-2" style={{ color: 'var(--color-muted)' }}>
              No presets match your search
            </p>
            <button
              onClick={() => setSearch('')}
              className="text-sm font-medium hover:underline"
              style={{ color: 'var(--color-accent)' }}
            >
              Clear search
            </button>
          </div>
        ) : (
          grouped.map(cat => (
            <div key={cat.name}>
              <div
                className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider sticky top-0 z-10"
                style={{
                  background: 'var(--color-surface)',
                  color: 'var(--color-muted)',
                  fontFamily: 'var(--font-body, Inter, system-ui, sans-serif)',
                }}
              >
                {cat.name}
              </div>
              {cat.presets.map(preset => {
                const isSelected = selectedId === preset.id
                const isExpanded = expandedId === preset.id

                return (
                  <div key={preset.id}>
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : preset.id)}
                      aria-expanded={isExpanded}
                      className="w-full text-left px-4 py-3 transition-colors"
                      style={{
                        borderTop: '1px solid var(--color-border)',
                        backgroundColor: isSelected ? 'var(--color-accent-muted)' : undefined,
                      }}
                    >
                      <p
                        className="text-sm font-medium"
                        style={{ color: isSelected ? 'var(--color-accent)' : 'var(--color-text)' }}
                      >
                        {preset.name}
                      </p>
                      <p className="text-xs mt-0.5 line-clamp-1" style={{ color: 'var(--color-muted)' }}>
                        {preset.description}
                      </p>
                    </button>

                    {/* Expanded: show progression preview + select button */}
                    {isExpanded && (
                      <div className="px-4 pb-3 space-y-2">
                        <ProgressionPreview />
                        <button
                          onClick={() => onSelect({
                            id: preset.id,
                            name: preset.name,
                            description: preset.description,
                            category_id: preset.category_id,
                          })}
                          className="w-full py-2 rounded-lg text-sm font-semibold"
                          style={{
                            backgroundColor: 'var(--color-accent)',
                            color: '#fff',
                            minHeight: 'var(--tap-target-min, 44px)',
                          }}
                        >
                          Select {preset.name}
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
