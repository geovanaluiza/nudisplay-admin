-- ============================================================================
-- 007_power_commands.sql — Phase 5C
--
-- Extends the display_commands_command_check constraint to allow the two
-- new hardware-agnostic power commands sent by the Power Management
-- section in the admin dashboard.
--
-- The display client's commandExecutor.executePowerOff / executePowerOn
-- are stubs in this initial implementation; future integrations
-- (Samsung VXT, LG webOS, BrightSign, Wake-on-LAN, CEC, GPIO relay,
-- etc.) plug in there without further schema changes.
-- ============================================================================

-- Drop the old constraint (the name Supabase auto-generated). If the
-- project is on an older schema the name might differ; we try both
-- the common variants.
alter table public.display_commands
  drop constraint if exists display_commands_command_check;

alter table public.display_commands
  drop constraint if exists display_commands_command_name_check;

-- Discover and drop any other check constraint on the command column.
-- (Postgres doesn't have a built-in "drop all checks on column" so we
-- use a DO block to look up the constraint name dynamically.)
do $$
declare
  cname text;
begin
  for cname in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    join pg_attribute att on att.attrelid = rel.oid and att.attnum = any(con.conkey)
    where nsp.nspname = 'public'
      and rel.relname = 'display_commands'
      and att.attname = 'command'
      and con.contype = 'c'
  loop
    execute format('alter table public.display_commands drop constraint %I', cname);
  end loop;
end$$;

-- Re-add with the full set of supported commands.
alter table public.display_commands
  add constraint display_commands_command_check
  check (command in (
    'reload',
    'go_home',
    'blackout',
    'emergency_message',
    'clear_blackout',
    'clear_emergency',
    -- Phase 5C — Power Management
    'power_off',
    'power_on'
  ));
