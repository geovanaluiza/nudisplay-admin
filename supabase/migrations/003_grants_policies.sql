-- ============================================================================
-- 003_grants_policies.sql — FIX for PGRST205/42501
--
-- The 001_init.sql migration enables RLS and creates policies with
-- `to anon`, but on Supabase the `anon` role ALSO needs explicit
-- GRANT privileges on each table — RLS policies are evaluated
-- AFTER the table-level privileges.
--
-- Symptom: 42501 "permission denied for table displays"
--           401 on Realtime websocket
-- Tables exist, RLS exists, but the anon role cannot SELECT.
--
-- This migration is idempotent. Run it in the Supabase SQL editor.
-- ============================================================================

-- 1. Explicit table-level grants for the anon role
grant usage on schema public to anon;
grant select, insert, update, delete on public.displays          to anon;
grant select, insert, update, delete on public.display_commands  to anon;
grant select, insert, update, delete on public.display_events    to anon;

-- 2. RLS remains enabled (from 001) — drop + recreate policies cleanly.
--    Keeping `to anon` for consistency with 001_init.sql.
alter table public.displays          enable row level security;
alter table public.display_commands  enable row level security;
alter table public.display_events    enable row level security;

drop policy if exists displays_anon_all          on public.displays;
drop policy if exists display_commands_anon_all  on public.display_commands;
drop policy if exists display_events_anon_all    on public.display_events;

create policy displays_anon_all         on public.displays          for all to anon using (true) with check (true);
create policy display_commands_anon_all on public.display_commands  for all to anon using (true) with check (true);
create policy display_events_anon_all   on public.display_events    for all to anon using (true) with check (true);

-- 3. Realtime: re-assert publication membership (no-op if already present).
--    The GRANT above covers Realtime (it needs SELECT).
alter publication supabase_realtime add table public.displays;
alter publication supabase_realtime add table public.display_commands;
alter publication supabase_realtime add table public.display_events;
