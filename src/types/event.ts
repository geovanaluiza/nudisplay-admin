export type EventType =
  | 'display_online'
  | 'display_offline'
  | 'heartbeat_received'
  | 'command_sent'
  | 'command_executed'

export type DisplayEvent = {
  id: string
  display_id: string | null
  event_type: EventType
  message: string | null
  created_at: string
}
