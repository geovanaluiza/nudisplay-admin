import type { Display } from '../types/display'

/**
 * Initial display roster — Phase 1.
 * Phase 2 will read this from Supabase so the dashboard reflects
 * what is actually deployed without a code deploy.
 */
export const DISPLAYS: Display[] = [
  {
    id: 'barton-left-arrow',
    name: 'Barton Left Arrow',
    orientation: 'Left arrow',
    location: 'Barton Hall',
    url: 'https://display-barton-left-arrow.vercel.app',
  },
  {
    id: 'barton-right-arrow',
    name: 'Barton Right Arrow',
    orientation: 'Right arrow',
    location: 'Barton Hall',
    url: 'https://display-barton-right-arrow.vercel.app',
  },
  {
    id: 'barton-downstairs',
    name: 'Barton Downstairs',
    orientation: 'Upstairs (2nd floor)',
    location: 'Barton Hall',
    url: 'https://display-barton-downstairs.vercel.app',
  },
  {
    id: 'nu-display',
    name: 'Main NU Display',
    orientation: 'Hero lobby wall',
    location: 'Campus',
    url: 'https://nu-display.vercel.app',
  },
]
