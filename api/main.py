"""
PointsValue — Flight Pricing Service

Dumb pipe: takes origin, destination, date, cabin → returns Google Flights cash pricing.
No business logic, no CPM computation, no caching. All intelligence lives in the Next.js layer.
"""

from __future__ import annotations

import logging
from datetime import date, datetime
from enum import Enum
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

logger = logging.getLogger("flight-pricing")
logging.basicConfig(level=logging.INFO)

app = FastAPI(
    title="PointsValue Flight Pricing",
    description="Google Flights cash pricing via fli",
    version="0.1.0",
)

# CORS — allow the Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Tighten to Vercel domain in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------

class CabinClass(str, Enum):
    economy = "economy"
    premium = "premium"
    business = "business"
    first = "first"


class SearchRequest(BaseModel):
    origin: str = Field(..., min_length=3, max_length=3, description="IATA airport code")
    destination: str = Field(..., min_length=3, max_length=3, description="IATA airport code")
    date: date = Field(..., description="Departure date (YYYY-MM-DD)")
    cabin: CabinClass = Field(default=CabinClass.economy)


class FlightResult(BaseModel):
    price: Optional[float] = Field(None, description="Cash price in USD")
    airline: Optional[str] = None
    departure: Optional[str] = None
    arrival: Optional[str] = None
    duration_minutes: Optional[int] = None
    stops: Optional[int] = None
    flight_numbers: Optional[str] = None


class SearchResponse(BaseModel):
    origin: str
    destination: str
    date: str
    cabin: str
    flights: list[FlightResult]
    source: str = "google_flights_fli"
    fetched_at: str


# ---------------------------------------------------------------------------
# Fli integration
# ---------------------------------------------------------------------------

# Map our cabin names to fli's SeatType enum
CABIN_MAP = {
    "economy": "ECONOMY",
    "premium": "PREMIUM_ECONOMY",
    "business": "BUSINESS",
    "first": "FIRST",
}


def _search_with_fli(origin: str, destination: str, travel_date: str, cabin: str) -> list[FlightResult]:
    """
    Search Google Flights via fli library.
    Returns a list of FlightResult objects.
    """
    try:
        from fli.models import (
            FlightSearchFilters,
            FlightSegment,
            PassengerInfo,
            SeatType,
        )
        from fli.search import SearchFlights
    except ImportError as e:
        logger.error(f"fli import failed: {e}")
        raise HTTPException(
            status_code=503,
            detail="Flight search library not available",
        )

    # Map cabin to SeatType enum
    seat_type_name = CABIN_MAP.get(cabin, "ECONOMY")
    try:
        seat_type = SeatType[seat_type_name]
    except KeyError:
        seat_type = SeatType.ECONOMY

    # Build search filters
    # fli accepts airport codes as tuples: [[code, radius]]
    # We pass IATA codes directly — fli handles the protobuf encoding
    filters = FlightSearchFilters(
        passenger_info=PassengerInfo(adults=1),
        flight_segments=[
            FlightSegment(
                departure_airport=[[origin, 0]],
                arrival_airport=[[destination, 0]],
                travel_date=travel_date,
            )
        ],
        seat_type=seat_type,
    )

    search = SearchFlights()
    results = search.search(filters)

    flights: list[FlightResult] = []
    for flight in results:
        # Extract flight details
        airline_names = []
        flight_nums = []
        dep_time = None
        arr_time = None
        total_duration = getattr(flight, 'duration', None)
        stops = getattr(flight, 'stops', 0)

        # Extract leg details if available
        legs = getattr(flight, 'legs', [])
        for leg in legs:
            airline_val = getattr(leg, 'airline', None)
            if airline_val:
                # airline might be an enum — get its value
                name = airline_val.value if hasattr(airline_val, 'value') else str(airline_val)
                airline_names.append(name)
            fn = getattr(leg, 'flight_number', None)
            if fn:
                flight_nums.append(str(fn))

        if legs:
            dep_dt = getattr(legs[0], 'departure_datetime', None)
            arr_dt = getattr(legs[-1], 'arrival_datetime', None)
            dep_time = str(dep_dt) if dep_dt else None
            arr_time = str(arr_dt) if arr_dt else None

        price = getattr(flight, 'price', None)

        flights.append(FlightResult(
            price=float(price) if price is not None else None,
            airline=', '.join(airline_names) if airline_names else None,
            departure=dep_time,
            arrival=arr_time,
            duration_minutes=int(total_duration) if total_duration else None,
            stops=int(stops) if stops is not None else None,
            flight_numbers=', '.join(flight_nums) if flight_nums else None,
        ))

    return flights


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "flight-pricing",
        "timestamp": datetime.utcnow().isoformat(),
    }


@app.post("/search", response_model=SearchResponse)
async def search_flights(req: SearchRequest):
    """
    Search Google Flights for cash pricing on a route/date/cabin.
    Returns all available flights with prices.
    """
    origin = req.origin.upper()
    destination = req.destination.upper()
    travel_date = req.date.isoformat()
    cabin = req.cabin.value

    logger.info(f"Searching: {origin} → {destination} on {travel_date} ({cabin})")

    try:
        flights = _search_with_fli(origin, destination, travel_date, cabin)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Search failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=502,
            detail=f"Google Flights search failed: {str(e)}",
        )

    logger.info(f"Found {len(flights)} flights for {origin} → {destination}")

    return SearchResponse(
        origin=origin,
        destination=destination,
        date=travel_date,
        cabin=cabin,
        flights=flights,
        fetched_at=datetime.utcnow().isoformat(),
    )
