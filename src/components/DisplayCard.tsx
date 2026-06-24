import type { Display } from '../types/display'
import type { DisplayCommand } from '../types/command'
import { StatusBadge } from './StatusBadge'
import { SecurityBadge } from './SecurityBadge'
import { SecurityAlert } from './SecurityAlert'
import { Button } from './Button'
import { ScreenshotPanel } from './ScreenshotPanel'
import { DevControls } from './DevControls'
import { CommandStatus } from './CommandStatus'
import { PowerManagement } from './PowerManagement'
import {
  IconExternal, IconRefresh, IconHome, IconBlock, IconAlert,
  IconMapPin, IconDisplay, IconClock, IconBolt, IconCheck, IconX,
} from './icons'
import { sendCommand } from '../services/commands'
import { logEvent } from '../services/events'
import { isSupabaseConfigured } from '../services/supabase'
import { useState, useMemo } from 'react'

type Props = {
  display: Display
  commands: DisplayCommand[]
  refreshTick?: number
}

type CommandName =
  | 'reload' | 'go_home' | 'blackout' | 'emergency_message'
  | 'clear_blackout' | 'clear_emergency'
  | 'power_off' | 'power_on'
type CommandUiState = 'idle' | 'sending' | 'queued' | 'executed' | 'error'

function timeAgo(iso: string | null): string {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 0) return 'just now'
  if (diff < 5_000) return 'just now'
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  return `${Math.floor(diff / 3_600_000)}h ago`
}

/**
 * Whether the command buttons should be enabled.
 *
 * Phase 4 made the buttons sensitive to `display.status === 'online'`,
 * but the column can be `undefined` when the seed schema doesn't yet
 * expose `security_status` (migration 004 not run). To avoid locking
 * admins out in that window, we treat `undefined`, `'online'` and
 * `'checking'` as commandable. `'offline'` is the only blocking state.
 *
 * Important: Go Home is ALWAYS commandable when Supabase is configured,
 * even if the display is offline. This is the universal recovery
 * command — it must reach the kiosk the moment it reconnects.
 */
function isCommandable(display: Display, supabaseReady: boolean): boolean {
  if (!supabaseReady) return false
  if (display.status === 'offline') return false
  return true
}

