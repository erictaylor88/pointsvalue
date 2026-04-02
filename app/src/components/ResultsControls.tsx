'use client'

/**
 * ResultsControls — Cabin quick-switch + sort control for search results.
 *
 * Cabin switch: segmented control that triggers a new search with the same
 * route/date but different cabin class. Avoids needing to re-open the search form.
 *
 * Sort: client-side sorting of loaded results.
 * Desktop: segmented control. Mobile: select dropdown.
 *
 * Per Aperture spec: placed in the "Active Filters" bar below the sticky search.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CabinClass = 'economy' | 'premium' | 'business' | 'first'

export type SortOption = 'best_value' | 'lowest_miles' | 'lowest_cash' | 'lowest_taxes'

interface ResultsControlsProps {
  /** Current cabin from the active search */
  activeCabin: CabinClass
  /** Callback to trigger a new search with a different cabin */
  onCabinChange: (cabin: CabinClass) => void
  /** Current sort selection */
  activeSort: SortOption
  /** Callback when sort changes */
  onSortChange: (sort: SortOption) => void
  /** Whether a search is currently loading */
  isLoading?: boolean
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

const SORT_OPTIONS: { value: SortOption; label: string; shortLabel: string }[] = [
  { value: 'best_value', label: 'Best Value', shortLabel: 'Value' },
  { value: 'lowest_miles', label: 'Lowest Miles', shortLabel: 'Miles' },
  { value: 'lowest_cash', label: 'Lowest Cash', shortLabel: 'Cash' },
  { value: 'lowest_taxes', label: 'Lowest Taxes', shortLabel: 'Taxes' },
]

// ---------------------------------------------------------------------------
// Sort icon
// ---------------------------------------------------------------------------

function SortIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none">
      <path
        d="M1.5 4.5H12.5M3.5 7.5H10.5M5.5 10.5H8.5"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ResultsControls({
  activeCabin,
  onCabinChange,
  activeSort,
  onSortChange,
  isLoading = false,
}: ResultsControlsProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      {/* Cabin quick-switch */}
      <div className="flex items-center gap-2">
        <span className="font-heading text-overline text-text-tertiary uppercase tracking-widest flex-shrink-0">
          Cabin
        </span>
        <div className="flex gap-1 bg-bg-subtle rounded-chip p-0.5">
          {CABIN_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onCabinChange(opt.value)}
              disabled={isLoading}
              className={`
                px-2.5 py-1 rounded-badge font-heading text-label
                transition-all duration-150 ease-smooth
                disabled:opacity-60 disabled:cursor-not-allowed
                ${
                  activeCabin === opt.value
                    ? 'bg-bg-surface-elevated text-text-primary shadow-sm'
                    : 'text-text-secondary hover:text-text-primary'
                }
              `}
            >
              <span className="hidden sm:inline">{opt.label}</span>
              <span className="sm:hidden">{opt.shortLabel}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Sort control */}
      <div className="flex items-center gap-2">
        <span className="font-heading text-overline text-text-tertiary uppercase tracking-widest flex-shrink-0 flex items-center gap-1">
          <SortIcon />
          Sort
        </span>

        {/* Desktop: segmented control */}
        <div className="hidden md:flex gap-1 bg-bg-subtle rounded-chip p-0.5">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onSortChange(opt.value)}
              className={`
                px-2.5 py-1 rounded-badge font-heading text-label
                transition-all duration-150 ease-smooth
                ${
                  activeSort === opt.value
                    ? 'bg-bg-surface-elevated text-text-primary shadow-sm'
                    : 'text-text-secondary hover:text-text-primary'
                }
              `}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Mobile: select dropdown */}
        <select
          value={activeSort}
          onChange={(e) => onSortChange(e.target.value as SortOption)}
          className="
            md:hidden
            bg-bg-subtle border border-border rounded-chip
            px-3 py-1.5
            font-heading text-label text-text-primary
            outline-none focus:ring-2 focus:ring-accent-primary
            appearance-none
            bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20viewBox%3D%220%200%2016%2016%22%20fill%3D%22%2394A3B8%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M4%206L8%2010L12%206%22%20stroke%3D%22%2394A3B8%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20fill%3D%22none%22%2F%3E%3C%2Fsvg%3E')]
            bg-[length:16px_16px]
            bg-[position:right_8px_center]
            bg-no-repeat
            pr-7
          "
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
