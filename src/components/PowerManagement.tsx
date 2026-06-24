import { useEffect, useState } from 'react'
import type { Display } from '../types/display'
import type { CommandType } from '../types/command'
import { sendCommand } from '../services/commands'
import { logEvent } from '../services/events'
import { isSupabaseConfigured } from '../services/supabase'
import { IconPower, IconBolt } from './icons'

/**
 * PowerManagement — Phase 5C.
 *
 * Hardware-agnostic remote on/off control for a single display.
 *
 * The dashboard inserts a row into `display_commands` with
 *   command: 'power_off' | 'power_on'
 * The display client's commandExecutor (services/commandExecutor.ts)
 * dispatches to whatever power backend is plugged in — for now a
 * console-logging stub, in the future Samsung VXT / LG webOS /
 * BrightSign / Wake-on-LAN / CEC / GPIO relay, etc.
 *
 * Safety:
 *   - 30-second cooldown between power commands (one at a time)
 *   - Turn Off requires a confirmation dialog
 *   - Buttons disabled while a command is pending
 *   - Spinner shown during the network round-trip
 *   - Power On is only enabled when the display is offline
 *
 * Status indicators:
 *   - '⚡ Powering Off…' while power_off is in flight
 *   - '⚡ Powering On…'  while power_on  is in flight
 *   - Power state (on/off) is read from display.power_state and
 *     the latest command in the commands prop.
 */

const COOLDOWN_MS = 30_000

type PowerState = 'on' | 'off' | 'unknown'
type PowerAction = 'power_off' | 'power_on'
type Status = 'idle' | 'sending' | 'sent' | 'executing' | 'done' | 'error'

type Props = {
  display: Display
  /** The most recent power_* command row (if any) — used to drive
   *  the 'Powering Off…' / 'Powering On…' status while the display
   *  client is acknowledging the command. */
  lastPowerCommand: {
    command: PowerAction
    created_at: string
    executed_at: string | null
  } | null
  /** Called when a power command is sent (so the parent can log it
   *  in the Command Pipeline history). */
  onCommandSent?: (cmd: PowerAction, label: string) => void
}

