// PongFall simulation: pure, fixed-timestep, no DOM. The renderer and audio only read this.
// Arena frame: the arena sits at the origin (y down); the field (walls with eyes)
// scrolls upward past it by `scroll` to read as constant falling.

import * as D from './detmath'
import { DEFAULT_TUNING, FIXED_DT, Tuning } from './tuning'
import { MODES, DEFAULT_MODE, ModeDef } from './data/modes'
import { MODIFIERS } from './data/modifiers'
import { DIFFICULTIES, DEFAULT_DIFFICULTY, DIFFICULTY_ORDER, blendDifficulty, DifficultyDef } from './data/difficulty'
import { stepAI } from './ai'
import { shardOrigins } from './glass'
import { stepSatellites, createSatellites, ballVsSatellites, normalizeArenas, SatHooks, Satellite, SatStray } from './arenas'

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
export interface Ball { x: number; y: number; vx: number; vy: number; scored: boolean; age: number; lastHit: -1 | SideIndex; swipeMod?: number }
export interface Side { score: number; glassHits: number; cracksTaken: number; broken: boolean; brokenEver: boolean; glassBreaksCaused: number; tearsCollected: number; powerBalls: number; paddleSwipes: number; heatSwipes: number; breezeSwipes: number; swipeReadyTick: number; paddleY: number; targetY: number; paddle2Y: number; target2Y: number; vy2: number; px: number; pvx: number; vy: number; thrustReadyTick: number; hitYs: number[]; hitTick: number; powerHits: number; fa: number; fav: number; fdir: -1 | 0 | 1; flipHitTick: number
  ta: number; tdir: -1 | 0 | 1                       // paddle tilt angle (clockwise on screen) and the held tilt key
  grow: number                                       // 0..1 how far the pinball arm has grown out
  aimOn: boolean; aimX: number; aimY: number         // Space held: the arm follows the cursor
  charge: number; relTick: number; relCharge: number // hold charge, and the charge carried by the last release
  stack: number; stackTick: number }                 // timed hits in a row
export interface Eye { wall: -1 | 1; slot: number; lid: number; flinch: number }
export interface Tear { x: number; y: number; vx: number; vy: number; age: number }
/** How far above and below the arena's origin loose glass can go before it bounces. A feature: shards never fall out of view. Changing it changes recorded runs (bump SIM_VERSION). */
export const SHARD_FLOOR = 520
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
  | { kind: 'ballSwipe'; side: SideIndex; dir: -1 | 1; level: number }
  | { kind: 'unload'; side: SideIndex }
  | { kind: 'unlock' }
  | { kind: 'triple' }
  | { kind: 'satHit'; id: number }
  | { kind: 'satBreak'; id: number }
  | { kind: 'bump'; level: number }
  | { kind: 'weather'; tears: number }

/** Player input, stamped with the tick it takes effect on (so runs can be replayed). */
export type LabOp = 'ball' | 'tear' | 'heal' | 'power' | 'clearBalls' | 'fall' | 'ballSpeed' | 'tearGravity'
export type Command =
  | { t: number; k: 'move'; side: SideIndex; y: number; paddle?: 0 | 1 }
  | { t: number; k: 'tear'; side?: SideIndex; x: number; y: number }
  | { t: number; k: 'slice'; side?: SideIndex; x1: number; y1: number; x2: number; y2: number }
  | { t: number; k: 'swipe'; side: SideIndex; dir: -1 | 1; x: number; y: number }
  | { t: number; k: 'thrust'; side: SideIndex; free?: boolean }   // free: letting go of Space always lunges, even while recharging
  | { t: number; k: 'power'; side: SideIndex }
  | { t: number; k: 'flip'; side: SideIndex; dir: -1 | 0 | 1 }
  | { t: number; k: 'tilt'; side: SideIndex; dir: -1 | 0 | 1 }                        // -1 counter-clockwise, 1 clockwise, 0 released
  | { t: number; k: 'aim'; side: SideIndex; on: boolean; x: number; y: number }       // Space held / released, with the cursor in arena coordinates
  | { t: number; k: 'lab'; op: LabOp; v?: number }                                       // sandbox tools (ignored in every other mode)
  | { t: number; k: 'overtime' }                                                       // accept the one post-win Power Mode overtime
