/**
 * Search API Route — /api/search
 *
 * Orchestrates the full data pipeline:
 * 1. Check Supabase cache for recent results
 * 2. If cache miss: query Seats.aero for award availability
 * 3. Query SerpAPI Google Flights for cash pricing
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
import {
  searchCashPricing,
  findLowestCashPrice,
} from '@/lib/serpapi'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SearchParams {
  origin: string
  destination: string
  date: string
  cabin: CabinClass
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
  cashPriceSource: string,
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
      cashPriceSource,
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

    // 2. Parallel fetch: Seats.aero + SerpAPI cash pricing + program valuations
    const [seatsResult, pricingResult, valuations] = await Promise.all([
      searchAvailability({
        origin: params.origin,
        destination: params.destination,
        cabin: params.cabin,
        startDate: params.date,
      }),
      searchCashPricing(
        params.origin,
        params.destination,
        params.date,
        params.cabin
      ),
      loadProgramValuations(),
    ])

    // 3. Find best cash price — with economy fallback for premium cabins
    let bestCashPrice = findLowestCashPrice(pricingResult)
    let cashPriceSource: 'serpapi' | 'serpapi_economy_ref' | 'unavailable' =
      bestCashPrice !== null ? 'serpapi' : 'unavailable'

    // If no cash price for the searched cabin, try economy as a reference
    if (bestCashPrice === null && params.cabin !== 'economy') {
      const fallbackPricing = await searchCashPricing(
        params.origin,
        params.destination,
        params.date,
        'economy'
      )
      const fallbackPrice = findLowestCashPrice(fallbackPricing)
      if (fallbackPrice !== null) {
        bestCashPrice = fallbackPrice
        cashPriceSource = 'serpapi_economy_ref'
      }
    }

    // 4. Assemble results with CPM computation
    const results = assembleResults(
      seatsResult.data,
      params.cabin,
      bestCashPrice,
      cashPriceSource,
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