export function PowerManagement({ display, lastPowerCommand, onCommandSent }: Props) {
  const [confirming, setConfirming] = useState<PowerAction | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)
  const [cooldownUntil, setCooldownUntil] = useState<number>(0)
  const [now, setNow] = useState(Date.now())
  const supabaseReady = isSupabaseConfigured()

  // Tick the cooldown timer so the "Try again in Ns" label updates.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1_000)
    return () => clearInterval(id)
  }, [])

  // Watch the lastPowerCommand prop to drive the in-flight status.
  useEffect(() => {
    if (!lastPowerCommand) {
      setStatus('idle')
      return
    }
    const sinceSent = Date.now() - new Date(lastPowerCommand.created_at).getTime()
    if (lastPowerCommand.executed_at) {
      setStatus('done')
      return
    }
    if (sinceSent < 30_000) {
      setStatus('executing')
      return
    }
    setStatus('idle')
  }, [lastPowerCommand])

  const powerState: PowerState =
    display.power_state === 'on' || display.power_state === 'off'
      ? display.power_state
      : 'unknown'
  const isOffline = display.status === 'offline'

  const cooldownLeftMs = Math.max(0, cooldownUntil - now)
  const inCooldown = cooldownLeftMs > 0
  const cooldownLeftLabel = inCooldown
    ? `Try again in ${Math.ceil(cooldownLeftMs / 1_000)}s`
    : null

  async function send(cmd: PowerAction) {
    if (!supabaseReady) {
      window.alert('Supabase not configured.')
      return
    }
    if (inCooldown) return
    setConfirming(null)
    setStatus('sending')
    setError(null)
    try {
      await sendCommand(display.id, cmd as CommandType)
      setStatus('sent')
      // Start the 30s cooldown immediately so the user can't spam
      // commands. The display client still has 30s to execute it.
      setCooldownUntil(Date.now() + COOLDOWN_MS)
      const label = cmd === 'power_off' ? 'Turn Off Display' : 'Turn On Display'
      await logEvent(
        cmd === 'power_off' ? 'power_off_requested' : 'power_on_requested',
        {
          displayId: display.id,
          message: `${label} requested for ${display.name}`,
        },
      )
      onCommandSent?.(cmd, label)
      // Move to 'executing' (display hasn't acked yet) — the effect
      // above will flip to 'done' when executed_at arrives.
      setStatus('executing')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to send power command'
      setError(msg)
      setStatus('error')
      window.alert(msg)
    }
  }

  const turnOffDisabled =
    !supabaseReady || inCooldown || status === 'sending' || status === 'executing'
  // Power On is ONLY enabled when the display is offline.
  const turnOnDisabled =
    !supabaseReady || inCooldown || status === 'sending' || status === 'executing' || !isOffline

  return (
    <section
      aria-label="Power Management"
      className="rounded-glass border border-white/10 bg-nu-navy/30 p-3 flex flex-col gap-2.5"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="nu-eyebrow text-[10px]">Power Management</span>
          <PowerStatePill state={powerState} />
        </div>
        {(status === 'sending' || status === 'executing') && (
          <span className="inline-flex items-center gap-1.5 text-[11px] text-nu-tour font-semibold">
            <span className="inline-block w-3 h-3 rounded-full border-2 border-nu-tour/30 border-t-nu-tour animate-spin" />
            {status === 'sending' ? 'Sending…' :
              lastPowerCommand?.command === 'power_off' ? 'Powering Off…' :
              'Powering On…'}
          </span>
        )}
        {status === 'done' && lastPowerCommand && (
          <span className="inline-flex items-center gap-1.5 text-[11px] text-nu-leaf font-semibold">
            <IconBolt size={11} />
            {lastPowerCommand.command === 'power_off' ? 'Powered Off' : 'Powered On'}
          </span>
        )}
        {cooldownLeftLabel && (
          <span className="text-[10px] text-nu-skylight/60">{cooldownLeftLabel}</span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setConfirming('power_off')}
          disabled={turnOffDisabled}
          className={[
            'h-10 px-3 rounded-glass border text-[13px] font-semibold gap-2',
            'inline-flex items-center justify-center transition-colors',
            'bg-nu-amber/12 text-nu-amber hover:bg-nu-amber/20 border-nu-amber/40',
            'disabled:opacity-40 disabled:cursor-not-allowed',
          ].join(' ')}
          title={
            !supabaseReady ? 'Supabase not configured' :
            inCooldown ? cooldownLeftLabel ?? 'Cooldown' :
            status === 'executing' ? 'Power command in flight' :
            'Remotely turn off this display (requires confirmation)'
          }
        >
          {status === 'sending' || (status === 'executing' && lastPowerCommand?.command === 'power_off') ? (
            <span className="inline-block w-3 h-3 rounded-full border-2 border-nu-amber/30 border-t-nu-amber animate-spin" />
          ) : (
            <IconPower size={14} />
          )}
          Turn Off
        </button>

        <button
          type="button"
          onClick={() => send('power_on')}
          disabled={turnOnDisabled}
          className={[
            'h-10 px-3 rounded-glass border text-[13px] font-semibold gap-2',
            'inline-flex items-center justify-center transition-colors',
            'bg-nu-leaf/12 text-nu-leaf hover:bg-nu-leaf/20 border-nu-leaf/40',
            'disabled:opacity-40 disabled:cursor-not-allowed',
          ].join(' ')}
          title={
            !supabaseReady ? 'Supabase not configured' :
            inCooldown ? cooldownLeftLabel ?? 'Cooldown' :
            status === 'executing' ? 'Power command in flight' :
            !isOffline ? 'Display must be offline to power on' :
            'Remotely turn on this display'
          }
        >
          {status === 'sending' || (status === 'executing' && lastPowerCommand?.command === 'power_on') ? (
            <span className="inline-block w-3 h-3 rounded-full border-2 border-nu-leaf/30 border-t-nu-leaf animate-spin" />
          ) : (
            <IconBolt size={14} />
          )}
          Turn On
        </button>
      </div>

      {error && (
        <div className="text-[11px] text-nu-amber border-l-2 border-nu-amber/50 pl-3">
          Power command failed: {error}
        </div>
      )}

      {confirming === 'power_off' && (
        <ConfirmDialog
          displayName={display.name}
          onCancel={() => setConfirming(null)}
          onConfirm={() => send('power_off')}
        />
      )}
    </section>
  )
}

/* -----------------------------------------------------------------
 * Confirm dialog
 * ----------------------------------------------------------------- */

function ConfirmDialog({
  displayName, onCancel, onConfirm,
}: {
  displayName: string
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Confirm power off"
      onClick={onCancel}
    >
      <div
        className="max-w-md w-full rounded-glass border-2 border-nu-amber/40 bg-nu-midnight p-6 flex flex-col gap-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-nu-amber/15 border border-nu-amber/40 flex items-center justify-center text-nu-amber">
            <IconPower size={18} />
          </div>
          <h4 className="font-serif text-[20px] text-nu-wisp leading-none">
            Turn off {displayName}?
          </h4>
        </div>
        <p className="text-[13px] text-nu-skylight/90 leading-relaxed">
          The display will stop showing content until it is powered back on.
        </p>
        <div className="flex items-center gap-2 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="h-9 px-4 rounded-glass bg-white/[0.06] text-nu-wisp hover:bg-white/10 border border-white/15 text-[13px] font-semibold"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="h-9 px-4 rounded-glass bg-nu-amber text-nu-midnight hover:bg-nu-tour border border-nu-amber/60 text-[13px] font-bold inline-flex items-center gap-2"
          >
            <IconPower size={13} />
            Turn Off
          </button>
        </div>
      </div>
    </div>
  )
}

/* -----------------------------------------------------------------
 * Power state pill
 * ----------------------------------------------------------------- */

function PowerStatePill({ state }: { state: PowerState }) {
  if (state === 'on') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-nu-leaf/12 border border-nu-leaf/40 text-nu-leaf px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-nu-leaf" />
        On
      </span>
    )
  }
  if (state === 'off') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-nu-amber/12 border border-nu-amber/40 text-nu-amber px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-nu-amber" />
        Off
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.04] border border-white/15 text-nu-skylight/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
      <span className="inline-block w-1.5 h-1.5 rounded-full bg-nu-skylight/40" />
      Unknown
    </span>
  )
}