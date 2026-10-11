// Other arenas: 1, 3 or 5 small arenas on a loose, rotating carousel around yours. Each is a rigid body
// (springs hold it near its orbit slot, collisions knock it about, it spins) and runs its own NPC-vs-NPC match.
// Pure and deterministic: they use their own seeded rng, so they replay exactly.
import * as D from './detmath'
import type { World, WorldEvent } from './world'

export const SAT_COUNTS = [0, 1, 3, 5] as const
export const SAT_W = 288
export const SAT_H = 180
export const SAT_PAD = 46
export const SAT_BALL = 6
export const SAT_GLASS = 3
export const SAT_TARGET = 5
/** A satellite side's paddle length: it drifts between 0.75x and 1.35x when Flux is on. */
export const satPad = (w: { flux: boolean; t: number }, id: number, k: number) => w.flux ? SAT_PAD * (1.05 + 0.3 * D.sin(w.t * 0.31 + id * 1.9 + k * 2.4)) : SAT_PAD
export const SAT_R = 0.5 * D.hypot(SAT_W, SAT_H) * 0.85
const SAT_SIDE_X = 14

export interface SatSide { score: number; glassHits: number; broken: boolean; paddleY: number; hitYs: number[]; hitTick: number }
export interface SatBall { x: number; y: number; vx: number; vy: number }
export interface Satellite {
  id: number
  x: number; y: number; vx: number; vy: number
  ang: number; vang: number; spin: number
  theta: number; omega: number
  mass: number
  sides: [SatSide, SatSide]
  ball: SatBall | null
  serveTimer: number
  resetTimer: number
  matches: number
}
export interface SatStray { x: number; y: number; vx: number; vy: number; age: number }

export interface SatHooks {
  /** Damage the player's pane i at height y (a hostile stray hit it). */
  hitPlayerPane(i: 0 | 1, y: number): void
  playerPaneIntact(i: 0 | 1): boolean
  /** The player broke another arena's glass: Triple score! */
  triple(): void
  emit(e: WorldEvent): void
}

export function normalizeArenas(n: number | undefined): number {
  const v = Number(n)
  if (!Number.isFinite(v) || v <= 0) return 0
  let best: number = SAT_COUNTS[0]
  for (const c of SAT_COUNTS) if (Math.abs(c - v) <= Math.abs(best - v)) best = c
  return best
}

/** Orbit radii that keep the carousel clear of the player's (growing) arena. */
export function orbitDims(W: number, H: number) {
  return { rx: Math.max(W / 2 + 340, 660), ry: Math.max(H / 2 + 320, 520) }
}

const newSide = (): SatSide => ({ score: 0, glassHits: 0, broken: false, paddleY: 0, hitYs: [], hitTick: -999 })

export function createSatellites(count: number, rng: () => number, W: number, H: number): Satellite[] {
  const { rx, ry } = orbitDims(W, H)
  const out: Satellite[] = []
  const phase = rng() * 0.5
  for (let i = 0; i < count; i++) {
    const theta = (i / count) * Math.PI * 2 + phase
    out.push({
      id: i, x: rx * D.cos(theta), y: ry * D.sin(theta), vx: 0, vy: 0,
      ang: rng() * 6.28, vang: 0, spin: (i % 2 ? -1 : 1) * (0.11 + rng() * 0.09),
      theta, omega: 0.085 + (i % 3) * 0.006, mass: 1,
      sides: [newSide(), newSide()], ball: null, serveTimer: 0.6 + rng() * 1.2, resetTimer: 0, matches: 0,
    })
  }
  return out
}

interface Body { x: number; y: number; vx: number; vy: number; vang: number }

function collide(a: Body, ra: number, ma: number, b: Body, rb: number, mb: number): number {
  const dx = b.x - a.x, dy = b.y - a.y
  const d = D.hypot(dx, dy)
  if (d >= ra + rb || d < 1e-6) return 0
  const nx = dx / d, ny = dy / d
  const over = ra + rb - d
  a.x -= nx * over * mb / (ma + mb); a.y -= ny * over * mb / (ma + mb)
  b.x += nx * over * ma / (ma + mb); b.y += ny * over * ma / (ma + mb)
  const rvx = b.vx - a.vx, rvy = b.vy - a.vy
  const vn = rvx * nx + rvy * ny
  if (vn > 0) return 0
  const j = -(1.75 * vn) / (1 / ma + 1 / mb)
  a.vx -= (j * nx) / ma; a.vy -= (j * ny) / ma
  b.vx += (j * nx) / mb; b.vy += (j * ny) / mb
  const vt = rvx * -ny + rvy * nx          // slip along the contact spins both arenas
  a.vang -= vt * 0.0022; b.vang -= vt * 0.0022
  return -vn
}

