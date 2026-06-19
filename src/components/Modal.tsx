import { useEffect, type ReactNode } from 'react'

type Props = {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: ReactNode
  /** Max width class, default 'max-w-2xl' */
  width?: string
}

/**
 * Centered glassmorphism modal with a backdrop. Closes on backdrop
 * click or Escape. Locks page scroll while open.
 */
export function Modal({
  open, onClose, title, subtitle, children, width = 'max-w-2xl',
}: Props) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = original
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8"
      style={{
        background: 'radial-gradient(circle at center, rgba(0,38,61,0.78) 0%, rgba(0,38,61,0.92) 100%)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={[
          'nu-card relative w-full p-8 max-h-[90vh] overflow-y-auto',
          width,
        ].join(' ')}
      >
        {/* Gold accent strip on top */}
        <div className="absolute top-0 left-0 right-0 h-1.5 rounded-t-glass"
             style={{
               background: 'linear-gradient(90deg, #fbd945 0%, #ffbc2d 50%, #fbd945 100%)',
             }} />

        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/[0.06] hover:bg-white/10 border border-white/10 text-nu-skylight hover:text-nu-wisp flex items-center justify-center transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="6" y1="6" x2="18" y2="18" />
            <line x1="18" y1="6" x2="6" y2="18" />
          </svg>
        </button>

        <h2 className="font-serif text-[28px] text-nu-wisp leading-none">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-2 text-[13px] text-nu-skylight max-w-prose">
            {subtitle}
          </p>
        )}

        <div className="mt-6">
          {children}
        </div>
      </div>
    </div>
  )
}
