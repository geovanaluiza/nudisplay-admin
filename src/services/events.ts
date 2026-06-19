import { getSupabase } from './supabase'
import type { DisplayEvent, EventType } from '../types/event'

/** Fetches the most recent N events for the Recent Events panel. */
export async function fetchRecentEvents(limit = 50): Promise<DisplayEvent[]> {
  const sb = getSupabase()
  if (!sb) return []
  const { data, error } = await sb
    .from('display_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) {
    console.warn('fetchRecentEvents error', error)
    return []
  }
  return (data ?? []) as DisplayEvent[]
}

/** Inserts an event row. Best-effort: errors are logged, not thrown. */
export async function logEvent(
  eventType: EventType,
  opts: { displayId?: string | null; message?: string | null } = {},
): Promise<void> {
  const sb = getSupabase()
  if (!sb) return
  const { error } = await sb.from('display_events').insert({
    event_type: eventType,
    display_id: opts.displayId ?? null,
    message: opts.message ?? null,
  })
  if (error) console.warn('logEvent error', error)
}
