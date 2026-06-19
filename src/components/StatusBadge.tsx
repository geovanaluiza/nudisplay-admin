import type { DisplayStatus } from '../types/display'

type Props = {
  status: DisplayStatus
  className?: string
}

/**
 * Online / offline status pill. Uses the locked NU palette:
 * - online   → nu-leaf  (green)
 * - offline  → nu-tour  (gold) — the NU brand uses gold for
 *              "attention" rather than red, keeping the calm
 *              admin tone.
 * - checking → nu-sky   (blue) — neutral, transient state while
 *              the dashboard re-derives status.
 */
export function StatusBadge({ status, className = '' }: Props) {
  const palette =
    status === 'online'
      ? { bg: 'bg-nu-leaf/12', text: 'text-nu-leaf', border: 'border-nu-leaf/40', dot: 'bg-nu-leaf', shadow: 'shadow-[0_0_8px_rgba(68,186,130,0.7)]' }
      : status === 'checking'
      ? { bg: 'bg-nu-sky/12', text: 'text-nu-sky', border: 'border-nu-sky/40', dot: 'bg-nu-sky', shadow: 'shadow-[0_0_8px_rgba(120,180,230,0.7)]' }
      : { bg: 'bg-nu-tour/12', text: 'text-nu-tour', border: 'border-nu-tour/40', dot: 'bg-nu-tour', shadow: 'shadow-[0_0_8px_rgba(251,217,69,0.7)]' }
  const label =
    status === 'online' ? 'Online' :
    status === 'checking' ? 'Checking' : 'Offline'
  return (
    <span
      className={[
        'inline-flex items-center gap-2 rounded-full px-3 py-1',
        'text-[11px] font-bold tracking-[0.22em] uppercase border',
        palette.bg, palette.text, palette.border,
        className,
      ].join(' ')}
    >
      <span
        className={[
          'w-1.5 h-1.5 rounded-full',
          palette.dot,
          palette.shadow,
          status === 'checking' ? 'animate-pulse' : '',
        ].join(' ')}
      />
      {label}
    </span>
  )
}
