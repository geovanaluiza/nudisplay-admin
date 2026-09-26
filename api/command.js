import { createClient } from '@supabase/supabase-js'

const ALLOWED = new Set([
  'reload',
  'go_home',
  'blackout',
  'emergency_message',
  'clear_blackout',
  'clear_emergency',
  'power_off',
  'power_on',
])

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY
  if (!url || !key) {
    res.status(503).json({ error: 'Admin write not configured' })
    return
  }

  const { display_id, command, payload } = req.body || {}
  if (!display_id || typeof display_id !== 'string' || !ALLOWED.has(command)) {
    res.status(400).json({ error: 'Invalid command' })
    return
  }

  const sb = createClient(url, key, { auth: { persistSession: false } })
  const { data, error } = await sb
    .from('display_commands')
    .insert({
      display_id,
      command,
      payload: payload && typeof payload === 'object' ? payload : {},
    })
    .select('*')
    .single()

  if (error) {
    res.status(500).json({ error: error.message })
    return
  }
  res.status(200).json(data)
}
