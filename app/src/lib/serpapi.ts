/**
 * SerpAPI Google Flights Client
 *
 * Replaces the Railway Python service (fast-flights) for cash pricing.
 * Called directly from Next.js API routes — no external service needed.
 *
 * API docs: https://serpapi.com/google-flights-api
 * Response docs: https://serpapi.com/google-flights-results
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** SerpAPI travel_class parameter mapping */
const CABIN_MAP: Record<string, number> = {
  economy: 1,
  premium: 2,
  business: 3,
  first: 4,
}

interface SerpApiAirport {
  name: string
  id: string
  time: string
}

interface SerpApiFlight {
  departure_airport: SerpApiAirport
  arrival_airport: SerpApiAirport
  duration: number
  airplane: string
  airline: string
  airline_logo: string
  travel_class: string
  flight_number: string
  legroom?: string
  extensions?: string[]
}

interface SerpApiFlightGroup {
  flights: SerpApiFlight[]
  total_duration: number
  price: number
  type?: string
  airline_logo?: string
  carbon_emissions?: {
    this_flight: number
    typical_for_this_route: number
    difference_percent: number
  }
  layovers?: Array<{
    name: string
    duration: number
  }>
}

interface SerpApiPriceInsights {
  lowest_price: number
  price_level?: string        // "low", "typical", "high"
  typical_price_range?: [number, number]
}

interface SerpApiResponse {
  best_flights?: SerpApiFlightGroup[]
  other_flights?: SerpApiFlightGroup[]
  price_insights?: SerpApiPriceInsights
  search_metadata?: {
    status: string
    id: string
  }
  error?: string
}

// ---------------------------------------------------------------------------
// Public interface (matches the shape the search route expects)
// ---------------------------------------------------------------------------

export interface CashFlightResult {
  price: number | null
  airline: string | null
  departure: string | null
  arrival: string | null
  duration: string | null
  stops: number | null
  isBest: boolean
}

export interface CashPricingResponse {
  origin: string
  destination: string
  date: string
  cabin: string
  flights: CashFlightResult[]
  currentPrice: string | null   // "low", "typical", "high" from price_insights
  lowestPrice: number | null    // From price_insights
  source: 'serpapi'
  fetchedAt: string
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

/**
 * Format duration in minutes to human-readable string (e.g., "10h 35m")
 */
function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

/**
 * Search Google Flights via SerpAPI for cash pricing.
 *
 * @param origin - IATA airport code (e.g., "LAX")
 * @param destination - IATA airport code (e.g., "NRT")
 * @param date - Travel date in YYYY-MM-DD format
 * @param cabin - Cabin class: "economy" | "premium" | "business" | "first"
 * @returns Cash pricing response or null on failure
 */
export async function searchCashPricing(
  origin: string,
  destination: string,
  date: string,
  cabin: string
): Promise<CashPricingResponse | null> {
  const apiKey = process.env.SERPAPI_KEY
  if (!apiKey) {
    console.warn('SERPAPI_KEY not set — skipping cash pricing')
    return null
  }

  const travelClass = CABIN_MAP[cabin] ?? 1

  const params = new URLSearchParams({
    engine: 'google_flights',
    departure_id: origin.toUpperCase(),
    arrival_id: destination.toUpperCase(),
    outbound_date: date,
    type: '2',              // one-way
    travel_class: String(travelClass),
    currency: 'USD',
    hl: 'en',
    api_key: apiKey,
  })

  try {
    const response = await fetch(
      `https://serpapi.com/search.json?${params.toString()}`,
      { signal: AbortSignal.timeout(15000) }  // 15s timeout
    )

    if (!response.ok) {
      const body = await response.text().catch(() => 'no body')
      console.error(`SerpAPI error: ${response.status} — ${body}`)
      return null
    }

    const data: SerpApiResponse = await response.json()

    if (data.error) {
      console.error(`SerpAPI returned error: ${data.error}`)
      return null
    }

    // Combine best_flights and other_flights
    const allGroups: SerpApiFlightGroup[] = [
      ...(data.best_flights ?? []),
      ...(data.other_flights ?? []),
    ]

    const flights: CashFlightResult[] = allGroups.map((group, idx) => {
      const firstLeg = group.flights[0]
      const lastLeg = group.flights[group.flights.length - 1]
      const stops = group.flights.length - 1

      return {
        price: group.price ?? null,
        airline: firstLeg?.airline ?? null,
        departure: firstLeg?.departure_airport?.time ?? null,
        arrival: lastLeg?.arrival_airport?.time ?? null,
        duration: group.total_duration ? formatDuration(group.total_duration) : null,
        stops,
        isBest: idx < (data.best_flights?.length ?? 0),
      }
    })

    return {
      origin: origin.toUpperCase(),
      destination: destination.toUpperCase(),
      date,
      cabin,
      flights,
      currentPrice: data.price_insights?.price_level ?? null,
      lowestPrice: data.price_insights?.lowest_price ?? null,
      source: 'serpapi',
      fetchedAt: new Date().toISOString(),
    }
  } catch (err) {
    if (err instanceof Error && err.name === 'TimeoutError') {
      console.error('SerpAPI request timed out (15s)')
    } else {
      console.error('SerpAPI request failed:', err)
    }
    return null
  }
}

/**
 * Find the lowest cash price from a SerpAPI response.
 * Prefers price_insights.lowest_price (most accurate), falls back to
 * scanning all flight groups.
 */
export function findLowestCashPrice(
  response: CashPricingResponse | null
): number | null {
  if (!response) return null

  // price_insights.lowest_price is the most reliable number
  if (response.lowestPrice && response.lowestPrice > 0) {
    return response.lowestPrice
  }

  // Fallback: scan all flights for the lowest price
  const prices = response.flights
    .map((f) => f.price)
    .filter((p): p is number => p !== null && p > 0)

  if (prices.length === 0) return null
  return Math.min(...prices)
}
