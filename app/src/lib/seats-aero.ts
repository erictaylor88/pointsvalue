/**
 * Seats.aero Partner API Client
 *
 * Handles cached search for award availability and trip details.
 * Auth: Partner-Authorization header with API key.
 * Base URL: https://seats.aero/partnerapi
 *
 * IMPORTANT: Live Search is NOT available on Pro tier — cached search only.
 */

const SEATS_AERO_BASE = 'https://seats.aero/partnerapi'

// ---------------------------------------------------------------------------
// Types — Cached Search Response
// ---------------------------------------------------------------------------

export interface SeatsAeroRoute {
  ID: string
  OriginAirport: string
  OriginRegion: string
  DestinationAirport: string
  DestinationRegion: string
  NumDaysOut: number
  Distance: number
  Source: string
}

/** Summary availability object from cached search */
export interface SeatsAeroAvailability {
  ID: string
  RouteID: string
  Route: SeatsAeroRoute
  Date: string
  ParsedDate: string
  // Per-cabin availability flags
  YAvailable: boolean
  WAvailable: boolean
  JAvailable: boolean
  FAvailable: boolean
  // Per-cabin mileage costs (string format, e.g. "50,000")
  YMileageCost: string
  WMileageCost: string
  JMileageCost: string
  FMileageCost: string
  // Per-cabin mileage costs (raw integer)
  YMileageCostRaw: number
  WMileageCostRaw: number
  JMileageCostRaw: number
  FMileageCostRaw: number
  // Taxes in cents per cabin
  TaxesCurrency: string
  YTotalTaxes: number
  WTotalTaxes: number
  JTotalTaxes: number
  FTotalTaxes: number
  // Remaining seats per cabin
  YRemainingSeats: number
  WRemainingSeats: number
  JRemainingSeats: number
  FRemainingSeats: number
  // Airlines per cabin
  YAirlines: string
  WAirlines: string
  JAirlines: string
  FAirlines: string
  // Metadata
  Source: string
  CreatedAt: string
  UpdatedAt: string
  AvailabilityTrips: string
}

export interface CachedSearchResponse {
  data: SeatsAeroAvailability[]
  count: number
  hasMore: boolean
  cursor: number
}

// ---------------------------------------------------------------------------
// Types — Trip Details Response
// ---------------------------------------------------------------------------

export interface AvailabilitySegment {
  ID: string
  FlightNumber: string
  Distance: number
  FareClass: string
  AircraftName: string
  AircraftCode: string
  OriginAirport: string
  DestinationAirport: string
  DepartsAt: string
  ArrivesAt: string
  Source: string
  Cabin: string
  Order: number
}

export interface AvailabilityTrip {
  ID: string
  RouteID: string
  AvailabilityID: string
  AvailabilitySegments: AvailabilitySegment[]
  TotalDuration: number
  Stops: number
  Carriers: string
  RemainingSeats: number
  MileageCost: number
  TotalTaxes: number
  TaxesCurrency: string
  TaxesCurrencySymbol: string
  FlightNumbers: string
  DepartsAt: string
  ArrivesAt: string
  Cabin: string
  Source: string
}

export interface BookingLink {
  label: string
  link: string
  primary: boolean
}

export interface TripResponse {
  data: AvailabilityTrip[]
  origin_coordinates: { Lat: number; Lon: number }
  destination_coordinates: { Lat: number; Lon: number }
  booking_links: BookingLink[]
  revalidation_id: string
}

// ---------------------------------------------------------------------------
// Cabin mapping
// ---------------------------------------------------------------------------

export type CabinClass = 'economy' | 'premium' | 'business' | 'first'

/** Map our cabin names to Seats.aero's single-letter cabin codes */
const CABIN_PREFIX: Record<CabinClass, 'Y' | 'W' | 'J' | 'F'> = {
  economy: 'Y',
  premium: 'W',
  business: 'J',
  first: 'F',
}

// ---------------------------------------------------------------------------
// API Client
// ---------------------------------------------------------------------------

