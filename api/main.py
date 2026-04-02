"""
PointsValue — Flight Pricing Service

Dumb pipe: takes origin, destination, date, cabin → returns Google Flights cash pricing.
No business logic, no CPM computation, no caching. All intelligence lives in the Next.js layer.
"""

from __future__ import annotations

import logging
import re
from datetime import datetime
from enum import Enum
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

logger = logging.getLogger("flight-pricing")
logging.basicConfig(level=logging.INFO)

app = FastAPI(
    title="PointsValue Flight Pricing",
    description="Google Flights cash pricing via fast-flights",
    version="0.2.0",
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
    date: str = Field(..., description="Departure date (YYYY-MM-DD)")
    cabin: CabinClass = Field(default=CabinClass.economy)


class FlightResult(BaseModel):
    price: Optional[float] = Field(None, description="Cash price in USD")
    airline: Optional[str] = None
    departure: Optional[str] = None
    arrival: Optional[str] = None
    duration: Optional[str] = None
    stops: Optional[int] = None
    is_best: bool = False


class SearchResponse(BaseModel):
    origin: str
    destination: str
    date: str
    cabin: str
    flights: list[FlightResult]
    current_price: Optional[str] = Field(None, description="Google price assessment: low, typical, or high")
    source: str = "google_flights"
    fetched_at: str


# ---------------------------------------------------------------------------
# fast-flights integration
# ---------------------------------------------------------------------------

# Map our cabin names to fast-flights seat names
CABIN_MAP = {
    "economy": "economy",
    "premium": "premium-economy",
    "business": "business",
    "first": "first",
}

# Parse price string like "$245", "$1,234" → float
PRICE_RE = re.compile(r"[\$£€]?([\d,]+(?:\.\d{2})?)")


def _parse_price(price_str: str) -> Optional[float]:
    """Extract numeric price from a formatted string like '$1,234'."""
    if not price_str:
        return None
    match = PRICE_RE.search(price_str)
    if match:
        return float(match.group(1).replace(",", ""))
    return None


def _search_flights(
    origin: str, destination: str, travel_date: str, cabin: str
) -> tuple[list[FlightResult], Optional[str]]:
    """
    Search Google Flights via fast-flights library.
    Returns (list of FlightResult, current_price assessment).
    """
    try:
        from fast_flights import FlightData, Passengers, get_flights
    except ImportError as e:
        logger.error(f"fast-flights import failed: {e}")
        raise HTTPException(
            status_code=503,
            detail="Flight search library not available",
        )

    seat = CABIN_MAP.get(cabin, "economy")

    result = get_flights(
        flight_data=[
            FlightData(
                date=travel_date,
                from_airport=origin,
                to_airport=destination,
            )
        ],
        trip="one-way",
        seat=seat,
        passengers=Passengers(adults=1),
        fetch_mode="common",
    )

    flights: list[FlightResult] = []
    for flight in result.flights:
        price_usd = _parse_price(flight.price)

        flights.append(FlightResult(
            price=price_usd,
            airline=flight.name or None,
            departure=flight.departure or None,
            arrival=flight.arrival or None,
            duration=flight.duration or None,
            stops=flight.stops if flight.stops is not None else None,
            is_best=flight.is_best,
        ))

    current_price = getattr(result, "current_price", None)

    return flights, current_price


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "flight-pricing",
        "version": "0.2.0",
        "library": "fast-flights",
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
    travel_date = req.date
    cabin = req.cabin.value

    logger.info(f"Searching: {origin} -> {destination} on {travel_date} ({cabin})")

    try:
        flights, current_price = _search_flights(origin, destination, travel_date, cabin)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Search failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=502,
            detail=f"Google Flights search failed: {str(e)}",
        )

    logger.info(f"Found {len(flights)} flights for {origin} -> {destination}")

    return SearchResponse(
        origin=origin,
        destination=destination,
        date=travel_date,
        cabin=cabin,
        flights=flights,
        current_price=current_price,
        fetched_at=datetime.utcnow().isoformat(),
    )
