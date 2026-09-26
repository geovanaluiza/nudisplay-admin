-- ============================================================================
-- 012_restrict_anon_writes.sql
--
-- The publishable (anon) key is in the browser. Until now it could
-- INSERT/UPDATE/DELETE everything. This migration keeps kiosk heartbeats
-- working and stops that key from changing programming (URLs, blackout,
-- emergency text, new commands).
--
-- Admin commands go through /api/command with the service role key
-- (never shipped to the browser). Run this in the Supabase SQL editor
-- AFTER deploying the API route and setting SUPABASE_SERVICE_ROLE_KEY.
-- ============================================================================

-- Displays: read everything; write only heartbeat / screenshot / power ack.
revoke insert, update, delete on public.displays from anon;
grant select on public.displays to anon;
grant update (
  status,
  current_page,
  current_url,
  last_seen,
  last_touch,
  response_time,
  software_version,
  screenshot_url,
  screenshot_updated_at,
  security_status,
  security_message,
  is_secure,
  power_state,
  power_changed_at,
  updated_at
) on public.displays to anon;

-- Commands: kiosks may read the queue and mark a command done.
-- They may not create reload / blackout / emergency commands.
revoke insert, update, delete on public.display_commands from anon;
grant select on public.display_commands to anon;
grant update (executed_at) on public.display_commands to anon;

-- Events: kiosks and the dashboard may append logs; nobody deletes via anon.
revoke update, delete on public.display_events from anon;
grant select, insert on public.display_events to anon;
