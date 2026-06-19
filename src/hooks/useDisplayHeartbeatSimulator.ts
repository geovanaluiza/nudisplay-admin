import { useCallback, useEffect, useState } from 'react'
import {
  sendHeartbeat,
  sendHeartbeatWithEvent,
  HEARTBEAT_INTERVAL_MS,
} from '../services/heartbeat'
import type { Display } from '../types/display'

/**
 * Simulates a display client inside the dashboard. Useful for:
 *
 * 1. Validating that the heartbeat schema (current_page, current_url,
 *    response_time, software_version) is correctly persisted and
 *    delivered to the dashboard via Realtime.
 * 2. Letting admin staff see what the "checking → online" transition
 *    looks like in the UI before the physical displays are connected.
 *
 * The simulator runs the heartbeat loop at the production interval
 * (HEARTBEAT_INTERVAL_MS) and stops when the page unmounts.
 */
export function useDisplayHeartbeatSimulator(
  display: Display,
  opts: {
    /** Custom interval (default: HEARTBEAT_INTERVAL_MS = 30s). */
    intervalMs?: number
    /** If false, no automatic heartbeat fires. */
    autoStart?: boolean
    /** If true, also writes a heartbeat_received event row. */
    logEvents?: boolean
  } = {},
) {
  const { intervalMs = HEARTBEAT_INTERVAL_MS, autoStart = true, logEvents = false } = opts
  const [running, setRunning] = useState(autoStart)
  const [lastSentAt, setLastSentAt] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [ticked, setTicked] = useState(0)

  const sendOne = useCallback(
    async (override?: { status?: 'online' | 'offline' | 'checking' }) => {
      setSending(true)
      const status = override?.status ?? 'online'
      const payload = {
        status,
        current_page: display.current_page ?? '/',
        current_url: display.current_url ?? display.public_url,
        response_time: 80 + Math.floor(Math.random() * 120),
        software_version: display.software_version ?? '0.7.0',
      }
      const ok = logEvents
        ? await sendHeartbeatWithEvent(display.id, display.name, payload)
        : await sendHeartbeat(display.id, payload)
      if (ok) {
        setLastSentAt(new Date().toISOString())
        setTicked((n) => n + 1)
      }
      setSending(false)
      return ok
    },
    [display, logEvents],
  )

  useEffect(() => {
    if (!running) return
    // Fire one immediately, then on interval.
    sendOne()
    const id = setInterval(() => sendOne(), intervalMs)
    return () => clearInterval(id)
  }, [running, intervalMs, sendOne])

  return {
    running,
    setRunning,
    sending,
    lastSentAt,
    ticked,
    sendOnline: () => sendOne({ status: 'online' }),
    sendOffline: () => sendOne({ status: 'offline' }),
    sendChecking: () => sendOne({ status: 'checking' }),
  }
}
