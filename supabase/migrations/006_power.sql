-- ============================================================================
-- 006_power.sql — Power Management (Phase 5C)
--
-- Adds a `power_state` column to public.displays so the dashboard can show
-- whether a kiosk is logically ON or OFF, and an optional
-- `power_changed_at` timestamp so we can render "Powering Off…" status
-- while the display client is acknowledging the command.
--
-- The hardware-agnostic abstraction lives in the display client
-- (services/commandExecutor.ts) — executePowerOff() and executePowerOn()
-- are stubs that future integrations (Samsung VXT, LG webOS, BrightSign,
-- Wake-on-LAN, CEC, etc.) can plug into without changing the dashboard.
--
-- Valid values:
--   'on'   — display is rendering content (default)
--   'off'  — display is logically powered off (no content, no heartbeat)
--   null   — unknown / not yet reported
-- ============================================================================

alter table public.displays
  add column if not exists power_state text
    check (power_state in ('on', 'off'));

alter table public.displays
  add column if not exists power_changed_at timestamptz;

create index if not exists displays_power_state_idx
  on public.displays (power_state);

-- Default all existing rows to 'on' so the dashboard shows the current
-- behaviour. The next heartbeat from each display will overwrite if the
-- hardware abstraction reports a different state.
update public.displays
  set power_state = 'on', power_changed_at = now()
  where power_state is null;

-- Anon role can read + write these (same as the other display columns).
grant select, insert, update, delete on public.displays to anon;