export function DisplayCard({ display, commands }: Props) {
  const [busyCmd, setBusyCmd] = useState<CommandName | null>(null)
  const [cmdState, setCmdState] = useState<Record<CommandName, CommandUiState>>({
    reload: 'idle',
    go_home: 'idle',
    blackout: 'idle',
    emergency_message: 'idle',
    clear_blackout: 'idle',
    clear_emergency: 'idle',
    power_off: 'idle',
    power_on: 'idle',
  })
  const [cmdError, setCmdError] = useState<string | null>(null)
  const supabaseReady = isSupabaseConfigured()
  const commandable = isCommandable(display, supabaseReady)

  const blackoutActive = Boolean(display.is_blackout)
  const emergencyActive = Boolean(display.emergency_message)

  /**
   * Watch the commands prop and flip the UI state of any matching
   * command from 'queued' → 'executed' so the admin sees the
   * display acknowledged it.
   */
  const latestForCmd = useMemo(() => {
    const map: Partial<Record<CommandName, DisplayCommand>> = {}
    for (const c of commands) {
      if (c.display_id !== display.id) continue
      const k = c.command as CommandName
      if (!map[k]) map[k] = c
    }
    return map
  }, [commands, display.id])

  // Track execution transitions without infinite re-renders.
  useMemo(() => {
    setCmdState((prev) => {
      const next = { ...prev }
      let changed = false
      for (const k of [
        'reload', 'go_home', 'blackout', 'emergency_message',
        'clear_blackout', 'clear_emergency', 'power_off', 'power_on',
      ] as CommandName[]) {
        const row = latestForCmd[k]
        if (!row) continue
        if (row.executed_at && prev[k] !== 'executed') {
          next[k] = 'executed'
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [latestForCmd])

  async function onCommand(cmd: CommandName, label: string) {
    if (!supabaseReady) {
      window.alert('Supabase not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env to enable commands.')
      return
    }
    if (busyCmd) return // already sending another command

    const payload = { displayId: display.id, command: cmd }
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.log('[command] clicked', { ...payload, label })
    }

    setBusyCmd(cmd)
    setCmdState((s) => ({ ...s, [cmd]: 'sending' }))
    setCmdError(null)

    try {
      const inserted = await sendCommand(display.id, cmd)
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.log('[command] supabase insert ok', { id: inserted.id, command: cmd })
      }
      setCmdState((s) => ({ ...s, [cmd]: 'queued' }))
      await logEvent('command_sent', {
        displayId: display.id,
        message: `${label} command sent to ${display.name}`,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to send command'
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.error('[command] supabase insert failed', { command: cmd, error: msg })
      }
      setCmdState((s) => ({ ...s, [cmd]: 'error' }))
      setCmdError(msg)
      window.alert(msg)
    } finally {
      setBusyCmd(null)
      // Reset to idle after 4s so the badge fades out
      setTimeout(() => {
        setCmdState((s) => (s[cmd] === 'queued' ? { ...s, [cmd]: 'idle' } : s))
      }, 4_000)
    }
  }

  // Build the props for each button (DRY)
  function btnProps(cmd: CommandName, label: string) {
    // Go Home is ALWAYS clickable (recovery) — except during a
    // Supabase insert in flight or when Supabase isn't configured.
    const blocked = cmd === 'go_home' ? !supabaseReady : !commandable
    const busy = busyCmd === cmd
    const state = cmdState[cmd]
    const disabled = blocked || busy
    const stateLabel =
      busy ? '…' :
      state === 'queued' ? 'Queued' :
      state === 'executed' ? 'Done' :
      state === 'error' ? '!' :
      label
    return {
      disabled,
      busy,
      state,
      stateLabel,
      title: blocked
        ? 'Display offline — commands are queued but not executed until the kiosk reports online'
        : `Send a '${cmd}' command to ${display.name} (inserted into display_commands)`,
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
          href={display.public_url || display.approved_url || '#'}
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

      {/* 4b) Overlay mode indicators — show current blackout / emergency state */}
      {(blackoutActive || emergencyActive) && (
        <div className="flex items-center gap-2 flex-wrap">
          {blackoutActive && (
            <span className="nu-pill text-[10px] py-1 px-3 border-nu-tour/60 bg-nu-tour/15 text-nu-tour border">
              <IconBlock size={11} />
              <span>Blackout active</span>
            </span>
          )}
          {emergencyActive && (
            <span className="nu-pill text-[10px] py-1 px-3 border-nu-amber/60 bg-nu-amber/15 text-nu-amber border">
              <IconAlert size={11} />
              <span>Emergency active</span>
            </span>
          )}
          <span className="text-[10px] text-nu-skylight/70 ml-auto">
            Click <strong className="text-nu-tour">Go Home</strong> to recover
          </span>
        </div>
      )}

      {/* 5) Command pipeline (Phase 3F) — pending/executed summary */}
      <CommandStatus display={display} commands={commands} />

      {/* 6) Commands row — primary actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {(() => {
          const r = btnProps('reload', 'Reload')
          return (
            <Button
              variant="secondary"
              size="sm"
              icon={<IconRefresh />}
              onClick={() => onCommand('reload', 'Reload')}
              disabled={r.disabled}
              title={r.title}
              className={r.state === 'queued' || r.state === 'executed' ? 'ring-1 ring-nu-tour/50' : ''}
            >
              {r.stateLabel}
            </Button>
          )
        })()}
        {(() => {
          const g = btnProps('go_home', 'Go Home')
          return (
            <Button
              variant="secondary"
              size="sm"
              icon={<IconHome />}
              onClick={() => onCommand('go_home', 'Go Home')}
              disabled={g.disabled}
              title="Universal recovery: clear blackout/emergency and return to home"
              className={[
                'ring-1 ring-nu-tour/40',
                g.state === 'queued' || g.state === 'executed' ? 'ring-nu-tour/60' : '',
              ].join(' ')}
            >
              {g.stateLabel}
            </Button>
          )
        })()}
        {(() => {
          const b = btnProps('blackout', blackoutActive ? 'End Blackout' : 'Blackout')
          return (
            <Button
              variant={blackoutActive ? 'secondary' : 'danger'}
              size="sm"
              icon={blackoutActive ? <IconCheck /> : <IconBlock />}
              onClick={() => onCommand(blackoutActive ? 'clear_blackout' : 'blackout', blackoutActive ? 'End Blackout' : 'Blackout')}
              disabled={b.disabled}
              title={blackoutActive
                ? 'End the blackout overlay (display client clears local state + key)'
                : 'Activate the blackout overlay (display client shows fullscreen #000)'}
              className={b.state === 'queued' || b.state === 'executed' ? 'ring-1 ring-nu-tour/50' : ''}
            >
              {b.stateLabel}
            </Button>
          )
        })()}
        {(() => {
          const e = btnProps('emergency_message', emergencyActive ? 'End Emergency' : 'Emergency')
          return (
            <Button
              variant={emergencyActive ? 'secondary' : 'primary'}
              size="sm"
              icon={emergencyActive ? <IconCheck /> : <IconAlert />}
              onClick={() => onCommand(emergencyActive ? 'clear_emergency' : 'emergency_message', emergencyActive ? 'End Emergency' : 'Emergency')}
              disabled={e.disabled}
              title={emergencyActive
                ? 'End the emergency overlay (display client clears local state + key)'
                : 'Activate the emergency overlay (display client shows fullscreen red)'}
              className={e.state === 'queued' || e.state === 'executed' ? 'ring-1 ring-nu-tour/50' : ''}
            >
              {e.stateLabel}
            </Button>
          )
        })()}
      </div>

      {/* 6b) Explicit recovery row — Clear Blackout / Clear Emergency
            Use these to remove a single overlay WITHOUT navigating.
            Go Home above does both AND navigates. */}
      <div className="grid grid-cols-2 gap-2">
        {(() => {
          const c = btnProps('clear_blackout', 'Clear Blackout')
          return (
            <Button
              variant="ghost"
              size="sm"
              icon={<IconX size={12} />}
              onClick={() => onCommand('clear_blackout', 'Clear Blackout')}
              disabled={c.disabled}
              title="Remove blackout overlay only — does not navigate"
              className="text-[11px]"
            >
              {c.state === 'queued' ? 'Queued' : c.state === 'executed' ? 'Done' : 'Clear Blackout'}
            </Button>
          )
        })()}
        {(() => {
          const c = btnProps('clear_emergency', 'Clear Emergency')
          return (
            <Button
              variant="ghost"
              size="sm"
              icon={<IconX size={12} />}
              onClick={() => onCommand('clear_emergency', 'Clear Emergency')}
              disabled={c.disabled}
              title="Remove emergency overlay only — does not navigate"
              className="text-[11px]"
            >
              {c.state === 'queued' ? 'Queued' : c.state === 'executed' ? 'Done' : 'Clear Emergency'}
            </Button>
          )
        })()}
      </div>

      {/* Last error feedback (DEV-friendly surface for any send failure) */}
      {cmdError && (
        <div className="text-[11px] text-nu-amber border-l-2 border-nu-amber/50 pl-3">
          Last command failed: {cmdError}
        </div>
      )}

      {/* 6c) Power Management (Phase 5C) — hardware-agnostic on/off.
            Sits below the command pipeline and reuses the same
            display_commands table. The display client's
            commandExecutor.executePowerOff / executePowerOn stubs
            dispatch to whatever backend is plugged in. */}
      <PowerManagement
        display={display}
        lastPowerCommand={
          latestForCmd.power_off ? {
            command: 'power_off',
            created_at: latestForCmd.power_off.created_at,
            executed_at: latestForCmd.power_off.executed_at,
          } : latestForCmd.power_on ? {
            command: 'power_on',
            created_at: latestForCmd.power_on.created_at,
            executed_at: latestForCmd.power_on.executed_at,
          } : null
        }
      />

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