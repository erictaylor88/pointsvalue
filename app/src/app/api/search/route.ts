/**
 * Search API Route — /api/search
 *
 * Orchestrates the full data pipeline:
 * 1. Check Supabase cache for recent results
 * 2. If cache miss: query Seats.aero for award availability
 * 3. Query Railway Python service for cash pricing
 * 4. Compute CPM for each result
 * 5. Rank by CPM value
 * 6. Cache results in Supabase
 * 7. Return to client
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import {
  getCachedResults,
  cacheResults,
} from '@/lib/cache'
import {
  searchAvailability,
  extractCabinData,
  type CabinClass,
  type SeatsAeroAvailability,
} from '@/lib/seats-aero'
import {
  computeCPM,
  getBaselineCpm,
  type CPMCalculation,
  type ProgramValuation,
} from '@/lib/cpm'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SearchParams {
  origin: string
  destination: string
  date: string
  cabin: CabinClass
}

interface FlightPricingResult {
  price: number | null
  airline: string | null
  departure: string | null
  arrival: string | null
  duration: string | null
  stops: number | null
  is_best: boolean
}

interface FlightPricingResponse {
  origin: string
  destination: string
  date: string
  cabin: string
  flights: FlightPricingResult[]
  current_price: string | null
  source: string
  fetched_at: string
}

export interface SearchResultItem {
  // Identification
  id: string
  availabilityId: string
  // Route
  origin: string
  destination: string
  date: string
  // Program & airline
  source: string              // program key (e.g., "united")
  airlines: string
  // Award details
  cabin: CabinClass
  milesRequired: number
  milesDisplay: string
  taxesCents: number
  taxesUsd: number
  taxesCurrency: string
  remainingSeats: number
  // Cash pricing
  cashPrice: number | null
  cashPriceSource: string
  // CPM calculation (shows the work)
  cpm: CPMCalculation
  // Metadata
  isDirect: boolean
  availabilityConfirmed: boolean  // true if program reports seats available, false if stale/uncertain
  lastSeen: string
  availabilityTrips: string   // ID for fetching trip details
}

interface SearchResponse {
  results: SearchResultItem[]
  meta: {
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
}

// ---------------------------------------------------------------------------
// Flight Pricing (Railway Python Service)
// ---------------------------------------------------------------------------

async function fetchCashPricing(
  params: SearchParams
): Promise<FlightPricingResponse | null> {
  const flightPricingUrl = process.env.FLIGHT_PRICING_API_URL
  if (!flightPricingUrl) {
    console.warn('FLIGHT_PRICING_API_URL not set — skipping cash pricing')
    return null
  }

  try {
    const response = await fetch(`${flightPricingUrl}/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        origin: params.origin.toUpperCase(),
        destination: params.destination.toUpperCase(),
        date: params.date,
        cabin: params.cabin,
      }),
    })

    if (!response.ok) {
      const body = await response.text().catch(() => 'no body')
      console.error(`Flight pricing service error: ${response.status} — ${body}`)
      return null
    }

    return response.json()
  } catch (err) {
    console.error('Flight pricing service unreachable:', err)
    return null
  }
}

/**
 * Find the best cash price match for a route.
 * Returns the lowest cash price from the pricing results.
 */
function findBestCashPrice(
  pricingResponse: FlightPricingResponse | null
): number | null {
  if (!pricingResponse?.flights?.length) return null

  const prices = pricingResponse.flights
    .map((f) => f.price)
    .filter((p): p is number => p !== null && p > 0)

  if (prices.length === 0) return null

  return Math.min(...prices)
}

// ---------------------------------------------------------------------------
// Program Valuations
// ---------------------------------------------------------------------------

async function loadProgramValuations(): Promise<Map<string, ProgramValuation>> {
  try {
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('program_valuations')
      .select('program, program_display_name, economy_cpp, premium_cpp, business_cpp, first_cpp')

    if (error || !data) return new Map()

    const map = new Map<string, ProgramValuation>()
    for (const row of data) {
      map.set(row.program, row as ProgramValuation)
    }
    return map
  } catch {
    return new Map()
  }
}

// ---------------------------------------------------------------------------
// Result Assembly
// ---------------------------------------------------------------------------

