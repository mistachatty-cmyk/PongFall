import { createWorld, stepWorld, issue, arenaDims, BALL_R, type World } from '../sim/world'

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n))

/** A fresh, unranked display run. It is never recorded as player progress. */
export function createIntroAttractWorld(seed: number): World {
  return createWorld({ mode: 'solo-fall', difficulty: 'chill', arenas: 0 }, seed)
}

function aimAtBall(w: World): number {
  const { W, H } = arenaDims(w)
  const side = w.sides[0]!
  const paddleX = -(W / 2 - 30)
  let incoming: World['balls'][number] | null = null
  for (const ball of w.balls) {
    if (ball.scored || ball.vx >= 0) continue
    if (!incoming || Math.abs(ball.x - paddleX) < Math.abs(incoming.x - paddleX)) incoming = ball
  }
  if (!incoming) return 0
  const reachTime = Math.max(0, (paddleX - incoming.x) / incoming.vx)
  const limit = H / 2 - BALL_R
  const span = limit * 2
  let y = incoming.y + incoming.vy * reachTime
  y = ((y + limit) % (span * 2) + span * 2) % (span * 2)
  y = (y > span ? span * 2 - y : y) - limit
  const error = (w.rng() - 0.5) * 2 * w.difficulty.error
  return clamp(y + error, -limit, limit)
}

/** Advance a two-bot Solo Fall exhibition by one fixed simulation step. */
export function stepIntroAttractWorld(w: World): void {
  if (w.status !== 'play') return
  // The built-in Solo Fall NPC drives side 1. This separate exhibition-only
  // controller gives side 0 the same ball-tracking job without changing the
  // saved/replayable rules or the normal one-player control path.
  if (w.tick % Math.max(1, w.difficulty.reaction) === 0) {
    issue(w, { k: 'move', side: 0, y: aimAtBall(w) })
  }
  stepWorld(w)
}

