# PHASE 3 — Connect the displays

This document describes the **next** implementation phase. The four
display projects below are the clients that will phone home to the
Supabase backend this dashboard already manages. None of them is
modified yet.

| Display project            | Repo / deploy                                       |
|----------------------------|-----------------------------------------------------|
| `barton-2floor-leftarrow`  | `display-barton-left-arrow.vercel.app`              |
| `barton-2floor-rightarrow` | `display-barton-right-arrow.vercel.app`             |
| `barton-2floor-downstairs` | `display-barton-downstairs.vercel.app`              |
| `nu-display`               | `nu-display.vercel.app`                             |

## Goal

Each display project POSTs a **heartbeat** to Supabase every 30s and
**subscribes** to the `display_commands` table. When a command arrives
it is executed locally, then marked `executed_at`. Each display also
posts a screenshot to Supabase Storage and writes a periodic
`heartbeat_received` event.

After Phase 3, the dashboard's existing Phase 2 hooks
(`useDisplayStatus`, `useDisplayCommands`, `useDisplayEvents`) will
fill in real-time data without any dashboard code changes.

## Display management

Displays are managed **in Supabase directly** (SQL editor, table
editor, or migrations). The dashboard's Phase 2.5 UI for Add / Edit /
Delete is intentionally deferred — the Supabase surface is the
canonical management plane for the 10+ display roster.

Adding a new kiosk:

```sql
insert into public.displays
  (id, name, location, orientation, public_url, notes)
values
  ('pavilion-1', 'Pavilion Display', 'Pavilion Hall', 'Center',
   'https://pavilion.vercel.app', 'Optional context for staff');
```

The new row appears in the dashboard via Realtime within a second or two.
No code deploy required.

---

## Per-display client (one of the four)

### 1. Add dependencies to each display

```bash
cd ../barton-2floor-rightarrow   # or whichever
npm install @supabase/supabase-js
```

### 2. Add a heartbeats helper

Create `composables/useDisplayHeartbeat.ts` (or in JS: `lib/heartbeat.ts`):

```ts
import { createClient } from '@supabase/supabase-js'

const DISPLAY_ID = 'barton-right-arrow'   // unique per project
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
)

let lastTouch = Date.now()
let currentPage = window.location.pathname

window.addEventListener('pointerdown', () => { lastTouch = Date.now() })
window.addEventListener('keydown',     () => { lastTouch = Date.now() })
setInterval(() => {
  if (window.location.pathname !== currentPage) {
    currentPage = window.location.pathname
    lastTouch = Date.now()
  }
}, 2000)

setInterval(async () => {
  await supabase.from('displays').update({
    status: 'online',
    last_seen: new Date().toISOString(),
    last_touch: new Date(lastTouch).toISOString(),
    current_page: currentPage,
    current_url: window.location.href,
    response_time: Math.round(performance.now() % 1000), // or actual measurement
  }).eq('id', DISPLAY_ID)

  await supabase.from('display_events').insert({
    display_id: DISPLAY_ID,
    event_type: 'heartbeat_received',
  })
}, 30_000)
```

### 3. Subscribe to commands

```ts
supabase
  .channel(`commands-${DISPLAY_ID}`)
  .on('postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'display_commands', filter: `display_id=eq.${DISPLAY_ID}` },
    async (payload) => {
      const cmd = payload.new.command
      switch (cmd) {
        case 'reload':          window.location.reload(); break
        case 'go_home':         window.location.href = '/'; break
        case 'blackout':        document.body.style.background = '#000'; break
        case 'emergency_message': showEmergencyOverlay(payload.new.payload?.text); break
      }
      await supabase.from('display_commands')
        .update({ executed_at: new Date().toISOString() })
        .eq('id', payload.new.id)
    },
  ).subscribe()
```

### 4. Screenshots (optional but planned)

A small headless `html2canvas` (or `dom-to-image`) task that captures
the visible viewport every 60s, uploads to Supabase Storage:

```ts
const blob = await html2canvas(document.body).then(c => c.toBlob())
const path = `screenshots/${DISPLAY_ID}/${Date.now()}.png`
await supabase.storage.from('screenshots').upload(path, blob)
await supabase.from('displays').update({ screenshot_url: path }).eq('id', DISPLAY_ID)
```

`supabase/migrations/003_storage.sql` will add the bucket.

---

## Migrations to add when Phase 3 starts

```sql
-- 003_storage.sql
insert into storage.buckets (id, name, public) values
  ('screenshots', 'screenshots', true)
on conflict (id) do nothing;

create policy "screenshots_read"   on storage.objects for select to anon using (bucket_id = 'screenshots');
create policy "screenshots_write"  on storage.objects for insert to anon with check (bucket_id = 'screenshots');
```

