import { useEffect, useState } from 'react'
import { getSupabase } from '../services/supabase'
import { fetchRecentEvents } from '../services/events'
import type { DisplayEvent } from '../types/event'

/**
 * Live list of recent display events. Subscribes to Supabase Realtime
 * INSERTs on `display_events` so the events panel updates without refresh.
 * Falls back to a one-shot fetch when Supabase isn't configured.
 */
export function useDisplayEvents(limit = 50) {
  const [events, setEvents] = useState<DisplayEvent[]>([])

  useEffect(() => {
    const sb = getSupabase()
    let cancelled = false

    if (sb) {
      fetchRecentEvents(limit)
        .then((rows) => { if (!cancelled) setEvents(rows) })
        .catch((err) => { if (!cancelled) console.warn('fetchRecentEvents failed', err) })

      const channel = sb
        .channel('events-inserts')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'display_events' },
          (payload) => {
            if (cancelled) return
            const incoming = (payload as unknown as { new: DisplayEvent }).new
            setEvents((prev) => [incoming, ...prev].slice(0, limit))
          },
        )
        .subscribe()

      return () => {
        cancelled = true
        sb.removeChannel(channel)
      }
    }

    return () => {
      cancelled = true
    }
  }, [limit])

  return events
}
