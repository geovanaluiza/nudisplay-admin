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

### Add a display

1. Click **Add Display** in the header.
2. Fill in **name** (required), **location** (required), **public URL** (required),
   optional **orientation** and **notes**.
3. The new row appears in the dashboard immediately via Realtime.

### Send a command

On any display card, click one of the four command buttons:

- **Reload**          — re-fetch the current page
- **Go Home**         — navigate to `/`
- **Blackout**        — show a black screen
- **Emergency**       — display an emergency message

The command is inserted into `display_commands` and a `command_sent`
event is logged. Phase 3 display clients will subscribe to that table
and execute the command, then mark `executed_at`.

### Edit / remove a display

Each card has an **Edit** and **Remove** action at the bottom (visible
when Supabase is configured). Edit opens the same modal as Add,
pre-filled with the row. Remove is confirmed via a native confirm().

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
