-- ============================================================================
-- 008_add_chapel_display.sql — add the Chapel Display as a fifth monitored display.
-- Safe to re-run.
-- ============================================================================

insert into public.displays (
  id, name, location, orientation, notes, approved_url, public_url
) values (
  'chapel-display',
  'Chapel Display',
  'Butterfield Chapel',
  'Portrait 1080×1920',
  'Chapel digital signage. Shows the Reach Church experience on Mondays and the regular chapel rotation on other days.',
  'https://chapel-ten.vercel.app',
  'https://chapel-ten.vercel.app'
)
on conflict (id) do update set
  name         = excluded.name,
  location     = excluded.location,
  orientation  = excluded.orientation,
  notes        = excluded.notes,
  approved_url = excluded.approved_url,
  public_url   = excluded.public_url;
