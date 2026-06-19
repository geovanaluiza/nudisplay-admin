import { useEffect, useState } from 'react'
import { getSupabase } from '../services/supabase'
import { fetchRecentCommands } from '../services/commands'
import type { DisplayCommand } from '../types/command'

/**
 * Live list of recent display commands. Subscribes to Supabase Realtime
 * INSERTs on `display_commands` so the history updates without a refresh.
 * Falls back to one-shot polling when Supabase isn't configured.
 */
export function useDisplayCommands(limit = 30) {
  const [commands, setCommands] = useState<DisplayCommand[]>([])

  useEffect(() => {
    const sb = getSupabase()
    let cancelled = false

    if (sb) {
      fetchRecentCommands(limit)
        .then((rows) => { if (!cancelled) setCommands(rows) })
        .catch((err) => { if (!cancelled) console.warn('fetchRecentCommands failed', err) })

      const channel = sb
        .channel('commands-inserts')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'display_commands' },
          (payload) => {
            if (cancelled) return
            const incoming = (payload as unknown as { new: DisplayCommand }).new
            setCommands((prev) => [incoming, ...prev].slice(0, limit))
          },
        )
        .subscribe()

      return () => {
        cancelled = true
        sb.removeChannel(channel)
      }
    }

    // No Supabase: poll occasionally for the history (best-effort).
    const id = setInterval(() => {
      if (cancelled) return
      setCommands((prev) => prev) // no-op when no source
    }, 30_000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [limit])

  return commands
}
