import { getSupabase } from './supabase'
import { logEvent } from './events'
import type { Display, DisplayStatus } from '../types/display'

/**
 * Heartbeat configuration. These numbers are the source of truth for
 * the entire dashboard:
 *
 * - HEARTBEAT_INTERVAL_MS: how often a display client is expected to
 *   ping the database (we also use this interval for the
 *   in-dashboard simulator).
 * - OFFLINE_AFTER_MS: how long a display is allowed to be silent
 *   before the dashboard flips it to "offline". Set to 3× the
 *   heartbeat interval so a single dropped packet doesn't turn
 *   a healthy display red.
 */
export const HEARTBEAT_INTERVAL_MS = 30_000
export const OFFLINE_AFTER_MS = 90_000

/** Fields a display client (or simulator) may write in a heartbeat. */
export type HeartbeatPayload = {
  status: DisplayStatus
  current_page?: string | null
  current_url?: string | null
  response_time?: number | null
  software_version?: string | null
  last_touch?: string | null
  is_blackout?: boolean
  emergency_message?: string | null
}

/**
 * Computes the effective status of a display by comparing
 * `last_seen` against the offline threshold. This is the same
 * derivation the dashboard uses so display clients and the
 * dashboard always agree.
 */
export function deriveStatus(d: Pick<Display, 'last_seen' | 'status'>): DisplayStatus {
  if (!d.last_seen) return 'offline'
  const age = Date.now() - new Date(d.last_seen).getTime()
  if (age < OFFLINE_AFTER_MS) return d.status === 'checking' ? 'checking' : 'online'
  return 'offline'
}

/**
 * Sends a single heartbeat update to Supabase. Best-effort:
 * - returns true on success
 * - returns false on any error (logged but not thrown)
 *
 * This is the function the display clients will call every
 * 30 seconds once they're integrated. The simulator
 * (useDisplayHeartbeatSimulator) and the dev controls also use it.
 */
export async function sendHeartbeat(
  displayId: string,
  payload: HeartbeatPayload,
): Promise<boolean> {
  const sb = getSupabase()
  if (!sb) return false
  const now = new Date().toISOString()
  const update = {
    ...payload,
    last_seen: now,
    updated_at: now,
  }
  const { error } = await sb.from('displays').update(update).eq('id', displayId)
  if (error) {
    console.warn('sendHeartbeat error', error)
    return false
  }
  return true
}

/**
 * Same as sendHeartbeat but also logs a `heartbeat_received`
 * event for the audit trail. Use this on the dashboard side
 * (admin tools / simulator) — display clients should call
 * sendHeartbeat directly and log their own events.
 */
export async function sendHeartbeatWithEvent(
  displayId: string,
  displayName: string,
  payload: HeartbeatPayload,
): Promise<boolean> {
  const ok = await sendHeartbeat(displayId, payload)
  if (ok) {
    await logEvent('heartbeat_received', {
      displayId,
      message: `${displayName} → ${payload.status} (${payload.current_page ?? '—'})`,
    })
  }
  return ok
}
