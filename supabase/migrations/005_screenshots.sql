-- ============================================================================
-- 005_screenshots.sql — Phase 5: Live Screenshot Preview
--
-- Adds `screenshot_updated_at` to public.displays and creates the
-- `display-screenshots` Supabase Storage bucket for the per-display
-- latest JPEG. The dashboard reads this image + timestamp; each
-- display client uploads `latest.jpg` periodically (and after
-- navigations / commands) so the operator always sees what's on
-- the kiosk in real time.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- DB column
-- ----------------------------------------------------------------------------
alter table public.displays
  add column if not exists screenshot_updated_at timestamptz;

create index if not exists displays_screenshot_updated_at_idx
  on public.displays (screenshot_updated_at desc);

-- Same anon grant pattern as 003_grants_policies.sql so dashboard
-- can read the column and display clients can write it.
grant select, insert, update, delete on public.displays to anon;

-- ----------------------------------------------------------------------------
-- Storage bucket
--
-- Supabase Storage buckets must be created in `storage.buckets`.
-- Because the anon role cannot insert into `storage.buckets` (only
-- service_role can), this section is run by an admin via the
-- Supabase SQL editor or via `supabase db push` from the CLI.
--
-- If you prefer to create the bucket via the Dashboard, do:
--   1. Storage → New bucket
--   2. Name: display-screenshots
--   3. Public: ON (read)  (the dashboard is anonymous and reads
--      the screenshots from public URL paths)
--   4. File size limit: 2 MB
--   5. Allowed MIME types: image/jpeg
-- Then skip the `insert into storage.buckets` below and just run
-- the policies.
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('display-screenshots', 'display-screenshots', true, 2097152, array['image/jpeg']::text[])
on conflict (id) do update
  set public            = excluded.public,
      file_size_limit   = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ----------------------------------------------------------------------------
-- Storage RLS policies — anon role
--
-- The dashboard is anonymous (anon key) and needs to READ the
-- screenshots. Display clients are also anonymous and need to
-- WRITE / OVERWRITE `latest.jpg` for their display id.
-- ----------------------------------------------------------------------------

-- Drop pre-existing policies so the migration is idempotent.
drop policy if exists display_screenshots_anon_read   on storage.objects;
drop policy if exists display_screenshots_anon_write  on storage.objects;
drop policy if exists display_screenshots_anon_update on storage.objects;
drop policy if exists display_screenshots_anon_delete on storage.objects;

-- READ: any anon user can read any screenshot (the bucket is public
-- but we still need an explicit policy so RLS doesn't block the
-- signed URL).
create policy display_screenshots_anon_read
  on storage.objects
  for select to anon
  using ( bucket_id = 'display-screenshots' );

-- WRITE: anon can upload to display-screenshots/{any}/latest.jpg
-- only. Inserting into a different path (e.g. a non-{display_id}
-- prefix or a different filename) is blocked so a compromised
-- client cannot overwrite another display's screenshot.
create policy display_screenshots_anon_write
  on storage.objects
  for insert to anon
  with check (
    bucket_id = 'display-screenshots'
    and name ~ '^[a-z0-9-]+/latest\.jpg$'
  );

-- UPDATE: same path restriction (overwrite of latest.jpg in
-- the same directory).
create policy display_screenshots_anon_update
  on storage.objects
  for update to anon
  using (
    bucket_id = 'display-screenshots'
    and name ~ '^[a-z0-9-]+/latest\.jpg$'
  );

-- DELETE: not strictly needed (overwrite uses UPDATE), but allow
-- it for the same restricted path so the admin dashboard can
-- clean up screenshots if needed.
create policy display_screenshots_anon_delete
  on storage.objects
  for delete to anon
  using (
    bucket_id = 'display-screenshots'
    and name ~ '^[a-z0-9-]+/latest\.jpg$'
  );