export interface Options { mode?: string; modifiers?: string[]; difficulty?: string; powerUnlocked?: boolean; flux?: boolean; arenas?: number; target?: number; timeLimit?: number; duoOpponent?: 'cpu' | 'local' }
export interface World {
  mode: ModeDef
  modifiers: string[]
  difficulty: DifficultyDef
  seed: number
  tune: Tuning
  tick: number
  queue: Command[]
  log: Command[]
  opts: { target: number; timeLimit: number; duoOpponent?: 'cpu' | 'local' }
  initialOpts: { target: number; timeLimit: number; duoOpponent?: 'cpu' | 'local' }
  duoOpponent: 'cpu' | 'local'
  flux: boolean               // NPC skill and paddle size drift over time (never ranked)
  status: 'play' | 'over'
  winner: SideIndex | -1 | null
  endReason: 'score' | 'time' | 'grounded' | null
  overtime: boolean
  realT: number; t: number; timeScale: number; slowUntil: number
  scale: number; drawScale: number
  scroll: number; fallV: number
  arena: ArenaBody
  arenaAcc: { x: number; y: number }
  windPhase: [number, number]
  ventSide: -1 | 1
  ventY: number
  ventTimer: number
  ventPhase: number
  eyeWeatherTimer: number
  ai: AIState
  arenaCount: number
  sats: Satellite[]
  satStrays: SatStray[]
  satSaved: number
  satFallen: number
  srng: () => number
  powerUnlocked: boolean
  initialUnlocked: boolean
  manualUntil: number
  manualUntil2: number
  assistOn: boolean
  npcLocked: boolean
  sides: [Side, Side]
  balls: Ball[]
  eyes: Eye[]
  eyesOpenUntil: number
  eyesPeekUntil: number
  eyeHits: number
  tears: Tear[]
  tearsHeld: number
  tearsHeld2: number
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
  const side = (): Side => ({ score: 0, glassHits: 0, cracksTaken: 0, broken: false, brokenEver: false, glassBreaksCaused: 0, tearsCollected: 0, powerBalls: 0, paddleSwipes: 0, heatSwipes: 0, breezeSwipes: 0, swipeReadyTick: 0, paddleY: 0, targetY: 0, paddle2Y: 72, target2Y: 72, vy2: 0, px: 0, pvx: 0, vy: 0, thrustReadyTick: 0, hitYs: [], hitTick: -999, powerHits: 0, fa: 0, fav: 0, fdir: 0, flipHitTick: -999, ta: 0, tdir: 0, grow: 0, aimOn: false, aimX: 0, aimY: 0, charge: 0, relTick: -999, relCharge: 0, stack: 0, stackTick: -9999 })
  const rng = mulberry32(seed)
  const arenaCount = normalizeArenas(opts.arenas)
  const windPhase: [number, number] = [rng() * 6.28, rng() * 6.28]
  const hasVents = (opts.modifiers ?? []).includes('wind-vents')
  const ventSide: -1 | 1 = hasVents && rng() < 0.5 ? -1 : 1
  const ventY = hasVents ? (rng() - 0.5) * BASE_H * 0.9 : 0
  const ventPhase = hasVents ? rng() * 6.28 : 0
  const eyeWeatherTimer = modifiers.includes('eye-weather') ? 12 + rng() * 6 : 0
  const duoOpponent: 'cpu' | 'local' = mode.id === 'duo-fall' && opts.duoOpponent === 'local' ? 'local' : 'cpu'
  const matchOpts = { target: opts.target ?? mode.target, timeLimit: opts.timeLimit ?? mode.timeLimit, ...(mode.id === 'duo-fall' ? { duoOpponent } : {}) }
  return {
    mode, modifiers, difficulty, seed, tune, tick: 0, queue: [], log: [], duoOpponent,
    opts: { ...matchOpts }, initialOpts: matchOpts, flux: !!opts.flux,
    status: 'play', winner: null, endReason: null, overtime: false,
    realT: 0, t: 0, timeScale: 1, slowUntil: 0,
    scale: 1, drawScale: 1, scroll: 0, fallV: tune.baseFall,
    arena: { x: 0, y: 0, vx: 0, vy: 0, ang: 0, vang: 0 }, arenaAcc: { x: 0, y: 0 }, windPhase, ventSide, ventY, ventTimer: hasVents ? 4 + rng() * 3 : 0, ventPhase, eyeWeatherTimer,
    ai: { target: 0, freezeUntil: 0, nextThrust: 0 },
    arenaCount, sats: createSatellites(arenaCount, mulberry32((seed ^ 0xa5a5a5) >>> 0), BASE_W, BASE_H), satStrays: [], satSaved: 0, satFallen: 0, srng: mulberry32((seed ^ 0x5eed5) >>> 0),
    powerUnlocked: opts.powerUnlocked ?? mode.unlimited, initialUnlocked: opts.powerUnlocked ?? mode.unlimited, manualUntil: 0, manualUntil2: 0, assistOn: false, npcLocked: false,
    sides: [side(), side()], balls: [], eyes, eyesOpenUntil: 0, eyesPeekUntil: 0, eyeHits: 0,
    tears: [], tearsHeld: 0, tearsHeld2: 0, shards: [], serveTimer: 1, serveToward: 0,
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
  const joined = w.mode.id === 'duo-fall'
  return { W: BASE_W * (joined ? 1.6 : 1) * s, H: BASE_H * (joined ? 1.35 : 1) * (1 + (s - 1) * 0.5), pad: BASE_PAD * (joined ? 1.1 : 1) * (1 + (s - 1) * 0.4) }
}

/** Whether side 1 is controlled by the simulation instead of a local player. */
export function hasCpuOpponent(w: World) { return w.mode.ai && !(w.mode.id === 'duo-fall' && w.duoOpponent === 'local') }

/** Paddle length for a side (the player's is longer on easy tiers). */
export function padLen(w: World, i: SideIndex) {
  const { pad } = arenaDims(w)
  return pad * (i === 0 ? w.difficulty.playerPad : fluxScale(w, w.windPhase[1] + 1.3))
}

/** The NPC's skill right now: its tier, or with Flux on a slow drift across all four tiers. */
export function npcDifficulty(w: World): DifficultyDef {
  if (!w.flux) return w.difficulty
  const x = (0.5 + 0.5 * D.sin(w.t * 0.11 + w.windPhase[0])) * (DIFFICULTY_ORDER.length - 1)
  const i = Math.min(DIFFICULTY_ORDER.length - 2, Math.floor(x))
  return blendDifficulty(DIFFICULTIES[DIFFICULTY_ORDER[i]!]!, DIFFICULTIES[DIFFICULTY_ORDER[i + 1]!]!, x - i)
}
/** Flux paddle size multiplier (0.75 to 1.35) for a side of the main arena or a satellite side. */
export function fluxScale(w: World, phase: number) { return w.flux ? 1.05 + 0.3 * D.sin(w.t * 0.23 + phase) : 1 }

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
  return w.tune.windStrength * (D.sin(t * 0.37 + w.windPhase[0]) * 0.6 + D.sin(t * 0.91 + w.windPhase[1]) * 0.4)
}

export function windVentAt(w: World, x: number, y: number) {
  if (!w.modifiers.includes('wind-vents')) return 0
  const { W } = arenaDims(w)
  const vertical = Math.max(0, 1 - Math.abs(y - w.ventY) / 190)
  const sideWeight = Math.max(0.12, Math.min(1, (W / 2 + w.ventSide * x) / W))
  const pulse = 0.15 + 0.85 * Math.max(0, D.sin(w.t * 1.55 + w.ventPhase))
  return -w.ventSide * 520 * vertical * sideWeight * pulse
}

