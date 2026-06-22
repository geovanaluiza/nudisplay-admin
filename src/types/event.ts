export type EventType =
  | 'display_online'
  | 'display_offline'
  | 'heartbeat_received'
  | 'command_sent'
  | 'command_executed'
  // Phase 4.5 — security
  | 'security_warning'
  | 'security_critical'
  | 'kiosk_escape_detected'
  | 'focus_lost'
  | 'auto_recovery_triggered'

export type DisplayEvent = {
  id: string
  display_id: string | null
  event_type: EventType
  message: string | null
  created_at: string
}
