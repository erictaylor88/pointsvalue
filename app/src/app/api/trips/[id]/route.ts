/**
 * Trips API Route — /api/trips/[id]
 *
 * Fetches detailed flight-level information from Seats.aero:
 * - Individual flight segments (departure/arrival times, aircraft, fare class)
 * - Booking links (affiliate links)
 * - Exact mileage cost and taxes per trip option
 *
 * Used when the user clicks "Show the math" or wants to book.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getTripDetails } from '@/lib/seats-aero'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params

  if (!id) {
    return NextResponse.json(
      { error: 'Availability ID is required' },
      { status: 400 }
    )
  }

  try {
    const tripData = await getTripDetails(id)

    return NextResponse.json({
      trips: tripData.data.map((trip) => ({
        id: trip.ID,
        cabin: trip.Cabin,
        milesRequired: trip.MileageCost,
        totalTaxesCents: trip.TotalTaxes,
        taxesCurrency: trip.TaxesCurrency,
        taxesCurrencySymbol: trip.TaxesCurrencySymbol,
        stops: trip.Stops,
        carriers: trip.Carriers,
        flightNumbers: trip.FlightNumbers,
        totalDuration: trip.TotalDuration,
        departsAt: trip.DepartsAt,
        arrivesAt: trip.ArrivesAt,
        remainingSeats: trip.RemainingSeats,
        source: trip.Source,
        segments: trip.AvailabilitySegments.map((seg) => ({
          flightNumber: seg.FlightNumber,
          origin: seg.OriginAirport,
          destination: seg.DestinationAirport,
          departsAt: seg.DepartsAt,
          arrivesAt: seg.ArrivesAt,
          aircraft: seg.AircraftName,
          aircraftCode: seg.AircraftCode,
          fareClass: seg.FareClass,
          cabin: seg.Cabin,
          distance: seg.Distance,
        })),
      })),
      bookingLinks: tripData.booking_links,
      coordinates: {
        origin: tripData.origin_coordinates,
        destination: tripData.destination_coordinates,
      },
    })
  } catch (err) {
    console.error('Trip details fetch failed:', err)
    const message = err instanceof Error ? err.message : 'Failed to fetch trip details'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
