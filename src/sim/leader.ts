import type { World } from './world'

export type PointLeader = { arena: 'main'; side: 0 | 1; score: number } | { arena: 'satellite'; id: number; side: 0 | 1; score: number }

/** The crown belongs to the sole highest scoring competitor in the visible shaft. */
export function pointLeader(w: Pick<World, 'sides' | 'sats'>): PointLeader | null {
  let leader: PointLeader | null = null
  let high = 0, tied = false
  const consider = (candidate: PointLeader) => {
    if (candidate.score > high) { high = candidate.score; leader = candidate; tied = false }
    else if (candidate.score === high && high > 0) tied = true
  }
  for (const side of [0, 1] as const) consider({ arena: 'main', side, score: w.sides[side].score })
  for (const sat of w.sats) for (const side of [0, 1] as const) consider({ arena: 'satellite', id: sat.id, side, score: sat.sides[side].score })
  return tied ? null : leader
}
