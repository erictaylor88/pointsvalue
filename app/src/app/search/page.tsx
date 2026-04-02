'use client'

/**
 * Search Results Page — /search
 *
 * Reads query params (from, to, date, cabin), calls /api/search,
 * and displays ranked results with CPM values.
 *
 * URL pattern: /search?from=LAX&to=NRT&date=2026-05-15&cabin=business
 */

import { useSearchParams } from 'next/navigation'
import { useState, useEffect, useCallback, useMemo, Suspense } from 'react'
import SearchForm from '@/components/SearchForm'
import ResultCard from '@/components/ResultCard'
import ProgramFilter from '@/components/ProgramFilter'
import ResultsControls, { type SortOption } from '@/components/ResultsControls'
import ComparePanel, { MAX_COMPARE_ITEMS } from '@/components/ComparePanel'
import type { SearchResultItem } from '@/app/api/search/route'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CabinClass = 'economy' | 'premium' | 'business' | 'first'

interface SearchMeta {
  origin: string
  destination: string
  date: string
  cabin: CabinClass
  totalResults: number
  cachedAt: string | null
  expiresAt: string | null
  seatsAeroRateLimit: number | null
  searchDurationMs: number
}

interface SearchState {
  status: 'idle' | 'loading' | 'success' | 'error'
  results: SearchResultItem[]
  meta: SearchMeta | null
  error: string | null
}

// ---------------------------------------------------------------------------
// Skeleton card
// ---------------------------------------------------------------------------

