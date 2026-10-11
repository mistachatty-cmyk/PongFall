import { thrust, arenaDims, powerActive, BALL_R } from './world'
import type { World, Ball } from './world'

/** Where a ball will be (y) when it reaches x, folding over the arena's top and bottom. */
function predictY(b: Ball, x: number, H: number) {
  if (b.vx === 0) return b.y
  const t = (x - b.x) / b.vx
  if (t < 0) return b.y
  const lim = H / 2 - BALL_R
  let y = b.y + b.vy * t
  const span = lim * 2
  y = ((y + lim) % (span * 2) + span * 2) % (span * 2)
  return (y > span ? span * 2 - y : y) - lim
}

/** NPC paddle driven by the difficulty tier: slow re-aim, aim error, optional intercept prediction, lunges. */
export function stepAI(w: World, side: 0 | 1) {
  const d = w.difficulty
  const dir = side === 0 ? -1 : 1
  const me = w.sides[side]
  const ai = w.ai
  const { W, H } = arenaDims(w)
  const padX = dir * (W / 2 - 30)
  if (powerActive(w, side)) {
    // swat the arm up for a ball above it, down for a ball below
    let near: Ball | null = null
    for (const b of w.balls) if (!b.scored && b.vx * dir > 0 && Math.abs(b.x - padX) < 150 && (!near || Math.abs(b.x - padX) < Math.abs(near.x - padX))) near = b
    me.fdir = near ? (near.y < me.paddleY ? 1 : -1) : 0
  }
  if (w.tick < ai.freezeUntil) return
  if (w.tick % Math.max(1, d.reaction) === 0) {
    let best: Ball | null = null
    for (const b of w.balls) {
      if (b.scored || b.vx * dir <= 0) continue
      if (!best || Math.abs(b.x - padX) < Math.abs(best.x - padX)) best = b
    }
    if (best) {
      const pred = predictY(best, padX, H)
      ai.target = best.y + (pred - best.y) * d.predict + (w.rng() - 0.5) * 2 * d.error
      if (w.rng() < d.mistake * (Math.max(1, d.reaction) / 120)) ai.freezeUntil = w.tick + 45
    } else ai.target = 0
  }
  me.targetY = ai.target
  if (d.thrust > 0 && w.tick >= ai.nextThrust) {
    for (const b of w.balls) {
      if (!b.scored && b.vx * dir > 0 && Math.abs(b.x - padX) < 150 && Math.abs(b.y - me.paddleY) < 70 && w.rng() < d.thrust) {
        if (thrust(w, side)) ai.nextThrust = w.tick + 90
        break
      }
    }
  }
}