export function stepWindVents(w: World, dt: number) {
  if (!w.modifiers.includes('wind-vents')) return
  w.ventTimer -= dt
  if (w.ventTimer > 0) return
  w.ventSide = w.rng() < 0.5 ? -1 : 1
  w.ventY = (w.rng() - 0.5) * BASE_H * 0.9
  w.ventPhase = w.rng() * 6.28
  w.ventTimer = 4 + w.rng() * 4
}

/** Seeded environmental event: the shaft eyes wake and release three collectible tears. */
export function stepEyeWeather(w: World, dt: number) {
  if (!w.modifiers.includes('eye-weather')) return
  w.eyeWeatherTimer -= dt
  if (w.eyeWeatherTimer > 0) return
  const { W, H } = arenaDims(w)
  w.eyesOpenUntil = Math.max(w.eyesOpenUntil, w.realT + 3.2)
  w.eyesPeekUntil = 0
  for (let i = 0; i < 3; i++) {
    w.tears.push({ x: (w.rng() - 0.5) * W * 0.72, y: -H / 2 - 24 - i * 18, vx: (w.rng() - 0.5) * 90, vy: 70 + w.rng() * 24, age: 0 })
  }
  w.events.push({ kind: 'weather', tears: 3 })
  w.eyeWeatherTimer = 21 + w.rng() * 9
}

/** y of an eye in arena-frame, wrapped around the field period. */
export function eyeY(w: World, e: Eye) {
  const period = EYE_SLOTS * EYE_SPACING
  const raw = e.slot * EYE_SPACING + (e.wall === 1 ? EYE_SPACING / 2 : 0) - w.scroll
  return (((raw + period / 2) % period) + period) % period - period / 2
}

export function eyesOpen(w: World) { return w.realT < w.eyesOpenUntil }
/** The wall eyes stay fully shut for the first minute: a second hit only makes them peek, a third (or any hit after the minute) opens them. */
export function eyesPeeking(w: World) { return w.realT < w.eyesPeekUntil && !eyesOpen(w) }

/** 0..1 while a side's thrust is recharging (1 = just fired). */
export function thrustCharge(w: World, i: SideIndex) {
  const left = w.sides[i].thrustReadyTick - w.tick
  return left <= 0 ? 0 : Math.min(1, left / Math.max(1, Math.round(w.tune.thrustCooldown / FIXED_DT)))
}

/** Is a side's Power Paddle armed right now? */
export function powerActive(w: World, i: SideIndex) {
  return i === 1 ? (w.npcLocked || w.sides[1].broken || w.tick < w.manualUntil2) : (w.tick < w.manualUntil || w.assistOn || w.powerUnlocked)
}
/** Seconds left on the player's manually activated Power Paddle (0 if none). */
export function powerLeft(w: World, i: SideIndex = 0) { return Math.max(0, ((i === 0 ? w.manualUntil : w.manualUntil2) - w.tick) * FIXED_DT) }
/** 'charging' (collecting tears), 'ready' (enough tears: press E), or 'active'. Breaking your own glass is an optional shortcut that keeps the arm out for good. */
export function powerState(w: World, i: SideIndex = 0): 'locked' | 'charging' | 'ready' | 'active' {
  if (powerActive(w, i)) return 'active'
  return (i === 0 ? w.tearsHeld : w.tearsHeld2) >= w.tune.tearsForPower ? 'ready' : 'charging'
}

export function activatePower(w: World, i: SideIndex = 0) {
  if (powerActive(w, i) || (i === 0 ? w.tearsHeld : w.tearsHeld2) < w.tune.tearsForPower) return false
  if (i === 0) { w.tearsHeld -= w.tune.tearsForPower; w.manualUntil = w.tick + Math.round(w.tune.powerSeconds / FIXED_DT) }
  else { w.tearsHeld2 -= w.tune.tearsForPower; w.manualUntil2 = w.tick + Math.round(w.tune.powerSeconds / FIXED_DT) }
  w.sides[i].powerHits = 0
  w.events.push({ kind: 'power', side: i, mode: 'manual' })
  return true
}

