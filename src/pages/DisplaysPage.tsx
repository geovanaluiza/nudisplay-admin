import { DISPLAYS } from '../data/displays'
import { DisplayCard } from '../components/DisplayCard'
import { useHealthContext } from '../context/HealthContext'

export default function DisplaysPage() {
  const { tally, total } = useHealthContext()
  const allOnline = tally.offline === 0 && tally.checking === 0

  return (
    <div className="flex flex-col gap-8">
      {/* Page header */}
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="nu-eyebrow">Displays</div>
          <h1 className="font-serif text-[40px] text-nu-wisp leading-none mt-2">
            Campus Signage
          </h1>
          <p className="text-[14px] text-nu-skylight mt-3 max-w-xl">
            Live status of every Northwest University lobby and campus display.
            Polled every 30 seconds.
          </p>
        </div>
        <div className="flex items-center gap-6">
          <Stat label="Online" value={tally.online} accent="leaf" />
          <Stat label="Offline" value={tally.offline} accent={tally.offline ? 'amber' : 'skylight'} />
          <Stat label="Total" value={total} accent="tour" />
        </div>
      </div>

      {/* Status banner */}
      <div
        className={[
          'rounded-glass border px-5 py-3 flex items-center gap-3 text-[13px]',
          allOnline
            ? 'bg-nu-leaf/10 border-nu-leaf/30 text-nu-leaf'
            : 'bg-nu-tour/10 border-nu-tour/30 text-nu-tour',
        ].join(' ')}
      >
        <span
          className={[
            'w-2 h-2 rounded-full',
            allOnline ? 'bg-nu-leaf' : 'bg-nu-tour',
          ].join(' ')}
        />
        {allOnline
          ? 'All displays online — no action required.'
          : `${tally.offline} of ${total} display${tally.offline === 1 ? '' : 's'} need attention.`}
      </div>

      {/* Display grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {DISPLAYS.map((d) => (
          <DisplayCard key={d.id} display={d} />
        ))}
      </div>
    </div>
  )
}

function Stat({
  label, value, accent,
}: { label: string; value: number; accent: 'leaf' | 'amber' | 'tour' | 'skylight' }) {
  const color =
    accent === 'leaf' ? 'text-nu-leaf' :
    accent === 'amber' ? 'text-nu-amber' :
    accent === 'tour' ? 'text-nu-tour' :
    'text-nu-skylight'
  return (
    <div className="text-right">
      <div className="text-[11px] font-bold tracking-[0.28em] uppercase text-nu-skylight/70">
        {label}
      </div>
      <div className={['font-serif text-[40px] leading-none mt-1', color].join(' ')}>
        {value}
      </div>
    </div>
  )
}
