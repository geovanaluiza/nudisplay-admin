import { useCallback, useEffect, useRef, useState } from 'react'
import { sendHeartbeat, HEARTBEAT_INTERVAL_MS } from '../services/heartbeat'
import type { HeartbeatPayload } from '../services/heartbeat'
import type { Display } from '../types/display'

/**
 * Per-display heartbeat hook.
 *
 * Two modes:
 *
 * 1. Dashboard mode (simulator) — no `autoTick`. The hook exposes
 *    `tick()` so a button can call it; useful for the "Simulate
 *    Heartbeat" admin control.
 *
 * 2. Display-client mode — pass `autoTick: true` and the hook will
 *    send a heartbeat every HEARTBEAT_INTERVAL_MS. This is what the
 *    Nuxt / Vue kiosk pages will import once they're integrated.
 *
 * Returns:
 *   - lastSentAt: ISO string of the most recent successful send
 *   - sending:    in-flight flag
 *   - error:      last error message (null when healthy)
 *   - tick():     force a heartbeat right now
 */
export function useDisplayHeartbeat(
  display: Display | null,
  getPayload: () => HeartbeatPayload | null,
  opts: { autoTick?: boolean } = {},
) {
  const [lastSentAt, setLastSentAt] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const cancelledRef = useRef(false)
  const payloadRef = useRef(getPayload)
  payloadRef.current = getPayload

  const tick = useCallback(async (): Promise<boolean> => {
    if (!display) return false
    const payload = payloadRef.current()
    if (!payload) return false
    setSending(true)
    setError(null)
    const ok = await sendHeartbeat(display.id, payload)
    if (cancelledRef.current) return ok
    if (ok) {
      setLastSentAt(new Date().toISOString())
    } else {
      setError('Heartbeat write failed — check Supabase connection.')
    }
    setSending(false)
    return ok
  }, [display])

  useEffect(() => {
    if (!opts.autoTick || !display) return
    cancelledRef.current = false
    // Fire one immediately so the display is "online" the moment
    // it boots, then schedule the recurring tick.
    tick()
    const id = setInterval(tick, HEARTBEAT_INTERVAL_MS)
    return () => {
      cancelledRef.current = true
      clearInterval(id)
    }
  }, [opts.autoTick, display?.id, tick])

  return { lastSentAt, sending, error, tick }
}
