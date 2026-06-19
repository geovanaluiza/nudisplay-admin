# NU Display Admin

A real-time operations center for Northwest University campus digital
signage. This dashboard monitors every display registered in Supabase,
lets administrators add/edit/remove displays, and queues remote commands
(reload, go_home, blackout, emergency_message) that Phase 3 display
clients will execute via Supabase Realtime.

## Stack

- **Vite 5** + **React 18** + **TypeScript** (strict)
- **Tailwind 3** with custom Northwest University color tokens
- **Supabase** (`@supabase/supabase-js`) + **Realtime** subscriptions
- **React Router 6** (single route: `/admin/displays`)
- Zero external SaaS dependencies — pure Northwest design system

## Run locally

```bash
npm install
npm run dev          # http://localhost:5173/admin/displays
npm run build        # outputs to dist/
```

If `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` are missing, the
dashboard falls back to **Local mode** (HEAD-probe only, no persistence)
and a "Local mode" pill appears in the header.

## Configure Supabase (Phase 2)

1. Create a Supabase project.
2. Copy `.env.example` to `.env` and fill in:
   ```
   VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```
3. Run the SQL migrations in order from `supabase/migrations/`:
   - `001_init.sql`     — schema (displays, display_commands, display_events), RLS, Realtime
   - `002_seed.sql`     — the four known displays as initial rows
4. Reload the dashboard — the four displays will appear via Realtime
   within a second or two.

## Architecture

```
src/
  services/
    supabase.ts         — singleton client (null if env missing)
    displays.ts         — CRUD: fetchDisplays, createDisplay, updateDisplay, deleteDisplay
    commands.ts         — fetchRecentCommands, sendCommand
    events.ts           — fetchRecentEvents, logEvent
  hooks/
    useDisplayStatus.ts      — single source of truth (Realtime + local probe fallback)
    useDisplayCommands.ts    — Realtime INSERT subscription on display_commands
    useDisplayEvents.ts      — Realtime INSERT subscription on display_events
    useDisplayHeartbeat.ts   — alias for useDisplayStatus (legacy name)
  components/
    Shell.tsx                 — header / nav / footer
    DisplayCard.tsx           — single display card (screenshot, page, location, times, commands)
    DisplayFormModal.tsx      — Add / Edit display
    Modal.tsx                 — generic centered glassmorphism modal
    StatusBadge.tsx           — online / offline pill
    Button.tsx                — 4 variants × 2 sizes
    NuMark.tsx                — gold NU monogram for the header
    icons.tsx                 — inline SVG icon set
  pages/
    DisplaysPage.tsx          — the only page
  types/                       — Display, Command, Event
```

### Realtime model

| Table             | Subscribed events                | Hook                    |
|-------------------|----------------------------------|-------------------------|
| `displays`        | INSERT, UPDATE, DELETE           | `useDisplayStatus`      |
| `display_commands`| INSERT                            | `useDisplayCommands`    |
| `display_events`  | INSERT                            | `useDisplayEvents`      |

Every consumer of display state (header, stats, banner, card grid,
events panel) reads from the same React state — no duplicate fetches
and no N+1 queries.

### Offline logic

A display is considered `offline` when `last_seen` is older than
**90 seconds** (3× the 30s heartbeat interval). Status is recomputed
locally every 10 seconds from `last_seen` so a display that stops
phoning home flips to `offline` even if its last persisted status
was `online`.

## Operations

### Add / edit / remove displays

For now, displays are managed **directly in Supabase** — either via
the Supabase dashboard's table editor, the SQL editor, or by running
additional migrations. The four known displays are seeded by
`supabase/migrations/002_seed.sql`. Adding more is as simple as:

```sql
insert into public.displays (id, name, location, orientation, public_url, notes)
values ('kiosk-5', 'Pavilion Display', 'Pavilion Hall', 'Center', 'https://...', '...');
```

The new row appears in the dashboard within a second or two via
Supabase Realtime — no code deploy needed. The architecture supports
10, 20, or more displays without changes.

> Full Add/Edit/Delete UI inside the dashboard is on the roadmap
> (Phase 2.5) but intentionally deferred — the SQL editor is
> currently the canonical management surface for the 10+ display
> roster.

### Send a command

On any display card, click one of the four command buttons:

- **Reload**          — re-fetch the current page
- **Go Home**         — navigate to `/`
- **Blackout**        — show a black screen
- **Emergency**       — display an emergency message

The command is inserted into `display_commands` and a `command_sent`
event is logged. Phase 3 display clients will subscribe to that table
and execute the command, then mark `executed_at`.

## Deploy to Vercel

```bash
vercel link
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
vercel --prod
```

`serve.json` ships with SPA rewrite rules so React Router works
correctly under any static host.

## Phase 3 plan (next)

See `PHASE_3.md`.
