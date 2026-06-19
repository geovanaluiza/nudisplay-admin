import { useEffect, useRef, useState } from 'react'
import type { Display, DisplayHealth, DisplayStatus } from '../types/display'

/**
 * Health-check hook for one display URL.
 *
 * Phase 1: uses `fetch(url, { method: 'GET', mode: 'no-cors', cache: 'no-store' })`
 * with an AbortController timeout. The 'no-cors' response yields an
 * opaque result — we treat any non-network failure as "offline" and
 * a successful opaque response as "online".
 *
 * Phase 2 will swap this for a Supabase heartbeat: each display
 * POSTs a heartbeat every 30s; the dashboard reads from a `displays`
 * table with `last_heartbeat` and `response_ms` columns.
 */
function probe(url: string, timeoutMs: number): Promise<{
  ok: boolean
  responseTime: number
  httpStatus: number | null
}> {
  const started = performance.now()
  return new Promise((resolve) => {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), timeoutMs)
    fetch(url, {
      method: 'HEAD',
      mode: 'no-cors',
      cache: 'no-store',
      signal: ctrl.signal,
    })
      .then(() => {
        clearTimeout(timer)
        resolve({ ok: true, responseTime: performance.now() - started, httpStatus: null })
      })
      .catch(() => {
        clearTimeout(timer)
        resolve({ ok: false, responseTime: performance.now() - started, httpStatus: null })
      })
  })
}

const PROBE_INTERVAL_MS = 30_000
const PROBE_TIMEOUT_MS = 8_000
const STALE_AFTER_MS = PROBE_INTERVAL_MS * 2 + PROBE_TIMEOUT_MS

function emptyHealth(): DisplayHealth {
  return {
    status: 'checking',
    responseTime: null,
    lastChecked: new Date().toISOString(),
    httpStatus: null,
  }
}

/**
 * Probes a single display. Re-probes every PROBE_INTERVAL_MS.
 * Marked "checking" while the first probe is in flight; flips to
 * "offline" if it fails; flips back to "online" on the next success.
 * If no successful probe for STALE_AFTER_MS, forces "offline".
 */
export function useDisplayHealth(display: Display): DisplayHealth {
  const [health, setHealth] = useState<DisplayHealth>(emptyHealth)
  const inFlight = useRef(false)

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null
    let lastOk = 0

    const run = async () => {
      if (cancelled || inFlight.current) return
      inFlight.current = true
      setHealth((h) => ({ ...h, status: 'checking' as DisplayStatus }))
      const result = await probe(display.url, PROBE_TIMEOUT_MS)
      if (cancelled) return
      inFlight.current = false

      if (result.ok) {
        lastOk = Date.now()
        setHealth({
          status: 'online',
          responseTime: Math.round(result.responseTime),
          lastChecked: new Date().toISOString(),
          httpStatus: result.httpStatus,
        })
      } else {
        setHealth({
          status: 'offline',
          responseTime: null,
          lastChecked: new Date().toISOString(),
          httpStatus: result.httpStatus,
        })
      }
    }

    // Run immediately, then on interval
    run()
    timer = setInterval(() => {
      // Force offline if we've been stale too long
      if (lastOk && Date.now() - lastOk > STALE_AFTER_MS) {
        setHealth((h) => ({ ...h, status: 'offline' as DisplayStatus }))
      }
      run()
    }, PROBE_INTERVAL_MS)

    return () => {
      cancelled = true
      if (timer) clearInterval(timer)
    }
  }, [display.url])

  return health
}
