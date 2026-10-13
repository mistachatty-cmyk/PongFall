import { createWorld, stepWorld, issue, arenaDims, padLen, type World } from '../sim/world'

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n))

export interface IntroAttractScene {
  id: string
  title: string
  detail: string
  world: World
}

const SHOWCASE = [
  { id: 'solo-power', title: 'SOLO FALL', detail: 'GLASS · TEARS · POWER PADDLE', mode: 'solo-fall', difficulty: 'casual', arenas: 0, flux: false, powered: true },
  { id: 'satellites', title: 'THE SHAFT', detail: 'THREE SATELLITES · FLUX', mode: 'classic', difficulty: 'sharp', arenas: 3, flux: true, powered: false },
  { id: 'versus', title: 'VERSUS', detail: 'TWO AI PILOTS · ONE SHAFT', mode: 'versus', difficulty: 'sharp', arenas: 1, flux: false, powered: false },
  { id: 'timed', title: 'TIMED FALL', detail: 'FIVE SATELLITES · RELENTLESS', mode: 'timed', difficulty: 'relentless', arenas: 5, flux: true, powered: false },
  { id: 'sandbox', title: 'SANDBOX', detail: 'OPEN POWER · FULL PHYSICS', mode: 'sandbox', difficulty: 'sharp', arenas: 3, flux: true, powered: true },
] as const

export const INTRO_SHOWCASE_SECONDS = 18
export const introShowcaseSceneCount = SHOWCASE.length

/** Post-first-fall intro scenes use the real simulation, rotating through modes and arena setups. */
export function createIntroShowcaseScene(seed: number, index: number): IntroAttractScene {
  const spec = SHOWCASE[((index % SHOWCASE.length) + SHOWCASE.length) % SHOWCASE.length]!
  const world = createWorld({ mode: spec.mode, difficulty: spec.difficulty, arenas: spec.arenas, flux: spec.flux, powerUnlocked: spec.powered }, seed)
  return { id: spec.id, title: spec.title, detail: spec.detail, world }
}

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
export function stepIntroAttractWorld(w: World, dynamic = false): void {
  if (w.status !== 'play') return
  // The exhibition controller gives the left paddle the same predictive aim
  // as the configured NPC on the right. Standard paddle collision and pane
  // damage still decide every hit; missed paddles can crack the glass.
  const { H } = arenaDims(w)
  const phase = Math.floor(w.realT / 5.5) % 4
  for (const side of [0, 1] as const) {
    const base = aimAtBall(w, side)
    if (!dynamic) {
      // Keep the first-run exhibition gentle and unbroken, exactly as a quiet intro rally.
      issue(w, { k: 'move', side, y: base })
      continue
    }
    const sway = Math.sin(w.realT * (side ? 1.7 : 1.35) + side * 1.4) * H * (phase === 1 ? .19 : phase === 2 ? .38 : .08)
    const miss = phase === 3 && Math.floor(w.realT / 2.2) % 3 === side ? H * .58 : 0
    issue(w, { k: 'move', side, y: clamp(base + sway + miss, -H * .46, H * .46) })
    // Cycle the pinball arm and tilt through real input commands so the showcase
    // demonstrates the same collision response as a player controlled match.
    const armWave = Math.sin(w.realT * 2.3 + side * Math.PI)
    issue(w, { k: 'flip', side, dir: armWave > .2 ? 1 : armWave < -.2 ? -1 : 0 })
    const tiltWave = Math.sin(w.realT * .9 + side)
    issue(w, { k: 'tilt', side, dir: tiltWave > .78 ? 1 : tiltWave < -.78 ? -1 : 0 })
    const activeUntil = side === 0 ? w.manualUntil : w.manualUntil2
    if (w.powerUnlocked && w.tick % 600 === side * 300 && activeUntil <= w.tick) {
      if (side === 0) w.tearsHeld = w.tune.tearsForPower
      else w.tearsHeld2 = w.tune.tearsForPower
      issue(w, { k: 'power', side })
    }
    if (w.tick % 480 === side * 240) issue(w, { k: 'thrust', side, free: true })
  }
  stepWorld(w)
}

