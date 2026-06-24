import { useEffect, useRef, useState } from 'react'
import type { Display } from '../types/display'
import { IconImage, IconExternal, IconBlock } from './icons'

/**
 * LivePreviewPanel — Phase 5B.
 *
 * Replaces the previous screenshot-render preview with a live
 * iframe embedding the display's actual public URL. The preview
 * area is locked to the kiosk's portrait aspect ratio (9:16,
 * 1080×1920) so the dashboard feels like a real digital
 * signage operations center.
 *
 * Key behaviors:
 *   - Lazy mount: an IntersectionObserver defers the <iframe>
 *     src until the card scrolls into the viewport, so four
 *     cards on the dashboard do NOT all load their heavy
 *     Vercel sites at the same time.
 *   - Portrait container: aspect-ratio 9/16, max-height
 *     caps the preview so 4 cards on one row don't push
 *     the page into a vertical scroll tower.
 *   - LIVE indicator: a small pulsing dot appears top-right
 *     once the iframe successfully fires its onLoad event.
 *   - Blocked/CSP fallback: if the iframe fails to load
 *     (X-Frame-Options: deny, missing Content-Security-Policy
 *     frame-ancestors), we render a clear "preview blocked"
 *     panel with an "Open Live Preview" button. The card
 *     never crashes.
 *   - Offline display: we DO NOT mount the iframe. Instead
 *     a portrait "DISPLAY OFFLINE" placeholder is rendered
 *     inside the same 9:16 frame so the visual rhythm of
 *     the page is preserved.
 *
 * The component intentionally drops:
 *   - screenshot_url reads
 *   - screenshot_updated_at stale badge
 *   - screenshot Retry / Open-image controls
 *   - display_events.screenshot_failed emission
 *
 * The display clients still upload screenshots (Phase 5A) and
 * the Storage bucket still exists — they are just no longer
 * surfaced in the dashboard. Migration 005 is left in place
 * so historical screenshots remain queryable.
 */

const PREVIEW_MAX_HEIGHT = 540 // px — keeps cards from getting
                                //      comically tall on a 4-up grid
const PREVIEW_MAX_WIDTH  = Math.round(PREVIEW_MAX_HEIGHT * 9 / 16) // 304px
                                // — derived from the 9:16 aspect
                                //   so the wrapper actually fits
                                //   the portrait shape inside the
                                //   wider grid cell. Without this
                                //   the aspect-ratio collapses to
                                //   "square-ish" because CSS does
                                //   not auto-shrink width when
                                //   max-height kicks in.

export function ScreenshotPanel({ display }: { display: Display }) {
  const isOnline = display.status === 'online'
  // Priority:
  //   1. display.current_url (live) — what the physical kiosk is
  //      actually showing right now. Supabase Realtime pushes a
  //      new value every time the display navigates, so the
  //      iframe follows the physical screen in real time.
  //   2. display.public_url (configured) — the canonical page.
  //   3. display.approved_url (kiosk) — last-resort origin.
  //   4. '' → renders the offline placeholder.
  //
  // Localhost guard: heartbeat payloads from a dev machine
  // report http://localhost:3000/... — that origin would never
  // embed in the production admin. Reconstruct the URL from
  // approved_url + current_page instead.
  const url = resolveIframeUrl(display)
  return (
    <div className="flex flex-col gap-2">
      <PreviewHeader />
      {isOnline && url ? (
        <LiveIframe key={url} url={url} name={display.name} />
      ) : (
        <OfflinePortraitFrame />
      )}
    </div>
  )
}

/* -----------------------------------------------------------------
 * URL resolution
 * ----------------------------------------------------------------- */

/** True for origins that can never embed in the production
 *  dashboard (dev machine, internal IP, etc). */
function isLocalOrigin(href: string): boolean {
  try {
    const u = new URL(href)
    return (
      u.hostname === 'localhost' ||
      u.hostname === '127.0.0.1' ||
      u.hostname === '0.0.0.0' ||
      u.hostname === '::1' ||
      u.hostname.endsWith('.local') ||
      u.protocol === 'file:'
    )
  } catch {
    return false
  }
}

/**
 * Resolve the iframe src for a display, in priority order:
 *   1. current_url  (if not a local/dev origin)
 *   2. public_url   (if not a local/dev origin)
 *   3. approved_url + current_page  (reconstructed)
 *   4. approved_url
 *   5. ''  → offline placeholder
 *
 * If current_url is localhost (dev machine), we still know what
 * page the kiosk is on (current_page) and we know its production
 * origin (approved_url). Reconstruct by appending current_page
 * to approved_url so the admin still shows the right page.
 */
export function resolveIframeUrl(display: Display): string {
  const { current_url, public_url, approved_url, current_page } = display

  // 1. current_url (the live page) — skip if local/dev.
  if (current_url && !isLocalOrigin(current_url)) return current_url

  // 2. public_url (configured) — skip if local/dev.
  if (public_url && !isLocalOrigin(public_url)) return public_url

  // 3. approved_url + current_page (reconstructed)
  //    Used when only approved_url is reachable (local dev or
  //    where public_url was never seeded).
  if (approved_url && current_page) {
    try {
      const base = new URL(approved_url)
      const path = current_page.startsWith('/') ? current_page : `/${current_page}`
      return `${base.origin}${path}`
    } catch {
      /* fall through */
    }
  }

  // 4. approved_url alone
  if (approved_url) return approved_url

  // 5. nothing
  return ''
}

function PreviewHeader() {
  return (
    <div className="flex items-center justify-between text-[11px] text-nu-skylight/70 px-1">
      <span className="nu-eyebrow text-[10px]">Live preview</span>
    </div>
  )
}

/* -----------------------------------------------------------------
 * Live iframe (lazy-mounted via IntersectionObserver)
 * ----------------------------------------------------------------- */

