// PongFall simulation: pure, fixed-timestep, no DOM. The renderer and audio only read this.
// Arena frame: the arena sits at the origin (y down); the field (walls with eyes)
// scrolls upward past it by `scroll` to read as constant falling.

import { DEFAULT_TUNING, FIXED_DT, Tuning } from './tuning'
import { MODES, DEFAULT_MODE, ModeDef } from './data/modes'
import { MODIFIERS } from './data/modifiers'
import { DIFFICULTIES, DEFAULT_DIFFICULTY, DifficultyDef } from './data/difficulty'
import { stepAI } from './ai'
import { shardOrigins, PANE_W } from './glass'

export const FIELD_HALF = 1100
export const BASE_W = 640
export const BASE_H = 400
export const BASE_PAD = 90
export const EYE_SLOTS = 6
export const EYE_SPACING = 420
export const EYE_R = 62
export const BALL_R = 10
const GOAL_OFFSET = 14
const PAD_THICK = 7

export type SideIndex = 0 | 1
export interface Ball { x: number; y: number; vx: number; vy: number; scored: boolean; age: number; lastHit: -1 | SideIndex }
export interface Side { score: number; glassHits: number; broken: boolean; paddleY: number; targetY: number; px: number; pvx: number; vy: number; thrustReadyTick: number; hitYs: number[]; hitTick: number; powerHits: number }
export interface Eye { wall: -1 | 1; slot: number; lid: number; flinch: number }
export interface Tear { x: number; y: number; vx: number; vy: number; age: number }
export interface Shard { x: number; y: number; vx: number; vy: number; rot: number; vr: number; life: number; k: number; size: number }
export interface ArenaBody { x: number; y: number; vx: number; vy: number; ang: number; vang: number }
export interface AIState { target: number; freezeUntil: number; nextThrust: number }
export type WorldEvent =
  | { kind: 'paddle'; side: SideIndex; speed: number; boosted: boolean }
  | { kind: 'wall'; wall: -1 | 1; y: number; speed: number }
  | { kind: 'crack'; side: SideIndex; hits: number; x: number; y: number }
  | { kind: 'break'; side: SideIndex }
  | { kind: 'score'; side: SideIndex }
  | { kind: 'eye'; wall: -1 | 1 }
  | { kind: 'squish'; wall: -1 | 1; y: number }
  | { kind: 'thrust'; side: SideIndex }
  | { kind: 'serve' }
  | { kind: 'tear'; x: number; y: number }
  | { kind: 'slice'; count: number }
  | { kind: 'power'; side: SideIndex; mode: 'manual' | 'assist' | 'lock' | 'end' }
  | { kind: 'boost'; side: SideIndex }
  | { kind: 'unlock' }

/** Player input, stamped with the tick it takes effect on (so runs can be replayed). */
export type Command =
  | { t: number; k: 'move'; side: SideIndex; y: number }
  | { t: number; k: 'tear'; x: number; y: number }
  | { t: number; k: 'slice'; x1: number; y1: number; x2: number; y2: number }
  | { t: number; k: 'thrust'; side: SideIndex }
  | { t: number; k: 'power'; side: SideIndex }
