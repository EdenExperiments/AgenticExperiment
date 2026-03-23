'use client'

import { useState, useMemo, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { listSkills, logXP, toggleFavourite, listCategories, listTags } from '@rpgtracker/api-client'
import { SkillCard, QuickLogSheet, TierTransitionModal } from '@rpgtracker/ui'
import type { SkillDetail } from '@rpgtracker/api-client'

type SortOption = 'recent' | 'name' | 'level' | 'tier'

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'recent', label: 'Recent' },
  { value: 'name', label: 'Name' },
  { value: 'level', label: 'Level' },
  { value: 'tier', label: 'Tier' },
]

const TIER_NAMES = [
  'All',
  'Novice',
  'Apprentice',
  'Journeyman',
  'Adept',
  'Expert',
  'Master',
  'Grandmaster',
  'Legendary',
  'Mythic',
  'Transcendent',
  'Legend',
]

function sortSkills(skills: SkillDetail[], sort: SortOption): SkillDetail[] {
  const sorted = [...skills]
  switch (sort) {
    case 'name':
      return sorted.sort((a, b) => a.name.localeCompare(b.name))
    case 'level':
      return sorted.sort((a, b) => b.effective_level - a.effective_level)
    case 'tier':
      return sorted.sort((a, b) => b.tier_number - a.tier_number || b.effective_level - a.effective_level)
    case 'recent':
    default:
      return sorted.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
  }
}

