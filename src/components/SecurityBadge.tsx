import type { SecurityStatus } from '../types/display'

type Props = {
  status: SecurityStatus
  className?: string
}

/**
 * Phase 4.5 — security badge.
 *
 *   secure   → 🟢 Secure   (leaf)
 *   warning  → 🟡 Warning  (sky)
 *   critical → 🔴 Critical (amber — NU palette uses gold/red together
 *              rather than red alone, keeping the calm admin tone)
 */
export function SecurityBadge({ status, className = '' }: Props) {
  const palette =
    status === 'secure'
      ? { bg: 'bg-nu-leaf/12', text: 'text-nu-leaf', border: 'border-nu-leaf/40', label: 'Secure' }
      : status === 'warning'
      ? { bg: 'bg-nu-sky/12', text: 'text-nu-sky', border: 'border-nu-sky/40', label: 'Warning' }
      : { bg: 'bg-nu-amber/15', text: 'text-nu-amber', border: 'border-nu-amber/50', label: 'Critical' }
  const dot =
    status === 'secure' ? 'bg-nu-leaf' :
    status === 'warning' ? 'bg-nu-sky' :
    'bg-nu-amber'
  const shadow =
    status === 'secure' ? 'shadow-[0_0_8px_rgba(68,186,130,0.7)]' :
    status === 'warning' ? 'shadow-[0_0_8px_rgba(120,180,230,0.7)]' :
    'shadow-[0_0_10px_rgba(255,188,45,0.8)]'
  return (
    <span
      className={[
        'inline-flex items-center gap-2 rounded-full px-3 py-1',
        'text-[11px] font-bold tracking-[0.22em] uppercase border',
        palette.bg, palette.text, palette.border,
        className,
      ].join(' ')}
      title={`Security status: ${palette.label}`}
    >
      <span className={['w-1.5 h-1.5 rounded-full', dot, shadow, status === 'critical' ? 'animate-pulse' : ''].join(' ')} />
      {palette.label}
    </span>
  )
}