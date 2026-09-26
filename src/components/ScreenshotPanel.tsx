import { useState } from 'react'
import type { Display } from '../types/display'
import { IconImage, IconExternal } from './icons'

/**
 * Shows what is on the physical kiosk: the JPEG the display client
 * uploads to Storage (display-screenshots/{id}/latest.jpg).
 * An iframe of the public URL is a second copy of the website, not
 * the TV, so it is only a fallback when no snapshot exists.
 */

export function ScreenshotPanel({ display }: { display: Display }) {
  const [open, setOpen] = useState(false)
  const shot = screenshotSrc(display)
  const age = timeAgo(display.screenshot_updated_at)
  const online = display.status !== 'offline'

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-[11px] text-nu-skylight/70 px-1">
        <span className="nu-eyebrow text-[10px]">Physical screen</span>
        {display.screenshot_updated_at && (
          <span className="font-mono text-[10px] text-nu-skylight/50">Updated {age}</span>
        )}
      </div>

      <div
        className="relative mx-auto w-full overflow-hidden rounded-glass border border-white/10 bg-nu-navy/40"
        style={{ aspectRatio: '9 / 16', maxWidth: '280px', maxHeight: '500px' }}
      >
        {shot ? (
          <button
            type="button"
            className="absolute inset-0 block w-full h-full"
            onClick={() => setOpen(true)}
            title="Enlarge snapshot"
          >
            <img
              src={shot}
              alt={`${display.name} physical screen`}
              className="absolute inset-0 w-full h-full object-cover object-top bg-nu-midnight"
            />
            <span className="absolute top-2 right-2 flex items-center gap-1.5 rounded-full bg-nu-midnight/85 border border-nu-leaf/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-nu-leaf">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-nu-leaf animate-pulse" />
              On glass
            </span>
          </button>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center p-5 text-center">
            <div>
              <IconImage size={28} className="text-nu-skylight/30 mx-auto" />
              <div className="nu-eyebrow mt-2 text-[10px] text-nu-skylight/60">
                {online ? 'Waiting for snapshot' : 'Display offline'}
              </div>
              <p className="mt-1 text-[11px] text-nu-skylight/50 max-w-[200px] mx-auto">
                {online
                  ? 'The kiosk uploads a photo of the TV about every 20 seconds.'
                  : 'Snapshot resumes when the kiosk reports online.'}
              </p>
            </div>
          </div>
        )}

        {previewHref(display) && (
          <a
            href={previewHref(display)!}
            target="_blank"
            rel="noreferrer noopener"
            className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-nu-midnight/80 border border-white/15 px-2 py-0.5 text-[10px] text-nu-skylight hover:text-nu-tour"
          >
            <IconExternal size={10} /> Open site
          </a>
        )}
      </div>

      {open && shot && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-label="Enlarged screen snapshot"
        >
          <img
            src={shot}
            alt={`${display.name} enlarged`}
            className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg border border-white/20"
          />
        </div>
      )}
    </div>
  )
}

function screenshotSrc(display: Display): string | null {
  const url = display.screenshot_url
  if (!url) return null
  const t = display.screenshot_updated_at
    ? Date.parse(display.screenshot_updated_at)
    : Date.now()
  const sep = url.includes('?') ? '&' : '?'
  return `${url}${sep}t=${t}`
}

function previewHref(display: Display): string | null {
  if (display.public_url) return display.public_url
  if (display.approved_url) return display.approved_url
  return null
}

function timeAgo(iso: string | null): string {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 15_000) return 'just now'
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  return `${Math.floor(diff / 3_600_000)}h ago`
}
