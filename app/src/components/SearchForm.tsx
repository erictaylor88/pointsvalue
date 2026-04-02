'use client'

/**
 * SearchForm — The primary search interface.
 *
 * Design spec: Floating search bar, max-width 880px.
 * Desktop: single row (origin | destination | date | cabin | search button)
 * Mobile: stacked inputs, full-width search button
 * URL state: query params for shareable/bookmarkable searches
 */

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CabinClass = 'economy' | 'premium' | 'business' | 'first'

interface SearchFormProps {
  /** Pre-fill values (e.g., from URL params on results page) */
  initialOrigin?: string
  initialDestination?: string
  initialDate?: string
  initialCabin?: CabinClass
  /** Compact mode for sticky header on results page */
  compact?: boolean
  /** External loading state */
  isLoading?: boolean
  /** Called when search is submitted (for results page inline search) */
  onSearch?: (params: {
    origin: string
    destination: string
    date: string
    cabin: CabinClass
  }) => void
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CABIN_OPTIONS: { value: CabinClass; label: string; shortLabel: string }[] = [
  { value: 'economy', label: 'Economy', shortLabel: 'Econ' },
  { value: 'premium', label: 'Premium', shortLabel: 'Prem' },
  { value: 'business', label: 'Business', shortLabel: 'Biz' },
  { value: 'first', label: 'First', shortLabel: 'First' },
]

// ---------------------------------------------------------------------------
// Swap icon
// ---------------------------------------------------------------------------

function SwapIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M6 13L3 10L6 7M14 7L17 10L14 13M3 10H17"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Search icon
// ---------------------------------------------------------------------------

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M16.5 16.5L12.875 12.875M14.8333 8.16667C14.8333 11.8486 11.8486 14.8333 8.16667 14.8333C4.48477 14.8333 1.5 11.8486 1.5 8.16667C1.5 4.48477 4.48477 1.5 8.16667 1.5C11.8486 1.5 14.8333 4.48477 14.8333 8.16667Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Spinner
// ---------------------------------------------------------------------------

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SearchForm({
  initialOrigin = '',
  initialDestination = '',
  initialDate = '',
  initialCabin = 'economy',
  compact = false,
  isLoading = false,
  onSearch,
}: SearchFormProps) {
  const router = useRouter()

  const [origin, setOrigin] = useState(initialOrigin)
  const [destination, setDestination] = useState(initialDestination)
  const [date, setDate] = useState(initialDate)
  const [cabin, setCabin] = useState<CabinClass>(initialCabin)

  const canSubmit =
    origin.trim().length >= 3 &&
    destination.trim().length >= 3 &&
    date.trim().length > 0

  const handleSwap = useCallback(() => {
    setOrigin(destination)
    setDestination(origin)
  }, [origin, destination])

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      if (!canSubmit || isLoading) return

      const params = {
        origin: origin.trim().toUpperCase(),
        destination: destination.trim().toUpperCase(),
        date: date.trim(),
        cabin,
      }

      if (onSearch) {
        onSearch(params)
      } else {
        // Navigate to search results page
        const searchParams = new URLSearchParams({
          from: params.origin,
          to: params.destination,
          date: params.date,
          cabin: params.cabin,
        })
        router.push(`/search?${searchParams.toString()}`)
      }
    },
    [canSubmit, isLoading, origin, destination, date, cabin, onSearch, router]
  )

  // Get tomorrow's date as minimum for date picker
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const minDate = tomorrow.toISOString().split('T')[0]

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-search mx-auto">
      <div
        className={`
          bg-bg-surface-elevated border border-border rounded-card shadow-search
          ${compact ? 'p-3' : 'p-4 md:p-5'}
          transition-shadow duration-250 ease-smooth
          hover:shadow-card-hover
        `}
      >
        {/* Desktop: single row — Mobile: stacked */}
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          {/* Origin + Swap + Destination */}
          <div className="flex items-center gap-1 flex-1 min-w-0">
            {/* Origin */}
            <div className="flex-1 min-w-0">
              <label
                htmlFor="search-origin"
                className="block font-heading text-overline text-text-tertiary uppercase tracking-widest mb-1"
              >
                From
              </label>
              <input
                id="search-origin"
                type="text"
                value={origin}
                onChange={(e) => setOrigin(e.target.value.toUpperCase())}
                placeholder="LAX"
                maxLength={5}
                className={`
                  w-full bg-transparent border-0 outline-none
                  font-heading text-h3 font-medium text-text-primary
                  placeholder:text-text-tertiary
                  ${compact ? 'text-label' : ''}
                `}
                autoComplete="off"
              />
            </div>

            {/* Swap button */}
            <button
              type="button"
              onClick={handleSwap}
              className="
                flex-shrink-0 p-2 rounded-full
                text-text-tertiary hover:text-accent-primary
                hover:bg-accent-primary-light dark:hover:bg-accent-primary/15
                transition-colors duration-200 ease-smooth
                mt-4
              "
              aria-label="Swap origin and destination"
            >
              <SwapIcon />
            </button>

            {/* Destination */}
            <div className="flex-1 min-w-0">
              <label
                htmlFor="search-destination"
                className="block font-heading text-overline text-text-tertiary uppercase tracking-widest mb-1"
              >
                To
              </label>
              <input
                id="search-destination"
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value.toUpperCase())}
                placeholder="NRT"
                maxLength={5}
                className={`
                  w-full bg-transparent border-0 outline-none
                  font-heading text-h3 font-medium text-text-primary
                  placeholder:text-text-tertiary
                  ${compact ? 'text-label' : ''}
                `}
                autoComplete="off"
              />
            </div>
          </div>

          {/* Divider — desktop only */}
          <div className="hidden md:block w-px h-10 bg-border self-center" />

          {/* Date */}
          <div className="flex-shrink-0 md:w-[160px]">
            <label
              htmlFor="search-date"
              className="block font-heading text-overline text-text-tertiary uppercase tracking-widest mb-1"
            >
              Date
            </label>
            <input
              id="search-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={minDate}
              className={`
                w-full bg-transparent border-0 outline-none
                font-body text-body-medium font-medium text-text-primary
                ${compact ? 'text-label' : ''}
              `}
            />
          </div>

          {/* Divider — desktop only */}
          <div className="hidden md:block w-px h-10 bg-border self-center" />

          {/* Cabin selector */}
          <div className="flex-shrink-0">
            <label
              className="block font-heading text-overline text-text-tertiary uppercase tracking-widest mb-1"
            >
              Cabin
            </label>
            <div className="flex gap-1">
              {CABIN_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setCabin(opt.value)}
                  className={`
                    px-3 py-1.5 rounded-chip font-heading text-label
                    transition-all duration-200 ease-smooth
                    ${
                      cabin === opt.value
                        ? 'bg-accent-primary text-white shadow-sm'
                        : 'text-text-secondary hover:bg-bg-subtle'
                    }
                  `}
                >
                  <span className="hidden sm:inline">{opt.label}</span>
                  <span className="sm:hidden">{opt.shortLabel}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Search button */}
          <button
            type="submit"
            disabled={!canSubmit || isLoading}
            className={`
              flex items-center justify-center gap-2
              px-6 py-3 md:px-8
              bg-accent-primary text-white font-heading text-label font-medium
              rounded-button
              transition-all duration-200 ease-smooth
              hover:bg-accent-primary-hover hover:shadow-button-accent
              active:scale-[0.98]
              disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none
              ${compact ? 'py-2' : ''}
            `}
          >
            {isLoading ? (
              <>
                <Spinner />
                <span className="hidden sm:inline">Searching…</span>
              </>
            ) : (
              <>
                <SearchIcon />
                <span className="hidden sm:inline">Search</span>
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  )
}
