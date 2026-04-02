'use client'

/**
 * ResultCard — Displays a single award flight result with CPM value.
 *
 * Shows: airline/program, route, CPM value (hero), deal quality badge,
 * miles cost, cash price comparison, and expandable "show the math" section.
 */

import { useState } from 'react'
import type { SearchResultItem } from '@/app/api/search/route'

// ---------------------------------------------------------------------------
// Deal Quality Badge
// ---------------------------------------------------------------------------

type DealQuality = 'great' | 'fair' | 'below' | 'negative' | 'unknown'

function getDealQuality(item: SearchResultItem): DealQuality {
  if (!item.cpm.cashPriceAvailable) return 'unknown'
  return item.cpm.dealQuality as DealQuality
}

const DEAL_CONFIG: Record<
  DealQuality,
  { label: string; textClass: string; bgClass: string; dotColor: string }
> = {
  great: {
    label: 'GREAT DEAL',
    textClass: 'text-deal-great',
    bgClass: 'bg-deal-great-bg',
    dotColor: 'bg-deal-great',
  },
  fair: {
    label: 'FAIR',
    textClass: 'text-deal-fair',
    bgClass: 'bg-deal-fair-bg',
    dotColor: 'bg-deal-fair',
  },
  below: {
    label: 'BELOW AVG',
    textClass: 'text-deal-below',
    bgClass: 'bg-deal-below-bg',
    dotColor: 'bg-deal-below',
  },
  negative: {
    label: 'PAY CASH',
    textClass: 'text-deal-negative',
    bgClass: 'bg-deal-negative-bg',
    dotColor: 'bg-deal-negative',
  },
  unknown: {
    label: 'NO CASH PRICE',
    textClass: 'text-text-tertiary',
    bgClass: 'bg-bg-subtle',
    dotColor: 'bg-text-tertiary',
  },
}

