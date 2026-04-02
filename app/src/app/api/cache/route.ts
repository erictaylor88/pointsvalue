/**
 * Cache Admin API Route — /api/cache
 *
 * GET  — Returns cache stats (active, expired, total entries)
 * POST — Triggers bulk cleanup of all expired cache entries
 */

import { NextResponse } from 'next/server'
import { getCacheStats, cleanupAllExpired } from '@/lib/cache'

export async function GET() {
  const stats = await getCacheStats()
  if (!stats) {
    return NextResponse.json({ error: 'Failed to fetch cache stats' }, { status: 500 })
  }
  return NextResponse.json(stats)
}

export async function POST() {
  const result = await cleanupAllExpired()
  return NextResponse.json({
    message: `Cleaned up ${result.deleted} expired cache entries`,
    ...result,
  })
}
