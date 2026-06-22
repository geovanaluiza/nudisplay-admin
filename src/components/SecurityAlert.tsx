import type { Display } from '../types/display'
import { IconAlert } from './icons'

type Props = { display: Display }

/**
 * Red alert banner rendered at the top of a DisplayCard when
 * `security_status === 'critical'`. Shows the issue and the
 * current URL so staff can immediately see what happened.
 */
export function SecurityAlert({ display }: Props) {
  if (display.security_status !== 'critical') return null
  const url = display.current_url ?? display.public_url ?? '—'
  return (
    <div
      className="rounded-glass border border-nu-amber/55 bg-nu-amber/12 px-4 py-3 flex items-start gap-3"
      role="alert"
    >
      <div className="w-9 h-9 rounded-full bg-nu-amber/30 flex items-center justify-center text-nu-amber shrink-0 mt-0.5">
        <IconAlert size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-bold tracking-[0.22em] uppercase text-nu-amber">
          🚨 Security Incident
        </div>
        <div className="text-[13px] text-nu-wisp mt-1">
          <span className="font-semibold">{display.name}</span>
          {' — '}
          <span className="text-nu-amber/95">
            {display.security_message ?? 'Critical security state'}
          </span>
        </div>
        <div className="text-[11px] text-nu-skylight mt-1 font-mono break-all">
          Current URL: {url}
        </div>
        <div className="text-[11px] text-nu-skylight/70 mt-0.5">
          Approved: <span className="font-mono">{display.approved_url}</span>
        </div>
      </div>
    </div>
  )
}