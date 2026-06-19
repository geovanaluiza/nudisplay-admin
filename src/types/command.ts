export type CommandType = 'reload' | 'go_home' | 'blackout' | 'emergency_message'

export type DisplayCommand = {
  id: string
  display_id: string
  command: CommandType
  payload: Record<string, unknown>
  created_at: string
  executed_at: string | null
}
