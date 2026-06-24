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
  // Phase 5C — Power Management
  | 'power_off_requested'
  | 'power_off_executed'
  | 'power_on_requested'
  | 'power_on_executed'

export type DisplayEvent = {
  id: string
  display_id: string | null
  event_type: EventType
  message: string | null
  created_at: string
}