/** Comeback rules, derived purely from the score so replays stay exact. */
function updateComeback(w: World) {
  if (w.mode.unlimited || !hasCpuOpponent(w)) return
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

/** An impulse (jx, jy) applied to the arena body at local point (px, py): it shoves and, off-centre, rocks it. */
function jolt(w: World, px: number, py: number, jx: number, jy: number) {
  const a = w.arena
  a.vx += jx; a.vy += jy
  a.vang += (px * jy - py * jx) * w.tune.rockTorque
}

/** A ball (yours or a stray from another arena) hits the intact pane of side i at height y. */
function damagePane(w: World, i: SideIndex, y: number, W: number, H: number) {
  const side = w.sides[i]
  const s = i === 0 ? -1 : 1
  side.glassHits++
  side.cracksTaken++
  side.hitYs.push(y)
  side.hitTick = w.tick
  if (side.glassHits >= glassLimit(w, i)) {
    side.broken = true; side.brokenEver = true
    if (i === 0 && !w.powerUnlocked) { w.powerUnlocked = true; w.events.push({ kind: 'unlock' }) }
    breakGlass(w, i, W, H)
  } else {
    w.crackLook = { x: s * W / 2, y, until: w.realT + 0.8 }
    jolt(w, s * W / 2, y, s * w.tune.swayKick * 0.8, 0)
    w.events.push({ kind: 'crack', side: i, hits: side.glassHits, x: s * W / 2, y })
  }
}

function satHooks(w: World, W: number, H: number): SatHooks {
  return {
    hitPlayerPane: (i, y) => damagePane(w, i, y, W, H),
    playerPaneIntact: i => !w.sides[i].broken,
    triple() {
      w.events.push({ kind: 'triple' })
      for (let k = 0; k < 3; k++) w.tears.push({ x: (w.srng() - 0.5) * W * 0.6, y: -H / 2 - 20, vx: (w.srng() - 0.5) * 80, vy: 40, age: 0 })
      for (let k = 0; k < 3 && w.status === 'play'; k++) applyScore(w, 0)
    },
    emit: e => { w.events.push(e) },
  }
}

function eyeAt(w: World, wall: -1 | 1, y: number) {
  return w.eyes.find(e => e.wall === wall && Math.abs(eyeY(w, e) - y) < EYE_R)
}

function hitEye(w: World, e: Eye, wall: -1 | 1, y: number) {
  w.eyeHits++
  if (w.t < w.tune.eyeSleepSeconds && w.eyeHits < 3) {
    if (w.eyeHits === 2) w.eyesPeekUntil = w.realT + w.tune.eyePeekSeconds
  } else w.eyesOpenUntil = w.realT + 10
  e.flinch = 1
  w.tears.push({ x: wall * (FIELD_HALF - 60), y, vx: -wall * 50, vy: -70, age: 0 })
  w.events.push({ kind: 'eye', wall })
  w.events.push({ kind: 'squish', wall, y })
}

/** Sandbox tools. Every effect is deterministic (the world's own rng) so a sandbox replay still reproduces. Does nothing outside the sandbox. */
function labCommand(w: World, c: { op: LabOp; v?: number }) {
  if (w.mode.id !== 'sandbox') return
  const { W, H } = arenaDims(w)
  const v = typeof c.v === 'number' && Number.isFinite(c.v) ? c.v : 1
  const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x))
  if (c.op === 'ball') {
    if (w.balls.length >= 8) return
    const a = w.rng() * Math.PI * 2, sp = w.tune.serveSpeed
    w.balls.push({ x: 0, y: (w.rng() - 0.5) * H * 0.5, vx: D.cos(a) * sp, vy: D.sin(a) * sp, scored: false, age: 0, lastHit: -1, swipeMod: 0 })
  } else if (c.op === 'tear') {
    w.tears.push({ x: (w.rng() - 0.5) * W * 0.72, y: -H / 2 - 24, vx: (w.rng() - 0.5) * 90, vy: 70 + w.rng() * 24, age: 0 })
  } else if (c.op === 'heal') {
    for (const side of w.sides) { side.glassHits = 0; side.broken = false; side.hitYs = [] }
  } else if (c.op === 'power') {
    w.powerUnlocked = true
  } else if (c.op === 'clearBalls') {
    w.balls.length = Math.min(w.balls.length, 1)
  } else if (c.op === 'fall') {
    w.tune.baseFall = DEFAULT_TUNING.baseFall * clamp(v, 0, 3)
  } else if (c.op === 'ballSpeed') {
    const k = clamp(v, 0.5, 2)
    w.tune.serveSpeed = DEFAULT_TUNING.serveSpeed * k; w.tune.maxSpeed = DEFAULT_TUNING.maxSpeed * k
  } else if (c.op === 'tearGravity') {
    w.tune.tearGravity = DEFAULT_TUNING.tearGravity * clamp(v, 0, 3)
  }
}

function serve(w: World) {
  const dir = w.serveToward === 0 ? -1 : 1
  const a = (w.rng() - 0.5) * 0.8
  const sp = w.tune.serveSpeed * w.difficulty.serveMult
  w.balls.push({ x: 0, y: 0, vx: D.cos(a) * sp * dir, vy: D.sin(a) * sp, scored: false, age: 0, lastHit: -1, swipeMod: 0 })
  w.events.push({ kind: 'serve' })
}

function breakGlass(w: World, i: SideIndex, W: number, H: number) {
  w.sides[i === 0 ? 1 : 0].glassBreaksCaused++
  const x = (i === 0 ? -1 : 1) * W / 2
  for (const o of shardOrigins(w.seed, i, w.sides[i].hitYs, H, 36)) {
    const sx = (i === 0 ? 1 : -1)
    w.shards.push({ x: x + o.u * 0.9 * sx, y: o.v, vx: -sx * (20 + (o.k % 90)) + ((o.k >> 3) % 80 - 40), vy: ((o.k >> 5) % 120) - 60, rot: (o.k % 628) / 100, vr: ((o.k >> 7) % 8) - 4, life: 1, k: o.k, size: o.size })
  }
  w.slowUntil = w.realT + 0.7
  w.shockUntil = w.realT + 1.4
  jolt(w, x, w.sides[i].hitYs[w.sides[i].hitYs.length - 1] ?? 0, (i === 0 ? -1 : 1) * w.tune.swayKick * 2, 0)
  w.events.push({ kind: 'break', side: i })
}

function endGame(w: World, reason: World['endReason']) {
  if (w.mode.unlimited) return
  w.status = 'over'
  w.endReason = reason
  const [a, b] = w.sides
  w.winner = reason === 'grounded' ? 0 : a.score === b.score ? -1 : a.score > b.score ? 0 : 1
}

