import type { Display } from '../types/display'
import { StatusBadge } from './StatusBadge'
import { Button } from './Button'
import {
  IconExternal, IconRefresh, IconHome, IconBlock, IconAlert,
  IconMapPin, IconDisplay, IconClock, IconImage,
} from './icons'
import { sendCommand } from '../services/commands'
import { logEvent } from '../services/events'
import { isSupabaseConfigured } from '../services/supabase'
import { useState } from 'react'

type Props = {
  display: Display
  refreshTick?: number
  /** Optional Edit/Remove buttons supplied by the page (admin actions). */
  actions?: React.ReactNode
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

export function DisplayCard({ display, actions }: Props) {
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
      {/* Header: name + status */}
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
          </div>
          {display.orientation && (
            <div className="mt-1 text-[12px] text-nu-skylight">
              {display.orientation}
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

      {/* 1) Screenshot preview area (priority) */}
      <ScreenshotPreview display={display} />

      {/* 2) Display name (already in header) + status (already in header) */}

      {/* 3) Current page */}
      {display.current_page && (
        <div className="text-[12px] text-nu-skylight flex items-center gap-2">
          <span className="nu-eyebrow text-[10px]">Page</span>
          <code className="font-mono text-nu-sky">{display.current_page}</code>
        </div>
      )}

      {/* 4) Location + 5) Response time + 6) Last seen + 7) Last touch */}
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[12px]">
        <Meta icon={<IconMapPin size={12} />} label="Location" value={display.location} />
        <Meta
          icon={<IconClock size={12} />}
          label="Response"
          value={display.response_time !== null ? `${display.response_time} ms` : '—'}
        />
        <Meta
          icon={<IconClock size={12} />}
          label="Last seen"
          value={timeAgo(display.last_seen)}
          accent={display.status === 'online' ? 'leaf' : 'amber'}
        />
        <Meta
          icon={<IconClock size={12} />}
          label="Last touch"
          value={timeAgo(display.last_touch)}
        />
      </dl>

      {/* 8) Optional: Notes */}
      {display.notes && (
        <div className="text-[12px] text-nu-skylight/80 italic border-l-2 border-nu-tour/40 pl-3">
          {display.notes}
        </div>
      )}

      {/* Commands row — placeholder until Phase 3 connects to displays */}
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

      {/* Admin actions (Edit/Remove) — supplied by the page */}
      {actions && (
        <div className="grid grid-cols-2 gap-2 -mt-2">
          {actions}
        </div>
      )}
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
  accent?: 'leaf' | 'amber'
}) {
  const color = accent === 'leaf' ? 'text-nu-leaf'
    : accent === 'amber' ? 'text-nu-amber'
    : 'text-nu-wisp'
  return (
    <div className="flex items-center gap-2">
      <span className="text-nu-skylight/60 shrink-0">{icon}</span>
      <span className="text-nu-skylight/70 text-[11px] uppercase tracking-wider font-bold">
        {label}
      </span>
      <span className={['font-mono text-[12px] ml-auto', color].join(' ')}>
        {value}
      </span>
    </div>
  )
}

function ScreenshotPreview({ display }: { display: Display }) {
  // Phase 3: when screenshot_url is set, render <img>. Until then,
  // show a subtle placeholder with the display name.
  if (display.screenshot_url) {
    return (
      <div className="relative aspect-[16/10] rounded-glass overflow-hidden border border-white/10 bg-nu-navy/40">
        <img
          src={display.screenshot_url}
          alt={`Live preview of ${display.name}`}
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
        />
      </div>
    )
  }
  return (
    <div className="relative aspect-[16/10] rounded-glass bg-gradient-to-br from-nu-navy/60 to-nu-midnight/80 border border-white/10 flex items-center justify-center overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(45deg, rgba(255,255,255,0.6) 0 1px, transparent 1px 14px)',
        }}
      />
      <div className="relative text-center">
        <IconImage size={28} className="text-nu-skylight/30 mx-auto" />
        <div className="nu-eyebrow mt-2 text-[10px]">Screenshot</div>
        <div className="mt-1 text-[11px] text-nu-skylight/50">
          Available in Phase 3
        </div>
      </div>
    </div>
  )
}
