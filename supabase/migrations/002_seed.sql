-- ============================================================================
-- 002_seed.sql — initial 4 displays for the dashboard.
-- These are seed records only. Administrators can add/edit/delete freely
-- via the dashboard's AddDisplayModal/EditDisplayModal.
-- Safe to re-run.
-- ============================================================================

insert into public.displays (id, name, location, orientation, notes, approved_url) values
  ('barton-left-arrow',
   'Barton Left Arrow',
   'Barton Hall',
   'Left arrow',
   '2nd floor lobby. Points visitors to the Admissions Office on the left.',
   'https://display-barton-left-arrow.vercel.app'),

  ('barton-right-arrow',
   'Barton Right Arrow',
   'Barton Hall',
   'Right arrow',
   '2nd floor lobby. Points visitors to the Admissions Office on the right.',
   'https://display-barton-right-arrow.vercel.app'),

  ('barton-downstairs',
   'Barton Downstairs',
   'Barton Hall',
   'Upstairs (2nd floor)',
   'Main lobby. Wayfinding card with up arrow tells visitors to go up one floor.',
   'https://display-barton-downstairs.vercel.app'),

  ('nu-display',
   'Main NU Display',
   'Campus',
   'Hero lobby wall',
   'Full-screen hero display at the campus main entrance.',
   'https://nu-display.vercel.app')
on conflict (id) do update set
  name         = excluded.name,
  location     = excluded.location,
  orientation  = excluded.orientation,
  notes        = excluded.notes,
  approved_url = excluded.approved_url;