function getApiKey(): string {
  const key = process.env.SEATS_AERO_API_KEY
  if (!key) {
    throw new Error('SEATS_AERO_API_KEY is not set')
  }
  return key
}

export interface SeatsAeroSearchParams {
  origin: string        // IATA code(s), comma-separated
  destination: string   // IATA code(s), comma-separated
  cabin: CabinClass
  startDate: string     // YYYY-MM-DD
  endDate?: string      // YYYY-MM-DD, defaults to startDate
}

export interface SeatsAeroSearchResult {
  data: SeatsAeroAvailability[]
  count: number
  hasMore: boolean
  rateLimitRemaining: number | null
}

/**
 * Cached Search — query award availability across all programs.
 * GET /partnerapi/search?origin=LAX&destination=NRT&cabin=business&start_date=2026-05-15&end_date=2026-05-15
 */
export async function searchAvailability(
  params: SeatsAeroSearchParams
): Promise<SeatsAeroSearchResult> {
  const { origin, destination, startDate, endDate } = params

  const allData: SeatsAeroAvailability[] = []
  let rateLimitRemaining: number | null = null
  let cursor: number | undefined
  let hasMore = true

  // Paginate through all results (Seats.aero returns ~10-20 per page)
  while (hasMore) {
    const url = new URL(`${SEATS_AERO_BASE}/search`)
    url.searchParams.set('origin_airport', origin.toUpperCase())
    url.searchParams.set('destination_airport', destination.toUpperCase())
    // Note: cabin is NOT sent as a query param. Cached search returns all cabins
    // in each availability object (YAvailable, JAvailable, etc.). Cabin filtering
    // is done client-side via extractCabinData().
    url.searchParams.set('start_date', startDate)
    url.searchParams.set('end_date', endDate || startDate)
    if (cursor !== undefined) {
      url.searchParams.set('cursor', cursor.toString())
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Partner-Authorization': getApiKey(),
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      throw new Error(
        `Seats.aero API error ${response.status}: ${errorText}`
      )
    }

    const rlHeader = response.headers.get('X-RateLimit-Remaining')
    if (rlHeader) {
      rateLimitRemaining = parseInt(rlHeader, 10)
    }

    const body: CachedSearchResponse = await response.json()
    if (body.data?.length) {
      allData.push(...body.data)
    }

    hasMore = body.hasMore || false
    cursor = body.cursor

    // Safety: cap at 10 pages to avoid runaway loops
    if (allData.length > 500) break
  }

  return {
    data: allData,
    count: allData.length,
    hasMore: false,
    rateLimitRemaining,
  }
}

/**
 * Get Trip Details — flight-level info from an availability object.
 * GET /partnerapi/trips/{availability_id}
 */
export async function getTripDetails(
  availabilityId: string
): Promise<TripResponse> {
  const url = `${SEATS_AERO_BASE}/trips/${availabilityId}`

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Partner-Authorization': getApiKey(),
      'Accept': 'application/json',
    },
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error')
    throw new Error(
      `Seats.aero trips API error ${response.status}: ${errorText}`
    )
  }

  return response.json()
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extract cabin-specific data from a cached search availability object.
 * The cached search returns per-cabin fields (YMileageCost, JTotalTaxes, etc.)
 * This helper pulls the right fields for the requested cabin.
 */
export function extractCabinData(
  availability: SeatsAeroAvailability,
  cabin: CabinClass
): {
  available: boolean
  mileageCost: number
  mileageCostDisplay: string
  totalTaxesCents: number
  remainingSeats: number
  airlines: string
} {
  const prefix = CABIN_PREFIX[cabin]

  return {
    available: availability[`${prefix}Available`] as boolean,
    mileageCost: availability[`${prefix}MileageCostRaw`] as number,
    mileageCostDisplay: availability[`${prefix}MileageCost`] as string,
    totalTaxesCents: availability[`${prefix}TotalTaxes`] as number,
    remainingSeats: availability[`${prefix}RemainingSeats`] as number,
    airlines: availability[`${prefix}Airlines`] as string,
  }
}
