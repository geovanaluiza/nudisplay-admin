import { useState } from 'react'
import type { Display } from '../types/display'
import { Button } from './Button'
import { IconPower, IconAlert, IconBolt } from './icons'
import { sendHeartbeatWithEvent } from '../services/heartbeat'
import { logEvent } from '../services/events'
import { isSupabaseConfigured } from '../services/supabase'

type Props = {
  display: Display
  /**
   * If true, render even in production builds. Defaults to false
   * because these controls are for Phase 3 / staging validation only.
   */
  forceEnable?: boolean
}

/**
 * Phase 3 / Phase 4 testing controls.
 *
 * Three buttons that write directly to the `displays` and
 * `display_events` tables, mimicking what the production display
 * client will do every 30 seconds:
 *
 *   • Simulate Online    → status = 'online',  new last_seen
 *   • Simulate Offline   → status = 'offline', stale last_seen
 *   • Simulate Heartbeat → status = 'online', new last_seen + log event
 *
 * Clearly marked "Development Only" so a production admin cannot
 * accidentally inject fake state. Hidden when forceEnable is false
 * AND import.meta.env.PROD is true.
 */
export function DevControls({ display, forceEnable = false }: Props) {
  const [busy, setBusy] = useState<string | null>(null)
  if (import.meta.env.PROD && !forceEnable) return null
  if (!isSupabaseConfigured()) return null

  async function simulateOnline() {
    if (!confirm(`Set ${display.name} to ONLINE in Supabase? (Development Only)`)) return
    setBusy('online')
    await sendHeartbeatWithEvent(display.id, display.name, {
      status: 'online',
      current_page: display.current_page ?? '/',
      current_url: display.current_url ?? display.public_url,
      response_time: 120,
      software_version: display.software_version ?? '0.7.0',
    })
    setBusy(null)
  }
  async function simulateOffline() {
    if (!confirm(`Set ${display.name} to OFFLINE in Supabase? (Development Only)`)) return
    setBusy('offline')
    await sendHeartbeatWithEvent(display.id, display.name, {
      status: 'offline',
      current_page: null,
      current_url: null,
      response_time: null,
      software_version: display.software_version ?? '0.7.0',
    })
    // The dashboard re-derives status from last_seen. We leave
    // last_seen alone here so the simulator can still bring the
    // display back online with one click.
    setBusy(null)
  }
  async function simulateHeartbeat() {
    setBusy('heartbeat')
    await sendHeartbeatWithEvent(display.id, display.name, {
      status: 'online',
      current_page: display.current_page ?? '/',
      current_url: display.current_url ?? display.public_url,
      response_time: 80 + Math.floor(Math.random() * 80),
      software_version: display.software_version ?? '0.7.0',
    })
    await logEvent('heartbeat_received', {
      displayId: display.id,
      message: `Manual heartbeat via Dev Controls (${display.name})`,
    })
    setBusy(null)
  }

  return (
    <div className="rounded-glass border border-dashed border-nu-tour/40 bg-nu-tour/5 px-3 py-2.5">
      <div className="flex items-center justify-between mb-2">
        <span className="nu-eyebrow text-[10px] text-nu-tour">Development Only</span>
        <span className="text-[10px] text-nu-skylight/50">simulator</span>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        <Button
          variant="secondary"
          size="sm"
          icon={<IconPower size={12} />}
          onClick={simulateOnline}
          disabled={busy !== null}
          className="text-[11px] !h-7 !px-2"
          title="Mark this display as online and update last_seen"
        >
          {busy === 'online' ? '…' : 'Online'}
        </Button>
        <Button
          variant="danger"
          size="sm"
          icon={<IconAlert size={12} />}
          onClick={simulateOffline}
          disabled={busy !== null}
          className="text-[11px] !h-7 !px-2"
          title="Mark this display as offline"
        >
          {busy === 'offline' ? '…' : 'Offline'}
        </Button>
        <Button
          variant="primary"
          size="sm"
          icon={<IconBolt size={12} />}
          onClick={simulateHeartbeat}
          disabled={busy !== null}
          className="text-[11px] !h-7 !px-2"
          title="Send a single heartbeat and log the event"
        >
          {busy === 'heartbeat' ? '…' : 'Heartbeat'}
        </Button>
      </div>
    </div>
  )
}
