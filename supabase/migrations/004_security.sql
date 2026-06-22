-- ============================================================================
-- 004_security.sql — Phase 4.5: Display Security Monitoring
--
-- Adds four fields to public.displays:
--   approved_url      text   the URL the kiosk is allowed to be on
--   is_secure         bool   master kill-switch (false ⇒ display goes critical)
--   security_status   text   'secure' | 'warning' | 'critical'
--   security_message  text   human-readable explanation when not secure
--
-- Also extends the audit vocabulary with the new security event types
-- the kiosk client writes when it detects a problem.
-- ============================================================================

alter table public.displays
  add column if not exists approved_url     text        not null default '',
  add column if not exists is_secure        boolean     not null default true,
  add column if not exists security_status  text        not null default 'secure'
                    check (security_status in ('secure', 'warning', 'critical')),
  add column if not exists security_message text;

-- -----------------------------------------------------------------
-- Backfill approved_url for the four seed displays. Idempotent.
-- (If you added new displays with their own approved_url, those
--  values stay intact — the UPDATE only fires where it's still empty.)
-- -----------------------------------------------------------------
update public.displays set approved_url = 'https://display-barton-downstairs.vercel.app' where id = 'barton-downstairs' and approved_url = '';
update public.displays set approved_url = 'https://display-barton-left-arrow.vercel.app' where id = 'barton-left-arrow'    and approved_url = '';
update public.displays set approved_url = 'https://display-barton-right-arrow.vercel.app' where id = 'barton-right-arrow' and approved_url = '';
update public.displays set approved_url = 'https://nu-display.vercel.app' where id = 'nu-display' and approved_url = '';

create index if not exists displays_security_status_idx
  on public.displays (security_status)
  where security_status <> 'secure';

-- -----------------------------------------------------------------
-- Grant + RLS — same shape as 003_grants_policies.sql. The new
-- columns inherit the existing permissive policy because the
-- policy is `for all`. The grant below is a no-op for already
-- granted privileges; we include it so this migration is safe to
-- run on instances where 003 was skipped.
-- -----------------------------------------------------------------
grant select, insert, update, delete on public.displays to anon;

-- -----------------------------------------------------------------
-- Realtime: already in publication from 001. New columns ride along.
-- -----------------------------------------------------------------
alter publication supabase_realtime add table public.displays;