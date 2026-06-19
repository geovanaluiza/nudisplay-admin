import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
  icon?: ReactNode
}

const VARIANTS: Record<Variant, string> = {
  // Filled gold-tour primary (matches the wayfinding CTA on the displays)
  primary: 'bg-nu-tour text-nu-midnight hover:bg-nu-amber border border-nu-tour/60',
  // Glass secondary
  secondary: 'bg-white/[0.06] text-nu-wisp hover:bg-white/10 border border-white/15',
  // Text-only
  ghost: 'text-nu-skylight hover:text-nu-wisp',
  // Soft gold-tour danger (e.g. Blackout)
  danger: 'bg-nu-tour/12 text-nu-tour hover:bg-nu-tour/20 border border-nu-tour/40',
}

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3 text-[12px] gap-1.5',
  md: 'h-10 px-4 text-[13px] gap-2',
}

export function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  className = '',
  children,
  ...rest
}: Props) {
  return (
    <button
      {...rest}
      disabled={rest.disabled}
      className={[
        'inline-flex items-center justify-center rounded-full',
        'font-semibold tracking-wide transition-colors duration-200',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        VARIANTS[variant],
        SIZES[size],
        className,
      ].join(' ')}
    >
      {icon}
      {children}
    </button>
  )
}
