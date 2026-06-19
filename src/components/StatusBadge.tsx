import type { DisplayStatus } from '../types/display'

type Props = {
  status: DisplayStatus
  className?: string
}

/**
 * Online / offline status pill. Uses the locked NU palette:
 * - online  → nu-leaf  (green)
 * - offline → nu-tour  (gold) — the NU brand uses gold for "attention"
 *                       rather than red, keeping the calm admin tone.
 */
export function StatusBadge({ status, className = '' }: Props) {
  const online = status === 'online'
  return (
    <span
      className={[
        'inline-flex items-center gap-2 rounded-full px-3 py-1',
        'text-[11px] font-bold tracking-[0.22em] uppercase border',
        online
          ? 'bg-nu-leaf/12 text-nu-leaf border-nu-leaf/40'
          : 'bg-nu-tour/12 text-nu-tour border-nu-tour/40',
        className,
      ].join(' ')}
    >
      <span
        className={[
          'w-1.5 h-1.5 rounded-full',
          online
            ? 'bg-nu-leaf shadow-[0_0_8px_rgba(68,186,130,0.7)]'
            : 'bg-nu-tour shadow-[0_0_8px_rgba(251,217,69,0.7)]',
        ].join(' ')}
      />
      {online ? 'Online' : 'Offline'}
    </span>
  )
}
