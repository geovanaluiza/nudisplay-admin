import { getSupabase } from './supabase'
import { EMPTY_ROSTER, type Display, type DisplayFormData } from '../types/display'

/**
 * One-shot fetch (used for the initial render before Realtime takes over).
 * Returns an empty roster when Supabase isn't configured so the dashboard
 * still mounts cleanly during dev / Phase 1.
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

/** Generates a URL-safe slug from the display name. */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** INSERT a new display row. Returns the inserted Display or throws. */
export async function createDisplay(input: DisplayFormData): Promise<Display> {
  const sb = getSupabase()
  if (!sb) throw new Error('Supabase not configured')
  const id = `${slugify(input.name)}-${Math.random().toString(36).slice(2, 6)}`
  const row = {
    id,
    name: input.name,
    location: input.location,
    orientation: input.orientation || null,
    notes: input.notes || null,
    public_url: input.public_url,
  }
  const { data, error } = await sb.from('displays').insert(row).select('*').single()
  if (error) throw error
  return data as Display
}

/** UPDATE an existing display row. Returns the updated Display or throws. */
export async function updateDisplay(
  id: string,
  input: DisplayFormData,
): Promise<Display> {
  const sb = getSupabase()
  if (!sb) throw new Error('Supabase not configured')
  const row = {
    name: input.name,
    location: input.location,
    orientation: input.orientation || null,
    notes: input.notes || null,
    public_url: input.public_url,
  }
  const { data, error } = await sb.from('displays').update(row).eq('id', id).select('*').single()
  if (error) throw error
  return data as Display
}

/** DELETE a display row. Throws on failure. */
export async function deleteDisplay(id: string): Promise<void> {
  const sb = getSupabase()
  if (!sb) throw new Error('Supabase not configured')
  const { error } = await sb.from('displays').delete().eq('id', id)
  if (error) throw error
}

/**
 * Updates the heartbeat / status fields for a single display. Used by
 * the local probe fallback (Phase 2) when Supabase is configured but the
 * display client is not yet integrated (Phase 3).
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