function useDebounce(value: string, delay: number): string {
  const [debounced, setDebounced] = useState(value)
  useMemo(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

export default function SkillsPage() {
  const router = useRouter()
  const qc = useQueryClient()
  const { data: skills = [], isLoading } = useQuery({ queryKey: ['skills'], queryFn: listSkills })
  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: listCategories })
  const { data: userTags = [] } = useQuery({ queryKey: ['tags'], queryFn: listTags })

  const [logSheetSkill, setLogSheetSkill] = useState<SkillDetail | null>(null)
  const [tierTransition, setTierTransition] = useState<{ tierName: string; tierNumber: number } | null>(null)
  const [sortBy, setSortBy] = useState<SortOption>('recent')
  const [tierFilter, setTierFilter] = useState<string>('All')
  const [categoryFilter, setCategoryFilter] = useState<string>('All')
  const [tagFilter, setTagFilter] = useState<string>('All')
  const [showFavourites, setShowFavourites] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const searchQuery = useDebounce(searchInput, 200)

  // Track skills that were just un-favourited while favourites filter is active (P3-D12)
  const [dimmedSkills, setDimmedSkills] = useState<Set<string>>(new Set())

  const logMutation = useMutation({
    mutationFn: ({ skillId, xpDelta, logNote }: { skillId: string; xpDelta: number; logNote: string }) =>
      logXP(skillId, xpDelta, logNote),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['skills'] })
      setLogSheetSkill(null)
      if (result.tier_crossed) {
        setTierTransition({ tierName: result.tier_name, tierNumber: result.tier_number })
      }
    },
  })

  const favouriteMutation = useMutation({
    mutationFn: (skillId: string) => toggleFavourite(skillId),
    onMutate: async (skillId) => {
      await qc.cancelQueries({ queryKey: ['skills'] })
      const prev = qc.getQueryData<SkillDetail[]>(['skills'])
      qc.setQueryData<SkillDetail[]>(['skills'], (old) =>
        old?.map((s) => (s.id === skillId ? { ...s, is_favourite: !s.is_favourite } : s))
      )
      // P3-D12: if favourites filter is active and we're un-favouriting, dim instead of hide
      if (showFavourites) {
        const skill = prev?.find((s) => s.id === skillId)
        if (skill?.is_favourite) {
          setDimmedSkills((prev) => new Set(prev).add(skillId))
        } else {
          setDimmedSkills((prev) => {
            const next = new Set(prev)
            next.delete(skillId)
            return next
          })
        }
      }
      return { prev }
    },
    onError: (_err, _skillId, context) => {
      if (context?.prev) qc.setQueryData(['skills'], context.prev)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['skills'] })
    },
  })

  const handleToggleFavourite = useCallback((skillId: string) => {
    favouriteMutation.mutate(skillId)
  }, [favouriteMutation])

  // Count active filters for "Clear filters" button
  const activeFilterCount = [
    tierFilter !== 'All',
    categoryFilter !== 'All',
    tagFilter !== 'All',
    showFavourites,
    searchQuery.length > 0,
  ].filter(Boolean).length

  const clearFilters = () => {
    setTierFilter('All')
    setCategoryFilter('All')
    setTagFilter('All')
    setShowFavourites(false)
    setSearchInput('')
    setDimmedSkills(new Set())
  }

  const filteredAndSorted = useMemo(() => {
    let result = skills

    // AND filter combination (P3-D8)
    if (tierFilter !== 'All') {
      result = result.filter((s) => s.tier_name === tierFilter)
    }
    if (categoryFilter !== 'All') {
      result = result.filter((s) => s.category_slug === categoryFilter)
    }
    if (tagFilter !== 'All') {
      result = result.filter((s) => s.tags.some((t) => t.name === tagFilter))
    }
    if (showFavourites) {
      // P3-D12: include dimmed skills that were just un-favourited
      result = result.filter((s) => s.is_favourite || dimmedSkills.has(s.id))
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter((s) => s.name.toLowerCase().includes(q))
    }

    return sortSkills(result, sortBy)
  }, [skills, sortBy, tierFilter, categoryFilter, tagFilter, showFavourites, searchQuery, dimmedSkills])

  // Clear dimmed skills when favourites filter is turned off
  useMemo(() => {
    if (!showFavourites) setDimmedSkills(new Set())
  }, [showFavourites])

  if (isLoading) return <div className="p-8" style={{ color: 'var(--color-muted)' }}>Loading...</div>

  const pillStyle = (active: boolean) => ({
    minHeight: 'var(--tap-target-min, 44px)' as const,
    fontFamily: 'var(--font-body)' as const,
    backgroundColor: active ? 'var(--color-accent)' : 'var(--color-surface)',
    color: active ? 'white' : 'var(--color-text-secondary)',
  })

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <h1
          className="text-2xl font-bold"
          style={{
            fontFamily: 'var(--font-display, var(--font-body, Inter, system-ui, sans-serif))',
            color: 'var(--color-text)',
          }}
        >
          Skills
        </h1>
        <Link
          href="/skills/new"
          className="px-4 py-2 rounded-xl font-semibold text-white text-sm min-h-[44px] flex items-center"
          style={{ backgroundColor: 'var(--color-accent)' }}
        >
          + Add Skill
        </Link>
      </div>

      {skills.length === 0 ? (
        <div className="text-center py-16 space-y-6">
          {/* CSS-based illustration */}
          <div className="mx-auto w-20 h-24 relative" aria-hidden="true">
            <div
              className="absolute inset-0 rounded-t-full rounded-b-[50%]"
              style={{
                backgroundColor: 'var(--color-bg-elevated)',
                border: '3px solid var(--color-accent)',
              }}
            />
            <div
              className="absolute top-1/3 left-1/2 -translate-x-1/2 w-6 h-10"
              style={{
                borderLeft: '2px solid var(--color-accent)',
                borderRight: '2px solid var(--color-accent)',
                borderBottom: '2px solid var(--color-accent)',
              }}
            />
          </div>

          <h2
            className="text-xl font-bold"
            style={{
              fontFamily: 'var(--font-display, var(--font-body, Inter, system-ui, sans-serif))',
              color: 'var(--color-text)',
            }}
          >
            No skills yet
          </h2>
          <p style={{ color: 'var(--color-text-secondary)' }}>
            Start tracking your real-world skills like an RPG character.
          </p>
          <Link
            href="/skills/new"
            className="inline-block px-6 py-3 rounded-xl font-semibold text-white min-h-[48px]"
            style={{ backgroundColor: 'var(--color-accent)' }}
          >
            Create your first skill
          </Link>
        </div>
      ) : (
        <>
          {/* Row 1: Search + Favourites (P3-D9) */}
          <div className="flex items-center gap-2 mb-2" role="toolbar" aria-label="Search and favourites">
            <div className="relative flex-1">
              <input
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search skills..."
                aria-label="Search skills"
                className="w-full rounded-lg px-3 py-2 text-sm border-none outline-none"
                style={{
                  minHeight: 'var(--tap-target-min, 44px)',
                  fontFamily: 'var(--font-body)',
                  backgroundColor: 'var(--color-surface)',
                  color: 'var(--color-text)',
                }}
              />
              {searchInput && (
                <button
                  aria-label="Clear search"
                  onClick={() => setSearchInput('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full text-xs"
                  style={{ color: 'var(--color-muted)' }}
                >
                  ✕
                </button>
              )}
            </div>
            <button
              aria-label={showFavourites ? 'Show all skills' : 'Show favourites only'}
              aria-pressed={showFavourites}
              onClick={() => setShowFavourites(!showFavourites)}
              className="flex items-center justify-center w-[44px] h-[44px] rounded-lg text-lg shrink-0"
              style={{
                backgroundColor: showFavourites ? 'var(--color-accent)' : 'var(--color-surface)',
                color: showFavourites ? 'white' : 'var(--color-muted)',
              }}
            >
              {showFavourites ? '★' : '☆'}
            </button>
          </div>

          {/* Row 2: Scrollable pills — sort, tier, category, tag (P3-D9) */}
          <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1" role="toolbar" aria-label="Sort and filter">
            {/* Sort pills */}
            <div className="flex gap-1.5 shrink-0">
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setSortBy(opt.value)}
                  aria-pressed={sortBy === opt.value}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                  style={pillStyle(sortBy === opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="w-px h-6 shrink-0" style={{ backgroundColor: 'var(--color-border)' }} />

            {/* Tier filter */}
            <select
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value)}
              aria-label="Filter by tier"
              className="text-xs rounded-lg px-2 py-1.5 border-none shrink-0"
              style={{
                ...pillStyle(tierFilter !== 'All'),
                fontFamily: 'var(--font-body)',
              }}
            >
              {TIER_NAMES.map((tier) => (
                <option key={tier} value={tier}>
                  {tier === 'All' ? 'All Tiers' : tier}
                </option>
              ))}
            </select>

            {/* Category filter */}
            {categories.length > 0 && (
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                aria-label="Filter by category"
                className="text-xs rounded-lg px-2 py-1.5 border-none shrink-0"
                style={{
                  ...pillStyle(categoryFilter !== 'All'),
                  fontFamily: 'var(--font-body)',
                }}
              >
                <option value="All">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.slug}>
                    {cat.emoji} {cat.name}
                  </option>
                ))}
              </select>
            )}

            {/* Tag filter — hidden when user has no tags (P3-D9) */}
            {userTags.length > 0 && (
              <select
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
                aria-label="Filter by tag"
                className="text-xs rounded-lg px-2 py-1.5 border-none shrink-0"
                style={{
                  ...pillStyle(tagFilter !== 'All'),
                  fontFamily: 'var(--font-body)',
                }}
              >
                <option value="All">All Tags</option>
                {userTags.map((tag) => (
                  <option key={tag.id} value={tag.name}>
                    {tag.name} ({tag.skill_count})
                  </option>
                ))}
              </select>
            )}

            {/* Clear filters button — shown when >1 filter active */}
            {activeFilterCount > 1 && (
              <button
                onClick={clearFilters}
                className="px-3 py-1.5 rounded-lg text-xs font-medium shrink-0 transition-colors"
                style={{
                  minHeight: 'var(--tap-target-min, 44px)',
                  fontFamily: 'var(--font-body)',
                  backgroundColor: 'var(--color-error, #ef4444)',
                  color: 'white',
                }}
              >
                Clear filters
              </button>
            )}
          </div>

          {/* Skill cards */}
          {filteredAndSorted.length === 0 ? (
            <div className="text-center py-8 space-y-2">
              <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
                {showFavourites
                  ? 'No favourited skills yet. Tap ☆ on a skill to favourite it.'
                  : searchQuery
                    ? `No skills matching "${searchQuery}".`
                    : 'No skills match the current filters.'}
              </p>
              {activeFilterCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="text-sm underline"
                  style={{ color: 'var(--color-accent)' }}
                >
                  Clear all filters
                </button>
              )}
            </div>
          ) : (
            <div data-testid="skills-grid" className="grid grid-cols-1 md:grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-4">
              {filteredAndSorted.map((skill) => (
                <SkillCard
                  key={skill.id}
                  skill={skill}
                  onLogXP={(id) => setLogSheetSkill(skills.find((s) => s.id === id) ?? null)}
                  onClick={(id) => router.push(`/skills/${id}`)}
                  onToggleFavourite={handleToggleFavourite}
                  dimmed={dimmedSkills.has(skill.id)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Floating Add button on mobile */}
      <Link
        href="/skills/new"
        aria-label="Add new skill"
        className="fixed bottom-20 right-4 w-14 h-14 rounded-full text-white text-2xl flex items-center justify-center shadow-lg md:hidden"
        style={{ backgroundColor: 'var(--color-accent)' }}
      >
        +
      </Link>

      {logSheetSkill && (
        <QuickLogSheet
          skillName={logSheetSkill.name}
          chips={logSheetSkill.quick_log_chips}
          isOpen
          isLoading={logMutation.isPending}
          onClose={() => setLogSheetSkill(null)}
          onSubmit={({ xpDelta, logNote }) =>
            logMutation.mutate({ skillId: logSheetSkill.id, xpDelta, logNote })
          }
        />
      )}

      {tierTransition && (
        <TierTransitionModal
          newTierName={tierTransition.tierName}
          newTierNumber={tierTransition.tierNumber}
          isOpen
          onContinue={() => setTierTransition(null)}
        />
      )}
    </div>
  )
}
