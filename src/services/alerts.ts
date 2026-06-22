/**
 * Phase 4.5 — Notification preparation.
 *
 * These are *interfaces* and a tiny routing service. No real
 * email/SMS/Teams integration is wired yet — Phase 5 will plug in
 * concrete providers (SendGrid, Twilio, Microsoft Power Automate,
 * etc). For now this layer only:
 *
 *   1. Defines the AlertChannel types
 *   2. Logs which channels would have been notified (so admins can
 *      see "alert prepared" in the Recent Events panel)
 *   3. Falls back gracefully when no provider is configured
 *
 * Adding a real channel later is a 5-line change: write a function
 * matching `AlertSender` and add it to `alertService.send()`.
 */

import type { SecurityStatus } from '../types/display'

export type AlertSeverity = 'info' | 'warning' | 'critical'

export type AlertChannel = 'email' | 'sms' | 'teams' | 'webhook'

export type AlertMessage = {
  displayId: string
  displayName: string
  severity: AlertSeverity
  securityStatus: SecurityStatus
  message: string
  /** Original source event for richer context (focus / URL / etc). */
  source: 'security_warning' | 'security_critical' | 'kiosk_escape_detected' |
          'focus_lost' | 'auto_recovery_triggered'
}

export type AlertSender = (channel: AlertChannel, msg: AlertMessage) => Promise<void>

/**
 * Default sender: writes a `notification_prepared` event into the
 * audit log so admins can see which alerts WOULD have been sent.
 * Swap this for real providers in Phase 5.
 */
export const defaultSender: AlertSender = async (channel, msg) => {
  // Lazy-import to avoid a circular dep with services/events.
  const { logEvent } = await import('./events')
  await logEvent('security_warning', {
    displayId: msg.displayId,
    message: `[alert:${channel}] ${msg.displayName} — ${msg.message}`,
  })
}

/**
 * Pure router. Decides which channels to use for a given severity
 * so the rest of the app stays free of policy.
 *
 * Policy (preparation phase, easy to change):
 *   - info     → none
 *   - warning  → teams
 *   - critical → email + sms + teams
 */
export function channelsFor(severity: AlertSeverity): AlertChannel[] {
  if (severity === 'critical') return ['email', 'sms', 'teams']
  if (severity === 'warning') return ['teams']
  return []
}

export const alertService = {
  /**
   * Send an alert through the channels appropriate for the
   * severity. Never throws — alerts are best-effort.
   */
  async send(
    msg: AlertMessage,
    sender: AlertSender = defaultSender,
  ): Promise<AlertChannel[]> {
    const channels = channelsFor(msg.severity)
    if (channels.length === 0) return []
    await Promise.allSettled(channels.map((c) => sender(c, msg)))
    return channels
  },

  /** Convenience: build the message from a display + raw event. */
  build(
    display: { id: string; name: string; security_status: SecurityStatus },
    message: string,
    source: AlertMessage['source'],
  ): AlertMessage {
    const severity: AlertSeverity =
      display.security_status === 'critical' ? 'critical' :
      display.security_status === 'warning' ? 'warning' :
      'info'
    return {
      displayId: display.id,
      displayName: display.name,
      severity,
      securityStatus: display.security_status,
      message,
      source,
    }
  },
}