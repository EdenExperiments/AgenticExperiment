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
  const [showFilterSheet, setShowFilterSheet] = useState(false)

  // Track skills that were just un-favourited while favourites filter is active (P3-D12)
  const [dimmedSkills, setDimmedSkills] = useState<Set<string>>(new Set())

  const logMutation = useMutation({
    mutationFn: ({ skillId, xpDelta, logNote }: { skillId: string; xpDelta: number; logNote: string; timeSpentMinutes?: number }) =>
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

  // Filter-only count (excludes search, favourites, and sort) for mobile badge
  const filterOnlyCount = [
    tierFilter !== 'All',
    categoryFilter !== 'All',
    tagFilter !== 'All',
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

  // pillStyle removed — sort/filter pills now use .chip/.chip-active CSS classes

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
          className="btn btn-primary px-4 py-2 text-sm min-h-[44px] flex items-center"
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
            className="btn btn-primary inline-block px-6 py-3 min-h-[48px]"
          >
            Create your first skill
          </Link>
        </div>
      ) : (
        <>
          {/* Search + Favourites + mobile filter trigger */}
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
              className={`chip flex items-center justify-center w-[44px] h-[44px] shrink-0 leading-none${showFavourites ? ' chip-active' : ''}`}
              style={{ fontSize: '1.25rem' }}
            >
              <span className="block -translate-y-1">{showFavourites ? '★' : '☆'}</span>
            </button>
            {/* Mobile filter trigger */}
            <button
              aria-label="Open filters"
              onClick={() => setShowFilterSheet(true)}
              className="chip flex items-center justify-center w-[44px] h-[44px] shrink-0 lg:hidden relative"
            >
              <span aria-hidden="true">&#x2699;</span>
              {filterOnlyCount > 0 && (
                <span
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center"
                  style={{ background: 'var(--color-accent)', color: 'var(--color-bg)' }}
                >
                  {filterOnlyCount}
                </span>
              )}
            </button>
          </div>

          {/* Desktop: inline filter dropdowns (lg+ to avoid sidebar squeeze) */}
          <div className="hidden lg:flex items-center gap-2 mb-4 flex-wrap py-1.5" role="toolbar" aria-label="Sort and filter">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              aria-label="Sort by"
              className="chip text-xs px-2 py-1.5 shrink-0"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  Sort: {opt.label}
                </option>
              ))}
            </select>

            <select
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value)}
              aria-label="Filter by tier"
              className={`chip text-xs px-2 py-1.5 shrink-0${tierFilter !== 'All' ? ' chip-active' : ''}`}
            >
              {TIER_NAMES.map((tier) => (
                <option key={tier} value={tier}>
                  {tier === 'All' ? 'All Tiers' : tier}
                </option>
              ))}
            </select>

            {categories.length > 0 && (
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                aria-label="Filter by category"
                className={`chip text-xs px-2 py-1.5 shrink-0${categoryFilter !== 'All' ? ' chip-active' : ''}`}
              >
                <option value="All">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.slug}>
                    {cat.emoji} {cat.name}
                  </option>
                ))}
              </select>
            )}

            {userTags.length > 0 && (
              <select
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
                aria-label="Filter by tag"
                className={`chip text-xs px-2 py-1.5 shrink-0${tagFilter !== 'All' ? ' chip-active' : ''}`}
              >
                <option value="All">All Tags</option>
                {userTags.map((tag) => (
                  <option key={tag.id} value={tag.name}>
                    {tag.name} ({tag.skill_count})
                  </option>
                ))}
              </select>
            )}

            {activeFilterCount > 1 && (
              <button
                onClick={clearFilters}
                className="btn btn-danger px-3 py-1.5 text-xs shrink-0"
              >
                Clear filters
              </button>
            )}
          </div>

          {/* Mobile: filter bottom sheet */}
          {showFilterSheet && (
            <>
              <div
                className="fixed inset-0 bg-black/40 z-40 lg:hidden"
                onClick={() => setShowFilterSheet(false)}
              />
              <div
                role="dialog"
                aria-label="Sort and filter"
                className="fixed bottom-0 inset-x-0 z-50 rounded-t-2xl p-6 pb-24 md:pb-6 safe-area-inset-bottom lg:hidden"
                style={{
                  background: 'var(--color-bg-elevated)',
                  borderTop: '1px solid var(--color-border-strong)',
                  color: 'var(--color-text)',
                }}
              >
                <div className="flex items-center justify-between mb-5">
                  <h2
                    className="font-semibold"
                    style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
                  >
                    Sort & Filter
                  </h2>
                  <button
                    onClick={() => setShowFilterSheet(false)}
                    aria-label="Close"
                    className="text-2xl leading-none"
                    style={{ color: 'var(--color-muted)' }}
                  >
                    ×
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs uppercase tracking-wider mb-1 block" style={{ color: 'var(--color-muted)' }}>
                      Sort by
                    </label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as SortOption)}
                      className="chip w-full px-3 py-2.5 text-sm"
                    >
                      {SORT_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs uppercase tracking-wider mb-1 block" style={{ color: 'var(--color-muted)' }}>
                      Tier
                    </label>
                    <select
                      value={tierFilter}
                      onChange={(e) => setTierFilter(e.target.value)}
                      className={`chip w-full px-3 py-2.5 text-sm${tierFilter !== 'All' ? ' chip-active' : ''}`}
                    >
                      {TIER_NAMES.map((tier) => (
                        <option key={tier} value={tier}>
                          {tier === 'All' ? 'All Tiers' : tier}
                        </option>
                      ))}
                    </select>
                  </div>

                  {categories.length > 0 && (
                    <div>
                      <label className="text-xs uppercase tracking-wider mb-1 block" style={{ color: 'var(--color-muted)' }}>
                        Category
                      </label>
                      <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className={`chip w-full px-3 py-2.5 text-sm${categoryFilter !== 'All' ? ' chip-active' : ''}`}
                      >
                        <option value="All">All Categories</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.slug}>
                            {cat.emoji} {cat.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {userTags.length > 0 && (
                    <div>
                      <label className="text-xs uppercase tracking-wider mb-1 block" style={{ color: 'var(--color-muted)' }}>
                        Tag
                      </label>
                      <select
                        value={tagFilter}
                        onChange={(e) => setTagFilter(e.target.value)}
                        className={`chip w-full px-3 py-2.5 text-sm${tagFilter !== 'All' ? ' chip-active' : ''}`}
                      >
                        <option value="All">All Tags</option>
                        {userTags.map((tag) => (
                          <option key={tag.id} value={tag.name}>
                            {tag.name} ({tag.skill_count})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    {activeFilterCount > 0 && (
                      <button
                        onClick={() => { clearFilters(); setShowFilterSheet(false) }}
                        className="btn btn-danger flex-1 py-3 text-sm"
                      >
                        Clear all
                      </button>
                    )}
                    <button
                      onClick={() => setShowFilterSheet(false)}
                      className="btn btn-primary flex-1 py-3 text-sm"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

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
        className="btn btn-primary fixed bottom-20 right-4 w-14 h-14 !rounded-full text-2xl shadow-lg md:hidden"
      >
        +
      </Link>

      {logSheetSkill && (
        <QuickLogSheet
          skillName={logSheetSkill.name}
          tierNumber={logSheetSkill.tier_number}
          isOpen
          isLoading={logMutation.isPending}
          onClose={() => setLogSheetSkill(null)}
          onSubmit={({ xpDelta, logNote, timeSpentMinutes }) =>
            logMutation.mutate({ skillId: logSheetSkill.id, xpDelta, logNote, timeSpentMinutes })
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
