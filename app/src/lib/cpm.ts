/**
 * CPM (Cents Per Mile) Computation Module
 *
 * Core formula: (cash_price - award_taxes_in_dollars) / miles_required × 100
 *
 * Deal quality scoring compares computed CPM against baseline program valuations:
 *   - Great:   CPM >= baseline for that program/cabin
 *   - Fair:    CPM >= 80% of baseline
 *   - Below:   CPM < 80% of baseline
 *   - Negative: taxes exceed cash price (pay cash instead)
 *
 * Hard rule: Every CPM calculation shows its work — miles cost, cash price,
 * taxes/fees, and the formula are all visible to the user.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DealQuality = 'great' | 'fair' | 'below' | 'negative'

export interface CPMCalculation {
  /** Cents per mile value */
  cpm: number
  /** The cash price used (USD) */
  cashPrice: number
  /** Award taxes/fees in USD */
  taxesUsd: number
  /** Miles required for the award */
  milesRequired: number
  /** Net value: cash_price - taxes */
  netValue: number
  /** Deal quality rating */
  dealQuality: DealQuality
  /** Deal quality label for display */
  dealLabel: string
  /** Percentage above/below baseline */
  baselinePercent: number | null
  /** Baseline CPM for this program/cabin */
  baselineCpm: number | null
  /** Whether cash price data was available */
  cashPriceAvailable: boolean
}

export interface ProgramValuation {
  program: string
  program_display_name: string
  economy_cpp: number
  premium_cpp: number
  business_cpp: number
  first_cpp: number
}

export type CabinClass = 'economy' | 'premium' | 'business' | 'first'

// ---------------------------------------------------------------------------
// Core Computation
// ---------------------------------------------------------------------------

/**
 * Compute CPM for a single award flight result.
 *
 * @param milesRequired - Number of miles/points needed
 * @param cashPrice - Cash price in USD for the same flight (null if unavailable)
 * @param taxesCents - Award taxes/fees in cents (from Seats.aero TotalTaxes field)
 * @param baselineCpm - Baseline CPM for this program/cabin (null if unknown)
 */
export function computeCPM(
  milesRequired: number,
  cashPrice: number | null,
  taxesCents: number,
  baselineCpm: number | null
): CPMCalculation {
  const taxesUsd = taxesCents / 100

  // No cash price available — can't compute CPM
  if (cashPrice === null || cashPrice <= 0) {
    return {
      cpm: 0,
      cashPrice: 0,
      taxesUsd,
      milesRequired,
      netValue: 0,
      dealQuality: 'below',
      dealLabel: 'NO CASH PRICE',
      baselinePercent: null,
      baselineCpm: baselineCpm,
      cashPriceAvailable: false,
    }
  }

  // No miles cost — shouldn't happen, but handle gracefully
  if (milesRequired <= 0) {
    return {
      cpm: 0,
      cashPrice,
      taxesUsd,
      milesRequired: 0,
      netValue: cashPrice - taxesUsd,
      dealQuality: 'below',
      dealLabel: 'UNKNOWN',
      baselinePercent: null,
      baselineCpm: baselineCpm,
      cashPriceAvailable: true,
    }
  }

  const netValue = cashPrice - taxesUsd
  const cpm = (netValue / milesRequired) * 100

  // Negative value — taxes exceed cash price
  if (netValue <= 0 || cpm <= 0) {
    return {
      cpm: Math.round(cpm * 100) / 100,
      cashPrice,
      taxesUsd,
      milesRequired,
      netValue,
      dealQuality: 'negative',
      dealLabel: 'PAY CASH',
      baselinePercent: baselineCpm ? Math.round((cpm / baselineCpm) * 100) : null,
      baselineCpm,
      cashPriceAvailable: true,
    }
  }

  // Round CPM to 2 decimal places
  const roundedCpm = Math.round(cpm * 100) / 100

  // Score deal quality against baseline
  const { quality, label, percent } = scoreDealQuality(roundedCpm, baselineCpm)

  return {
    cpm: roundedCpm,
    cashPrice,
    taxesUsd,
    milesRequired,
    netValue: Math.round(netValue * 100) / 100,
    dealQuality: quality,
    dealLabel: label,
    baselinePercent: percent,
    baselineCpm,
    cashPriceAvailable: true,
  }
}

/**
 * Score deal quality by comparing CPM against program baseline.
 */
function scoreDealQuality(
  cpm: number,
  baselineCpm: number | null
): { quality: DealQuality; label: string; percent: number | null } {
  if (baselineCpm === null || baselineCpm <= 0) {
    // No baseline — can't score, default to fair
    return { quality: 'fair', label: 'FAIR', percent: null }
  }

  const percent = Math.round((cpm / baselineCpm) * 100)

  if (cpm >= baselineCpm) {
    return { quality: 'great', label: 'GREAT DEAL', percent }
  }

  if (cpm >= baselineCpm * 0.8) {
    return { quality: 'fair', label: 'FAIR', percent }
  }

  return { quality: 'below', label: 'BELOW AVG', percent }
}

// ---------------------------------------------------------------------------
// Baseline Lookup
// ---------------------------------------------------------------------------

/**
 * Get the baseline CPM for a given program and cabin class.
 */
export function getBaselineCpm(
  valuation: ProgramValuation | null,
  cabin: CabinClass
): number | null {
  if (!valuation) return null

  const cabinKey = `${cabin}_cpp` as keyof ProgramValuation
  const value = valuation[cabinKey]
  return typeof value === 'number' ? value : null
}

// ---------------------------------------------------------------------------
// Formatting Helpers
// ---------------------------------------------------------------------------

/** Format CPM for display: "2.14¢/mi" */
export function formatCPM(cpm: number): string {
  return `${cpm.toFixed(1)}¢/mi`
}

/** Format miles for display: "50,000" */
export function formatMiles(miles: number): string {
  return miles.toLocaleString('en-US')
}

/** Format USD for display: "$1,234.56" */
export function formatUSD(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}
