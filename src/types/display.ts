export type DisplayStatus = 'online' | 'offline' | 'checking'

export type DisplayHealth = {
  status: DisplayStatus
  /** ms response time of the most recent probe. null if last probe failed. */
  responseTime: number | null
  /** ISO timestamp of the most recent successful probe. */
  lastChecked: string
  /** Latest HTTP status code seen, or null. */
  httpStatus: number | null
}

export type Display = {
  id: string
  name: string
  location: string
  url: string
  /** Optional label that distinguishes left/right/etc. (e.g. "Left arrow") */
  orientation?: string
}
