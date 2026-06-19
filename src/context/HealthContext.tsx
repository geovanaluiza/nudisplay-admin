import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { DISPLAYS } from '../data/displays'
import { useDisplayHealth } from '../hooks/useDisplayHealth'
import type { DisplayHealth, DisplayStatus } from '../types/display'

type Ctx = {
  health: Record<string, DisplayHealth>
  tally: Record<DisplayStatus, number>
  total: number
}

const HealthContext = createContext<Ctx | null>(null)

/**
 * Single source of truth for display health.
 * Each display probes exactly once (not 4x), and every consumer
 * (page header, status banner, individual cards) reads from the
 * same React state.
 */
export function HealthProvider({ children }: { children: ReactNode }) {
  // Each call to useDisplayHealth sets up its own internal setInterval.
  // Because we always call them in the same order, React's hook rules
  // are satisfied and each gets a stable internal state slot.
  const states = DISPLAYS.map((d) => useDisplayHealth(d))

  const value = useMemo<Ctx>(() => {
    const health: Record<string, DisplayHealth> = {}
    const tally: Record<DisplayStatus, number> = {
      online: 0, offline: 0, checking: 0,
    }
    DISPLAYS.forEach((d, i) => {
      const h = states[i]
      health[d.id] = h
      tally[h.status] += 1
    })
    return { health, tally, total: DISPLAYS.length }
  }, [states])

  return <HealthContext.Provider value={value}>{children}</HealthContext.Provider>
}

export function useHealthContext(): Ctx {
  const ctx = useContext(HealthContext)
  if (!ctx) throw new Error('useHealthContext must be used within <HealthProvider>')
  return ctx
}
