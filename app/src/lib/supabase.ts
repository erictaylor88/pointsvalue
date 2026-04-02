import { createClient, SupabaseClient } from '@supabase/supabase-js'

/**
 * Browser/client-side Supabase client.
 * Uses the anon key — safe for client-side usage with RLS.
 * Lazy-initialized to avoid build-time errors when env vars aren't set.
 */
let _supabase: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) {
      throw new Error('Supabase URL and anon key must be set')
    }
    _supabase = createClient(url, key)
  }
  return _supabase
}

/**
 * Server-side Supabase client with service role key.
 * Use ONLY in API routes / server components — never expose to the client.
 */
export function createServiceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) {
    throw new Error('Supabase URL and service role key must be set')
  }
  return createClient(url, serviceRoleKey)
}

/**
 * Track API usage — calls the increment_api_usage() Postgres function.
 * Non-blocking: fire and forget. Errors are logged but never thrown.
 */
export async function trackApiUsage(
  source: 'seats_aero' | 'serpapi' | 'atf',
  calls: number = 1
): Promise<void> {
  try {
    const supabase = createServiceClient()
    const { error } = await supabase.rpc('increment_api_usage', {
      p_source: source,
      p_calls: calls,
    })
    if (error) {
      console.error(`[api_usage] Failed to track ${source}:`, error.message)
    }
  } catch (err) {
    console.error(`[api_usage] Exception tracking ${source}:`, err)
  }
}
