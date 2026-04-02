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
import { useState, useEffect, useCallback, Suspense } from 'react'
import SearchForm from '@/components/SearchForm'
import ResultCard from '@/components/ResultCard'
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
    <div className="bg-bg-surface border border-border rounded-card shadow-card p-5 md:p-6 animate-pulse">
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex-1">
          <div className="h-3 w-20 bg-bg-muted rounded mb-3" />
          <div className="flex items-center gap-2 mb-2">
            <div className="h-6 w-12 bg-bg-muted rounded" />
            <div className="h-0.5 w-6 bg-bg-muted rounded" />
            <div className="h-6 w-12 bg-bg-muted rounded" />
          </div>
          <div className="h-3 w-32 bg-bg-muted rounded" />
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="h-5 w-24 bg-bg-muted rounded" />
          <div className="h-3 w-16 bg-bg-muted rounded" />
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="h-10 w-20 bg-bg-muted rounded" />
          <div className="h-6 w-24 bg-bg-muted rounded-badge" />
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

  const fetchResults = useCallback(
    async (params: { origin: string; destination: string; date: string; cabin: CabinClass }) => {
      setState((prev) => ({ ...prev, status: 'loading', error: null }))

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

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Sticky search bar */}
      <div className="sticky top-0 z-30 bg-bg-primary/80 backdrop-blur-lg border-b border-border py-3 px-4">
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
      <div className="max-w-content mx-auto px-4 py-6">
        {/* Results header */}
        {state.status === 'success' && state.meta && (
          <div className="flex items-baseline justify-between mb-4">
            <p className="font-heading text-h3 font-medium text-text-primary">
              {state.meta.totalResults} result{state.meta.totalResults !== 1 ? 's' : ''}
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

        {/* Empty state */}
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

        {/* Results list */}
        {state.status === 'success' && state.results.length > 0 && (
          <div className="space-y-4">
            {state.results.map((item) => (
              <ResultCard key={item.id} item={item} />
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
