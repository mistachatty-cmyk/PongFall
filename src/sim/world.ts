// PongFall simulation: pure, fixed-timestep, no DOM. The renderer only reads this.
// Arena frame: the arena sits at the origin (y down); the field (walls with eyes)
// scrolls upward past it by `scroll` to read as constant falling.

export const FIELD_HALF = 1100
export const BASE_W = 640
export const BASE_H = 400
export const BASE_PAD = 90
export const MAX_SCALE = 3.4
export const GLASS_MAX_HITS = 3
export const EYE_SLOTS = 6
export const EYE_SPACING = 420
export const EYE_R = 62
export const TEARS_FOR_POWER = 4
const BASE_FALL = 140
const BALL_R = 10
const SERVE_SPEED = 360
const MAX_SPEED = 900
const PADDLE_SPEED = 520
const GOAL_OFFSET = 14

export type SideIndex = 0 | 1
export interface Ball { x: number; y: number; vx: number; vy: number; scored: boolean; age: number; lastHit: -1 | SideIndex }
export interface Side { score: number; glassHits: number; broken: boolean; paddleY: number; targetY: number }
export interface Eye { wall: -1 | 1; slot: number; lid: number; flinch: number }
export interface Tear { x: number; y: number; vy: number; age: number }
export interface Shard { x: number; y: number; vx: number; vy: number; rot: number; vr: number; life: number }
export type WorldEvent =
  | { kind: 'paddle'; side: SideIndex }
  | { kind: 'crack'; side: SideIndex; hits: number; x: number; y: number }
  | { kind: 'break'; side: SideIndex }
  | { kind: 'score'; side: SideIndex }
  | { kind: 'eye'; wall: -1 | 1 }
  | { kind: 'tear' }

export interface Options { target: number; timeLimit: number }
export interface World {
  opts: Options
  status: 'play' | 'over'
  winner: SideIndex | -1 | null
  endReason: 'score' | 'time' | 'grounded' | null
  realT: number; t: number; timeScale: number; slowUntil: number
  scale: number; drawScale: number
  scroll: number
  sides: [Side, Side]
  balls: Ball[]
  eyes: Eye[]
  eyesOpenUntil: number
  tears: Tear[]
  tearsHeld: number
  shards: Shard[]
  serveTimer: number
  serveToward: SideIndex
  crackLook: { x: number; y: number; until: number } | null
  shockUntil: number
  events: WorldEvent[]
  rng: () => number
}

export function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function createWorld(opts: Partial<Options> = {}, seed = 1): World {
  const eyes: Eye[] = []
  for (const wall of [-1, 1] as const)
    for (let slot = 0; slot < EYE_SLOTS; slot++) eyes.push({ wall, slot, lid: 0, flinch: 0 })
  const side = (): Side => ({ score: 0, glassHits: 0, broken: false, paddleY: 0, targetY: 0 })
  return {
    opts: { target: 14, timeLimit: 0, ...opts },
    status: 'play', winner: null, endReason: null,
    realT: 0, t: 0, timeScale: 1, slowUntil: 0,
    scale: 1, drawScale: 1, scroll: 0,
    sides: [side(), side()], balls: [], eyes, eyesOpenUntil: 0,
    tears: [], tearsHeld: 0, shards: [], serveTimer: 1, serveToward: 0,
    crackLook: null, shockUntil: 0, events: [], rng: mulberry32(seed),
  }
}

export function arenaDims(w: World) {
  const s = w.drawScale
  return { W: BASE_W * s, H: BASE_H * (1 + (s - 1) * 0.5), pad: BASE_PAD * (1 + (s - 1) * 0.4) }
}

export function fallSpeed(w: World) {
  return BASE_FALL * Math.min(1, Math.max(0, 1 - (w.scale - 1) / (MAX_SCALE - 1)))
}