function LiveIframe({ url, name }: { url: string; name: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [inView, setInView] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [blocked, setBlocked] = useState(false)

  // Defer iframe creation until the card scrolls into view.
  useEffect(() => {
    if (!containerRef.current) return
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true)
      return
    }
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setInView(true)
            obs.disconnect()
            break
          }
        }
      },
      { rootMargin: '120px 0px', threshold: 0.05 },
    )
    obs.observe(containerRef.current)
    return () => obs.disconnect()
  }, [])

  // If the iframe never fires onLoad within 12s we assume the
  // embed was blocked. (X-Frame-Options / CSP frame-ancestors
  // prevents the page from even rendering the kiosk content,
  // and onError does not fire in that case — onLoad simply
  // never arrives.) 12s is generous: prerendered static
  // assets + the 415 KB main bundle typically load in 1-3s
  // on broadband; we leave headroom for cold Vercel cache,
  // 4 simultaneous iframes, etc.
  useEffect(() => {
    if (!inView || loaded || blocked) return
    const id = window.setTimeout(() => {
      setBlocked((prev) => prev || !loaded)
    }, 12_000)
    return () => window.clearTimeout(id)
  }, [inView, loaded, blocked])

  return (
    <div
      ref={containerRef}
      className="relative mx-auto w-full overflow-hidden rounded-glass border border-white/10 bg-nu-navy/40"
      style={{
        aspectRatio: '9 / 16',
        maxWidth: `${PREVIEW_MAX_WIDTH}px`,
        maxHeight: `${PREVIEW_MAX_HEIGHT}px`,
      }}
    >
      {inView && !blocked && (
        <iframe
          src={url}
          title={`${name} live preview`}
          loading="lazy"
          referrerPolicy="no-referrer"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          onLoad={() => setLoaded(true)}
          onError={() => setBlocked(true)}
          className="absolute inset-0 w-full h-full border-0 bg-nu-midnight"
        />
      )}

      {/* Loading skeleton (visible until iframe fires onLoad) */}
      {inView && !loaded && !blocked && (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-nu-navy/60 via-nu-midnight/80 to-nu-navy/60 flex items-center justify-center">
          <div className="text-center">
            <IconImage size={28} className="text-nu-skylight/30 mx-auto" />
            <div className="nu-eyebrow mt-2 text-[10px] text-nu-skylight/50">
              Connecting…
            </div>
          </div>
        </div>
      )}

      {/* Pre-mount placeholder (card not yet in viewport) */}
      {!inView && (
        <div className="absolute inset-0 flex items-center justify-center bg-nu-navy/30">
          <div className="text-center">
            <IconImage size={26} className="text-nu-skylight/25 mx-auto" />
            <div className="nu-eyebrow mt-2 text-[10px] text-nu-skylight/40">
              Scroll to load
            </div>
          </div>
        </div>
      )}

      {/* LIVE indicator (top-right, only after iframe loaded) */}
      {loaded && (
        <div className="absolute top-2 right-2 flex items-center gap-1.5 rounded-full bg-nu-midnight/85 border border-nu-leaf/40 px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase text-nu-leaf shadow-md">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-nu-leaf animate-pulse" />
          Live
        </div>
      )}

      {/* Open Live Preview button (top-left, always visible while online) */}
      <a
        href={url}
        target="_blank"
        rel="noreferrer noopener"
        title="Open the live display page in a new tab"
        className="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-nu-midnight/80 border border-white/15 px-2 py-0.5 text-[10px] text-nu-skylight hover:text-nu-tour transition-colors"
      >
        <IconExternal size={10} /> Open
      </a>

      {/* Blocked / CSP fallback overlay */}
      {blocked && (
        <BlockedOverlay url={url} name={name} />
      )}
    </div>
  )
}

function BlockedOverlay({ url, name }: { url: string; name: string }) {
  return (
    <div className="absolute inset-0 bg-nu-midnight/95 flex items-center justify-center p-6 text-center">
      <div>
        <IconBlock size={26} className="text-nu-amber/70 mx-auto" />
        <div className="nu-eyebrow mt-2 text-[10px] text-nu-amber/90">
          Preview blocked
        </div>
        <div className="mt-1 text-[11px] text-nu-skylight/70 max-w-[260px]">
          {name} does not allow iframe embedding (X-Frame-Options
          or CSP frame-ancestors). Open the page in a new tab to
          see the live display.
        </div>
        <a
          href={url}
          target="_blank"
          rel="noreferrer noopener"
          className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-nu-tour text-nu-midnight px-3 py-1 text-[11px] font-semibold hover:bg-nu-amber transition-colors"
        >
          <IconExternal size={11} /> Open Live Preview
        </a>
      </div>
    </div>
  )
}

/* -----------------------------------------------------------------
 * Offline placeholder (same 9:16 frame)
 * ----------------------------------------------------------------- */

function OfflinePortraitFrame() {
  return (
    <div
      className="relative mx-auto w-full overflow-hidden rounded-glass border border-white/10 bg-nu-navy/30"
      style={{
        aspectRatio: '9 / 16',
        maxWidth: `${PREVIEW_MAX_WIDTH}px`,
        maxHeight: `${PREVIEW_MAX_HEIGHT}px`,
      }}
    >
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(45deg, rgba(255,255,255,0.6) 0 1px, transparent 1px 14px)',
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <IconBlock size={28} className="text-nu-amber/60 mx-auto" />
          <div className="nu-eyebrow mt-2 text-[10px] text-nu-amber/80">
            Display offline
          </div>
          <div className="mt-1 text-[11px] text-nu-skylight/50 max-w-[200px]">
            Live preview resumes when the kiosk reports online.
          </div>
        </div>
      </div>
    </div>
  )
}