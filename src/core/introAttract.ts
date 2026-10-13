import { createWorld, stepWorld, issue, arenaDims, padLen, BALL_R, type World } from '../sim/world'

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n))

/** A fresh, unranked display run. It is never recorded as player progress. */
export function createIntroAttractWorld(seed: number): World {
  const world = createWorld({ mode: 'solo-fall', difficulty: 'chill', arenas: 0 }, seed)
  // The NPC is an exhibition opponent here: remove its chill-tier reaction
  // delay and aim error so the live demo can sustain a rally. This changes
  // only the demo controller; paddles and glass still use normal collisions.
  world.difficulty = { ...world.difficulty, speed: 1.5, reaction: 1, error: 0, predict: 1, mistake: 0, thrust: 0 }
  return world
}

function aimAtBall(w: World, sideIndex: 0 | 1): number {
  const { W, H } = arenaDims(w)
  const towardPaddle = sideIndex === 0 ? -1 : 1
  const paddleX = (sideIndex === 0 ? -1 : 1) * (W / 2 - 30)
  let incoming: World['balls'][number] | null = null
  for (const ball of w.balls) {
    if (ball.scored || ball.vx * towardPaddle <= 0) continue
    if (!incoming || Math.abs(ball.x - paddleX) < Math.abs(incoming.x - paddleX)) incoming = ball
  }
  if (!incoming) return 0
  const reachTime = Math.max(0, (paddleX - incoming.x) / incoming.vx)
  const paddleLength = padLen(w, sideIndex)
  const limit = H / 2 - paddleLength / 2
  const span = limit * 2
  let y = incoming.y + incoming.vy * reachTime
  y = ((y + limit) % (span * 2) + span * 2) % (span * 2)
  y = (y > span ? span * 2 - y : y) - limit
  return clamp(y, -limit, limit)
}

/** Advance a two-bot Solo Fall exhibition by one fixed simulation step. */
export function stepIntroAttractWorld(w: World): void {
  if (w.status !== 'play') return
  // The exhibition controller gives the left paddle the same predictive aim
  // as the configured NPC on the right. Standard paddle collision and pane
  // damage still decide every hit; missed paddles can crack the glass.
  for (const side of [0, 1] as const) issue(w, { k: 'move', side, y: aimAtBall(w, side) })
  stepWorld(w)
}

