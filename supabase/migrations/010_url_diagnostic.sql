-- Diagnostic: check what URL columns are populated for each display.
-- Run this in Supabase SQL Editor to see the actual URL values.
select
  id,
  name,
  public_url,
  approved_url,
  current_url,
  current_page,
  status,
  security_status
from public.displays
order by name;
