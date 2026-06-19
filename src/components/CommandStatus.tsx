import type { Display } from '../types/display'
import type { DisplayCommand } from '../types/command'

/**
 * Compact command status panel for a single display card.
 *
 * - Counts pending vs executed in the last 12 commands
 * - Shows the most recent command with its status pill
 *
 * Phase 3: this is read-only. The parent page subscribes to
 * display_commands once via useDisplayCommands and passes the
 * shared list down — this avoids the "cannot add
 * postgres_changes after subscribe()" error caused by multiple
 * identical Realtime channels.
 */
export function CommandStatus({
  display, commands,
}: {
  display: Display
  commands: DisplayCommand[]
}) {
  const mine = commands.filter((c) => c.display_id === display.id).slice(0, 12)
  if (mine.length === 0) return null
  const pending = mine.filter((c) => !c.executed_at).length
  const executed = mine.length - pending
  const latest = mine[0]
  return (
    <div className="rounded-glass bg-white/[0.04] border border-white/10 px-3 py-2.5">
      <div className="flex items-center justify-between mb-1.5">
        <span className="nu-eyebrow text-[10px]">Command Pipeline</span>
        <span className="text-[10px] text-nu-skylight/60 font-mono">
          {pending} pending · {executed} executed
        </span>
      </div>
      <div className="flex items-center gap-2 text-[12px]">
        <span className="font-mono text-nu-sky capitalize">
          {latest.command.replace(/_/g, ' ')}
        </span>
        <span className={[
          'nu-pill text-[9px] py-0.5 border',
          latest.executed_at
            ? 'bg-nu-leaf/12 text-nu-leaf border-nu-leaf/40'
            : 'bg-nu-tour/12 text-nu-tour border-nu-tour/40',
        ].join(' ')}>
          {latest.executed_at ? 'executed' : 'pending'}
        </span>
        <span className="ml-auto text-[10px] text-nu-skylight/60 font-mono">
          {timeAgo(latest.created_at)}
        </span>
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
