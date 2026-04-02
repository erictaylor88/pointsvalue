'use client'

/**
 * ResultCard — Displays a single award flight result with CPM value.
 *
 * Shows: airline/program, route, CPM value (hero), deal quality badge,
 * miles cost, cash price comparison, and expandable detail section with
 * flight details (fetched from /api/trips) and booking links.
 */

import { useState, useCallback } from 'react'
import type { SearchResultItem } from '@/app/api/search/route'

// ---------------------------------------------------------------------------
// Trip Detail Types (from /api/trips/[id])
// ---------------------------------------------------------------------------

interface TripSegment {
  flightNumber: string
  origin: string
  destination: string
  departsAt: string
  arrivesAt: string
  aircraft: string
  aircraftCode: string
  fareClass: string
  cabin: string
  distance: number
}

interface TripOption {
  id: string
  cabin: string
  milesRequired: number
  totalTaxesCents: number
  taxesCurrency: string
  stops: number
  carriers: string
  flightNumbers: string
  totalDuration: number
  departsAt: string
  arrivesAt: string
  remainingSeats: number
  source: string
  segments: TripSegment[]
}

interface BookingLink {
  label: string
  link: string
  primary: boolean
}

interface TripDetailsResponse {
  trips: TripOption[]
  bookingLinks: BookingLink[]
}

// ---------------------------------------------------------------------------
// Deal Quality
// ---------------------------------------------------------------------------

type DealQuality = 'great' | 'fair' | 'below' | 'negative' | 'unknown'

function getDealQuality(item: SearchResultItem): DealQuality {
  if (!item.cpm.cashPriceAvailable) return 'unknown'
  return item.cpm.dealQuality as DealQuality
}

const DEAL_CONFIG: Record<DealQuality, { label: string; textClass: string; bgClass: string; dotColor: string }> = {
  great: { label: 'GREAT DEAL', textClass: 'text-deal-great', bgClass: 'bg-deal-great-bg', dotColor: 'bg-deal-great' },
  fair: { label: 'FAIR', textClass: 'text-deal-fair', bgClass: 'bg-deal-fair-bg', dotColor: 'bg-deal-fair' },
  below: { label: 'BELOW AVG', textClass: 'text-deal-below', bgClass: 'bg-deal-below-bg', dotColor: 'bg-deal-below' },
  negative: { label: 'PAY CASH', textClass: 'text-deal-negative', bgClass: 'bg-deal-negative-bg', dotColor: 'bg-deal-negative' },
  unknown: { label: 'NO CASH PRICE', textClass: 'text-text-tertiary', bgClass: 'bg-bg-subtle', dotColor: 'bg-text-tertiary' },
}