function toWorld(s: Satellite, lx: number, ly: number) {
  const c = D.cos(s.ang), sn = D.sin(s.ang)
  return { x: s.x + c * lx - sn * ly, y: s.y + sn * lx + c * ly }
}
function toLocal(s: Satellite, wx: number, wy: number) {
  const c = D.cos(s.ang), sn = D.sin(s.ang), dx = wx - s.x, dy = wy - s.y
  return { x: c * dx + sn * dy, y: -sn * dx + c * dy }
}

function damageSatPane(s: Satellite, i: 0 | 1, y: number, w: World, hooks: SatHooks): boolean {
  const side = s.sides[i]
  side.glassHits++
  side.hitYs.push(y)
  side.hitTick = w.tick
  if (side.glassHits >= SAT_GLASS) { side.broken = true; hooks.emit({ kind: 'satBreak', id: s.id }); return true }
  hooks.emit({ kind: 'satHit', id: s.id })
  return false
}

/** A ball of the player's arena (out in the shaft) meeting another arena: its glass takes the hit. */
export function ballVsSatellites(w: World, b: { x: number; y: number; vx: number; vy: number; lastHit: number }, hooks: SatHooks, ballR: number) {
  for (const s of w.sats) {
    const dx = b.x - s.x, dy = b.y - s.y
    if (dx * dx + dy * dy > (SAT_R + 40) * (SAT_R + 40)) continue
    const l = toLocal(s, b.x, b.y)
    if (Math.abs(l.x) >= SAT_W / 2 + ballR || Math.abs(l.y) >= SAT_H / 2 + ballR) continue
    const c = D.cos(s.ang), sn = D.sin(s.ang)
    let lvx = c * b.vx + sn * b.vy, lvy = -sn * b.vx + c * b.vy
    const i: 0 | 1 = l.x < 0 ? 0 : 1
    const side = s.sides[i]
    const nearBar = Math.abs(l.y) > SAT_H / 2 - 8
    if (nearBar) {
      lvy = -lvy
      l.y = Math.sign(l.y) * (SAT_H / 2 + ballR)
    } else if (!side.broken) {
      lvx = -lvx
      l.x = Math.sign(l.x) * (SAT_W / 2 + ballR)
      const broke = damageSatPane(s, i, l.y, w, hooks)
      if (broke && b.lastHit === 0) hooks.triple()
    } else continue
    const wp = toWorld(s, l.x, l.y)
    b.x = wp.x; b.y = wp.y
    b.vx = c * lvx - sn * lvy; b.vy = sn * lvx + c * lvy
    s.vx += b.vx * 0.02; s.vy += b.vy * 0.02
  }
}