function assembleResults(
  availabilities: SeatsAeroAvailability[],
  cabin: CabinClass,
  cashPrice: number | null,
  valuations: Map<string, ProgramValuation>
): SearchResultItem[] {
  const results: SearchResultItem[] = []

  for (const avail of availabilities) {
    const cabinData = extractCabinData(avail, cabin)

    // Skip only if no mileage cost at all — means no data for this cabin
    if (cabinData.mileageCost <= 0) continue

    // Look up baseline for this program
    const valuation = valuations.get(avail.Source) || null
    const baselineCpm = getBaselineCpm(valuation, cabin)

    // Compute CPM
    const cpm = computeCPM(
      cabinData.mileageCost,
      cashPrice,
      cabinData.totalTaxesCents,
      baselineCpm
    )

    results.push({
      id: `${avail.ID}-${cabin}`,
      availabilityId: avail.ID,
      origin: avail.Route.OriginAirport,
      destination: avail.Route.DestinationAirport,
      date: avail.Date,
      source: avail.Source,
      airlines: cabinData.airlines,
      cabin,
      milesRequired: cabinData.mileageCost,
      milesDisplay: cabinData.mileageCostDisplay,
      taxesCents: cabinData.totalTaxesCents,
      taxesUsd: cabinData.totalTaxesCents / 100,
      taxesCurrency: avail.TaxesCurrency || 'USD',
      remainingSeats: cabinData.remainingSeats,
      cashPrice,
      cashPriceSource: cashPrice !== null ? 'google_flights' : 'unavailable',
      cpm,
      isDirect: false, // Will be enriched from trip details if needed
      availabilityConfirmed: cabinData.available,
      lastSeen: avail.UpdatedAt || avail.CreatedAt,
      availabilityTrips: avail.AvailabilityTrips || avail.ID,
    })
  }

  // Sort by CPM descending (best deals first)
  // Results with no cash price go to the end
  results.sort((a, b) => {
    if (!a.cpm.cashPriceAvailable && !b.cpm.cashPriceAvailable) return 0
    if (!a.cpm.cashPriceAvailable) return 1
    if (!b.cpm.cashPriceAvailable) return -1
    return b.cpm.cpm - a.cpm.cpm
  })

  return results
}

// ---------------------------------------------------------------------------
// Request Validation
// ---------------------------------------------------------------------------

function validateParams(searchParams: URLSearchParams): SearchParams | { error: string } {
  const origin = searchParams.get('origin')?.trim().toUpperCase()
  const destination = searchParams.get('destination')?.trim().toUpperCase()
  const date = searchParams.get('date')?.trim()
  const cabin = (searchParams.get('cabin')?.trim().toLowerCase() || 'economy') as CabinClass

  if (!origin || origin.length < 3) {
    return { error: 'origin is required (IATA airport code)' }
  }
  if (!destination || destination.length < 3) {
    return { error: 'destination is required (IATA airport code)' }
  }
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { error: 'date is required (YYYY-MM-DD format)' }
  }
  if (!['economy', 'premium', 'business', 'first'].includes(cabin)) {
    return { error: 'cabin must be one of: economy, premium, business, first' }
  }

  return { origin, destination, date, cabin }
}

// ---------------------------------------------------------------------------
// Route Handler
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const startTime = Date.now()

  // Validate params
  const params = validateParams(request.nextUrl.searchParams)
  if ('error' in params) {
    return NextResponse.json({ error: params.error }, { status: 400 })
  }

  try {
    // 1. Check cache
    const cached = await getCachedResults<SearchResultItem[]>(params)
    if (cached) {
      return NextResponse.json({
        results: cached.results,
        meta: {
          origin: params.origin,
          destination: params.destination,
          date: params.date,
          cabin: params.cabin,
          totalResults: cached.results.length,
          cachedAt: cached.cachedAt,
          expiresAt: cached.expiresAt,
          seatsAeroRateLimit: null,
          searchDurationMs: Date.now() - startTime,
        },
      } satisfies SearchResponse)
    }

    // 2. Parallel fetch: Seats.aero + cash pricing + program valuations
    const [seatsResult, pricingResult, valuations] = await Promise.all([
      searchAvailability({
        origin: params.origin,
        destination: params.destination,
        cabin: params.cabin,
        startDate: params.date,
      }),
      fetchCashPricing(params),
      loadProgramValuations(),
    ])

    // 3. Find best cash price
    const bestCashPrice = findBestCashPrice(pricingResult)

    // 4. Assemble results with CPM computation
    const results = assembleResults(
      seatsResult.data,
      params.cabin,
      bestCashPrice,
      valuations
    )

    // Debug: when no results pass filtering, include diagnostic info
    const debug = results.length === 0 && seatsResult.data.length > 0 ? {
      rawResultCount: seatsResult.data.length,
      sampleRaw: seatsResult.data.slice(0, 2).map((a) => {
        const prefix = params.cabin === 'economy' ? 'Y' : params.cabin === 'premium' ? 'W' : params.cabin === 'business' ? 'J' : 'F'
        const raw = a as unknown as Record<string, unknown>
        return {
          id: a.ID,
          source: a.Source,
          [`${prefix}Available`]: raw[`${prefix}Available`],
          [`${prefix}MileageCost`]: raw[`${prefix}MileageCost`],
          [`${prefix}MileageCostRaw`]: raw[`${prefix}MileageCostRaw`],
          [`${prefix}RemainingSeats`]: raw[`${prefix}RemainingSeats`],
          allKeys: Object.keys(a).filter(k => k.startsWith(prefix)),
        }
      }),
    } : undefined

    // 5. Cache results (non-blocking, skip if empty to avoid caching failures)
    if (results.length > 0) {
      cacheResults(params, results, seatsResult, pricingResult).catch(() => {})
    }

    // 6. Return response
    return NextResponse.json({
      results,
      meta: {
        origin: params.origin,
        destination: params.destination,
        date: params.date,
        cabin: params.cabin,
        totalResults: results.length,
        cachedAt: null,
        expiresAt: null,
        seatsAeroRateLimit: seatsResult.rateLimitRemaining,
        searchDurationMs: Date.now() - startTime,
      },
      ...(debug ? { debug } : {}),
    } satisfies SearchResponse & { debug?: unknown })
  } catch (err) {
    console.error('Search failed:', err)
    const message = err instanceof Error ? err.message : 'Search failed'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