/** Start the single first-to-six Power Mode overtime after a score win. The transition is logged as input. */
function beginOvertime(w: World): boolean {
  if (!hasCpuOpponent(w) || w.overtime || w.endReason !== 'score' || w.winner !== 0) return false
  w.overtime = true
  w.status = 'play'; w.winner = null; w.endReason = null
  w.sides[0].score = 0; w.sides[1].score = 0
  for (const side of w.sides) {
    side.glassHits = 0; side.broken = false; side.hitYs.length = 0; side.hitTick = -999
    side.paddleY = 0; side.targetY = 0; side.paddle2Y = 0; side.target2Y = 0; side.vy2 = 0; side.px = 0; side.pvx = 0; side.vy = 0
    side.thrustReadyTick = 0; side.powerHits = 0; side.fa = 0; side.fav = 0; side.fdir = 0
    side.flipHitTick = -999
    side.ta = 0; side.tdir = 0; side.grow = 0; side.aimOn = false; side.charge = 0
    side.relTick = -999; side.relCharge = 0; side.stack = 0; side.stackTick = -9999
  }
  w.opts.target = 6; w.opts.timeLimit = 0
  w.scale = Math.min(w.scale, 1.65); w.drawScale = w.scale
  Object.assign(w.tune, {
    growStep: 0.43, shrinkStep: 0.48, scoreSurge: 260,
    serveSpeed: 520, maxSpeed: 1380, speedRamp: 0.105, paddleSpeed: 620,
  })
  w.powerUnlocked = true; w.manualUntil = 0; w.manualUntil2 = 0
  w.assistOn = false; w.npcLocked = false; w.ai.target = 0; w.ai.freezeUntil = 0; w.ai.nextThrust = 0
  w.serveTimer = 0.7; w.serveToward = 1
  w.balls.length = 0; w.tears.length = 0; w.shards.length = 0; w.tearsHeld = 0; w.tearsHeld2 = 0
  w.queue.length = 0
  return true
}

function applyScore(w: World, scorer: SideIndex) {
  w.sides[scorer].score++
  w.scale = scorer === 0 ? Math.min(w.tune.maxScale, w.scale + w.tune.growStep) : Math.max(w.overtime ? 0.5 : 1, w.scale - w.tune.shrinkStep)
  w.fallV += w.tune.scoreSurge
  kickArena(w, 0, w.tune.swayKick * 1.5)
  w.serveToward = scorer === 0 ? 1 : 0
  w.events.push({ kind: 'score', side: scorer })
  if (w.opts.target > 0 && w.sides[scorer].score >= w.opts.target) {
    if (w.overtime && scorer === 0) { w.scale = w.tune.maxScale; endGame(w, 'grounded') }
    else endGame(w, 'score')
  }
  else if (w.scale >= w.tune.maxScale) endGame(w, 'grounded')
}

function takeTear(w: World, i: number, side: SideIndex = 0) {
  const t = w.tears[i]!
  w.tears.splice(i, 1)
  if (side === 0) w.tearsHeld = Math.min(w.tune.tearsForPower, w.tearsHeld + 1)
  else w.tearsHeld2 = Math.min(w.tune.tearsForPower, w.tearsHeld2 + 1)
  w.sides[side].tearsCollected++
  w.events.push({ kind: 'tear', x: t.x, y: t.y })
}

export function collectTear(w: World, x: number, y: number, radius = w.tune.tearRadius, side: SideIndex = 0) {
  const i = w.tears.findIndex(t => D.hypot(t.x - x, t.y - y) < radius)
  if (i < 0) return false
  takeTear(w, i, side)
  return true
}

function segDist(px: number, py: number, x1: number, y1: number, x2: number, y2: number) {
  const dx = x2 - x1, dy = y2 - y1
  const l2 = dx * dx + dy * dy
  const u = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / l2))
  return D.hypot(px - (x1 + u * dx), py - (y1 + u * dy))
}

/** Fruit-ninja slice: collects every tear the segment passes close to. Returns how many. */
export function sliceTears(w: World, x1: number, y1: number, x2: number, y2: number, side: SideIndex = 0) {
  let n = 0
  for (let i = w.tears.length - 1; i >= 0; i--) {
    const t = w.tears[i]!
    if (segDist(t.x, t.y, x1, y1, x2, y2) < w.tune.tearRadius) { takeTear(w, i, side); n++ }
  }
  if (n) w.events.push({ kind: 'slice', count: n })
  return n
}

/** A deliberate ball swipe changes speed slightly; this state is replayed and networked like other inputs. */
function swipeBall(w: World, side: SideIndex, dir: -1 | 1, x: number, y: number) {
  const stats = w.sides[side]
  if (w.tick < stats.swipeReadyTick) return false
  const ball = w.balls.filter(b => !b.scored).sort((a, b) => D.hypot(a.x - x, a.y - y) - D.hypot(b.x - x, b.y - y))[0]
  if (!ball || D.hypot(ball.x - x, ball.y - y) > 56) return false
  const old = ball.swipeMod ?? 0
  const next = Math.max(-0.09, Math.min(0.12, old + (dir < 0 ? 0.03 : -0.03)))
  if (next === old) return false
  const speedRatio = (1 + next) / (1 + old)
  ball.vx *= speedRatio; ball.vy *= speedRatio; ball.swipeMod = next
  stats.paddleSwipes++
  stats.swipeReadyTick = w.tick + Math.round(0.25 / FIXED_DT)
  if (dir < 0) stats.heatSwipes++; else stats.breezeSwipes++
  w.events.push({ kind: 'ballSwipe', side, dir, level: Math.round(next * 1000) / 1000 })
  return true
}

function decaySwipeSpeed(ball: Ball, dt: number) {
  const old = ball.swipeMod ?? 0
  if (!old) return
  const next = Math.abs(old) <= 0.025 * dt ? 0 : old - Math.sign(old) * 0.025 * dt
  const ratio = (1 + next) / (1 + old)
  ball.vx *= ratio; ball.vy *= ratio; ball.swipeMod = next
}

/** Lunge the paddle toward the opponent, if it is recharged (or `free`, which ignores the recharge). */
export function thrust(w: World, i: SideIndex, free = false) {
  const s = w.sides[i]
  if (!free && w.tick < s.thrustReadyTick) return false
  s.pvx = w.tune.thrustSpeed
  s.thrustReadyTick = w.tick + Math.round(w.tune.thrustCooldown / FIXED_DT)
  jolt(w, (i === 0 ? -1 : 1) * (arenaDims(w).W / 2 - 30), s.paddleY, (i === 0 ? 1 : -1) * w.tune.swayKick * 0.6, 0)
  w.events.push({ kind: 'thrust', side: i })
  return true
}

