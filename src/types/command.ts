export type CommandType =
  | 'reload'
  | 'go_home'
  | 'blackout'
  | 'emergency_message'
  | 'clear_blackout'
  | 'clear_emergency'
  // Power Management (Phase 5C) — hardware-agnostic. The display
  // client's commandExecutor.executePowerOff / executePowerOn stubs
  // dispatch to whatever power backend is plugged in (Samsung VXT,
  // LG webOS, BrightSign, Wake-on-LAN, CEC, etc). The dashboard
  // does not know or care which backend is wired.
  | 'power_off'
  | 'power_on'

export type DisplayCommand = {
  id: string
  display_id: string
  command: CommandType
  payload: Record<string, unknown>
  created_at: string
  executed_at: string | null
}
