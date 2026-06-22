import type { Display } from '../types/display'
import type { DisplayCommand } from '../types/command'
import { StatusBadge } from './StatusBadge'
import { SecurityBadge } from './SecurityBadge'
import { SecurityAlert } from './SecurityAlert'
import { Button } from './Button'
import { ScreenshotPanel } from './ScreenshotPanel'
import { DevControls } from './DevControls'
import { CommandStatus } from './CommandStatus'
import {
  IconExternal, IconRefresh, IconHome, IconBlock, IconAlert,
  IconMapPin, IconDisplay, IconClock, IconBolt,
} from './icons'
import { sendCommand } from '../services/commands'
import { logEvent } from '../services/events'
import { isSupabaseConfigured } from '../services/supabase'
import { useState } from 'react'

type Props = {
  display: Display
  commands: DisplayCommand[]
  refreshTick?: number
}

function timeAgo(iso: string | null): string {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 0) return 'just now'
  if (diff < 5_000) return 'just now'
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  return `${Math.floor(diff / 3_600_000)}h ago`
}

export function DisplayCard({ display, commands }: Props) {
  const [busyCmd, setBusyCmd] = useState<string | null>(null)
  const supabaseReady = isSupabaseConfigured()

  async function onCommand(
    cmd: 'reload' | 'go_home' | 'blackout' | 'emergency_message',
    label: string,
  ) {
    if (!supabaseReady) {
      window.alert('Supabase not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env to enable commands.')
      return
    }
    setBusyCmd(cmd)
    try {
      await sendCommand(display.id, cmd)
      await logEvent('command_sent', {
        displayId: display.id,
        message: `${label} command sent to ${display.name}`,
      })
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Failed to send command')
    } finally {
      setBusyCmd(null)
    }
  }

  return (
    <article className="nu-card p-6 flex flex-col gap-5">
      {/* Phase 4.5: red alert banner if security_status === 'critical' */}
      <SecurityAlert display={display} />

      {/* Header: name + status + open-in-new-tab */}
      <header className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-glass bg-nu-blue/15 border border-nu-blue/30 flex items-center justify-center text-nu-sky shrink-0">
          <IconDisplay size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="font-serif text-[22px] text-nu-wisp leading-none truncate">
              {display.name}
            </h3>
            <StatusBadge status={display.status} />
            <SecurityBadge status={display.security_status} />
          </div>
          {display.orientation && (
            <div className="mt-1 text-[12px] text-nu-skylight">
              {display.orientation}
            </div>
          )}
          {display.security_message && display.security_status !== 'secure' && (
            <div className={[
              'mt-1 text-[11px]',
              display.security_status === 'critical' ? 'text-nu-amber' : 'text-nu-sky',
            ].join(' ')}>
              {display.security_message}
            </div>
          )}
        </div>
        <a
          href={display.public_url}
          target="_blank"
          rel="noreferrer noopener"
          aria-label={`Open ${display.name} in a new tab`}
          className="text-nu-skylight hover:text-nu-tour transition-colors shrink-0"
        >
          <IconExternal size={16} />
        </a>
      </header>

      {/* 1) Screenshot panel (Phase 3C: real image with loading/error states) */}
      <ScreenshotPanel display={display} />

      {/* 2) Current page / current URL (Phase 3B) */}
      <div className="grid grid-cols-1 gap-1 text-[12px]">
        <div className="flex items-center gap-2">
          <span className="nu-eyebrow text-[10px] w-20 shrink-0">Page</span>
          <code className="font-mono text-nu-sky truncate">
            {display.current_page ?? '—'}
          </code>
        </div>
        <div className="flex items-center gap-2 min-w-0">
          <span className="nu-eyebrow text-[10px] w-20 shrink-0">URL</span>
          <code className="font-mono text-nu-sky/80 truncate text-[11px]">
            {display.current_url ?? display.public_url ?? '—'}
          </code>
        </div>
      </div>

      {/* 3) Health grid (Phase 3D) — heartbeat, last touch, response, software */}
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[12px]">
        <Meta icon={<IconMapPin size={12} />} label="Location" value={display.location} />
        <Meta
          icon={<IconClock size={12} />}
          label="Response"
          value={display.response_time !== null ? `${display.response_time} ms` : '—'}
        />
        <Meta
          icon={<IconClock size={12} />}
          label="Last heartbeat"
          value={timeAgo(display.last_seen)}
          accent={display.status === 'online' ? 'leaf' : display.status === 'checking' ? 'sky' : 'amber'}
        />
        <Meta
          icon={<IconClock size={12} />}
          label="Last touch"
          value={timeAgo(display.last_touch)}
        />
        <Meta
          icon={<IconBolt size={12} />}
          label="Software"
          value={display.software_version ?? '—'}
        />
        <Meta
          icon={<IconClock size={12} />}
          label="Updated"
          value={timeAgo(display.updated_at)}
        />
      </dl>

      {/* Phase 4.5: approved URL bar (subtle, shows what's allowed) */}
      {display.approved_url && (
        <div className="text-[11px] text-nu-skylight/70 flex items-center gap-2 min-w-0">
          <span className="nu-eyebrow text-[10px] w-20 shrink-0">Approved</span>
          <code className="font-mono text-nu-sky/70 truncate text-[11px]" title={display.approved_url}>
            {display.approved_url}
          </code>
        </div>
      )}

      {/* 4) Optional notes */}
      {display.notes && (
        <div className="text-[12px] text-nu-skylight/80 italic border-l-2 border-nu-tour/40 pl-3">
          {display.notes}
        </div>
      )}

      {/* 5) Command pipeline (Phase 3F) — pending/executed summary */}
      <CommandStatus display={display} commands={commands} />

      {/* 6) Commands row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Button
          variant="secondary"
          size="sm"
          icon={<IconRefresh />}
          onClick={() => onCommand('reload', 'Reload')}
          disabled={!supabaseReady || display.status !== 'online' || busyCmd !== null}
          title="Insert a 'reload' command into display_commands"
        >
          {busyCmd === 'reload' ? '…' : 'Reload'}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          icon={<IconHome />}
          onClick={() => onCommand('go_home', 'Go Home')}
          disabled={!supabaseReady || display.status !== 'online' || busyCmd !== null}
          title="Insert a 'go_home' command into display_commands"
        >
          {busyCmd === 'go_home' ? '…' : 'Go Home'}
        </Button>
        <Button
          variant="danger"
          size="sm"
          icon={<IconBlock />}
          onClick={() => onCommand('blackout', 'Blackout')}
          disabled={!supabaseReady || display.status !== 'online' || busyCmd !== null}
          title="Insert a 'blackout' command into display_commands"
        >
          {busyCmd === 'blackout' ? '…' : 'Blackout'}
        </Button>
        <Button
          variant="primary"
          size="sm"
          icon={<IconAlert />}
          onClick={() => onCommand('emergency_message', 'Emergency')}
          disabled={!supabaseReady || display.status !== 'online' || busyCmd !== null}
          title="Insert an 'emergency_message' command into display_commands"
        >
          {busyCmd === 'emergency_message' ? '…' : 'Emergency'}
        </Button>
      </div>

      {/* 7) Dev controls (Phase 3E) — visible on the admin dashboard
         since this is an internal-only preview. In a real production
         build remove forceEnable to gate by import.meta.env.PROD. */}
      <DevControls display={display} forceEnable />
    </article>
  )
}

/* --------- Sub-components --------- */

function Meta({
  icon, label, value, accent,
}: {
  icon: React.ReactNode
  label: string
  value: string
  accent?: 'leaf' | 'amber' | 'sky'
}) {
  const color = accent === 'leaf' ? 'text-nu-leaf'
    : accent === 'amber' ? 'text-nu-amber'
    : accent === 'sky' ? 'text-nu-sky'
    : 'text-nu-wisp'
  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className="text-nu-skylight/60 shrink-0">{icon}</span>
      <span className="text-nu-skylight/70 text-[10px] uppercase tracking-wider font-bold whitespace-nowrap">
        {label}
      </span>
      <span className={['font-mono text-[11px] ml-auto truncate', color].join(' ')} title={value}>
        {value}
      </span>
    </div>
  )
}