function DealBadge({ quality }: { quality: DealQuality }) {
  const config = DEAL_CONFIG[quality]
  return (
    <span
      className={`
        inline-flex items-center gap-1.5 px-2.5 h-[26px]
        rounded-badge ${config.bgClass}
      `}
      role="status"
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dotColor}`} />
      <span
        className={`font-heading text-overline uppercase tracking-widest ${config.textClass}`}
      >
        {config.label}
      </span>
    </span>
  )
}

// ---------------------------------------------------------------------------
// Chevron icon
// ---------------------------------------------------------------------------

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      className={`w-4 h-4 transition-transform duration-300 ease-spring ${
        expanded ? 'rotate-180' : ''
      }`}
      viewBox="0 0 16 16"
      fill="none"
    >
      <path
        d="M4 6L8 10L12 6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

function formatMiles(miles: number): string {
  return miles.toLocaleString()
}

function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function formatCpm(cpm: number): string {
  return cpm.toFixed(1)
}

/** Get a CPM color class based on deal quality */
function getCpmColorClass(quality: DealQuality): string {
  switch (quality) {
    case 'great':
      return 'text-deal-great'
    case 'fair':
      return 'text-deal-fair'
    case 'below':
      return 'text-deal-below'
    case 'negative':
      return 'text-deal-negative'
    default:
      return 'text-text-tertiary'
  }
}

/** Capitalize first letter */
function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ResultCard({ item }: { item: SearchResultItem }) {
  const [expanded, setExpanded] = useState(false)
  const dealQuality = getDealQuality(item)
  const cpmColor = getCpmColorClass(dealQuality)

  return (
    <div
      className="
        bg-bg-surface border border-border rounded-card shadow-card
        transition-all duration-250 ease-smooth
        hover:shadow-card-hover hover:-translate-y-0.5
      "
    >
      {/* Main card content */}
      <div className="p-5 md:p-6">
        {/* Desktop: 3-column — Mobile: stacked */}
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          {/* Left: Program + Route */}
          <div className="flex-1 min-w-0">
            {/* Program badge */}
            <p className="font-heading text-overline text-text-tertiary uppercase tracking-widest mb-1">
              {capitalize(item.source)}
              {item.airlines && item.airlines !== item.source && (
                <span className="text-text-tertiary"> · {item.airlines}</span>
              )}
            </p>

            {/* Route */}
            <div className="flex items-center gap-2 mb-1">
              <span className="font-heading text-h2 font-bold text-text-primary">
                {item.origin}
              </span>
              <span className="flex-shrink-0">
                <svg width="24" height="2" viewBox="0 0 24 2" className="text-text-tertiary">
                  <line
                    x1="0"
                    y1="1"
                    x2="24"
                    y2="1"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                  />
                </svg>
              </span>
              <span className="font-heading text-h2 font-bold text-text-primary">
                {item.destination}
              </span>
            </div>

            {/* Date + cabin + seats */}
            <p className="font-body text-caption text-text-secondary">
              {item.date} · {capitalize(item.cabin)}
              {item.remainingSeats > 0 && item.remainingSeats < 10 && (
                <span className="text-deal-fair"> · {item.remainingSeats} seat{item.remainingSeats > 1 ? 's' : ''} left</span>
              )}
            </p>
          </div>

          {/* Center: Miles cost + Cash price */}
          <div className="flex md:flex-col items-baseline md:items-end gap-3 md:gap-1">
            <div className="flex items-baseline gap-1">
              <span className="font-mono text-data font-medium text-text-primary">
                {formatMiles(item.milesRequired)}
              </span>
              <span className="font-body text-caption text-text-tertiary">mi</span>
            </div>
            {item.taxesUsd > 0 && (
              <p className="font-mono text-data-sm text-text-tertiary">
                +{formatCurrency(item.taxesUsd)} tax
              </p>
            )}
            {item.cashPrice !== null && (
              <p className="font-body text-caption text-text-secondary md:mt-1">
                Cash: <span className="font-mono">{formatCurrency(item.cashPrice)}</span>
              </p>
            )}
          </div>

          {/* Right: CPM value + Deal badge */}
          <div className="flex items-center md:flex-col md:items-end gap-3 md:gap-2">
            {item.cpm.cashPriceAvailable ? (
              <div className="flex items-baseline gap-1">
                <span
                  className={`font-mono text-data-hero font-medium ${cpmColor}`}
                  aria-label={`${formatCpm(item.cpm.cpm)} cents per mile, ${dealQuality} deal`}
                >
                  {formatCpm(item.cpm.cpm)}
                </span>
                <span className="font-body text-caption text-text-tertiary">¢/mi</span>
              </div>
            ) : (
              <span className="font-mono text-data text-text-tertiary">— ¢/mi</span>
            )}
            <DealBadge quality={dealQuality} />
          </div>
        </div>
      </div>

      {/* Show the math — expandable */}
      <div className="border-t border-border">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="
            w-full flex items-center justify-center gap-2
            px-5 py-3
            font-heading text-label text-text-tertiary
            hover:text-text-secondary hover:bg-bg-subtle
            transition-colors duration-200 ease-smooth
          "
          aria-expanded={expanded}
          aria-controls={`math-${item.id}`}
        >
          <span>Show the math</span>
          <ChevronIcon expanded={expanded} />
        </button>

        {expanded && (
          <div
            id={`math-${item.id}`}
            className="px-5 pb-5 animate-in fade-in duration-200"
          >
            <div className="bg-bg-subtle rounded-chip p-4">
              {item.cpm.cashPriceAvailable ? (
                <>
                  {/* Formula */}
                  <p className="font-mono text-data-sm text-text-secondary mb-3">
                    ({formatCurrency(item.cashPrice!)} − {formatCurrency(item.taxesUsd)}) ÷{' '}
                    {formatMiles(item.milesRequired)} × 100 ={' '}
                    <span className={`font-medium ${cpmColor}`}>
                      {formatCpm(item.cpm.cpm)}¢/mi
                    </span>
                  </p>

                  {/* Breakdown */}
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                    <div>
                      <span className="font-body text-caption text-text-tertiary">Cash price</span>
                      <p className="font-mono text-data-sm text-text-primary">{formatCurrency(item.cashPrice!)}</p>
                    </div>
                    <div>
                      <span className="font-body text-caption text-text-tertiary">Miles required</span>
                      <p className="font-mono text-data-sm text-text-primary">{formatMiles(item.milesRequired)}</p>
                    </div>
                    <div>
                      <span className="font-body text-caption text-text-tertiary">Taxes & fees</span>
                      <p className="font-mono text-data-sm text-text-primary">{formatCurrency(item.taxesUsd)}</p>
                    </div>
                    <div>
                      <span className="font-body text-caption text-text-tertiary">Program</span>
                      <p className="font-body text-data-sm text-text-primary">{capitalize(item.source)}</p>
                    </div>
                    {item.cpm.baselineCpm !== null && (
                      <div>
                        <span className="font-body text-caption text-text-tertiary">Baseline value</span>
                        <p className="font-mono text-data-sm text-text-primary">{item.cpm.baselineCpm.toFixed(1)}¢/mi</p>
                      </div>
                    )}
                    {item.cpm.baselineCpm !== null && item.cpm.baselinePercent !== null && (
                      <div>
                        <span className="font-body text-caption text-text-tertiary">vs. baseline</span>
                        <p className={`font-mono text-data-sm ${
                          item.cpm.baselinePercent >= 100 ? 'text-deal-great' : 'text-deal-below'
                        }`}>
                          {item.cpm.baselinePercent >= 100 ? '+' : ''}
                          {Math.round(item.cpm.baselinePercent - 100)}%
                        </p>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <p className="font-body text-body text-text-secondary">
                  Cash price unavailable for this route and date. The CPM value
                  can&apos;t be calculated without a cash price to compare against.
                </p>
              )}

              {/* Data source and freshness */}
              <div className="mt-3 pt-3 border-t border-border">
                <p className="font-body text-caption text-text-tertiary">
                  Award data from Seats.aero
                  {item.cashPriceSource === 'google_flights' && ' · Cash price from Google Flights'}
                  {item.lastSeen && (
                    <> · Last seen {new Date(item.lastSeen).toLocaleDateString()}</>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
