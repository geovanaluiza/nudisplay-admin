import { useState } from 'react'
import type { Display } from '../types/display'
import { IconImage, IconExternal } from './icons'

/**
 * Renders the live preview area for a display.
 *
 * States:
 *  - URL present + loaded  → real <img>
 *  - URL present + loading → skeleton
 *  - URL present + broken  → "Screenshot unavailable" + retry hint
 *  - URL absent            → subtle placeholder ("Available in Phase 3")
 *
 * The screenshot timestamp is shown below the image so admins can
 * see how stale the preview is. We don't auto-refresh — the display
 * client controls when to update the screenshot.
 */
export function ScreenshotPanel({ display }: { display: Display }) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle')
  const [reloadKey, setReloadKey] = useState(0)
  const hasUrl = Boolean(display.screenshot_url)

  if (!hasUrl) return <Placeholder />

  if (status === 'error') {
    return (
      <div className="flex flex-col gap-2">
        <div className="relative aspect-[16/10] rounded-glass border border-nu-amber/30 bg-nu-amber/5 flex items-center justify-center overflow-hidden">
          <div className="text-center">
            <IconImage size={28} className="text-nu-amber/50 mx-auto" />
            <div className="nu-eyebrow mt-2 text-[10px] text-nu-amber/80">Screenshot unavailable</div>
            <div className="mt-1 text-[11px] text-nu-skylight/60 px-4">
              Could not load the preview from the display.
            </div>
          </div>
        </div>
        <ScreenshotFooter display={display} onRetry={() => { setStatus('loading'); setReloadKey((n) => n + 1) }} />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="relative aspect-[16/10] rounded-glass overflow-hidden border border-white/10 bg-nu-navy/40">
        {status !== 'loaded' && (
          <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-nu-navy/60 via-nu-midnight/80 to-nu-navy/60" />
        )}
        <img
          key={reloadKey}
          src={display.screenshot_url!}
          alt={`Live preview of ${display.name}`}
          className={[
            'absolute inset-0 w-full h-full object-cover transition-opacity duration-300',
            status === 'loaded' ? 'opacity-100' : 'opacity-0',
          ].join(' ')}
          loading="lazy"
          onLoad={() => setStatus('loaded')}
          onError={() => setStatus('error')}
        />
      </div>
      <ScreenshotFooter display={display} onRetry={() => { setStatus('loading'); setReloadKey((n) => n + 1) }} />
    </div>
  )
}

function ScreenshotFooter({
  display, onRetry,
}: {
  display: Display
  onRetry: () => void
}) {
  const updated = display.updated_at
  return (
    <div className="flex items-center justify-between text-[11px] text-nu-skylight/70 px-1">
      <div className="flex items-center gap-2">
        <span className="nu-eyebrow text-[10px]">Preview</span>
        {updated && <span>updated {timeAgo(updated)}</span>}
      </div>
      <div className="flex items-center gap-3">
        <a
          href={display.screenshot_url ?? '#'}
          target="_blank"
          rel="noreferrer noopener"
          className="text-nu-skylight hover:text-nu-tour transition-colors inline-flex items-center gap-1"
          title="Open screenshot URL in a new tab"
        >
          <IconExternal size={11} /> Open
        </a>
        <button
          type="button"
          onClick={onRetry}
          className="text-nu-skylight hover:text-nu-tour transition-colors"
        >
          Retry
        </button>
      </div>
    </div>
  )
}

function Placeholder() {
  return (
    <div className="relative aspect-[16/10] rounded-glass bg-gradient-to-br from-nu-navy/60 to-nu-midnight/80 border border-white/10 flex items-center justify-center overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(45deg, rgba(255,255,255,0.6) 0 1px, transparent 1px 14px)',
        }}
      />
      <div className="relative text-center">
        <IconImage size={28} className="text-nu-skylight/30 mx-auto" />
        <div className="nu-eyebrow mt-2 text-[10px]">Screenshot</div>
        <div className="mt-1 text-[11px] text-nu-skylight/50">
          Available when display client uploads to Supabase Storage
        </div>
      </div>
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