/** y of an eye in arena-frame, wrapped around the field period. */
export function eyeY(w: World, e: Eye) {
  const period = EYE_SLOTS * EYE_SPACING
  const raw = e.slot * EYE_SPACING + (e.wall === 1 ? EYE_SPACING / 2 : 0) - w.scroll
  return (((raw + period / 2) % period) + period) % period - period / 2
}

export function eyesOpen(w: World) { return w.realT < w.eyesOpenUntil }

function hitEye(w: World, wall: -1 | 1, y: number) {
  w.eyesOpenUntil = w.realT + 10
  for (const e of w.eyes) if (e.wall === wall && Math.abs(eyeY(w, e) - y) < EYE_R) e.flinch = 1
  w.tears.push({ x: wall * (FIELD_HALF - 40), y, vy: 0, age: 0 })
  w.events.push({ kind: 'eye', wall })
}

function serve(w: World) {
  const dir = w.serveToward === 0 ? -1 : 1
  const a = (w.rng() - 0.5) * 0.8
  w.balls.push({ x: 0, y: 0, vx: Math.cos(a) * SERVE_SPEED * dir, vy: Math.sin(a) * SERVE_SPEED, scored: false, age: 0, lastHit: -1 })
}

function breakGlass(w: World, i: SideIndex, W: number, H: number) {
  const x = (i === 0 ? -1 : 1) * W / 2
  for (let k = 0; k < 28; k++) {
    w.shards.push({ x, y: (w.rng() - 0.5) * H, vx: (w.rng() - 0.5) * 140, vy: (w.rng() - 0.5) * 140, rot: w.rng() * 6, vr: (w.rng() - 0.5) * 4, life: 1 })
  }
  w.slowUntil = w.realT + 0.7
  w.shockUntil = w.realT + 1.4
  w.events.push({ kind: 'break', side: i })
}

function endGame(w: World, reason: World['endReason']) {
  w.status = 'over'
  w.endReason = reason
  const [a, b] = w.sides
  w.winner = a.score === b.score ? -1 : a.score > b.score ? 0 : 1
}

function applyScore(w: World, scorer: SideIndex) {
  w.sides[scorer].score++
  w.scale = scorer === 0 ? Math.min(MAX_SCALE, w.scale + 0.15) : Math.max(1, w.scale - 0.1)
  w.serveToward = scorer === 0 ? 1 : 0
  w.events.push({ kind: 'score', side: scorer })
  if (w.sides[scorer].score >= w.opts.target) endGame(w, 'score')
  else if (w.scale >= MAX_SCALE) endGame(w, 'grounded')
}

export function collectTear(w: World, x: number, y: number, radius = 36) {
  const i = w.tears.findIndex(t => Math.hypot(t.x - x, t.y - y) < radius)
  if (i < 0) return false
  w.tears.splice(i, 1)
  w.tearsHeld = Math.min(TEARS_FOR_POWER, w.tearsHeld + 1)
  w.events.push({ kind: 'tear' })
  return true
}

