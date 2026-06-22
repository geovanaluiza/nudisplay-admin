import { useEffect, useState } from 'react'
import { getSupabase } from '../services/supabase'
import { fetchRecentEvents } from '../services/events'
import type { DisplayEvent } from '../types/event'

const SECURITY_EVENT_TYPES = new Set([
  'security_warning',
  'security_critical',
  'kiosk_escape_detected',
  'focus_lost',
  'auto_recovery_triggered',
])

/**
 * Live list of recent security events. Subscribes to Supabase
 * Realtime INSERTs on `display_events` filtered by event type.
 *
 * Returns up to `limit` events sorted newest first.
 */
export function useSecurityEvents(limit = 30) {
  const [events, setEvents] = useState<DisplayEvent[]>([])

  useEffect(() => {
    const sb = getSupabase()
    let cancelled = false

    async function refresh() {
      if (cancelled) return
      const all = await fetchRecentEvents(200)
      if (cancelled) return
      setEvents(all.filter((e) => SECURITY_EVENT_TYPES.has(e.event_type)).slice(0, limit))
    }

    if (sb) {
      refresh()
      const channel = sb
        .channel('security-events')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'display_events' },
          (payload) => {
            if (cancelled) return
            const row = (payload as unknown as { new: DisplayEvent }).new
            if (!SECURITY_EVENT_TYPES.has(row.event_type)) return
            setEvents((prev) => [row, ...prev].slice(0, limit))
          },
        )
        .subscribe()
      return () => { cancelled = true; sb.removeChannel(channel) }
    }

    return () => { cancelled = true }
  }, [limit])

  return events
}