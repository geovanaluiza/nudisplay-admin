import { useMemo, useState } from 'react'
import { useDisplayStatus } from '../hooks/useDisplayStatus'
import { useDisplayCommands } from '../hooks/useDisplayCommands'
import { useDisplayEvents } from '../hooks/useDisplayEvents'
import { DisplayCard } from '../components/DisplayCard'
import { SecurityEventsPanel } from '../components/SecurityEventsPanel'
import { Button } from '../components/Button'
import { IconRefresh } from '../components/icons'
import { isSupabaseConfigured } from '../services/supabase'
import type { Display } from '../types/display'

export default function DisplaysPage() {
  const { displays, lastUpdated, ready } = useDisplayStatus()
  const commands = useDisplayCommands(40)
  const events = useDisplayEvents(60)
  const [refreshTick, setRefreshTick] = useState(0)

  // DEBUG: log all displays from hook
  // eslint-disable-next-line no-console
  console.group('[DisplaysPage] displays from useDisplayStatus')
  // eslint-disable-next-line no-console
  displays.forEach((d) => {
    const OFFLINE_AFTER_MS = 90_000
    const now = Date.now()
    const lastSeenMs = d.last_seen ? new Date(d.last_seen).getTime() : null
    const ageMs = lastSeenMs !== null ? now - lastSeenMs : null
    // eslint-disable-next-line no-console
    console.table({
      id: d.id,
      name: d.name,
      dbStatus: d.status,
      last_seen: d.last_seen,
      lastSeenAge: ageMs !== null ? `${Math.round(ageMs / 1000)}s ago` : 'null',
      ageMs,
      thresholdMs: OFFLINE_AFTER_MS,
      recomputedStatus: ageMs !== null && ageMs < OFFLINE_AFTER_MS ? 'online' : 'offline',
      public_url: d.public_url ?? '—',
      approved_url: d.approved_url ?? '—',
      current_url: d.current_url ?? '—',
      current_page: d.current_page ?? '—',
    })
  })
  // eslint-disable-next-line no-console
  console.groupEnd()

  const stats = useMemo(() => {
    const online = displays.filter((d) => d.status === 'online').length
    const offline = displays.filter((d) => d.status === 'offline').length
    const checking = displays.filter((d) => d.status === 'checking').length
    const onlineWithRt = displays.filter(
      (d) => d.status === 'online' && typeof d.response_time === 'number',
    )
    const avgRt = onlineWithRt.length
      ? Math.round(
          onlineWithRt.reduce((s, d) => s + (d.response_time ?? 0), 0) / onlineWithRt.length,
        )
      : null
    return { online, offline, checking, avgRt, total: displays.length }
  }, [displays])

  const supabaseReady = isSupabaseConfigured()

  return (
    <div className="flex flex-col gap-8">
      {/* ---------- Operations Center header (Phase 1.5) ---------- */}
      <header className="flex items-end justify-between flex-wrap gap-6">
        <div>
          <div className="nu-eyebrow">Northwest University</div>
          <h1 className="font-serif text-[44px] text-nu-wisp leading-none mt-2">
            Digital Signage Operations Center
          </h1>
          <p className="text-[14px] text-nu-skylight mt-3 max-w-xl">
            Monitor and manage campus display health and status.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            {!supabaseReady && (
              <span className="nu-pill border-nu-amber/40 bg-nu-amber/10 text-nu-amber">
                <span className="w-1.5 h-1.5 rounded-full bg-nu-amber" />
                Local mode
              </span>
            )}
            <Button
              variant="secondary"
              size="sm"
              icon={<IconRefresh />}
              onClick={() => setRefreshTick((t) => t + 1)}
            >
              Refresh
            </Button>
          </div>
          <div className="text-[12px] text-nu-skylight/70">
            Last updated: {timeAgo(lastUpdated)}
          </div>
        </div>
      </header>

      {/* ---------- Global health banner ---------- */}
      <HealthBanner stats={stats} />

      {/* ---------- Phase 4.5: security incident banner ---------- */}
      <SecurityIncidentBanner displays={displays} />

      {/* ---------- Stats row ---------- */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Displays" value={stats.total} accent="tour" />
        <StatCard label="Online" value={stats.online} accent="leaf" />
        <StatCard
          label="Offline"
          value={stats.offline}
          accent={stats.offline > 0 ? 'amber' : 'skylight'}
        />
        <StatCard
          label="Avg Response"
          value={stats.avgRt === null ? '—' : `${stats.avgRt} ms`}
          accent="skylight"
          isText
        />
      </section>

      {/* ---------- Display monitoring grid (2 per row) ---------- */}
      <section>
        <SectionHeader title="Display Monitoring" />
        {ready && displays.length === 0 ? (
          <EmptyState supabaseReady={supabaseReady} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {displays.map((d) => (
              <DisplayCard
                key={d.id}
                display={d}
                commands={commands}
                refreshTick={refreshTick}
              />
            ))}
          </div>
        )}
      </section>

      {/* ---------- Recent Events + Command History ---------- */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <EventsPanel events={events} displays={displays} />
        <CommandsPanel commands={commands} displays={displays} />
      </section>

      {/* ---------- Phase 4.5: Recent Security Events ---------- */}
      <section>
        <SecurityEventsPanel displays={displays} />
      </section>
    </div>
  )
}

/* ===================== sub-components ===================== */

function SecurityIncidentBanner({ displays }: { displays: Display[] }) {
  const critical = displays.filter((d) => d.security_status === 'critical')
  const warning = displays.filter((d) => d.security_status === 'warning')
  if (critical.length === 0 && warning.length === 0) return null
  const isCritical = critical.length > 0
  const headline = isCritical
    ? `🚨 ${critical.length} Security Incident${critical.length === 1 ? '' : 's'} Require Immediate Attention`
    : `🟡 ${warning.length} Display${warning.length === 1 ? '' : 's'} Need Review`
  return (
    <div
      className={[
        'rounded-glass border px-5 py-4 flex items-start gap-3 text-[14px]',
        isCritical
          ? 'bg-nu-amber/12 border-nu-amber/55 text-nu-amber'
          : 'bg-nu-sky/12 border-nu-sky/40 text-nu-sky',
      ].join(' ')}
      role="status"
    >
      <span className="text-[18px] leading-none mt-0.5">{isCritical ? '🚨' : '🟡'}</span>
      <div className="flex-1 min-w-0">
        <div className="font-semibold">{headline}</div>
        <div className="mt-2 flex flex-wrap gap-2 text-[12px]">
          {critical.map((d) => (
            <span
              key={d.id}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-nu-amber/15 border border-nu-amber/40 text-nu-amber"
            >
              <strong>{d.name}</strong>
              <span className="font-mono opacity-80 text-[11px]">
                {d.security_message ?? 'critical'}
              </span>
            </span>
          ))}
          {warning.map((d) => (
            <span
              key={d.id}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-nu-sky/12 border border-nu-sky/40 text-nu-sky"
            >
              <strong>{d.name}</strong>
              <span className="font-mono opacity-80 text-[11px]">
                {d.security_message ?? 'warning'}
              </span>
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

function HealthBanner({
  stats,
}: { stats: { online: number; offline: number; checking: number; total: number } }) {
  const allOnline = stats.total > 0 && stats.offline === 0 && stats.checking === 0
  return (
    <div
      className={[
        'rounded-glass border px-5 py-4 flex items-center gap-3 text-[14px]',
        allOnline
          ? 'bg-nu-leaf/10 border-nu-leaf/35 text-nu-leaf'
          : 'bg-nu-amber/10 border-nu-amber/35 text-nu-amber',
      ].join(' ')}
      role="status"
    >
      <span className="text-[18px] leading-none">
        {allOnline ? '🟢' : '🔴'}
      </span>
      <span className="font-semibold">
        {stats.total === 0
          ? 'No displays registered'
          : allOnline
            ? 'All Displays Operational'
            : `${stats.offline} Display${stats.offline === 1 ? '' : 's'} Require Attention`}
      </span>
      <span className="ml-auto text-[12px] opacity-70">
        {stats.total} registered · {stats.checking} checking
      </span>
    </div>
  )
}

function StatCard({
  label, value, accent, isText = false,
}: {
  label: string
  value: number | string
  accent: 'leaf' | 'amber' | 'tour' | 'skylight'
  isText?: boolean
}) {
  const color =
    accent === 'leaf' ? 'text-nu-leaf' :
    accent === 'amber' ? 'text-nu-amber' :
    accent === 'tour' ? 'text-nu-tour' :
    'text-nu-skylight'
  return (
    <div className="nu-card p-5">
      <div className="text-[11px] font-bold tracking-[0.28em] uppercase text-nu-skylight/70">
        {label}
      </div>
      <div className={[
        'leading-none mt-2',
        isText ? 'font-sans font-bold text-[26px]' : 'font-serif text-[36px]',
        color,
      ].join(' ')}>
        {value}
      </div>
    </div>
  )
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-end justify-between mb-4">
      <h2 className="font-serif text-[22px] text-nu-wisp leading-none">{title}</h2>
    </div>
  )
}

function EmptyState({
  supabaseReady,
}: { supabaseReady: boolean }) {
  return (
    <div className="nu-card p-10 text-center">
      <div className="nu-eyebrow">No displays yet</div>
      <h3 className="font-serif text-[24px] text-nu-wisp mt-3">
        {supabaseReady
          ? 'No displays registered in Supabase.'
          : 'Connect Supabase to start monitoring displays.'}
      </h3>
      <p className="text-[13px] text-nu-skylight mt-3 max-w-md mx-auto">
        {supabaseReady
          ? 'Add displays by inserting rows in the `displays` table. New rows appear in the dashboard immediately via Realtime.'
          : 'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env, then run the SQL migrations in supabase/migrations/ to enable cloud sync.'}
      </p>
    </div>
  )
}

function EventsPanel({
  events, displays,
}: {
  events: ReturnType<typeof useDisplayEvents>
  displays: Display[]
}) {
  const displayName = (id: string | null) =>
    displays.find((d) => d.id === id)?.name ?? '—'
  return (
    <div className="nu-card p-5">
      <SectionHeader title="Recent Events" />
      {events.length === 0 ? (
        <div className="text-[13px] text-nu-skylight/60 py-8 text-center">
          No events yet. Configure Supabase to start logging display activity.
        </div>
      ) : (
        <ul className="divide-y divide-white/5 max-h-[420px] overflow-y-auto">
          {events.map((e) => (
            <li key={e.id} className="py-2.5 flex items-start gap-3 text-[12px]">
              <span className="text-nu-skylight/60 font-mono w-16 shrink-0 pt-0.5">
                {timeAgo(e.created_at)}
              </span>
              <span className="nu-pill text-[10px] py-0.5">{e.event_type}</span>
              <span className="text-nu-wisp grow">
                <span className="text-nu-sky">{displayName(e.display_id)}</span>
                {e.message && (
                  <span className="text-nu-skylight ml-1">— {e.message}</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function CommandsPanel({
  commands, displays,
}: {
  commands: ReturnType<typeof useDisplayCommands>
  displays: Display[]
}) {
  const displayName = (id: string) =>
    displays.find((d) => d.id === id)?.name ?? id
  return (
    <div className="nu-card p-5">
      <SectionHeader title="Command History" />
      {commands.length === 0 ? (
        <div className="text-[13px] text-nu-skylight/60 py-8 text-center">
          No commands sent yet. Tap a button on a display card to send
          Reload / Go Home / Blackout / Emergency.
        </div>
      ) : (
        <ul className="divide-y divide-white/5 max-h-[420px] overflow-y-auto">
          {commands.map((c) => (
            <li key={c.id} className="py-2.5 flex items-start gap-3 text-[12px]">
              <span className="text-nu-skylight/60 font-mono w-16 shrink-0 pt-0.5">
                {timeAgo(c.created_at)}
              </span>
              <span className="nu-pill text-[10px] py-0.5 capitalize">{c.command.replace(/_/g, ' ')}</span>
              <span className="text-nu-wisp grow">
                <span className="text-nu-sky">{displayName(c.display_id)}</span>
                {c.executed_at
                  ? <span className="text-nu-leaf ml-1">— executed</span>
                  : <span className="text-nu-tour ml-1">— pending</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/* ===================== utils ===================== */

function timeAgo(iso: string): string {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 5_000) return 'just now'
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  return `${Math.floor(diff / 3_600_000)}h ago`
}
