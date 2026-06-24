import { useEffect, useState } from 'react'
import type { Display } from '../types/display'
import { IconImage, IconExternal } from './icons'

/**
 * ScreenshotPanel — Phase 5.
 *
 * Live preview of what each physical display is currently showing.
 *
 * Render priority:
 *   1. screenshot_url present → real <img> + "Last screenshot: Ns/Nm ago"
 *   2. screenshot_url present AND screenshot_updated_at older than
 *      5 minutes → "Screenshot stale" warning badge overlay
 *   3. screenshot_url absent → keep the elegant placeholder panel
 *
 * Click-to-open: clicking the image (or the footer Open link) opens
 * the full JPEG in a new tab so an operator can inspect details.
 *
 * Realtime updates: the parent DisplayCard re-renders the panel
 * whenever the display row changes (Realtime delivers UPDATE
 * events with the new screenshot_url + screenshot_updated_at).
 * We also poll `screenshot_updated_at` every 30s so the "Ns/Nm
 * ago" label ticks up without waiting for a new upload.
 */

const STALE_THRESHOLD_MS = 5 * 60 * 1000 // 5 minutes

export function ScreenshotPanel({ display }: { display: Display }) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle')
  const [reloadKey, setReloadKey] = useState(0)
  const [now, setNow] = useState(() => Date.now())
  const hasUrl = Boolean(display.screenshot_url)

  // Tick "time ago" every 30s while the panel is mounted so the
  // operator sees a fresh value without manual refresh.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(id)
  }, [])

  // When the screenshot URL changes (Realtime UPDATE), reset to
  // loading so the new image shows a brief skeleton flash.
  useEffect(() => {
    setStatus('loading')
    setReloadKey((n) => n + 1)
  }, [display.screenshot_url])

  if (!hasUrl) return <Placeholder />

  const isStale = display.screenshot_updated_at
    ? now - new Date(display.screenshot_updated_at).getTime() > STALE_THRESHOLD_MS
    : false

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
        <ScreenshotFooter
          display={display}
          now={now}
          isStale={isStale}
          onRetry={() => { setStatus('loading'); setReloadKey((n) => n + 1) }}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <a
        href={display.screenshot_url!}
        target="_blank"
        rel="noreferrer noopener"
        title="Open full screenshot in a new tab"
        className="relative aspect-[16/10] rounded-glass overflow-hidden border border-white/10 bg-nu-navy/40 group block cursor-zoom-in"
      >
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
        {/* Stale badge overlay */}
        {isStale && status === 'loaded' && (
          <div className="absolute top-2 right-2 flex items-center gap-1.5 rounded-full bg-nu-amber/90 text-nu-midnight px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase shadow-md">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-nu-midnight animate-pulse" />
            Screenshot stale
          </div>
        )}
        {/* Hover zoom hint */}
        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity rounded-full bg-black/60 text-white px-2 py-0.5 text-[10px] inline-flex items-center gap-1">
          <IconExternal size={10} /> Open
        </div>
      </a>
      <ScreenshotFooter
        display={display}
        now={now}
        isStale={isStale}
        onRetry={() => { setStatus('loading'); setReloadKey((n) => n + 1) }}
      />
    </div>
  )
}

function ScreenshotFooter({
  display, now, isStale, onRetry,
}: {
  display: Display
  now: number
  isStale: boolean
  onRetry: () => void
}) {
  const ts = display.screenshot_updated_at ?? display.updated_at
  return (
    <div className="flex items-center justify-between text-[11px] text-nu-skylight/70 px-1">
      <div className="flex items-center gap-2">
        <span className="nu-eyebrow text-[10px]">Live preview</span>
        {ts && (
          <span className={isStale ? 'text-nu-amber' : 'text-nu-skylight/70'}>
            Last screenshot: {timeAgo(ts, now)}
          </span>
        )}
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

function timeAgo(iso: string, now: number = Date.now()): string {
  const diff = now - new Date(iso).getTime()
  if (diff < 5_000) return 'just now'
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  return `${Math.floor(diff / 3_600_000)}h ago`
}