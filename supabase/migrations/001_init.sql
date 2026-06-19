-- ============================================================================
-- 001_init.sql — Phase 2: displays, display_commands, display_events
-- Run in the Supabase SQL editor (or via `supabase db push` once the CLI is
-- configured). This migration is idempotent (uses IF NOT EXISTS).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- displays: the live state of every kiosk the admin is monitoring.
-- One row per physical display. Updated by the display client via Supabase
-- Realtime POSTs (Phase 3) AND by the dashboard's local probe fallback.
-- ----------------------------------------------------------------------------
create table if not exists public.displays (
  id                 text primary key,        -- 'barton-left-arrow', 'nu-display', etc.
  name               text not null,
  location           text not null,
  orientation        text,                    -- e.g. 'Left arrow', 'Upstairs (2nd floor)'
  notes              text,                    -- free-form admin note
  public_url         text not null default '',-- URL the display should be reached at
  current_page       text,                    -- e.g. '/', '/swoop-shop', '/academics'
  current_url        text,                    -- full URL the display is showing
  status             text not null default 'offline' check (status in ('online', 'offline', 'checking')),
  last_seen          timestamptz,             -- last heartbeat from the display client
  last_touch         timestamptz,             -- last user/auto interaction on the display
  response_time      integer,                 -- last measured ms
  screenshot_url     text,                    -- Phase 3: Supabase Storage URL
  software_version   text,                    -- e.g. '0.7.0', 'commit abc1234'
  is_blackout        boolean not null default false,
  emergency_message  text,                    -- nullable; Phase 3 push from admin
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- touch_updated_at keeps updated_at honest on every row write.
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_displays_touch on public.displays;
create trigger trg_displays_touch
before update on public.displays
for each row execute function public.touch_updated_at();

create index if not exists displays_status_idx on public.displays (status);
create index if not exists displays_last_seen_idx on public.displays (last_seen desc);

-- ----------------------------------------------------------------------------
-- display_commands: the command queue.
-- Phase 2 inserts commands here from the dashboard. Phase 3 has the display
-- clients subscribe via Supabase Realtime and execute them, then write
-- executed_at to mark the command as done.
-- ----------------------------------------------------------------------------
create table if not exists public.display_commands (
  id           uuid primary key default gen_random_uuid(),
  display_id   text not null references public.displays(id) on delete cascade,
  command      text not null check (command in ('reload', 'go_home', 'blackout', 'emergency_message')),
  payload      jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  executed_at  timestamptz
);

create index if not exists display_commands_display_idx on public.display_commands (display_id, created_at desc);
create index if not exists display_commands_pending_idx on public.display_commands (display_id) where executed_at is null;

-- ----------------------------------------------------------------------------
-- display_events: append-only audit log of what happened.
-- Inserted by both the dashboard (state changes, command sends) and the
-- display clients (heartbeat_received, display_online, display_offline).
-- ----------------------------------------------------------------------------
create table if not exists public.display_events (
  id          uuid primary key default gen_random_uuid(),
  display_id  text references public.displays(id) on delete set null,
  event_type  text not null,
  message     text,
  created_at  timestamptz not null default now()
);

create index if not exists display_events_recent_idx
  on public.display_events (created_at desc);
create index if not exists display_events_display_idx
  on public.display_events (display_id, created_at desc);

-- ----------------------------------------------------------------------------
-- RLS: open read for the anon role (dashboard), open write for inserts and
-- updates on the three tables. The Supabase anon key is exposed in the
-- dashboard bundle; this policy allows the dashboard to read everything
-- and write commands/events freely. Lock this down further when we move
-- from anon to a per-staff authenticated role.
-- ----------------------------------------------------------------------------
alter table public.displays          enable row level security;
alter table public.display_commands  enable row level security;
alter table public.display_events    enable row level security;

drop policy if exists displays_anon_all          on public.displays;
drop policy if exists display_commands_anon_all  on public.display_commands;
drop policy if exists display_events_anon_all    on public.display_events;

create policy displays_anon_all         on public.displays          for all to anon using (true) with check (true);
create policy display_commands_anon_all on public.display_commands  for all to anon using (true) with check (true);
create policy display_events_anon_all   on public.display_events    for all to anon using (true) with check (true);

-- ----------------------------------------------------------------------------
-- Supabase Realtime: publish changes so the dashboard updates without refresh.
-- ----------------------------------------------------------------------------
alter publication supabase_realtime add table public.displays;
alter publication supabase_realtime add table public.display_commands;
alter publication supabase_realtime add table public.display_events;
