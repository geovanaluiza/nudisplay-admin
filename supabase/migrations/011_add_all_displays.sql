-- ============================================================================
-- 011_add_all_displays.sql — register all 10 campus displays.
-- Each physical display reports heartbeats using the DISPLAY_ID constant in
-- its own lib/heartbeat.ts. Those IDs must match the `id` column here:
--   nu-display, feehall, hsc1, hsc2, pecota, 6710,
--   barton-downstairs, barton-left-arrow, barton-right-arrow, chapel-display
-- Safe to re-run.
-- ============================================================================

insert into public.displays (id, name, location, orientation, notes, approved_url, public_url) values
  ('nu-display',
   'Main NU Display',
   'Campus',
   'Portrait 1080×1920',
   'Full-screen hero display at the campus main entrance.',
   'https://nu-display.vercel.app',
   'https://nu-display.vercel.app'),

  ('feehall',
   'Fee Hall Display',
   'Fee Hall',
   'Portrait 1080×1920',
   'Digital signage in the Fee Hall lobby.',
   'https://display-web-feehall.vercel.app',
   'https://display-web-feehall.vercel.app'),

  ('hsc1',
   'HSC Display 1',
   'Health & Sciences Center',
   'Portrait 1080×1920',
   'First digital signage screen in the Health & Sciences Center.',
   'https://display-web-hsc1.vercel.app',
   'https://display-web-hsc1.vercel.app'),

  ('hsc2',
   'HSC Display 2',
   'Health & Sciences Center',
   'Portrait 1080×1920',
   'Second digital signage screen in the Health & Sciences Center.',
   'https://display-web-hsc2.vercel.app',
   'https://display-web-hsc2.vercel.app'),

  ('pecota',
   'Pecota Student Center',
   'Pecota Student Center',
   'Portrait 1080×1920',
   'Digital signage inside the Pecota Student Center, near the SwoopShop.',
   'https://pecota.vercel.app',
   'https://pecota.vercel.app'),

  ('6710',
   '6710 PA Display',
   '6710 Building',
   'Portrait 1080×1920',
   'School of PA Medicine digital signage in the 6710 building.',
   'https://6710.vercel.app',
   'https://6710.vercel.app'),

  ('barton-downstairs',
   'Barton Downstairs',
   'Barton Hall',
   'Upstairs (2nd floor)',
   'Main lobby. Wayfinding card with up arrow tells visitors to go up one floor.',
   'https://display-barton-downstairs.vercel.app',
   'https://display-barton-downstairs.vercel.app'),

  ('barton-left-arrow',
   'Barton Left Arrow',
   'Barton Hall',
   'Left arrow',
   '2nd floor lobby. Points visitors to the Admissions Office on the left.',
   'https://display-barton-left-arrow.vercel.app',
   'https://display-barton-left-arrow.vercel.app'),

  ('barton-right-arrow',
   'Barton Right Arrow',
   'Barton Hall',
   'Right arrow',
   '2nd floor lobby. Points visitors to the Admissions Office on the right.',
   'https://display-barton-right-arrow.vercel.app',
   'https://display-barton-right-arrow.vercel.app'),

  ('chapel-display',
   'Chapel Display',
   'Butterfield Chapel',
   'Portrait 1080×1920',
   'Chapel digital signage. Shows the Reach Church experience on Mondays and the regular chapel rotation on other days.',
   'https://chapel-ten.vercel.app',
   'https://chapel-ten.vercel.app')
on conflict (id) do update set
  name         = excluded.name,
  location     = excluded.location,
  orientation  = excluded.orientation,
  notes        = excluded.notes,
  approved_url = excluded.approved_url,
  public_url   = excluded.public_url;
