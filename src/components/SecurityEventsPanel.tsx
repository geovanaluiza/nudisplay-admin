import type { Display } from '../types/display'
import { useSecurityEvents } from '../hooks/useSecurityEvents'

type Props = {
  displays: Display[]
}

const SEVERITY: Record<string, { label: string; cls: string }> = {
  kiosk_escape_detected:    { label: 'Kiosk escape',    cls: 'bg-nu-amber/15 text-nu-amber border-nu-amber/40' },
  security_critical:        { label: 'Critical',        cls: 'bg-nu-amber/15 text-nu-amber border-nu-amber/40' },
  security_warning:         { label: 'Warning',         cls: 'bg-nu-sky/12 text-nu-sky border-nu-sky/40' },
  focus_lost:               { label: 'Focus lost',      cls: 'bg-nu-sky/12 text-nu-sky border-nu-sky/40' },
  auto_recovery_triggered:  { label: 'Auto-recovered',  cls: 'bg-nu-leaf/12 text-nu-leaf border-nu-leaf/40' },
}

/**
 * Phase 4.5 — Recent Security Events panel.
 *
 * Shows the last 30 security-related events across all displays.
 * Sorted newest first. Each row has a severity pill, the display
 * name, and the original message.
 */
export function SecurityEventsPanel({ displays }: Props) {
  const events = useSecurityEvents(30)
  const displayName = (id: string | null) =>
    displays.find((d) => d.id === id)?.name ?? '—'
  return (
    <div className="nu-card p-5">
      <div className="flex items-end justify-between mb-4">
        <div>
          <div className="nu-eyebrow text-nu-amber">Phase 4.5</div>
          <h2 className="font-serif text-[22px] text-nu-wisp leading-none mt-1">
            Recent Security Events
          </h2>
        </div>
        <div className="text-[12px] text-nu-skylight/70">
          {events.length} incident{events.length === 1 ? '' : 's'}
        </div>
      </div>
      {events.length === 0 ? (
        <div className="text-[13px] text-nu-skylight/60 py-8 text-center">
          No security incidents. All kiosks are operating within their approved URLs.
        </div>
      ) : (
        <ul className="divide-y divide-white/5 max-h-[420px] overflow-y-auto">
          {events.map((e) => {
            const sev = SEVERITY[e.event_type] ?? { label: e.event_type, cls: 'bg-white/10 text-nu-wisp border-white/20' }
            return (
              <li key={e.id} className="py-2.5 flex items-start gap-3 text-[12px]">
                <span className="text-nu-skylight/60 font-mono w-16 shrink-0 pt-0.5">
                  {timeAgo(e.created_at)}
                </span>
                <span className={['nu-pill text-[10px] py-0.5 border', sev.cls].join(' ')}>
                  {sev.label}
                </span>
                <span className="text-nu-wisp grow min-w-0">
                  <span className="text-nu-sky">{displayName(e.display_id)}</span>
                  {e.message && (
                    <span className="text-nu-skylight ml-1">— {e.message}</span>
                  )}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 5_000) return 'just now'
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  return `${Math.floor(diff / 3_600_000)}h ago`
}