/** Reach of the pinball arm: it grows and shrinks with your personal arena. */
export function armLen(w: World) { return w.tune.armLength * w.drawScale }

/**
 * The pinball arm: a bar hinged at the paddle's centre that extends horizontally into the arena and swats up/down.
 * It is a separate body from the paddle. Whatever it strikes is knocked upward hard.
 */
function armHit(w: World, i: SideIndex, b: Ball, padX: number, inward: number) {
  const side = w.sides[i], T = w.tune
  const L = armLen(w) * side.grow
  const ca = D.cos(side.fa), sa = D.sin(side.fa)            // fa > 0: tip swung up (screen y negative)
  const hx = padX, hy = side.paddleY
  const dx = inward * L * ca, dy = -L * sa
  const l2 = dx * dx + dy * dy
  const t = Math.max(0, Math.min(1, ((b.x - hx) * dx + (b.y - hy) * dy) / l2))
  const cx = hx + dx * t, cy = hy + dy * t
  const ex = b.x - cx, ey = b.y - cy
  const d = D.hypot(ex, ey)
  if (d > BALL_R + PAD_THICK) return false
  const nx = d > 1e-6 ? ex / d : 0, ny = d > 1e-6 ? ey / d : -1
  const r = t * L
  const vsx = -side.fav * r * inward * sa, vsy = -side.fav * r * ca       // surface velocity at the contact point
  const vn = (b.vx - vsx) * nx + (b.vy - vsy) * ny
  if (vn >= 0) return false
  const e = T.flipRestitution
  b.vx -= (1 + e) * vn * nx; b.vy -= (1 + e) * vn * ny
  b.x = cx + nx * (BALL_R + PAD_THICK + 0.5); b.y = cy + ny * (BALL_R + PAD_THICK + 0.5)
  let boosted = false
  const fresh = w.tick - side.flipHitTick > 12
  if (powerActive(w, i) && fresh) { side.powerHits++; boosted = side.powerHits % T.powerHits === 0 }
  side.flipHitTick = w.tick
  // a hit within a moment of letting go of Space is timed: the charge stacks into extra speed
  let extra = 0
  if (w.tick - side.relTick <= Math.round(T.armReleaseWindow / FIXED_DT) && side.relCharge > 0.15) {
    if (w.tick - side.stackTick > Math.round(4 / FIXED_DT)) side.stack = 0
    side.stack = Math.min(T.armStackMax, side.stack + 1); side.stackTick = w.tick
    extra = side.relCharge * T.armChargeBoost * (1 + 0.5 * (side.stack - 1))
    side.relCharge = 0
    boosted = true
  }
  const cur = Math.max(1, D.hypot(b.vx, b.vy))
  const sp = Math.min(T.maxSpeed * (boosted ? 1.25 : 1), cur * (1 + T.speedRamp * w.difficulty.rampMult) + T.armLift + (boosted ? T.powerBoost : 0) + extra)
  b.vx *= sp / cur; b.vy *= sp / cur
  if (b.vy > -sp * 0.6) { b.vy = -sp * 0.6; b.vx = Math.sign(b.vx || inward) * Math.sqrt(Math.max(0, sp * sp - b.vy * b.vy)) }   // always knocked up
  if (side.fdir === 0 && Math.abs(side.fav) > 0.5) {
    // released: the arm snaps back and fires the ball forward ("power hit unloaded")
    b.vx += inward * T.unloadForward
    w.events.push({ kind: 'unload', side: i })
  }
  b.lastHit = i
  jolt(w, padX, b.y, inward * T.swayKick * (sp / 600) * (boosted ? 2 : 1), -T.swayKick * 0.5)
  if (boosted) { side.powerBalls++; w.events.push({ kind: 'boost', side: i }) }
  if (fresh) w.events.push({ kind: 'paddle', side: i, speed: sp, boosted })
  return true
}

function aimCommand(w: World, c: { side: SideIndex; on: boolean; x: number; y: number }) {
  const s = w.sides[c.side]
  if (c.on) {
    if (s.grow < 0.5) return                       // the arm has to have grown out first
    if (!s.aimOn) s.charge = 0
    s.aimOn = true; s.aimX = c.x; s.aimY = c.y
  } else if (s.aimOn) {
    s.aimOn = false
    s.relTick = w.tick; s.relCharge = s.charge; s.charge = 0
  }
}