export interface Options { mode?: string; modifiers?: string[]; difficulty?: string; powerUnlocked?: boolean; target?: number; timeLimit?: number }
export interface World {
  mode: ModeDef
  modifiers: string[]
  difficulty: DifficultyDef
  seed: number
  tune: Tuning
  tick: number
  queue: Command[]
  log: Command[]
  opts: { target: number; timeLimit: number }
  status: 'play' | 'over'
  winner: SideIndex | -1 | null
  endReason: 'score' | 'time' | 'grounded' | null
  realT: number; t: number; timeScale: number; slowUntil: number
  scale: number; drawScale: number
  scroll: number; fallV: number
  arena: ArenaBody
  arenaAcc: { x: number; y: number }
  windPhase: [number, number]
  ai: AIState
  powerUnlocked: boolean
  initialUnlocked: boolean
  manualUntil: number
  assistOn: boolean
  npcLocked: boolean
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

export function createWorld(opts: Options = {}, seed = 1): World {
  const mode = MODES[opts.mode ?? DEFAULT_MODE] ?? MODES[DEFAULT_MODE]!
  const modifiers = (opts.modifiers ?? []).filter(m => m in MODIFIERS)
  const difficulty = DIFFICULTIES[opts.difficulty ?? DEFAULT_DIFFICULTY] ?? DIFFICULTIES[DEFAULT_DIFFICULTY]!
  const tune: Tuning = { ...DEFAULT_TUNING, ...mode.tune }
  for (const m of modifiers) Object.assign(tune, MODIFIERS[m]!.tune)
  const eyes: Eye[] = []
  for (const wall of [-1, 1] as const)
    for (let slot = 0; slot < EYE_SLOTS; slot++) eyes.push({ wall, slot, lid: 0, flinch: 0 })
  const side = (): Side => ({ score: 0, glassHits: 0, broken: false, paddleY: 0, targetY: 0, px: 0, pvx: 0, vy: 0, thrustReadyTick: 0, hitYs: [], hitTick: -999, powerHits: 0 })
  const rng = mulberry32(seed)
  const windPhase: [number, number] = [rng() * 6.28, rng() * 6.28]
  return {
    mode, modifiers, difficulty, seed, tune, tick: 0, queue: [], log: [],
    opts: { target: opts.target ?? mode.target, timeLimit: opts.timeLimit ?? mode.timeLimit },
    status: 'play', winner: null, endReason: null,
    realT: 0, t: 0, timeScale: 1, slowUntil: 0,
    scale: 1, drawScale: 1, scroll: 0, fallV: tune.baseFall,
    arena: { x: 0, y: 0, vx: 0, vy: 0, ang: 0, vang: 0 }, arenaAcc: { x: 0, y: 0 }, windPhase,
    ai: { target: 0, freezeUntil: 0, nextThrust: 0 },
    powerUnlocked: opts.powerUnlocked ?? mode.unlimited, initialUnlocked: opts.powerUnlocked ?? mode.unlimited, manualUntil: 0, assistOn: false, npcLocked: false,
    sides: [side(), side()], balls: [], eyes, eyesOpenUntil: 0,
    tears: [], tearsHeld: 0, shards: [], serveTimer: 1, serveToward: 0,
    crackLook: null, shockUntil: 0, events: [], rng,
  }
}

/** Queue player input for the next step; it is also logged for replays. */
export type CommandInput = Command extends infer C ? (C extends Command ? Omit<C, 't'> : never) : never
export function issue(w: World, c: CommandInput) {
  const cmd = { ...c, t: w.tick } as Command
  w.queue.push(cmd)
  w.log.push(cmd)
}

export function arenaDims(w: World) {
  const s = w.drawScale
  return { W: BASE_W * s, H: BASE_H * (1 + (s - 1) * 0.5), pad: BASE_PAD * (1 + (s - 1) * 0.4) }
}

/** Paddle length for a side (the player's is longer on easy tiers). */
export function padLen(w: World, i: SideIndex) {
  const { pad } = arenaDims(w)
  return pad * (i === 0 ? w.difficulty.playerPad : 1)
}

/** Glass hits a side survives. */
export function glassLimit(w: World, i: SideIndex) {
  return w.tune.glassHits + (i === 0 ? w.difficulty.playerGlass : 0)
}

/** Where the fall speed is heading (it eases toward this). */
export function fallSpeed(w: World) {
  return w.tune.baseFall * Math.min(1, Math.max(0, 1 - (w.scale - 1) / (w.tune.maxScale - 1)))
}

/** Wind acceleration along x at the current time; deterministic. */
export function windAt(w: World) {
  const t = w.t
  return w.tune.windStrength * (Math.sin(t * 0.37 + w.windPhase[0]) * 0.6 + Math.sin(t * 0.91 + w.windPhase[1]) * 0.4)
}

/** y of an eye in arena-frame, wrapped around the field period. */
export function eyeY(w: World, e: Eye) {
  const period = EYE_SLOTS * EYE_SPACING
  const raw = e.slot * EYE_SPACING + (e.wall === 1 ? EYE_SPACING / 2 : 0) - w.scroll
  return (((raw + period / 2) % period) + period) % period - period / 2
}

export function eyesOpen(w: World) { return w.realT < w.eyesOpenUntil }

/** 0..1 while a side's thrust is recharging (1 = just fired). */
export function thrustCharge(w: World, i: SideIndex) {
  const left = w.sides[i].thrustReadyTick - w.tick
  return left <= 0 ? 0 : Math.min(1, left / Math.max(1, Math.round(w.tune.thrustCooldown / FIXED_DT)))
}

/** Is a side's Power Paddle armed right now? */
export function powerActive(w: World, i: SideIndex) {
  return i === 1 ? w.npcLocked : (w.tick < w.manualUntil || w.assistOn)
}
/** Seconds left on the player's manually activated Power Paddle (0 if none). */
export function powerLeft(w: World) { return Math.max(0, (w.manualUntil - w.tick) * FIXED_DT) }
/** 'locked' (not unlocked yet), 'charging' (needs tears), 'ready', or 'active'. */
export function powerState(w: World): 'locked' | 'charging' | 'ready' | 'active' {
  if (powerActive(w, 0)) return 'active'
  if (!w.powerUnlocked) return 'locked'
  return w.tearsHeld >= w.tune.tearsForPower ? 'ready' : 'charging'
}

export function activatePower(w: World, i: SideIndex = 0) {
  if (i !== 0 || !w.powerUnlocked || powerActive(w, 0) || w.tearsHeld < w.tune.tearsForPower) return false
  w.tearsHeld -= w.tune.tearsForPower
  w.manualUntil = w.tick + Math.round(w.tune.powerSeconds / FIXED_DT)
  w.sides[0].powerHits = 0
  w.events.push({ kind: 'power', side: 0, mode: 'manual' })
  return true
}

/** Comeback rules, derived purely from the score so replays stay exact. */
function updateComeback(w: World) {
  if (w.mode.unlimited || !w.mode.ai) return
  const lead = w.sides[1].score - w.sides[0].score
  const T = w.tune
  if (!w.npcLocked && lead >= T.lockLead) {
    w.npcLocked = true
    w.assistOn = false
    w.sides[1].powerHits = 0
    w.events.push({ kind: 'power', side: 1, mode: 'lock' })
    return
  }
  if (w.npcLocked || !w.difficulty.assist) return
  if (!w.assistOn && lead >= T.assistLead) {
    w.assistOn = true
    w.sides[0].powerHits = 0
    w.events.push({ kind: 'power', side: 0, mode: 'assist' })
  } else if (w.assistOn && -lead >= T.assistEnd) {
    w.assistOn = false
    w.events.push({ kind: 'power', side: 0, mode: 'end' })
  }
}

function kickArena(w: World, kx: number, ky: number, kang = 0) {
  const a = w.arena
  a.vx += kx; a.vy += ky; a.vang += kang
}

function eyeAt(w: World, wall: -1 | 1, y: number) {
  return w.eyes.find(e => e.wall === wall && Math.abs(eyeY(w, e) - y) < EYE_R)
}

function hitEye(w: World, e: Eye, wall: -1 | 1, y: number) {
  w.eyesOpenUntil = w.realT + 10
  e.flinch = 1
  w.tears.push({ x: wall * (FIELD_HALF - 60), y, vx: -wall * 50, vy: -70, age: 0 })
  w.events.push({ kind: 'eye', wall })
  w.events.push({ kind: 'squish', wall, y })
}

function serve(w: World) {
  const dir = w.serveToward === 0 ? -1 : 1
  const a = (w.rng() - 0.5) * 0.8
  const sp = w.tune.serveSpeed * w.difficulty.serveMult
  w.balls.push({ x: 0, y: 0, vx: Math.cos(a) * sp * dir, vy: Math.sin(a) * sp, scored: false, age: 0, lastHit: -1 })
  w.events.push({ kind: 'serve' })
}

function breakGlass(w: World, i: SideIndex, W: number, H: number) {
  const x = (i === 0 ? -1 : 1) * W / 2
  for (const o of shardOrigins(w.seed, i, w.sides[i].hitYs, H, 36)) {
    const sx = (i === 0 ? 1 : -1)
    w.shards.push({ x: x + o.u * 0.9 * sx, y: o.v, vx: -sx * (20 + (o.k % 90)) + ((o.k >> 3) % 80 - 40), vy: ((o.k >> 5) % 120) - 60, rot: (o.k % 628) / 100, vr: ((o.k >> 7) % 8) - 4, life: 1, k: o.k, size: o.size })
  }
  w.slowUntil = w.realT + 0.7
  w.shockUntil = w.realT + 1.4
  kickArena(w, (i === 0 ? -1 : 1) * w.tune.swayKick * 2, 0, ((w.sides[i].hitYs.length * 37) % 10 - 5) * 0.02)
  w.events.push({ kind: 'break', side: i })
}

function endGame(w: World, reason: World['endReason']) {
  if (w.mode.unlimited) return
  w.status = 'over'
  w.endReason = reason
  const [a, b] = w.sides
  w.winner = a.score === b.score ? -1 : a.score > b.score ? 0 : 1
}

function applyScore(w: World, scorer: SideIndex) {
  w.sides[scorer].score++
  w.scale = scorer === 0 ? Math.min(w.tune.maxScale, w.scale + w.tune.growStep) : Math.max(1, w.scale - w.tune.shrinkStep)
  w.fallV += w.tune.scoreSurge
  kickArena(w, 0, w.tune.swayKick * 1.5)
  w.serveToward = scorer === 0 ? 1 : 0
  w.events.push({ kind: 'score', side: scorer })
  if (w.opts.target > 0 && w.sides[scorer].score >= w.opts.target) endGame(w, 'score')
  else if (w.scale >= w.tune.maxScale) endGame(w, 'grounded')
}

function takeTear(w: World, i: number) {
  const t = w.tears[i]!
  w.tears.splice(i, 1)
  w.tearsHeld = Math.min(w.tune.tearsForPower, w.tearsHeld + 1)
  w.events.push({ kind: 'tear', x: t.x, y: t.y })
  if (!w.powerUnlocked && w.tearsHeld >= w.tune.tearsForPower) { w.powerUnlocked = true; w.events.push({ kind: 'unlock' }) }
}

export function collectTear(w: World, x: number, y: number, radius = w.tune.tearRadius) {
  const i = w.tears.findIndex(t => Math.hypot(t.x - x, t.y - y) < radius)
  if (i < 0) return false
  takeTear(w, i)
  return true
}

function segDist(px: number, py: number, x1: number, y1: number, x2: number, y2: number) {
  const dx = x2 - x1, dy = y2 - y1
  const l2 = dx * dx + dy * dy
  const u = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / l2))
  return Math.hypot(px - (x1 + u * dx), py - (y1 + u * dy))
}

