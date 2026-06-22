/**
 * Mirror of the `public.displays` table in Supabase.
 * One row per physical kiosk. Optional fields are nullable until Phase 3
 * (the display client itself) starts writing heartbeats.
 */
export type DisplayStatus = 'online' | 'offline' | 'checking'
export type SecurityStatus = 'secure' | 'warning' | 'critical'

export type Display = {
  id: string
  name: string
  location: string
  orientation: string | null
  notes: string | null
  public_url: string
  current_page: string | null
  current_url: string | null
  status: DisplayStatus
  last_seen: string | null        // ISO timestamp
  last_touch: string | null       // ISO timestamp
  response_time: number | null     // ms
  screenshot_url: string | null
  software_version: string | null
  is_blackout: boolean
  emergency_message: string | null
  // Phase 4.5 — security
  approved_url: string
  is_secure: boolean
  security_status: SecurityStatus
  security_message: string | null
  // timestamps
  created_at: string
  updated_at: string
}

/** Form shape used by Add/Edit Display modals. */
export type DisplayFormData = {
  name: string
  location: string
  orientation: string
  notes: string
  public_url: string
}

/** Default values for the Add/Edit form. */
export const EMPTY_DISPLAY_FORM: DisplayFormData = {
  name: '',
  location: '',
  orientation: '',
  notes: '',
  public_url: '',
}

/**
 * Empty roster shown while the first Supabase query is in flight.
 * The dashboard will populate this as soon as Realtime delivers the seed
 * rows. We never hardcode the four production displays here — those live
 * in supabase/migrations/002_seed.sql so the operations center is data-driven.
 */
export const EMPTY_ROSTER: Display[] = []