function stepMatch(s: Satellite, w: World, dt: number, hooks: SatHooks) {
  const rng = w.srng
  const T = w.tune
  const H = SAT_H, W = SAT_W
  if (s.resetTimer > 0) {
    s.resetTimer -= dt
    if (s.resetTimer <= 0) { s.sides = [newSide(), newSide()]; s.ball = null; s.serveTimer = 0.8; s.matches++ }
    return
  }
  const b = s.ball
  for (let k = 0; k < 2; k++) {
    const side = s.sides[k]!
    const target = b ? b.y + D.sin(w.t * 1.3 + s.id * 2 + k) * 16 : 0
    const pad = satPad(w, s.id, k)
    const lim = H / 2 - pad / 2
    const goal = Math.max(-lim, Math.min(lim, target))
    const m = (k ? 128 : 140) * dt
    side.paddleY += Math.abs(goal - side.paddleY) <= m ? goal - side.paddleY : Math.sign(goal - side.paddleY) * m
  }
  if (!b) {
    s.serveTimer -= dt
    if (s.serveTimer <= 0) {
      const dir = rng() < 0.5 ? -1 : 1
      s.ball = { x: 0, y: 0, vx: dir * (170 + rng() * 40), vy: (rng() - 0.5) * 120 }
    }
    return
  }
  const px = b.x
  b.vx += T.tiltG * 0.6 * D.sin(s.ang) * dt
  b.x += b.vx * dt; b.y += b.vy * dt
  if (b.y - SAT_BALL < -H / 2 && b.vy < 0) { b.y = -H / 2 + SAT_BALL; b.vy = -b.vy }
  else if (b.y + SAT_BALL > H / 2 && b.vy > 0) { b.y = H / 2 - SAT_BALL; b.vy = -b.vy }
  for (const i of [0, 1] as const) {
    const sg = i === 0 ? -1 : 1
    const side = s.sides[i]
    const padX = sg * (W / 2 - SAT_SIDE_X)
    if (b.vx * sg > 0 && Math.abs(b.x - padX) < SAT_BALL + 4 && Math.abs(b.y - side.paddleY) < satPad(w, s.id, i) / 2 + SAT_BALL) {
      const off = (b.y - side.paddleY) / (satPad(w, s.id, i) / 2)
      b.vx = -sg * Math.min(360, Math.abs(b.vx) * 1.04 + 4)
      b.vy += off * 90
      b.x = padX - sg * (SAT_BALL + 4)
    }
    const edge = sg * W / 2
    const prev = px < edge ? -1 : 1
    if (prev !== (b.x < edge ? -1 : 1) && Math.abs(b.y) < H / 2 && !side.broken) {
      b.x = edge + prev * SAT_BALL
      b.vx = -b.vx
      damageSatPane(s, i, b.y, w, hooks)
    }
    if (side.broken && sg * b.x > W / 2 + 10 && sg * b.vx > 0) {
      s.sides[(1 - i) as 0 | 1].score++
      if (w.difficulty.hostile) {
        const wp = toWorld(s, b.x, b.y)
        const c = D.cos(s.ang), sn = D.sin(s.ang)
        w.satStrays.push({ x: wp.x, y: wp.y, vx: s.vx + c * b.vx - sn * b.vy, vy: s.vy + sn * b.vx + c * b.vy, age: 0 })
        if (w.satStrays.length > 6) w.satStrays.shift()
      }
      s.ball = null
      s.serveTimer = 1.2
      if (s.sides[(1 - i) as 0 | 1].score >= SAT_TARGET) s.resetTimer = 3
      break
    }
  }
}

/** One physics tick for the whole carousel. */
export function stepSatellites(w: World, dt: number, hooks: SatHooks, W: number, H: number, bounds: number) {
  const n = w.sats.length
  if (!n && !w.satStrays.length) return
  const { rx, ry } = orbitDims(W, H)
  const K = 16, C = 4.2
  for (const s of w.sats) {
    s.theta += s.omega * dt
    const tx = rx * D.cos(s.theta), ty = ry * D.sin(s.theta)
    s.vx += (K * (tx - s.x) - C * s.vx) * dt
    s.vy += (K * (ty - s.y) - C * s.vy) * dt
    s.vang += ((s.spin - s.vang) * 0.8) * dt
    s.x += s.vx * dt; s.y += s.vy * dt; s.ang += s.vang * dt
  }
  // collisions: arena against arena, and every arena against yours
  const a = w.arena
  const pr = 0.5 * D.hypot(W, H) * 0.78
  for (let i = 0; i < n; i++) {
    const s = w.sats[i]!
    for (let j = i + 1; j < n; j++) collide(s, SAT_R, 1, w.sats[j]!, SAT_R, 1)
    const hit = collide(a, pr, 8, s, SAT_R, 1)
    if (hit > 30) hooks.emit({ kind: 'bump', level: Math.min(1, hit / 400) })
  }
  for (const s of w.sats) { s.x = Math.max(-bounds, Math.min(bounds, s.x)); stepMatch(s, w, dt, hooks) }
  // strays that left another arena
  for (const st of w.satStrays) {
    st.age += dt
    st.x += st.vx * dt; st.y += st.vy * dt
    if (Math.abs(st.x) > bounds - 8) { st.x = Math.sign(st.x) * (bounds - 8); st.vx = -st.vx }
    for (const i of [0, 1] as const) {
      const edge = (i === 0 ? -1 : 1) * W / 2
      if (Math.abs(st.x - edge) < 12 && Math.abs(st.y) < H / 2 && hooks.playerPaneIntact(i)) {
        hooks.hitPlayerPane(i, st.y)
        st.vx = -st.vx; st.x = edge + (st.x < edge ? -1 : 1) * 12
        st.age += 3
      }
    }
  }
  w.satStrays = w.satStrays.filter(s => s.age < 8 && Math.abs(s.y) < 1500)
}