---

## Verification checklist (after Phase 3 is wired)

- [ ] Each of the 4 display deploys has its `VITE_SUPABASE_URL` set in
      the Vercel project settings
- [ ] Each display's `DISPLAY_ID` in code matches the row in `displays`
      (`barton-left-arrow`, `barton-right-arrow`, `barton-downstairs`, `nu-display`)
- [ ] Heartbeats arrive every 30s (visible in Recent Events panel)
- [ ] Clicking a command button on a card inserts a row in
      `display_commands` and the display executes it within ~1s
- [ ] `executed_at` is filled in by the display after execution
- [ ] Status badge on each card flips to "Online" within 30s of the
      display booting
- [ ] Screenshots appear in the DisplayCard preview area

---

## What this dashboard does NOT need to change

- The Phase 2 schema, hooks, services, and components stay as-is.
- Phase 3 is purely additive on the **client** side (each display
  project) and one new SQL migration (003_storage.sql) on the
  **backend** side. The dashboard's existing Realtime subscriptions
  pick up the new data automatically.

---

## Phase 3 dashboard features (already shipped)

The dashboard itself received Phase 3 enhancements so staff can
**validate heartbeat behavior before the display clients are
connected**. None of these changes alter the visual design system
— they are all additive UI elements on the existing DisplayCard.

### 3A — Heartbeat service & hook
- `src/services/heartbeat.ts` — pure functions
  - `sendHeartbeat(id, payload)` writes to Supabase
  - `sendHeartbeatWithEvent(...)` same + logs `heartbeat_received`
  - `deriveStatus(d)` re-derives status from `last_seen`
  - `HEARTBEAT_INTERVAL_MS = 30_000`, `OFFLINE_AFTER_MS = 90_000`
- `src/hooks/useDisplayHeartbeat.ts` — generic per-display hook
  (display-client mode: `autoTick: true` fires every 30s).
- `src/hooks/useDisplayHeartbeatSimulator.ts` — in-dashboard
  simulator (used by Dev Controls).

### 3B — Current page / current URL
DisplayCard now shows two rows:
- `Page  /swoop-shop` (mono, nu-sky)
- `URL  https://nu-display.vercel.app/...` (mono, nu-sky/80)

### 3C — Screenshot infrastructure
- `src/components/ScreenshotPanel.tsx` — dedicated component with
  three states:
  - URL present + loaded → real `<img>`
  - URL present + broken → "Screenshot unavailable" + retry
  - URL absent → subtle "Available when display client uploads to
    Supabase Storage" placeholder
- Footer shows `updated 2m ago`, Open, and Retry controls.

### 3D — Health indicators
DisplayCard health grid (2×3) now includes:
- Location · Response (ms)
- Last Heartbeat (color-coded: leaf = online, sky = checking,
  amber = offline)
- Last Touch · Software (version) · Updated (relative time)

`StatusBadge` extended with a `checking` state (sky-blue, pulsing).

### 3E — Dev controls
- `src/components/DevControls.tsx` — three buttons wrapped in a
  dashed amber border with the **"Development Only"** eyebrow:
  - **Simulate Online** — sets status=online, new last_seen
  - **Simulate Offline** — sets status=offline
  - **Simulate Heartbeat** — fires one full heartbeat + event
- Currently `forceEnable={true}` on the dashboard so the
  preview deployment shows them. Remove `forceEnable` for the
  real production build to gate by `import.meta.env.PROD`.

### 3F — Command pipeline
- `src/components/CommandStatus.tsx` — per-card summary of the
  display's last 12 commands: `N pending · M executed` and the
  most recent command with a status pill (gold = pending,
  leaf = executed).
- The command list is fetched once in `DisplaysPage` via
  `useDisplayCommands(60)` and passed down to every DisplayCard
  to avoid duplicate Realtime channels.

---

## What the display clients need to do

Each of the four projects (`barton-2floor-rightarrow`,
`barton-2floor-leftarrow`, `barton-2floor-downstairs`,
`nu-display`) needs to:

1. `npm install @supabase/supabase-js`
2. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the
   Vercel project environment variables (the same anon key the
   dashboard uses).
3. Import `useDisplayHeartbeat` from this admin repo (or copy the
   pattern) and call it with `autoTick: true`.
4. Subscribe to `display_commands` (see the snippet above) and
   write `executed_at` after executing.
5. (Optional) Periodically upload a screenshot to
   Supabase Storage bucket `screenshots` and update
   `screenshot_url` on the row.

The dashboard needs zero changes once the displays phone home —
everything flows through the existing Realtime subscriptions.