export function stepWorld(w: World, realDt: number) {
  if (w.status !== 'play') return
  w.realT += realDt
  const slow = w.realT < w.slowUntil ? 0.35 : 1
  w.timeScale += (slow - w.timeScale) * Math.min(1, realDt * 8)
  const dt = realDt * w.timeScale
  w.t += dt
  if (w.opts.timeLimit > 0 && w.t >= w.opts.timeLimit) { endGame(w, 'time'); return }

  w.drawScale += (w.scale - w.drawScale) * Math.min(1, dt * 3)
  w.scroll += fallSpeed(w) * dt
  const { W, H, pad } = arenaDims(w)

  for (const e of w.eyes) {
    e.lid += ((eyesOpen(w) ? 1 : 0) - e.lid) * Math.min(1, dt * 6)
    e.flinch = Math.max(0, e.flinch - dt * 3)
  }

  // paddles
  w.sides.forEach(s => {
    const lim = H / 2 - pad / 2
    const target = Math.max(-lim, Math.min(lim, s.targetY))
    const d = target - s.paddleY
    const m = PADDLE_SPEED * dt
    s.paddleY = Math.abs(d) <= m ? target : s.paddleY + Math.sign(d) * m
  })

  // serve
  if (!w.balls.some(b => !b.scored)) {
    w.serveTimer -= dt
    if (w.serveTimer <= 0) { serve(w); w.serveTimer = 1 }
  }

  for (const b of w.balls) {
    b.age += dt
    const px = b.x, py = b.y
    b.x += b.vx * dt
    b.y += b.vy * dt

    if (Math.abs(b.x) < W / 2 && Math.abs(py) <= H / 2) {
      if (b.y - BALL_R < -H / 2 && b.vy < 0) { b.y = -H / 2 + BALL_R; b.vy = -b.vy }
      else if (b.y + BALL_R > H / 2 && b.vy > 0) { b.y = H / 2 - BALL_R; b.vy = -b.vy }
    }

    for (const i of [0, 1] as const) {
      const s = i === 0 ? -1 : 1
      const side = w.sides[i]
      const padX = s * (W / 2 - 30)
      const inward = -s
      if (b.vx * inward < 0 && Math.abs(b.x - padX) < BALL_R + 7 && Math.abs(b.y - side.paddleY) < pad / 2 + BALL_R) {
        const off = Math.max(-1, Math.min(1, (b.y - side.paddleY) / (pad / 2)))
        const sp = Math.min(MAX_SPEED, Math.hypot(b.vx, b.vy) * 1.05 + 10)
        const a = off * 0.9
        b.vx = inward * Math.cos(a) * sp
        b.vy = Math.sin(a) * sp
        b.x = padX + inward * (BALL_R + 7)
        b.lastHit = i
        w.events.push({ kind: 'paddle', side: i })
      }

      const edge = s * W / 2
      const prevSide = px < edge ? -1 : 1
      if (prevSide !== (b.x < edge ? -1 : 1) && Math.abs(b.y) < H / 2 && !side.broken) {
        b.x = edge + prevSide * BALL_R
        b.vx = -b.vx
        side.glassHits++
        if (side.glassHits >= GLASS_MAX_HITS) {
          side.broken = true
          breakGlass(w, i, W, H)
        } else {
          w.crackLook = { x: edge, y: b.y, until: w.realT + 0.8 }
          w.events.push({ kind: 'crack', side: i, hits: side.glassHits, x: edge, y: b.y })
        }
      }

      if (side.broken) {
        if (!b.scored && s * b.x > W / 2 + GOAL_OFFSET && s * b.vx > 0 && Math.abs(b.y) < H / 2 + 40) {
          b.scored = true
          applyScore(w, (1 - i) as SideIndex)
        } else if (b.scored && Math.abs(b.x) < W / 2 - 10) b.scored = false
      }
    }

    if (Math.abs(b.x) > FIELD_HALF - BALL_R) {
      const wall = Math.sign(b.x) as -1 | 1
      b.x = wall * (FIELD_HALF - BALL_R)
      b.vx = -b.vx
      hitEye(w, wall, b.y)
    }
  }
  w.balls = w.balls.filter(b => Math.abs(b.y) < 1500 && !(b.scored && b.age > 25))

  for (const t of w.tears) {
    t.age += dt
    t.vy += 400 * dt
    t.y += (t.vy - fallSpeed(w)) * dt
  }
  w.tears = w.tears.filter(t => Math.abs(t.y) < 1500 && t.age < 14)

  for (const s of w.shards) {
    s.x += s.vx * dt; s.y += s.vy * dt; s.rot += s.vr * dt
    s.vx *= 1 - dt * 0.8; s.vy *= 1 - dt * 0.8
    s.life = Math.max(0.35, s.life - dt * 0.1)
  }
}
