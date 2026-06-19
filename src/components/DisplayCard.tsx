import type { Display } from '../types/display'
import { useHealthContext } from '../context/HealthContext'
import { StatusBadge } from './StatusBadge'
import { Button } from './Button'
import {
  IconExternal, IconRefresh, IconHome, IconBlock, IconAlert,
  IconMapPin, IconDisplay, IconClock,
} from './icons'

type Props = { display: Display }

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 5_000) return 'just now'
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  return `${Math.floor(diff / 3_600_000)}h ago`
}

export function DisplayCard({ display }: Props) {
  const { health } = useHealthContext()
  const status = health[display.id]

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
            <StatusBadge status={status.status} />
          </div>
          {display.orientation && (
            <div className="mt-1 text-[12px] text-nu-skylight">
              {display.orientation}
            </div>
          )}
        </div>
        <a
          href={display.url}
          target="_blank"
          rel="noreferrer noopener"
          aria-label={`Open ${display.name} in a new tab`}
          className="text-nu-skylight hover:text-nu-tour transition-colors shrink-0"
        >
          <IconExternal size={16} />
        </a>
      </header>

      {/* Meta: location + URL */}
      <dl className="grid grid-cols-1 gap-2 text-[13px]">
        <div className="flex items-center gap-2 text-nu-skylight">
          <IconMapPin size={14} />
          <span>{display.location}</span>
        </div>
        <div className="flex items-center gap-2 text-nu-sky/80 font-mono text-[12px] truncate">
          <IconDisplay size={14} />
          <span className="truncate">{display.url}</span>
        </div>
        <div className="flex items-center gap-2 text-nu-skylight">
          <IconClock size={14} />
          <span>
            Last checked: {timeAgo(status.lastChecked)} ·{' '}
            {status.responseTime !== null
              ? <span className="text-nu-leaf">{status.responseTime} ms</span>
              : <span className="text-nu-skylight/60">— ms</span>}
          </span>
        </div>
      </dl>

      {/* Screenshot placeholder (Phase 2 will fill it in) */}
      <div className="relative aspect-[16/10] rounded-glass bg-gradient-to-br from-nu-navy/60 to-nu-midnight/80 border border-white/10 flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 opacity-[0.06]"
             style={{
               backgroundImage:
                 'repeating-linear-gradient(45deg, rgba(255,255,255,0.6) 0 1px, transparent 1px 14px)',
             }} />
        <div className="relative text-center">
          <div className="nu-eyebrow">Screenshot</div>
          <div className="mt-1 text-[12px] text-nu-skylight/60">
            Available in Phase 2
          </div>
        </div>
      </div>

      {/* Actions: placeholders, all disabled until Phase 2 */}
      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" size="sm" icon={<IconRefresh />} disabled>
          Reload
        </Button>
        <Button variant="secondary" size="sm" icon={<IconHome />} disabled>
          Go Home
        </Button>
        <Button variant="danger" size="sm" icon={<IconBlock />} disabled>
          Blackout
        </Button>
        <Button variant="primary" size="sm" icon={<IconAlert />} disabled>
          Emergency
        </Button>
      </div>
    </article>
  )
}
