import { getSupabase } from './supabase'
import { EMPTY_ROSTER, type Display } from '../types/display'

/**
 * Fetches all displays from Supabase. Returns an empty roster when
 * Supabase isn't configured so the dashboard still mounts cleanly
 * during dev / Phase 1.
 *
 * In production, displays are managed in the Supabase dashboard
 * (or via the SQL editor running 002_seed.sql). This is the
 * single source of truth.
 */
export async function fetchDisplays(): Promise<Display[]> {
  const sb = getSupabase()
  if (!sb) return EMPTY_ROSTER
  const { data, error } = await sb.from('displays').select('*').order('name')
  if (error) {
    console.warn('fetchDisplays error', error)
    return EMPTY_ROSTER
  }
  return (data ?? []) as Display[]
}

/**
 * Updates the heartbeat / status fields for a single display. Used by
 * the local probe fallback when Supabase is configured but the display
 * client is not yet integrated (Phase 3).
 */
export async function writeHeartbeat(
  id: string,
  fields: Partial<Display>,
): Promise<void> {
  const sb = getSupabase()
  if (!sb) return
  const { error } = await sb.from('displays').update(fields).eq('id', id)
  if (error) console.warn('writeHeartbeat error', error)
}
