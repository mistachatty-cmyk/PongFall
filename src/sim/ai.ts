import type { World } from './world'

/** Simple NPC paddle: tracks the nearest incoming ball with reaction error. */
export function stepAI(w: World, side: 0 | 1) {
  const dir = side === 0 ? -1 : 1
  let best: { x: number; y: number } | null = null
  for (const b of w.balls) {
    if (b.scored || b.vx * dir <= 0) continue
    if (!best || Math.abs(b.x - dir * 300) < Math.abs(best.x - dir * 300)) best = b
  }
  const me = w.sides[side]
  me.targetY = best ? best.y + Math.sin(w.t * 1.7 + side) * 28 : 0
}
