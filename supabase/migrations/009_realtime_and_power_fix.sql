-- ============================================================================
-- 009_realtime_and_power_fix.sql — Phase 3 Fixes
--
-- 1. Ensures Supabase Realtime publishes INSERT + UPDATE on display_commands.
--    The initial migration (001_init.sql) added the table to the publication,
--    but in some Supabase projects the publication needs to be refreshed after
--    schema changes (e.g. after 007_power_commands.sql altered constraints).
--
-- 2. Adds power_state / power_changed_at columns if 006_power.sql has not
--    been applied yet (these are referenced by the display client's
--    commandExecutor writePowerState() call).
--
-- Safe to re-run.
-- ============================================================================

-- ---- 1. Realtime publication for display_commands ----

-- Check if display_commands is in the realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and tablename = 'display_commands'
  ) THEN
    RAISE NOTICE 'Adding display_commands to supabase_realtime publication...';
    ALTER PUBLICATION supabase_realtime ADD TABLE public.display_commands;
  ELSE
    RAISE NOTICE 'display_commands already in supabase_realtime — no change needed.';
  END IF;
END
$$;

-- Also ensure displays table is in realtime (needed for heartbeat updates)
DO $$
BEGIN
  IF NOT EXISTS (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and tablename = 'displays'
  ) THEN
    RAISE NOTICE 'Adding displays to supabase_realtime publication...';
    ALTER PUBLICATION supabase_realtime ADD TABLE public.displays;
  ELSE
    RAISE NOTICE 'displays already in supabase_realtime — no change needed.';
  END IF;
END
$$;

-- Ensure display_events is also in realtime (used by heartbeat events)
DO $$
BEGIN
  IF NOT EXISTS (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and tablename = 'display_events'
  ) THEN
    RAISE NOTICE 'Adding display_events to supabase_realtime publication...';
    ALTER PUBLICATION supabase_realtime ADD TABLE public.display_events;
  ELSE
    RAISE NOTICE 'display_events already in supabase_realtime — no change needed.';
  END IF;
END
$$;

-- ---- 2. Power columns (idempotent — only runs if columns don't exist) ----

ALTER TABLE public.displays
  ADD COLUMN if not exists power_state text
  check (power_state in ('on', 'off'));

ALTER TABLE public.displays
  ADD COLUMN if not exists power_changed_at timestamptz;

-- Default existing rows to 'on'
UPDATE public.displays
  SET power_state = 'on', power_changed_at = now()
  WHERE power_state IS NULL;

-- Ensure anon can read/write these columns
GRANT select, insert, update, delete ON public.displays TO anon;