function SkeletonCard() {
  return (
    <div className="bg-bg-surface border border-border rounded-card shadow-card p-5 md:p-6">
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex-1">
          <div className="h-3 w-20 skeleton-shimmer rounded mb-3" />
          <div className="flex items-center gap-2 mb-2">
            <div className="h-6 w-12 skeleton-shimmer rounded" />
            <div className="h-0.5 w-6 skeleton-shimmer rounded" />
            <div className="h-6 w-12 skeleton-shimmer rounded" />
          </div>
          <div className="h-3 w-32 skeleton-shimmer rounded" />
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="h-5 w-24 skeleton-shimmer rounded" />
          <div className="h-3 w-16 skeleton-shimmer rounded" />
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="h-10 w-20 skeleton-shimmer rounded" />
          <div className="h-6 w-24 skeleton-shimmer rounded-badge" />
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Search Results (inner component using useSearchParams)
// ---------------------------------------------------------------------------

function SearchResults() {
  const searchParams = useSearchParams()

  const from = searchParams.get('from') || ''
  const to = searchParams.get('to') || ''
  const date = searchParams.get('date') || ''
  const cabin = (searchParams.get('cabin') || 'economy') as CabinClass

  const [state, setState] = useState<SearchState>({
    status: from && to && date ? 'loading' : 'idle',
    results: [],
    meta: null,
    error: null,
  })

  // Program filter state — empty = show all
  const [selectedPrograms, setSelectedPrograms] = useState<Set<string>>(new Set())

  // Sort state
  const [activeSort, setActiveSort] = useState<SortOption>('best_value')

  // Compare state
  const [compareItems, setCompareItems] = useState<SearchResultItem[]>([])
  const [comparePanelOpen, setComparePanelOpen] = useState(false)
  const compareIds = useMemo(() => new Set(compareItems.map(i => i.id)), [compareItems])

  // Extract unique programs sorted by result count (most results first)
  const availablePrograms = (() => {
    if (state.results.length === 0) return []
    const counts = new Map<string, number>()
    for (const r of state.results) {
      counts.set(r.source, (counts.get(r.source) || 0) + 1)
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([program]) => program)
  })()

  // Filter + sort results
  const filteredResults = useMemo(() => {
    // 1. Filter by program
    const filtered =
      selectedPrograms.size === 0
        ? [...state.results]
        : state.results.filter((r) => selectedPrograms.has(r.source))

    // 2. Sort
    switch (activeSort) {
      case 'best_value':
        // CPM descending (best deals first), no-cash-price items at end
        filtered.sort((a, b) => {
          if (!a.cpm.cashPriceAvailable && !b.cpm.cashPriceAvailable) return 0
          if (!a.cpm.cashPriceAvailable) return 1
          if (!b.cpm.cashPriceAvailable) return -1
          return b.cpm.cpm - a.cpm.cpm
        })
        break
      case 'lowest_miles':
        filtered.sort((a, b) => a.milesRequired - b.milesRequired)
        break
      case 'lowest_cash':
        // Items with cash price first, sorted ascending; no-price items at end
        filtered.sort((a, b) => {
          if (a.cashPrice === null && b.cashPrice === null) return 0
          if (a.cashPrice === null) return 1
          if (b.cashPrice === null) return -1
          return a.cashPrice - b.cashPrice
        })
        break
      case 'lowest_taxes':
        filtered.sort((a, b) => a.taxesCents - b.taxesCents)
        break
    }

    return filtered
  }, [state.results, selectedPrograms, activeSort])

  const handleToggleProgram = useCallback((program: string) => {
    setSelectedPrograms((prev) => {
      const next = new Set(prev)
      if (next.has(program)) {
        next.delete(program)
      } else {
        next.add(program)
      }
      return next
    })
  }, [])

  const handleClearPrograms = useCallback(() => {
    setSelectedPrograms(new Set())
  }, [])

  // Compare handlers
  const handleToggleCompare = useCallback((item: SearchResultItem) => {
    setCompareItems((prev) => {
      const exists = prev.some(i => i.id === item.id)
      if (exists) {
        return prev.filter(i => i.id !== item.id)
      }
      if (prev.length >= MAX_COMPARE_ITEMS) return prev
      const next = [...prev, item]
      // Auto-open panel on first add
      if (prev.length === 0) setComparePanelOpen(true)
      return next
    })
  }, [])

  const handleRemoveCompare = useCallback((id: string) => {
    setCompareItems((prev) => prev.filter(i => i.id !== id))
  }, [])

  const handleClearCompare = useCallback(() => {
    setCompareItems([])
    setComparePanelOpen(false)
  }, [])

  const handleToggleComparePanel = useCallback(() => {
    setComparePanelOpen((prev) => !prev)
  }, [])

  const fetchResults = useCallback(
    async (params: { origin: string; destination: string; date: string; cabin: CabinClass }) => {
      setState((prev) => ({ ...prev, status: 'loading', error: null }))
      setSelectedPrograms(new Set())
      setActiveSort('best_value')
      // Note: compareItems intentionally NOT cleared — users may compare across routes

      try {
        const qs = new URLSearchParams({
          origin: params.origin,
          destination: params.destination,
          date: params.date,
          cabin: params.cabin,
        })

        const response = await fetch(`/api/search?${qs.toString()}`)
        const data = await response.json()

        if (!response.ok) {
          setState({
            status: 'error',
            results: [],
            meta: null,
            error: data.error || 'Search failed',
          })
          return
        }

        setState({
          status: 'success',
          results: data.results,
          meta: data.meta,
          error: null,
        })
      } catch (err) {
        setState({
          status: 'error',
          results: [],
          meta: null,
          error: err instanceof Error ? err.message : 'Search failed',
        })
      }
    },
    []
  )

  // Auto-search on mount if URL has params
  useEffect(() => {
    if (from && to && date) {
      fetchResults({ origin: from, destination: to, date, cabin })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, date, cabin])

  const handleSearch = useCallback(
    (params: { origin: string; destination: string; date: string; cabin: CabinClass }) => {
      // Update URL without full page reload
      const qs = new URLSearchParams({
        from: params.origin,
        to: params.destination,
        date: params.date,
        cabin: params.cabin,
      })
      window.history.replaceState(null, '', `/search?${qs.toString()}`)
      fetchResults(params)
    },
    [fetchResults]
  )

  // Quick cabin switch — triggers a new search with the same route/date
  const handleCabinChange = useCallback(
    (newCabin: CabinClass) => {
      if (!from || !to || !date || newCabin === cabin) return
      handleSearch({ origin: from, destination: to, date, cabin: newCabin })
    },
    [from, to, date, cabin, handleSearch]
  )

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Sticky search bar */}
      <div className="sticky top-0 z-30 bg-bg-primary/80 backdrop-blur-lg border-b border-border py-2 sm:py-3 px-4 sm:px-6">
        <SearchForm
          initialOrigin={from}
          initialDestination={to}
          initialDate={date}
          initialCabin={cabin}
          compact
          isLoading={state.status === 'loading'}
          onSearch={handleSearch}
        />
      </div>

      {/* Results area */}
      <div className="max-w-content mx-auto px-4 sm:px-6 py-4 sm:py-6">
        {/* Results header */}
        {state.status === 'success' && state.meta && (
          <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2 sm:gap-4 mb-4">
            <p className="font-heading text-h3 font-medium text-text-primary">
              {selectedPrograms.size > 0
                ? `${filteredResults.length} of ${state.meta.totalResults} result${state.meta.totalResults !== 1 ? 's' : ''}`
                : `${state.meta.totalResults} result${state.meta.totalResults !== 1 ? 's' : ''}`
              }
              <span className="text-text-secondary font-normal">
                {' '}for {state.meta.origin} → {state.meta.destination}
              </span>
            </p>
            <div className="flex items-center gap-2">
              {state.meta.cachedAt && (
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-deal-fair" />
                  <span className="font-body text-caption text-text-tertiary">
                    Cached {new Date(state.meta.cachedAt).toLocaleTimeString()}
                  </span>
                </div>
              )}
              {!state.meta.cachedAt && (
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-deal-great" />
                  <span className="font-body text-caption text-text-tertiary">
                    Live · {state.meta.searchDurationMs}ms
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Program filter chips */}
        {state.status === 'success' && availablePrograms.length > 1 && (
          <div className="mb-4">
            <ProgramFilter
              programs={availablePrograms}
              selected={selectedPrograms}
              onToggle={handleToggleProgram}
              onClearAll={handleClearPrograms}
            />
          </div>
        )}

        {/* Cabin quick-switch + sort controls — always visible after a search completes */}
        {state.status === 'success' && (
          <div className="mb-4">
            <ResultsControls
              activeCabin={cabin}
              onCabinChange={handleCabinChange}
              activeSort={activeSort}
              onSortChange={setActiveSort}
            />
          </div>
        )}

        {/* Loading skeletons */}
        {state.status === 'loading' && (
          <div className="space-y-4">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        )}

        {/* Error state */}
        {state.status === 'error' && (
          <div className="text-center py-16">
            <p className="font-heading text-h2 text-text-primary mb-2">
              Search failed
            </p>
            <p className="font-body text-body text-text-secondary max-w-prose mx-auto mb-6">
              {state.error}
            </p>
            <button
              onClick={() => fetchResults({ origin: from, destination: to, date, cabin })}
              className="
                px-6 py-3 bg-accent-primary text-white
                font-heading text-label rounded-button
                hover:bg-accent-primary-hover
                transition-colors duration-200 ease-smooth
              "
            >
              Try again
            </button>
          </div>
        )}

        {/* Empty state — no results at all from API */}
        {state.status === 'success' && state.results.length === 0 && (
          <div className="text-center py-16">
            <p className="font-heading text-h2 text-text-primary mb-2">
              No award flights found
            </p>
            <p className="font-body text-body text-text-secondary max-w-prose mx-auto">
              No mileage availability was found for this route and date. Try different dates or a broader search.
            </p>
          </div>
        )}

        {/* Filtered empty state — results exist but all filtered out */}
        {state.status === 'success' && state.results.length > 0 && filteredResults.length === 0 && (
          <div className="text-center py-12">
            <p className="font-heading text-h3 font-medium text-text-primary mb-2">
              No results for selected programs
            </p>
            <p className="font-body text-body text-text-secondary max-w-prose mx-auto mb-4">
              Try selecting different programs or clear the filter to see all results.
            </p>
            <button
              type="button"
              onClick={handleClearPrograms}
              className="
                px-5 py-2.5 border border-border rounded-button
                font-heading text-label text-text-secondary
                hover:bg-bg-subtle transition-colors duration-200 ease-smooth
              "
            >
              Show all results
            </button>
          </div>
        )}

        {/* Results list */}
        {state.status === 'success' && filteredResults.length > 0 && (
          <div className="space-y-4">
            {filteredResults.map((item) => (
              <ResultCard
                key={item.id}
                item={item}
                isCompared={compareIds.has(item.id)}
                onToggleCompare={handleToggleCompare}
              />
            ))}
          </div>
        )}

        {/* Idle state — no search params */}
        {state.status === 'idle' && (
          <div className="text-center py-16">
            <p className="font-heading text-h2 text-text-primary mb-2">
              Search for award flights
            </p>
            <p className="font-body text-body text-text-secondary max-w-prose mx-auto">
              Enter an origin, destination, and date above to find award availability and see the real cents-per-mile value.
            </p>
          </div>
        )}
      </div>

      {/* Compare panel */}
      <ComparePanel
        items={compareItems}
        isOpen={comparePanelOpen}
        onClose={handleToggleComparePanel}
        onRemove={handleRemoveCompare}
        onClear={handleClearCompare}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page (with Suspense boundary for useSearchParams)
// ---------------------------------------------------------------------------

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-bg-primary flex items-center justify-center">
          <div className="animate-pulse font-heading text-label text-text-tertiary">
            Loading search…
          </div>
        </div>
      }
    >
      <SearchResults />
    </Suspense>
  )
}
