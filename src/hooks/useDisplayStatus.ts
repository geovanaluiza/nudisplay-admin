import { useEffect, useState } from 'react'
import { getSupabase } from '../services/supabase'
import { fetchDisplays, writeHeartbeat } from '../services/displays'
import { logEvent } from '../services/events'
import type { Display, DisplayStatus } from '../types/display'

/**
 * Offline threshold: if last_seen is older than this, the display is
 * considered offline. 90s gives a 3x safety margin over the 30s
 * heartbeat interval, while still being responsive.
 */
const OFFLINE_AFTER_MS = 90_000

/**
 * The single source of truth for display state in the dashboard.
 *
 * Phase 2 architecture:
 * - Subscribes to Supabase Realtime on the `displays` table
 *   (postgres_changes on INSERT / UPDATE / DELETE)
 * - As a fallback when Supabase isn't configured, runs the local
 *   HEAD probe at 30s intervals and writes the result into the
 *   local React state
 *
 * Returns the full list of displays plus a `lastUpdated` ISO string
 * so the UI can show "Last updated: just now" in the global banner.
 */
export function useDisplayStatus() {
  const [displays, setDisplays] = useState<Display[]>([])
  const [lastUpdated, setLastUpdated] = useState<string>(new Date().toISOString())
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const sb = getSupabase()
    let cancelled = false

    // ----- Initial fetch + Realtime subscription (when Supabase is up) -----
    if (sb) {
      fetchDisplays()
        .then((rows) => {
          if (cancelled) return
          setDisplays(rows)
          setLastUpdated(new Date().toISOString())
          setReady(true)
        })
        .catch((err) => {
          if (cancelled) return
          console.warn('initial fetchDisplays failed', err)
          setReady(true)
        })

      const channel = sb
        .channel('displays-changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'displays' },
          (payload) => {
            if (cancelled) return
            setDisplays((prev) => applyRealtimeChange(prev, payload))
            setLastUpdated(new Date().toISOString())
          },
        )
        .subscribe()

      return () => {
        cancelled = true
        sb.removeChannel(channel)
      }
    }

    // ----- Local probe fallback (no Supabase) ----------------------------
    setReady(true)
    return () => {
      cancelled = true
    }
  }, [])

  // Periodically re-evaluate offline status from last_seen (every 10s).
  useEffect(() => {
    if (!ready) return
    const id = setInterval(() => {
      setDisplays((prev) => prev.map(recomputeStatus))
    }, 10_000)
    return () => clearInterval(id)
  }, [ready])

  // When Supabase is not configured, run the local probe in the
  // background and write the results both to local state and to
  // Supabase (if/when it becomes configured). This keeps Phase 1
  // behaviour alive during development.
  useEffect(() => {
    if (getSupabase()) return
    const id = setInterval(async () => {
      const updated = await probeAllLocal(displays)
      setDisplays(updated)
      setLastUpdated(new Date().toISOString())
    }, 30_000)
    // Run once on mount
    probeAllLocal(displays).then((rows) => {
      setDisplays(rows)
      setLastUpdated(new Date().toISOString())
    })
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready])

  return { displays, lastUpdated, ready }
}

/* -------------------------------------------------------------------------
 * Helpers
 * ------------------------------------------------------------------------- */

type ChangePayload = {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new: Display | null
  old: { id: string } | null
}

function applyRealtimeChange(prev: Display[], payload: unknown): Display[] {
  const p = payload as ChangePayload
  if (p.eventType === 'DELETE') {
    return prev.filter((d) => d.id !== p.old?.id)
  }
  if (!p.new) return prev
  const incoming = recomputeStatus(p.new)
  const idx = prev.findIndex((d) => d.id === incoming.id)
  if (idx === -1) return [...prev, incoming].sort((a, b) => a.name.localeCompare(b.name))
  const next = prev.slice()
  next[idx] = incoming
  return next
}

/**
 * Re-derives `status` from `last_seen` without trusting the stored
 * value, so a display that hasn't pinged in 90s flips to offline
 * even if the dashboard's last write said otherwise.
 */
function recomputeStatus(d: Display): Display {
  let status: DisplayStatus = d.status
  if (d.last_seen) {
    const age = Date.now() - new Date(d.last_seen).getTime()
    status = age < OFFLINE_AFTER_MS ? 'online' : 'offline'
  } else {
    status = 'offline'
  }
  return { ...d, status }
}

async function probeAllLocal(prev: Display[]): Promise<Display[]> {
  const targets = prev.length > 0
    ? prev
    : await fetchDisplays()
  const now = new Date().toISOString()
  const results = await Promise.all(
    targets.map(async (d) => {
      const { status, responseTime } = await probeOne(d.public_url)
      const lastSeen = status === 'online' ? now : d.last_seen
      const updated: Display = {
        ...d,
        status,
        response_time: responseTime,
        last_seen: lastSeen,
        updated_at: now,
      }
      // Best-effort write to Supabase (no-op if not configured)
      writeHeartbeat(d.id, { status, response_time: responseTime, last_seen: lastSeen })
      if (status !== d.status) {
        logEvent(status === 'online' ? 'display_online' : 'display_offline', {
          displayId: d.id,
          message: `Probe result: ${status}`,
        })
      }
      return updated
    }),
  )
  return results
}

async function probeOne(
  url: string,
  timeoutMs = 8000,
): Promise<{ status: 'online' | 'offline'; responseTime: number | null }> {
  if (!url) return { status: 'offline', responseTime: null }
  const started = performance.now()
  return new Promise((resolve) => {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), timeoutMs)
    fetch(url, { method: 'HEAD', mode: 'no-cors', cache: 'no-store', signal: ctrl.signal })
      .then(() => {
        clearTimeout(timer)
        resolve({ status: 'online', responseTime: Math.round(performance.now() - started) })
      })
      .catch(() => {
        clearTimeout(timer)
        resolve({ status: 'offline', responseTime: null })
      })
  })
}