function DealBadge({ quality }: { quality: DealQuality }) {
  const config = DEAL_CONFIG[quality]
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 h-[26px] rounded-badge ${config.bgClass}`} role="status">
      <span className={`w-1.5 h-1.5 rounded-full ${config.dotColor}`} />
      <span className={`font-heading text-overline uppercase tracking-widest ${config.textClass}`}>{config.label}</span>
    </span>
  )
}

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg className={`w-4 h-4 transition-transform duration-300 ease-spring ${expanded ? 'rotate-180' : ''}`} viewBox="0 0 16 16" fill="none">
      <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ExternalLinkIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none">
      <path d="M10.5 7.5V11.5C10.5 12.05 10.05 12.5 9.5 12.5H2.5C1.95 12.5 1.5 12.05 1.5 11.5V4.5C1.5 3.95 1.95 3.5 2.5 3.5H6.5M8.5 1.5H12.5M12.5 1.5V5.5M12.5 1.5L5.5 8.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function PlaneIcon() {
  return (
    <svg className="w-3.5 h-3.5 text-text-tertiary flex-shrink-0" viewBox="0 0 14 14" fill="none">
      <path d="M12.5 5.5L8.5 7.5V11L10 12.5V13L7 12L4 13V12.5L5.5 11V7.5L1.5 5.5V4.5L5.5 5.5V2L4 0.5V0L7 1L10 0V0.5L8.5 2V5.5L12.5 4.5V5.5Z" fill="currentColor" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

function formatMiles(miles: number): string {
  return miles >= 1000 ? `${Math.round(miles / 1000)}K` : miles.toLocaleString()
}

function formatMilesExact(miles: number): string {
  return miles.toLocaleString()
}

function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function formatCurrencyExact(amount: number): string {
  return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatCpm(cpm: number): string { return cpm.toFixed(1) }

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function formatTime(isoString: string): string {
  try { return new Date(isoString).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) }
  catch { return isoString }
}

function formatDate(isoString: string): string {
  try { return new Date(isoString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }
  catch { return '' }
}

function getCpmColorClass(quality: DealQuality): string {
  switch (quality) {
    case 'great': return 'text-deal-great'
    case 'fair': return 'text-deal-fair'
    case 'negative': return 'text-deal-negative'
    default: return 'text-deal-below'
  }
}

function capitalize(s: string): string { return s.charAt(0).toUpperCase() + s.slice(1) }

// ---------------------------------------------------------------------------
// Flight Option Sub-component
// ---------------------------------------------------------------------------

function FlightOption({ trip }: { trip: TripOption }) {
  return (
    <div className="border border-border rounded-chip p-3 bg-bg-primary">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <span className="font-mono text-data-sm font-medium text-text-primary">{formatTime(trip.departsAt)}</span>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full border border-text-tertiary" />
            <div className="w-12 h-px bg-border relative">
              {trip.stops > 0 && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 font-body text-[10px] text-text-tertiary whitespace-nowrap">
                  {trip.stops === 0 ? 'nonstop' : `${trip.stops} stop${trip.stops > 1 ? 's' : ''}`}
                </span>
              )}
            </div>
            <div className="w-1.5 h-1.5 rounded-full bg-text-tertiary" />
          </div>
          <span className="font-mono text-data-sm font-medium text-text-primary">
            {formatTime(trip.arrivesAt)}
            {formatDate(trip.departsAt) !== formatDate(trip.arrivesAt) && (
              <span className="text-deal-fair text-[10px] ml-0.5 align-super">+1</span>
            )}
          </span>
        </div>
        <span className="font-body text-caption text-text-tertiary">{formatDuration(trip.totalDuration)}</span>
      </div>
      <div className="space-y-0.5">
        {trip.segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-2 font-body text-caption">
            <PlaneIcon />
            <span className="font-mono text-text-secondary">{seg.flightNumber}</span>
            <span className="text-text-tertiary">·</span>
            <span className="text-text-secondary">{seg.origin}→{seg.destination}</span>
            {seg.aircraft && (
              <>
                <span className="text-text-tertiary hidden sm:inline">·</span>
                <span className="text-text-tertiary hidden sm:inline">{seg.aircraft}</span>
              </>
            )}
          </div>
        ))}
      </div>
      {trip.remainingSeats > 0 && (
        <p className="mt-1.5 font-body text-caption text-deal-fair">
          {trip.remainingSeats} seat{trip.remainingSeats > 1 ? 's' : ''} at {formatMilesExact(trip.milesRequired)} miles
        </p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function ResultCard({ item }: { item: SearchResultItem }) {
  const [expanded, setExpanded] = useState(false)
  const [tripData, setTripData] = useState<TripDetailsResponse | null>(null)
  const [tripLoading, setTripLoading] = useState(false)
  const [tripError, setTripError] = useState<string | null>(null)
  const dealQuality = getDealQuality(item)
  const cpmColor = getCpmColorClass(dealQuality)

  const fetchTripDetails = useCallback(async () => {
    if (tripData || tripLoading) return
    setTripLoading(true)
    setTripError(null)
    try {
      const res = await fetch(`/api/trips/${item.availabilityTrips}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load flights')
      setTripData(data)
    } catch (err) {
      setTripError(err instanceof Error ? err.message : 'Failed to load flights')
    } finally {
      setTripLoading(false)
    }
  }, [item.availabilityTrips, tripData, tripLoading])

  const handleExpand = useCallback(() => {
    const next = !expanded
    setExpanded(next)
    if (next) fetchTripDetails()
  }, [expanded, fetchTripDetails])

  // Show all trips — routes/times/aircraft are the same regardless of cabin
  const displayTrips = tripData?.trips ?? []

  return (
    <div className="bg-bg-surface border border-border rounded-card shadow-card transition-all duration-250 ease-smooth hover:shadow-card-hover hover:-translate-y-0.5">
      <div className="p-5 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-1 min-w-0">
            <p className="font-heading text-overline text-text-tertiary uppercase tracking-widest mb-1">
              {capitalize(item.source)}
              {item.airlines && item.airlines !== item.source && <span> · {item.airlines}</span>}
            </p>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-heading text-h2 font-bold text-text-primary">{item.origin}</span>
              <svg width="24" height="2" viewBox="0 0 24 2" className="text-text-tertiary"><line x1="0" y1="1" x2="24" y2="1" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" /></svg>
              <span className="font-heading text-h2 font-bold text-text-primary">{item.destination}</span>
            </div>
            <p className="font-body text-caption text-text-secondary">
              {item.date} · {capitalize(item.cabin)}
              {item.remainingSeats > 0 && item.remainingSeats < 10 && <span className="text-deal-fair"> · {item.remainingSeats} seat{item.remainingSeats > 1 ? 's' : ''} left</span>}
              {!item.availabilityConfirmed && <span className="text-deal-fair"> · Verify on airline site</span>}
            </p>
          </div>

          <div className="flex md:flex-col items-baseline md:items-end gap-3 md:gap-1">
            <div className="flex items-baseline gap-1">
              <span className="font-mono text-data font-medium text-text-primary">{formatMiles(item.milesRequired)}</span>
              <span className="font-body text-caption text-text-tertiary">mi</span>
            </div>
            {item.taxesUsd > 0 && <p className="font-mono text-data-sm text-text-tertiary">+{formatCurrencyExact(item.taxesUsd)} tax</p>}
            {item.cashPrice !== null && (
              <p className="font-body text-caption text-text-secondary md:mt-1">
                Cash: <span className="font-mono font-medium">{formatCurrency(item.cashPrice)}</span>
              </p>
            )}
          </div>

          <div className="flex items-center md:flex-col md:items-end gap-3 md:gap-2">
            {item.cpm.cashPriceAvailable ? (
              <div className="flex items-baseline gap-1">
                <span className={`font-mono text-data-hero font-medium ${cpmColor}`}>{formatCpm(item.cpm.cpm)}</span>
                <span className="font-body text-caption text-text-tertiary">¢/mi</span>
              </div>
            ) : (
              <span className="font-mono text-data text-text-tertiary">— ¢/mi</span>
            )}
            <DealBadge quality={dealQuality} />
          </div>
        </div>
      </div>

      <div className="border-t border-border">
        <button type="button" onClick={handleExpand}
          className="w-full flex items-center justify-center gap-2 px-5 py-3 font-heading text-label text-text-tertiary hover:text-text-secondary hover:bg-bg-subtle transition-colors duration-200 ease-smooth"
          aria-expanded={expanded}>
          <span>{expanded ? 'Hide details' : 'Flights & math'}</span>
          <ChevronIcon expanded={expanded} />
        </button>

        {expanded && (
          <div className="px-5 pb-5 space-y-4">
            {tripData?.bookingLinks && tripData.bookingLinks.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tripData.bookingLinks.map((link, i) => (
                  <a key={i} href={link.link} target="_blank" rel="noopener noreferrer"
                    className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-button font-heading text-label transition-all duration-200 ease-smooth ${
                      link.primary ? 'bg-accent-primary text-white hover:bg-accent-primary-hover hover:shadow-button-accent' : 'border border-border text-text-secondary hover:bg-bg-subtle'
                    }`}>
                    {link.label}<ExternalLinkIcon />
                  </a>
                ))}
              </div>
            )}

            {tripLoading && (
              <div className="space-y-3">
                {[1, 2].map((n) => (
                  <div key={n} className="border border-border rounded-chip p-3 animate-pulse">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="h-4 w-16 bg-bg-muted rounded" /><div className="h-px w-12 bg-bg-muted" /><div className="h-4 w-16 bg-bg-muted rounded" />
                      <div className="flex-1" /><div className="h-3 w-10 bg-bg-muted rounded" />
                    </div>
                    <div className="h-3 w-48 bg-bg-muted rounded" />
                  </div>
                ))}
              </div>
            )}

            {tripError && <p className="font-body text-caption text-deal-negative">{tripError}</p>}

            {displayTrips.length > 0 && (
              <div>
                <p className="font-heading text-overline text-text-tertiary uppercase tracking-widest mb-2">
                  {displayTrips.length} flight option{displayTrips.length > 1 ? 's' : ''}
                </p>
                <div className="space-y-2">
                  {displayTrips.slice(0, 8).map((trip) => <FlightOption key={trip.id} trip={trip} />)}
                  {displayTrips.length > 8 && <p className="font-body text-caption text-text-tertiary text-center">+{displayTrips.length - 8} more options</p>}
                </div>
              </div>
            )}

            {tripData && displayTrips.length === 0 && !tripLoading && (
              <p className="font-body text-caption text-text-tertiary">No flight details available for this route.</p>
            )}

            <div className="bg-bg-subtle rounded-chip p-4">
              <p className="font-heading text-overline text-text-tertiary uppercase tracking-widest mb-2">Value calculation</p>
              {item.cpm.cashPriceAvailable ? (
                <>
                  <p className="font-mono text-data-sm text-text-secondary mb-3">
                    ({formatCurrency(item.cashPrice!)} − {formatCurrencyExact(item.taxesUsd)}) ÷ {formatMilesExact(item.milesRequired)} × 100 ={' '}
                    <span className={`font-medium ${cpmColor}`}>{formatCpm(item.cpm.cpm)}¢/mi</span>
                  </p>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                    <div><span className="font-body text-caption text-text-tertiary">Cash price</span><p className="font-mono text-data-sm text-text-primary">{formatCurrency(item.cashPrice!)}</p></div>
                    <div><span className="font-body text-caption text-text-tertiary">Miles required</span><p className="font-mono text-data-sm text-text-primary">{formatMilesExact(item.milesRequired)}</p></div>
                    <div><span className="font-body text-caption text-text-tertiary">Taxes & fees</span><p className="font-mono text-data-sm text-text-primary">{formatCurrencyExact(item.taxesUsd)}</p></div>
                    <div><span className="font-body text-caption text-text-tertiary">Program</span><p className="font-body text-data-sm text-text-primary">{capitalize(item.source)}</p></div>
                    {item.cpm.baselineCpm !== null && (
                      <div><span className="font-body text-caption text-text-tertiary">Baseline value</span><p className="font-mono text-data-sm text-text-primary">{item.cpm.baselineCpm.toFixed(1)}¢/mi</p></div>
                    )}
                    {item.cpm.baselineCpm !== null && item.cpm.baselinePercent !== null && (
                      <div><span className="font-body text-caption text-text-tertiary">vs. baseline</span>
                        <p className={`font-mono text-data-sm ${item.cpm.baselinePercent >= 100 ? 'text-deal-great' : 'text-deal-below'}`}>
                          {item.cpm.baselinePercent >= 100 ? '+' : ''}{Math.round(item.cpm.baselinePercent - 100)}%
                        </p>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <p className="font-body text-body text-text-secondary">Cash price unavailable for this route and date. CPM can&apos;t be calculated without a cash price.</p>
              )}
              <div className="mt-3 pt-3 border-t border-border">
                <p className="font-body text-caption text-text-tertiary">
                  Award data from Seats.aero{item.cashPriceSource === 'google_flights' && ' · Cash price from Google Flights'}
                  {item.lastSeen && <> · Last seen {new Date(item.lastSeen).toLocaleDateString()}</>}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