export function stepWorld(w: World) {
  if (w.status === 'over') {
    if (!w.queue.some(c => c.k === 'overtime') || !beginOvertime(w)) return
  }
  if (w.status !== 'play') return
  const realDt = FIXED_DT
  for (const c of w.queue) {
    if (c.k === 'move') {
      const side = w.sides[c.side]
      if (w.mode.id === 'duo-fall' && c.paddle === 1) side.target2Y = c.y
      else if (w.mode.id === 'duo-fall' && c.paddle === 0) side.targetY = c.y
      else { side.targetY = c.y; if (w.mode.id === 'duo-fall') side.target2Y = c.y }
    }
    else if (c.k === 'tear') collectTear(w, c.x, c.y, w.tune.tearRadius, c.side ?? 0)
    else if (c.k === 'slice') sliceTears(w, c.x1, c.y1, c.x2, c.y2, c.side ?? 0)
    else if (c.k === 'swipe') swipeBall(w, c.side, c.dir, c.x, c.y)
    else if (c.k === 'thrust') thrust(w, c.side, c.free)
    else if (c.k === 'power') activatePower(w, c.side)
    else if (c.k === 'tilt') w.sides[c.side].tdir = c.dir
    else if (c.k === 'aim') aimCommand(w, c)
    else if (c.k === 'overtime') continue
    else if (c.k === 'lab') labCommand(w, c)
    else w.sides[c.side].fdir = c.dir
  }
  w.queue.length = 0
  updateComeback(w)
  if (hasCpuOpponent(w)) stepAI(w, 1)
  if (hasCpuOpponent(w) && w.mode.id === 'duo-fall') w.sides[1].target2Y = w.sides[1].targetY
  if (w.manualUntil && w.tick === w.manualUntil) { w.events.push({ kind: 'power', side: 0, mode: 'end' }) }
  if (w.manualUntil2 && w.tick === w.manualUntil2) { w.events.push({ kind: 'power', side: 1, mode: 'end' }) }
  w.tick++
  w.realT += realDt
  const slow = w.realT < w.slowUntil ? 0.35 : 1
  w.timeScale += (slow - w.timeScale) * Math.min(1, realDt * 8)
  const dt = realDt * w.timeScale
  w.t += dt
  stepWindVents(w, dt)
  stepEyeWeather(w, dt)
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
  a.vang += (-T.rockStiffness * a.ang - T.rockDamping * a.vang) * dt
  a.x += a.vx * dt; a.y += a.vy * dt; a.ang += a.vang * dt
  if (Math.abs(a.ang) > 0.4) { a.ang = Math.sign(a.ang) * 0.4; a.vang *= -0.3 }
  w.arenaAcc.x = (a.vx - ovx) / dt; w.arenaAcc.y = (a.vy - ovy) / dt
  const hooks = satHooks(w, W, H)
  if (w.sats.length || w.satStrays.length) stepSatellites(w, dt, hooks, W, H, FIELD_HALF)
  const wind = windAt(w)

  for (const e of w.eyes) {
    e.lid += ((eyesOpen(w) ? 1 : eyesPeeking(w) ? 0.28 : 0) - e.lid) * Math.min(1, dt * 6)
    e.flinch = Math.max(0, e.flinch - dt * 2.5)
  }

  // paddles: y follows the target, x is the thrust lunge (spring back to rest)
  w.sides.forEach((s, i) => {
    const len = padLen(w, i as SideIndex)
    const lim = H / 2 - len / 2
    const target = Math.max(-lim, Math.min(lim, s.targetY))
    const d = target - s.paddleY
    const sm = i === 1 && hasCpuOpponent(w) ? npcDifficulty(w).speed : 1
    const m = T.paddleSpeed * sm * dt
    const y0 = s.paddleY
    s.paddleY = Math.abs(d) <= m ? target : s.paddleY + Math.sign(d) * m
    s.vy = (s.paddleY - y0) / dt
    if (w.mode.id === 'duo-fall') {
      const target2 = Math.max(-lim, Math.min(lim, s.target2Y))
      const d2 = target2 - s.paddle2Y, y2 = s.paddle2Y
      s.paddle2Y = Math.abs(d2) <= m ? target2 : s.paddle2Y + Math.sign(d2) * m
      s.vy2 = (s.paddle2Y - y2) / dt
    }
    s.pvx += (-100 * s.px - 20 * s.pvx) * dt
    s.px = Math.max(0, s.px + s.pvx * dt)
    // the pinball flipper: a bar hinged at the paddle's centre that swings up or down while a flip is held
    const armed = powerActive(w, i as SideIndex)
    if (!armed) { s.fdir = 0; if (s.aimOn) { s.aimOn = false; s.charge = 0 } }
    s.grow += Math.max(-T.armGrowRate * dt, Math.min(T.armGrowRate * dt, (armed ? 1 : 0) - s.grow))
    s.ta += Math.max(-T.tiltRate * dt, Math.min(T.tiltRate * dt, s.tdir * T.tiltMax - s.ta))
    let targetA = s.fdir * T.flipAngle
    if (s.aimOn) {
      // Space held: the arm swings out toward the cursor and charges
      const sgn = i === 0 ? -1 : 1, inward = -sgn
      const dx = inward * (s.aimX - (sgn * (W / 2 - 30) + inward * s.px)), dy = s.paddleY - s.aimY
      targetA = dx < 1 ? (dy >= 0 ? T.armAimMax : -T.armAimMax) : Math.max(-T.armAimMax, Math.min(T.armAimMax, D.atan(dy / dx)))
      s.charge = Math.min(1, s.charge + dt / T.armChargeTime)
    }
    const snapping = w.tick - s.relTick < Math.round(T.armReleaseWindow / FIXED_DT)
    const rate = s.fdir !== 0 || s.aimOn || snapping ? T.flipRate : T.flipReturn
    const df = Math.max(-rate * dt, Math.min(rate * dt, targetA - s.fa))
    s.fa += df; s.fav = df / dt
  })

  // serve
  if (!w.balls.some(b => !b.scored)) {
    w.serveTimer -= dt
    if (w.serveTimer <= 0) { serve(w); w.serveTimer = 1 }
  }

  for (const b of w.balls) {
    b.age += dt
    decaySwipeSpeed(b, dt)
    b.vx -= w.arenaAcc.x * T.ballInertia * dt
    b.vy -= w.arenaAcc.y * T.ballInertia * dt
    b.vx += T.tiltG * D.sin(a.ang) * dt
    b.vx += windVentAt(w, b.x, b.y) * dt
    if (w.modifiers.includes('paddle-wake-physics')) {
      // An optional local current from paddle motion. The tapered envelope and
      // acceleration cap keep it readable without overpowering a clean hit.
      for (const i of [0, 1] as const) {
        const side = w.sides[i], wall = i === 0 ? -1 : 1
        const paddleX = wall * (W / 2 - 30) - wall * side.px
        const dx = Math.abs(b.x - paddleX)
        if (dx >= 116) continue
        const len = padLen(w, i)
        const paddleY = w.mode.id === 'duo-fall' && Math.abs(b.y - side.paddle2Y) < Math.abs(b.y - side.paddleY) ? side.paddle2Y : side.paddleY
        const dy = Math.max(0, Math.abs(b.y - paddleY) - len * 0.35)
        const envelope = (1 - dx / 116) * Math.max(0, 1 - dy / (len * 1.2))
        if (envelope <= 0) continue
        b.vy += Math.max(-720, Math.min(720, side.vy)) * 0.42 * envelope * dt
        b.vx -= wall * 46 * envelope * dt
      }
    }
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
      if (side.grow > 0.15) armHit(w, i, b, padX, inward)
      const paddleStates: Array<[number, number]> = w.mode.id === 'duo-fall' ? [[side.paddleY, side.vy], [side.paddle2Y, side.vy2]] : [[side.paddleY, side.vy]]
      for (const [paddleY, paddleVelocity] of paddleStates) if (b.vx * inward < 0 && Math.abs(b.x - padX) < BALL_R + PAD_THICK + Math.abs(side.pvx) * dt && Math.abs(b.y - paddleY) < len / 2 + BALL_R) {
        const off = Math.max(-1, Math.min(1, (b.y - paddleY) / (len / 2)))
        const hand = Math.max(0, side.pvx) * T.thrustTransfer
        const powered = powerActive(w, i)
        let boosted = false
        if (powered) { side.powerHits++; boosted = side.powerHits % T.powerHits === 0 }
        const cap = T.maxSpeed * (boosted ? 1.25 : 1)
        const sp = Math.min(cap, D.hypot(b.vx, b.vy) * (1 + T.speedRamp * w.difficulty.rampMult) + 10 + hand + (boosted ? T.powerBoost : 0))
        const ang = side.ta === 0 ? off * 0.9 : Math.max(-1.2, Math.min(1.2, off * 0.9 + inward * side.ta * T.tiltDeflect))
        b.vx = inward * D.cos(ang) * sp
        b.vy = D.sin(ang) * sp + (powered ? paddleVelocity * T.powerCarry : 0)
        b.x = padX + inward * (BALL_R + PAD_THICK)
        b.lastHit = i
        jolt(w, padX, b.y, inward * T.swayKick * (sp / 600) * (boosted ? 2 : 1), off * T.swayKick * 0.3)
        if (boosted) { side.powerBalls++; w.events.push({ kind: 'boost', side: i }) }
        w.events.push({ kind: 'paddle', side: i, speed: sp, boosted })
      }

      const edge = s * W / 2
      const prevSide = px < edge ? -1 : 1
      if (prevSide !== (b.x < edge ? -1 : 1) && Math.abs(b.y) < H / 2 && !side.broken) {
        b.x = edge + prevSide * BALL_R
        b.vx = -b.vx
        damagePane(w, i, b.y, W, H)
      }

      if (side.broken) {
        if (!b.scored && s * b.x > W / 2 + GOAL_OFFSET && s * b.vx > 0 && Math.abs(b.y) < H / 2 + 40) {
          b.scored = true
          applyScore(w, (1 - i) as SideIndex)
        } else if (b.scored && Math.abs(b.x) < W / 2 - 10) b.scored = false
      }
    }

    if (Math.abs(b.x) > W / 2 || Math.abs(b.y) > H / 2) {
      // outside the personal arena a ball belongs to the shaft: wind and the fall carry it
      b.vx += wind * 3 * T.outsideDrag * dt
      b.y -= w.fallV * T.outsideDrag * dt
      b.vx *= 1 - dt * 0.1
      b.vy *= 1 - dt * 0.1
    }
    if (w.sats.length && (Math.abs(b.x) > W / 2 || Math.abs(b.y) > H / 2)) ballVsSatellites(w, b, hooks, BALL_R)

    if (Math.abs(b.x) > FIELD_HALF - BALL_R) {
      const wall = Math.sign(b.x) as -1 | 1
      const speed = D.hypot(b.vx, b.vy)
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
    t.vx += (wind + windVentAt(w, t.x, t.y) - w.arenaAcc.x * 0.5) * dt
    t.vy -= w.arenaAcc.y * 0.5 * dt
    t.vx *= 1 - dt * 0.3
    t.x += t.vx * dt
    t.y += (t.vy - w.fallV) * dt
    const lim = FIELD_HALF - 30
    if (Math.abs(t.x) > lim) { t.x = Math.sign(t.x) * lim; t.vx *= -0.4 }
  }
  w.tears = w.tears.filter(t => Math.abs(t.y) < 1500 && t.age < 12)

  // shards are loose debris: they tumble under gravity, get shoved by balls, bounce off the shaft and stay in view.
  // The invisible floor and ceiling they bounce on (SHARD_FLOOR) is kept ON PURPOSE: broken glass falls, flies and piles up in view. See docs/FEATURES_TO_IMPROVE.md.
  const SHARD_Y = SHARD_FLOOR
  for (const s of w.shards) {
    s.vx += (wind * 0.6 - w.arenaAcc.x * 0.8) * dt
    s.vy += (T.shardGravity - w.arenaAcc.y * 0.8) * dt
    for (const bl of w.balls) {
      const dx = s.x - bl.x, dy = s.y - bl.y, dd = D.hypot(dx, dy)
      if (dd < 34 && dd > 1e-3) { const k = (34 - dd) / 34; s.vx += (dx / dd) * k * 380 + bl.vx * 0.04; s.vy += (dy / dd) * k * 380 + bl.vy * 0.04; s.vr += k * 6 }
    }
    s.x += s.vx * dt; s.y += s.vy * dt; s.rot += s.vr * dt
    s.vx *= 1 - dt * 0.15; s.vy *= 1 - dt * 0.15; s.vr *= 1 - dt * 0.2
    const lim = FIELD_HALF - 30
    if (Math.abs(s.x) > lim) { s.x = Math.sign(s.x) * lim; s.vx *= -0.5; s.vr += 2 }
    if (Math.abs(s.y) > SHARD_Y) { s.y = Math.sign(s.y) * SHARD_Y; s.vy *= -0.5; s.vx *= 0.9; s.vr *= 0.8 }
    s.life = Math.max(0.35, s.life - dt * 0.1)
  }
}
