// Touch gestures that fire a thrust (lunge): flick toward the other side. Pure so the rule is tested; createPongFall feeds it the finger's recent points.
export interface TouchPoint { x: number; y: number; t: number }
export const FLICK = { windowMs: 160, minDist: 40, minSpeed: 900, horizontalRatio: 1.6 } as const

/**
 * True when the last moments of a drag were a fast, mostly sideways flick in direction `dir` (+1 = right, -1 = left). Slow drags, vertical paddle moves and
 * flicks the wrong way are not thrusts. `points` are in time order.
 */
export function isThrustFlick(points: readonly TouchPoint[], dir: 1 | -1): boolean {
  if (points.length < 2) return false
  const last = points[points.length - 1]!
  let first = last
  for (let i = points.length - 2; i >= 0; i--) { if (last.t - points[i]!.t > FLICK.windowMs) break; first = points[i]! }
  const dt = (last.t - first.t) / 1000, dx = (last.x - first.x) * dir, dy = Math.abs(last.y - first.y)
  if (dt <= 0 || dx < FLICK.minDist) return false
  return dx / dt >= FLICK.minSpeed && dx >= dy * FLICK.horizontalRatio
}
