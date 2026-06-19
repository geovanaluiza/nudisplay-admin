import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Single Supabase client used everywhere in the app.
 * Returns null if the env vars are missing — in that case the dashboard
 * falls back to local URL-polling so it still runs in dev / Phase 1.
 */
let _client: SupabaseClient | null = null

export function getSupabase(): SupabaseClient | null {
  if (_client) return _client
  const url = import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) return null
  _client = createClient(url, key, {
    realtime: { params: { eventsPerSecond: 5 } },
    auth: { persistSession: false },
  })
  return _client
}

export function isSupabaseConfigured(): boolean {
  return Boolean(import.meta.env.VITE_SUPABASE_URL) &&
         Boolean(import.meta.env.VITE_SUPABASE_ANON_KEY)
}