/** Fruit-ninja slice: collects every tear the segment passes close to. Returns how many. */
export function sliceTears(w: World, x1: number, y1: number, x2: number, y2: number) {
  let n = 0
  for (let i = w.tears.length - 1; i >= 0; i--) {
    const t = w.tears[i]!
    if (segDist(t.x, t.y, x1, y1, x2, y2) < w.tune.tearRadius) { takeTear(w, i); n++ }
  }
  if (n) w.events.push({ kind: 'slice', count: n })
  return n
}

/** Lunge the paddle toward the opponent, if it is recharged. */
export function thrust(w: World, i: SideIndex) {
  const s = w.sides[i]
  if (w.tick < s.thrustReadyTick) return false
  s.pvx = w.tune.thrustSpeed
  s.thrustReadyTick = w.tick + Math.round(w.tune.thrustCooldown / FIXED_DT)
  kickArena(w, (i === 0 ? 1 : -1) * w.tune.swayKick * 0.6, 0)
  w.events.push({ kind: 'thrust', side: i })
  return true
}

export function stepWorld(w: World) {
  if (w.status !== 'play') return
  const realDt = FIXED_DT
  for (const c of w.queue) {
    if (c.k === 'move') w.sides[c.side].targetY = c.y
    else if (c.k === 'tear') collectTear(w, c.x, c.y)
    else if (c.k === 'slice') sliceTears(w, c.x1, c.y1, c.x2, c.y2)
    else if (c.k === 'thrust') thrust(w, c.side)
    else activatePower(w, c.side)
  }
  w.queue.length = 0
  updateComeback(w)
  if (w.mode.ai) stepAI(w, 1)
  if (w.manualUntil && w.tick === w.manualUntil) { w.events.push({ kind: 'power', side: 0, mode: 'end' }) }
  w.tick++
  w.realT += realDt
  const slow = w.realT < w.slowUntil ? 0.35 : 1
  w.timeScale += (slow - w.timeScale) * Math.min(1, realDt * 8)
  const dt = realDt * w.timeScale
  w.t += dt
  if (w.opts.timeLimit > 0 && w.t >= w.opts.timeLimit) { endGame(w, 'time'); return }

  w.drawScale += (w.scale - w.drawScale) * Math.min(1, dt * 3)
  w.fallV += (fallSpeed(w) - w.fallV) * Math.min(1, dt * w.tune.fallEase)
  w.scroll += w.fallV * dt
  const { W, H, pad } = arenaDims(w)

  // arena body: a damped spring that impacts shove; loose things feel its acceleration
  const a = w.arena, T = w.tune
  const ovx = a.vx, ovy = a.vy
  a.vx += (-T.swayStiffness * a.x - T.swayDamping * a.vx) * dt
  a.vy += (-T.swayStiffness * a.y - T.swayDamping * a.vy) * dt
  a.vang += (-60 * a.ang - 7 * a.vang) * dt
  a.x += a.vx * dt; a.y += a.vy * dt; a.ang += a.vang * dt
  w.arenaAcc.x = (a.vx - ovx) / dt; w.arenaAcc.y = (a.vy - ovy) / dt
  const wind = windAt(w)

  for (const e of w.eyes) {
    e.lid += ((eyesOpen(w) ? 1 : 0) - e.lid) * Math.min(1, dt * 6)
    e.flinch = Math.max(0, e.flinch - dt * 2.5)
  }

  // paddles: y follows the target, x is the thrust lunge (spring back to rest)
  w.sides.forEach((s, i) => {
    const len = padLen(w, i as SideIndex)
    const lim = H / 2 - len / 2
    const target = Math.max(-lim, Math.min(lim, s.targetY))
    const d = target - s.paddleY
    const sm = i === 1 && w.mode.ai ? w.difficulty.speed : 1
    const m = T.paddleSpeed * sm * dt
    const y0 = s.paddleY
    s.paddleY = Math.abs(d) <= m ? target : s.paddleY + Math.sign(d) * m
    s.vy = (s.paddleY - y0) / dt
    s.pvx += (-100 * s.px - 20 * s.pvx) * dt
    s.px = Math.max(0, s.px + s.pvx * dt)
  })

  // serve
  if (!w.balls.some(b => !b.scored)) {
    w.serveTimer -= dt
    if (w.serveTimer <= 0) { serve(w); w.serveTimer = 1 }
  }

  for (const b of w.balls) {
    b.age += dt
    b.vx -= w.arenaAcc.x * T.ballInertia * dt
    b.vy -= w.arenaAcc.y * T.ballInertia * dt
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
      const len = padLen(w, i)
      const inward = -s
      const padX = s * (W / 2 - 30) + inward * side.px
      if (b.vx * inward < 0 && Math.abs(b.x - padX) < BALL_R + PAD_THICK + Math.abs(side.pvx) * dt && Math.abs(b.y - side.paddleY) < len / 2 + BALL_R) {
        const off = Math.max(-1, Math.min(1, (b.y - side.paddleY) / (len / 2)))
        const hand = Math.max(0, side.pvx) * T.thrustTransfer
        const powered = powerActive(w, i)
        let boosted = false
        if (powered) { side.powerHits++; boosted = side.powerHits % T.powerHits === 0 }
        const cap = T.maxSpeed * (boosted ? 1.25 : 1)
        const sp = Math.min(cap, Math.hypot(b.vx, b.vy) * (1 + T.speedRamp * w.difficulty.rampMult) + 10 + hand + (boosted ? T.powerBoost : 0))
        const ang = off * 0.9
        b.vx = inward * Math.cos(ang) * sp
        b.vy = Math.sin(ang) * sp + (powered ? side.vy * T.powerCarry : 0)
        b.x = padX + inward * (BALL_R + PAD_THICK)
        b.lastHit = i
        kickArena(w, inward * T.swayKick * (sp / 600) * (boosted ? 2 : 1), off * T.swayKick * 0.3, off * 0.04)
        if (boosted) w.events.push({ kind: 'boost', side: i })
        w.events.push({ kind: 'paddle', side: i, speed: sp, boosted })
      }

      const edge = s * W / 2
      const prevSide = px < edge ? -1 : 1
      if (prevSide !== (b.x < edge ? -1 : 1) && Math.abs(b.y) < H / 2 && !side.broken) {
        b.x = edge + prevSide * BALL_R
        b.vx = -b.vx
        side.glassHits++
        side.hitYs.push(b.y)
        side.hitTick = w.tick
        if (side.glassHits >= glassLimit(w, i)) {
          side.broken = true
          breakGlass(w, i, W, H)
        } else {
          w.crackLook = { x: edge, y: b.y, until: w.realT + 0.8 }
          kickArena(w, s * T.swayKick * 0.8, 0)
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
      const speed = Math.hypot(b.vx, b.vy)
      b.x = wall * (FIELD_HALF - BALL_R)
      b.vx = -b.vx
      const eye = eyeAt(w, wall, b.y)
      if (eye) hitEye(w, eye, wall, b.y)
      else w.events.push({ kind: 'wall', wall, y: b.y, speed })
    }
  }
  w.balls = w.balls.filter(b => Math.abs(b.y) < 1500 && !(b.scored && b.age > 25))

  for (const t of w.tears) {
    t.age += dt
    t.vy += T.tearGravity * dt
    t.vx += (wind - w.arenaAcc.x * 0.5) * dt
    t.vy -= w.arenaAcc.y * 0.5 * dt
    t.vx *= 1 - dt * 0.3
    t.x += t.vx * dt
    t.y += (t.vy - w.fallV) * dt
    const lim = FIELD_HALF - 30
    if (Math.abs(t.x) > lim) { t.x = Math.sign(t.x) * lim; t.vx *= -0.4 }
  }
  w.tears = w.tears.filter(t => Math.abs(t.y) < 1500 && t.age < 12)

  for (const s of w.shards) {
    s.vx += (wind * 0.6 - w.arenaAcc.x * 0.8) * dt
    s.vy += -w.arenaAcc.y * 0.8 * dt
    s.x += s.vx * dt; s.y += s.vy * dt; s.rot += s.vr * dt
    s.vx *= 1 - dt * 0.8; s.vy *= 1 - dt * 0.8
    s.life = Math.max(0.35, s.life - dt * 0.1)
  }
}
