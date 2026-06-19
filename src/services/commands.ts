import { getSupabase } from './supabase'
import type { CommandType, DisplayCommand } from '../types/command'

/** Fetches the most recent N commands across all displays (for the history panel). */
export async function fetchRecentCommands(limit = 30): Promise<DisplayCommand[]> {
  const sb = getSupabase()
  if (!sb) return []
  const { data, error } = await sb
    .from('display_commands')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) {
    console.warn('fetchRecentCommands error', error)
    return []
  }
  return (data ?? []) as DisplayCommand[]
}

/**
 * Insert a new command for a display. Returns the inserted command.
 * Phase 3 will have display clients subscribe to display_commands and
 * execute them; for now this just queues them in the database.
 */
export async function sendCommand(
  displayId: string,
  command: CommandType,
  payload: Record<string, unknown> = {},
): Promise<DisplayCommand> {
  const sb = getSupabase()
  if (!sb) throw new Error('Supabase not configured')
  const row = { display_id: displayId, command, payload }
  const { data, error } = await sb
    .from('display_commands')
    .insert(row)
    .select('*')
    .single()
  if (error) throw error
  return data as DisplayCommand
}
