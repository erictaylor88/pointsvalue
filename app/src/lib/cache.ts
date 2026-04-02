/**
 * Result Caching Layer
 *
 * Manages cached search results in Supabase with TTL-based expiration.
 * All cache operations are non-fatal — failures log but don't break searches.
 *
 * Design decisions:
 * - 4-hour TTL for cached results (Seats.aero data is cached on their end too)
 * - Deduplication on write: old entries for the same route/date/cabin are replaced
 * - Opportunistic cleanup: expired entries for the current search are cleaned on write
 * - Periodic bulk cleanup via cleanupAllExpired() — can be called from a cron or on-demand
 */

import { createServiceClient } from '@/lib/supabase'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Hours before cached results expire */
export const CACHE_TTL_HOURS = 4

/** Max number of expired rows to clean up per opportunistic cleanup */
const CLEANUP_BATCH_SIZE = 50

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CacheSearchParams {
  origin: string
  destination: string
  date: string
  cabin: string
}

export interface CacheHit<T> {
  results: T
  cachedAt: string
  expiresAt: string
}

// ---------------------------------------------------------------------------
// Cache Lookup
// ---------------------------------------------------------------------------

/**
 * Check for a valid (unexpired) cached result matching the search params.
 * Returns null on cache miss or any error.
 */
export async function getCachedResults<T>(
  params: CacheSearchParams
): Promise<CacheHit<T> | null> {
  try {
    const supabase = createServiceClient()
    const now = new Date().toISOString()

    const { data, error } = await supabase
      .from('cached_searches')
      .select('results, created_at, expires_at')
      .eq('origin', params.origin.toUpperCase())
      .eq('destination', params.destination.toUpperCase())
      .eq('search_date', params.date)
      .eq('cabin', params.cabin)
      .gt('expires_at', now)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error || !data) return null

    // Don't serve cached empty results — they may be stale failures
    const results = data.results as T
    if (Array.isArray(results) && results.length === 0) return null

    return {
      results,
      cachedAt: data.created_at,
      expiresAt: data.expires_at,
    }
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Cache Write (with deduplication)
// ---------------------------------------------------------------------------

/**
 * Cache search results in Supabase. Replaces any existing entries for the
 * same route/date/cabin to prevent duplicate rows from concurrent searches.
 * Also runs opportunistic cleanup of expired entries for this route.
 */
export async function cacheResults<T>(
  params: CacheSearchParams,
  results: T,
  seatsAeroRaw: unknown,
  cashPricingRaw: unknown
): Promise<void> {
  try {
    const supabase = createServiceClient()
    const now = new Date()
    const expiresAt = new Date(now.getTime() + CACHE_TTL_HOURS * 60 * 60 * 1000)

    const origin = params.origin.toUpperCase()
    const destination = params.destination.toUpperCase()

    // Delete any existing entries for this exact search (deduplication)
    await supabase
      .from('cached_searches')
      .delete()
      .eq('origin', origin)
      .eq('destination', destination)
      .eq('search_date', params.date)
      .eq('cabin', params.cabin)

    // Insert fresh result
    const { error } = await supabase.from('cached_searches').insert({
      origin,
      destination,
      search_date: params.date,
      cabin: params.cabin,
      results,
      seats_aero_raw: seatsAeroRaw,
      cash_pricing_raw: cashPricingRaw,
      created_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
    })

    if (error) {
      console.error('Cache write failed:', error.message)
    }

    // Opportunistic cleanup: remove expired entries for nearby routes
    // (scoped cleanup — doesn't scan the whole table)
    cleanupExpiredForRoute(origin, destination).catch(() => {})
  } catch (err) {
    console.error('Cache write error:', err)
  }
}

// ---------------------------------------------------------------------------
// TTL Cleanup
// ---------------------------------------------------------------------------

/**
 * Remove expired cache entries for a specific route (both directions).
 * Runs after each cache write to keep the table lean without needing a cron.
 */
async function cleanupExpiredForRoute(
  origin: string,
  destination: string
): Promise<number> {
  try {
    const supabase = createServiceClient()
    const now = new Date().toISOString()

    // Clean expired entries for this route (origin→destination)
    const { data } = await supabase
      .from('cached_searches')
      .delete()
      .lt('expires_at', now)
      .eq('origin', origin)
      .eq('destination', destination)
      .select('id')

    return data?.length ?? 0
  } catch {
    return 0
  }
}

/**
 * Bulk cleanup of ALL expired cache entries across the table.
 * Call this from a scheduled endpoint or admin route — not on every request.
 * Deletes in batches to avoid long-running queries.
 */
export async function cleanupAllExpired(): Promise<{ deleted: number }> {
  let totalDeleted = 0

  try {
    const supabase = createServiceClient()
    const now = new Date().toISOString()

    // Delete in batches
    let hasMore = true
    while (hasMore) {
      const { data, error } = await supabase
        .from('cached_searches')
        .delete()
        .lt('expires_at', now)
        .limit(CLEANUP_BATCH_SIZE)
        .select('id')

      if (error) {
        console.error('Bulk cleanup error:', error.message)
        break
      }

      const batchSize = data?.length ?? 0
      totalDeleted += batchSize
      hasMore = batchSize >= CLEANUP_BATCH_SIZE
    }
  } catch (err) {
    console.error('Bulk cleanup failed:', err)
  }

  return { deleted: totalDeleted }
}

/**
 * Get cache stats for monitoring. Returns count of active vs expired entries.
 */
export async function getCacheStats(): Promise<{
  active: number
  expired: number
  total: number
} | null> {
  try {
    const supabase = createServiceClient()
    const now = new Date().toISOString()

    const [activeResult, totalResult] = await Promise.all([
      supabase
        .from('cached_searches')
        .select('id', { count: 'exact', head: true })
        .gt('expires_at', now),
      supabase
        .from('cached_searches')
        .select('id', { count: 'exact', head: true }),
    ])

    const active = activeResult.count ?? 0
    const total = totalResult.count ?? 0

    return {
      active,
      expired: total - active,
      total,
    }
  } catch {
    return null
  }
}
