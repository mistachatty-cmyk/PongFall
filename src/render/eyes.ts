import { World, padLen, FIELD_HALF, EYE_R, WorldEvent, windAt, eyesOpen, eyeY, arenaDims } from '../sim/world'
import type { EyeType } from '../core/pongPainter'
import type { FogGL, Stir } from './fogGL'
import { WALL_EYE_X } from './wall'
import { hash2, softBlob } from './fog'

const METAL_A = '#46536b', METAL_B = '#2f3a4d', METAL_C = '#1c2331'   // the wall's own plate metal
const BG_PER_WALL = 14
const NEAR_MISS = 90   // units past the paddle's end that still counts as a near miss

/** Render-only effects: never read by the sim. */
export interface Banner { text: string; sub?: string; at: number; ms: number; color: string }
export interface Fx {
  endAt: number                     // ms timestamp the game ended (0 while playing), drives the ending camera
  bgReact: number[]                 // 0..1 how awake each background eye is
  splats: Array<{ x: number; y: number; vx: number; vy: number; life: number }>
  windV: number
  windX: number
  reduce: boolean                   // Reduce Motion: no shake, roll, smear or heavy streaks
  surge: number                     // 1 right after a score: the arena drops, then settles
  boostFlash: number
  air: { x: number; y: number; roll: number; shx: number; shy: number }
  banners: Banner[]
  faceMix: number                   // 0 = scattered background eyes, 1 = the single unknown face
  bgGlow: number[]                  // 0..1 glow of each background eye (its pair on the wall was hit)
  faceGlow: number                  // glow of the face's eye
  faceOpen: number
  stirs: Array<Stir & { age: number }>
  fog: FogGL | null
  fogMode: 'high' | 'low' | 'off'
  satDepth: number[]                // 0 far back .. 1 in front, per other arena
}
export const createFx = (reduce = false): Fx => ({ endAt: 0, bgReact: new Array(BG_PER_WALL * 2).fill(0), splats: [], windV: 0, windX: 0, reduce, surge: 0, boostFlash: 0, air: { x: 0, y: 0, roll: 0, shx: 0, shy: 0 }, banners: [], faceMix: 0, bgGlow: new Array(BG_PER_WALL * 2).fill(0), faceGlow: 0, faceOpen: 0, stirs: [], fog: null, fogMode: 'high', satDepth: [] })

/** How far through the game we are, 0..1 (score target, time limit, or depth in sandbox). */
export function gameProgress(w: World) {
  if (w.opts.target > 0) return Math.min(1, Math.max(w.sides[0].score, w.sides[1].score) / w.opts.target)
  if (w.opts.timeLimit > 0) return Math.min(1, w.t / w.opts.timeLimit)
  return Math.min(1, w.scroll / 9000)
}
const smooth = (a: number, b: number, x: number) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t) }

/** Quiet staggered blinks for deep shaft eyes; returns a lid-open multiplier. */
export function backgroundBlink(t: number, phase: number) {
  const cycle = ((t + phase) % 6.8 + 6.8) % 6.8
  return cycle > 6.48 ? Math.abs(Math.cos((cycle - 6.48) / 0.32 * Math.PI)) : 1
}

/** A deliberate click on the shaft wakes the distant eyes for a short look back. */
export function wakeBackgroundEyes(fx: Fx) {
  fx.bgReact = fx.bgReact.map(v => Math.max(v, 0.9))
  fx.bgGlow = fx.bgGlow.map(v => Math.max(v, 0.42))
}

/** The unknown face: one huge eye deep in the shaft; its pair is an eye on the opposite wall. */
export const FACE = { wall: 1 as -1 | 1, x: 470, y: -110, r: 130 }
export function faceEye(w: World) {
  return { x: FACE.x + Math.sin(w.t * 0.07) * 25, y: FACE.y + Math.sin(w.t * 0.05 + 1) * 30, r: FACE.r }
}
/** The wall eye (opposite wall) nearest the face's height: the face's pair. */
export function faceMate(w: World) {
  const f = faceEye(w)
  let best = w.eyes[0]!, d = 1e9
  for (const e of w.eyes) { if (e.wall === FACE.wall) continue; const dd = Math.abs(eyeY(w, e) - f.y); if (dd < d) { d = dd; best = e } }
  return { eye: best, y: eyeY(w, best), x: -FACE.wall * WALL_EYE_X }
}

function bgPos(w: World, wall: -1 | 1, k: number) {
  const period = BG_PER_WALL * 200
  const raw = k * 200 + hash2(k, wall + 3) * 90 - w.scroll * 0.6
  const y = (((raw + period / 2) % period) + period) % period - period / 2
  const x = wall * (FIELD_HALF - 90 - hash2(k, wall + 9) * 230)
  const r = 22 + hash2(k, wall + 21) * 20
  return { x, y, r }
}

/** Feed sim events and time into the render effects. */
export function feedFx(fx: Fx, w: World, events: WorldEvent[], dt: number, nowMs = 0) {
  for (const e of events) {
    if (e.kind === 'score') { fx.surge = 1; fx.stirs.push({ x: 0, y: 0, s: 90, age: 0 }) }
    if (e.kind === 'paddle') { const W = arenaDims(w).W; fx.stirs.push({ x: (e.side === 0 ? -1 : 1) * (W / 2 - 30), y: w.sides[e.side].paddleY, s: Math.min(70, e.speed / 12) * (e.boosted ? 1.6 : 1), age: 0 }) }
    if (e.kind === 'break') { const W = arenaDims(w).W; fx.stirs.push({ x: (e.side === 0 ? -1 : 1) * W / 2, y: 0, s: 140, age: 0 }) }
    if (e.kind === 'squish') fx.stirs.push({ x: e.wall * (FIELD_HALF - 40), y: e.y, s: 110, age: 0 })
    if (e.kind === 'eye') {
      // the background eye paired with the wall eye that was hit wakes and glows
      const hitY = (events.find(x => x.kind === 'squish' && x.wall === e.wall) as { y: number } | undefined)?.y ?? 0
      let bi = -1, bd = 1e9
      for (let k = 0; k < BG_PER_WALL; k++) { const p = bgPos(w, e.wall, k); const d = Math.abs(p.y - hitY); if (d < bd) { bd = d; bi = k } }
      if (bi >= 0 && bd < 380) fx.bgGlow[bi + (e.wall === 1 ? BG_PER_WALL : 0)] = 1
      const f = faceEye(w)
      if (e.wall === -FACE.wall && Math.abs(hitY - f.y) < 300) fx.faceGlow = 1
    }
    if (e.kind === 'triple') fx.banners.push({ text: 'TRIPLE SCORE!', sub: 'You broke another arena\'s glass', at: nowMs, ms: 2600, color: '#ffe08a' })
    if (e.kind === 'weather') fx.banners.push({ text: 'EYE WEATHER', sub: `${e.tears} tears are falling through the shaft`, at: nowMs, ms: 2100, color: '#9cd0ff' })
    if (e.kind === 'bump') fx.stirs.push({ x: 0, y: 0, s: 40 + 60 * e.level, age: 0 })
    if (e.kind === 'satBreak') { const sat = w.sats[e.id]; if (sat) fx.stirs.push({ x: sat.x, y: sat.y, s: 100, age: 0 }) }
    if (e.kind === 'boost') { fx.boostFlash = 1; fx.banners.push({ text: 'POWER HIT!', at: nowMs, ms: 700, color: '#ffe08a' }) }
    if (e.kind === 'unlock') fx.banners.push({ text: 'PINBALL ARM KEPT FOR GOOD', sub: 'Your glass broke, so the arm stays out. You can also earn it with 4 tears and E', at: nowMs, ms: 3200, color: '#9cd0ff' })
    if (e.kind === 'power') {
      if (e.mode === 'manual') fx.banners.push({ text: 'PINBALL PADDLE', sub: 'Flip with ↑ / ↓, click / right-click, or the FLIP buttons. Every third hit is a power hit', at: nowMs, ms: 2200, color: '#9cd0ff' })
      else if (e.mode === 'assist') fx.banners.push({ text: 'SECOND WIND', sub: 'Your pinball paddle is on until you lead by 2', at: nowMs, ms: 2800, color: '#8affc1' })
      else if (e.mode === 'lock') fx.banners.push({ text: 'THE DEPTHS CLAIM THE PADDLE', sub: 'Their paddle is powered for the rest of the game', at: nowMs, ms: 3600, color: '#ff8a8a' })
    }
    if (e.kind === 'squish' || e.kind === 'wall' || e.kind === 'eye') {
      const wall = e.wall, y = 'y' in e ? e.y : 0
      for (let k = 0; k < BG_PER_WALL; k++) {
        const p = bgPos(w, wall, k)
        const d = Math.abs(p.y - y)
        const idx = k + (wall === 1 ? BG_PER_WALL : 0)
        const amt = e.kind === 'wall' ? 0.5 : 1
        if (d < 420) fx.bgReact[idx] = Math.max(fx.bgReact[idx]!, amt * (1 - d / 420))
      }
    }
    if (e.kind === 'break') for (let i = 0; i < fx.bgReact.length; i++) fx.bgReact[i] = Math.max(fx.bgReact[i]!, 0.7)
    if (e.kind === 'crack') {
      // near miss: the ball got through but only just past the paddle, so every eye startles (render only)
      const gap = Math.abs(e.y - w.sides[e.side].paddleY) - padLen(w, e.side) / 2
      if (gap < NEAR_MISS) {
        const near = 1 - Math.max(0, gap) / NEAR_MISS
        for (let i = 0; i < fx.bgReact.length; i++) fx.bgReact[i] = Math.max(fx.bgReact[i]!, 0.6 + 0.4 * near)
        for (let i = 0; i < fx.bgGlow.length; i++) fx.bgGlow[i] = Math.max(fx.bgGlow[i]!, 0.5 * near)
        fx.faceGlow = Math.max(fx.faceGlow, 0.5 + 0.5 * near)
        fx.stirs.push({ x: e.x, y: e.y, s: 60 + 50 * near, age: 0 })
      }
    }
    if (e.kind === 'crack') for (let i = 0; i < fx.bgReact.length; i += 3) fx.bgReact[i] = Math.max(fx.bgReact[i]!, 0.45)
    if (e.kind === 'squish') {
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * 6.283, sp = 90 + hash2(i, w.tick) * 160
        fx.splats.push({ x: e.wall * (FIELD_HALF - 50), y: e.y, vx: -e.wall * (40 + Math.abs(Math.cos(a)) * sp), vy: Math.sin(a) * sp, life: 1 })
      }
    }
  }
  // the arena with the most points (or the biggest box) slowly floats to the front; the rest drift back
  let lead = -1, bestSat = -1
  w.sats.forEach((s, i) => { const sc = Math.max(s.sides[0].score, s.sides[1].score); if (sc > bestSat) { bestSat = sc; lead = i } })
  if (w.sides[0].score >= bestSat || w.scale >= 1.35) lead = -1
  w.sats.forEach((_, i) => { const cur = fx.satDepth[i] ?? 0.3; fx.satDepth[i] = cur + ((lead === i ? 1 : 0) - cur) * Math.min(1, dt * 0.35) })
  for (let i = 0; i < fx.bgReact.length; i++) fx.bgReact[i] = Math.max(0, fx.bgReact[i]! - dt * 0.9)
  for (const s of fx.splats) {
    s.vy += 500 * dt; s.x += s.vx * dt; s.y += (s.vy - w.fallV) * dt; s.life -= dt * 1.1
  }
  fx.splats = fx.splats.filter(s => s.life > 0).slice(-120)
  for (const st of fx.stirs) { st.age += dt; st.s *= Math.max(0, 1 - dt * 1.6) }
  fx.stirs = fx.stirs.filter(st => st.s > 1.5).slice(-6)
  fx.bgGlow = fx.bgGlow.map(g => Math.max(0, g - dt * 0.45))
  fx.faceGlow = Math.max(0, fx.faceGlow - dt * 0.35)
  fx.faceMix += (smooth(0.45, 0.62, gameProgress(w)) - fx.faceMix) * Math.min(1, dt * 0.5)
  fx.faceOpen += ((fx.faceGlow > 0.05 ? 0.2 + 0.8 * fx.faceGlow : 0.1 + 0.04 * Math.sin(w.t * 0.5)) - fx.faceOpen) * Math.min(1, dt * 3)
  fx.windV += (windAt(w) * 0.6 - fx.windV) * Math.min(1, dt * 0.8)
  fx.windX += fx.windV * dt
  fx.surge = Math.max(0, fx.surge - dt * 1.4)
  fx.boostFlash = Math.max(0, fx.boostFlash - dt * 3)
  fx.banners = fx.banners.filter(b => nowMs - b.at < b.ms)
  // the arena moves in the air: drag lifts it, wind pushes and rolls it, buffeting shakes it (render only)
  const speed = Math.min(1, w.fallV / 320), k = fx.reduce ? 0 : 1
  const t = w.t, wind = windAt(w)
  const tx = wind * 0.16 * k, ty = (-speed * 34 + fx.surge * 26) * k
  const tr = (wind * 0.00018 + Math.sin(t * 0.9) * 0.004 * speed) * k
  const e = Math.min(1, dt * 4)
  fx.air.x += (tx - fx.air.x) * e; fx.air.y += (ty - fx.air.y) * e; fx.air.roll += (tr - fx.air.roll) * e
  fx.air.shx = (Math.sin(t * 41) + Math.sin(t * 23 + 1)) * 0.8 * speed * speed * 3 * k
  fx.air.shy = (Math.sin(t * 37 + 2) + Math.sin(t * 19)) * 0.8 * speed * speed * 3 * k
}

function eyeLook(w: World, ex: number, ey: number) {
  let tx = 0, ty = 0
  if (w.crackLook && w.realT < w.crackLook.until) { tx = w.crackLook.x; ty = w.crackLook.y }
  else if (w.balls.length) {
    let best = w.balls[0]!
    for (const b of w.balls) if (Math.hypot(b.x - ex, b.y - ey) < Math.hypot(best.x - ex, best.y - ey)) best = b
    tx = best.x; ty = best.y
  }
  return { a: Math.atan2(ty - ey, tx - ex), d: Math.min(1, Math.hypot(tx - ex, ty - ey) / 500) }
}

/** One eye. lid: 0 closed .. 1 open. flinch squashes it flat when hit. */
export function drawEye(ctx: CanvasRenderingContext2D, w: World, wall: -1 | 1, x: number, y: number, r: number, lid: number, flinch: number, dim: number, style: 'metal' | 'organic' = 'metal', glow = 0, irisColor = '', eyeType: EyeType = 'round') {
  const shock = w.realT < w.shockUntil
  const fx = x + wall * flinch * 18      // a hit recoils the eye into the wall
  ctx.save()
  ctx.translate(fx, y)
  ctx.scale(1 - 0.32 * flinch, 1 + 0.26 * flinch)
  ctx.globalAlpha = dim
  const rx = r * 1.2, ry = r * 0.9
  ctx.fillStyle = style === 'organic' ? '#c9d6e4' : '#e8e4da'
  ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, 7); ctx.fill()
  const look = eyeLook(w, fx, y)
  const ix = Math.cos(look.a) * look.d * r * 0.5, iy = Math.sin(look.a) * look.d * r * 0.4
  ctx.fillStyle = irisColor || (glow > 0.02 ? `rgb(${60 + 120 * glow | 0},${150 + 90 * glow | 0},255)` : '#2b5f8f')
  ctx.beginPath(); ctx.arc(ix, iy, r * 0.5, 0, 7); ctx.fill()
  ctx.fillStyle = '#05080c'
  ctx.beginPath()
  if (eyeType === 'slit' || style === 'organic' && eyeType === 'round') ctx.ellipse(ix, iy, r * (shock ? 0.2 : 0.1), r * 0.44, 0, 0, 7)
  else if (eyeType === 'diamond') { const s = r * .4; ctx.moveTo(ix, iy - s); ctx.lineTo(ix + s * .72, iy); ctx.lineTo(ix, iy + s); ctx.lineTo(ix - s * .72, iy); ctx.closePath() }
  else ctx.arc(ix, iy, r * (shock ? 0.22 : 0.34), 0, 7)
  ctx.fill()
  if (eyeType === 'ring') { ctx.fillStyle = irisColor || '#2b5f8f'; ctx.beginPath(); ctx.arc(ix, iy, r * .16, 0, 7); ctx.fill() }
  const cover = 1 - lid * (shock ? 1 : 0.85)
  const lidH = r * (0.95 * cover + 0.1 * Math.max(0, (cover - 0.9) / 0.1))   // fully closed: the lids overlap, no slit
  const g = ctx.createLinearGradient(0, -r, 0, r)
  if (style === 'organic') { g.addColorStop(0, '#1a1f33'); g.addColorStop(0.5, '#10142a'); g.addColorStop(1, '#0a0c1c') }
  else { g.addColorStop(0, METAL_A); g.addColorStop(0.5, METAL_B); g.addColorStop(1, METAL_C) }
  ctx.fillStyle = g
  ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, 7); ctx.clip()
  ctx.fillRect(-r * 1.3, -r, r * 2.6, lidH)
  ctx.fillRect(-r * 1.3, r - lidH, r * 2.6, lidH)
  if (cover > 0.9) { ctx.strokeStyle = style === 'organic' ? 'rgba(126,200,255,0.55)' : '#0a0e16'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-rx, 0); ctx.lineTo(rx, 0); ctx.stroke() }
  if (style === 'metal' && cover > 0.3) {
    // rivets on the lid plates, like the wall around them
    ctx.fillStyle = 'rgba(130,155,195,0.55)'
    for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.arc(k * r * 0.42, -lidH + 7, 2.4, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(k * r * 0.42, lidH * 0 + r - lidH - 7, 2.4, 0, 7); ctx.fill() }
  }
  ctx.restore()
  ctx.save(); ctx.translate(fx, y); ctx.scale(1 - 0.32 * flinch, 1 + 0.26 * flinch)
  ctx.strokeStyle = style === 'metal' ? '#0a0e16' : '#3a4455'; ctx.lineWidth = 3; ctx.globalAlpha = dim
  ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, 7); ctx.stroke(); ctx.restore()
}

/** The many small eyes deep in the walls: barely visible, closed until woken. They fade out as the face takes over. */
export function drawBackgroundEyes(ctx: CanvasRenderingContext2D, w: World, fx: Fx, vh: number, eyeType: EyeType = 'round', irisColor = '') {
  const vis = 1 - fx.faceMix
  if (vis < 0.02) return
  const woke = eyesOpen(w) ? 1 : 0
  const anyLid = Math.max(...w.eyes.map(e => e.lid))
  // the opening pattern is 1:1 - every wall eye has one background eye beside it; the scatter grows in as the game goes on
  const prog = gameProgress(w)
  const scatter = smooth(0.12, 0.55, prog), twins = 1 - smooth(0.2, 0.6, prog)
  if (twins > 0.02) {
    for (const e of w.eyes) {
      const y = eyeY(w, e)
      if (Math.abs(y) > vh / 2 + 80) continue
      const open = Math.max(anyLid * 0.5, e.flinch) * (fx.reduce ? 1 : backgroundBlink(w.t, e.slot * 1.17 + (e.wall + 1) * 0.73))
      drawEye(ctx, w, e.wall, e.wall * (FIELD_HALF - 215), y, 30, open, 0, (0.14 + 0.12 * open) * vis * twins, 'organic', 0, irisColor, eyeType)
    }
  }
  for (const wall of [-1, 1] as const) {
    for (let k = 0; k < BG_PER_WALL; k++) {
      const p = bgPos(w, wall, k)
      if (Math.abs(p.y) > vh / 2 + 80) continue
      if (hash2(k, wall + 40) > scatter) continue
      const idx = k + (wall === 1 ? BG_PER_WALL : 0)
      const glow = fx.bgGlow[idx]!
      const twitch = fx.bgReact[idx]! * 0.6 + (woke ? 0 : 0.08 + (fx.reduce ? 0 : 0.08 * Math.max(0, Math.sin(w.t * 1.3 + k * 2.1)) * (hash2(k, 5) > 0.7 ? 1 : 0)))
      const open = Math.max(anyLid * 0.5, Math.min(1, twitch), glow * 0.9) * (fx.reduce ? 1 : backgroundBlink(w.t, k * 0.83 + (wall + 1) * 1.17))
      const dim = (0.1 + 0.08 * open + 0.7 * glow) * vis * Math.min(1, 0.3 + scatter)
      if (glow > 0.05) { const gr = p.r * (3.2 + glow); ctx.globalAlpha = 0.8 * glow * vis; ctx.drawImage(softBlob('#6fc3ff'), p.x - gr, p.y - gr, gr * 2, gr * 2); ctx.globalAlpha = 1 }
      drawEye(ctx, w, wall, p.x, p.y, p.r, open, 0, dim, 'organic', glow, irisColor, eyeType)
    }
  }
}

/** The unknown face: a huge eye deep in the shaft, matched by one eye on the opposite wall. Fades in over the second half. */
export function drawFace(ctx: CanvasRenderingContext2D, w: World, fx: Fx, eyeType: EyeType = 'round', irisColor = '') {
  if (fx.faceMix < 0.02) return
  const f = faceEye(w), m = faceMate(w)
  const a = fx.faceMix
  // slow breathing halo behind it
  const pulse = 0.5 + 0.5 * Math.sin(w.t * 0.6)
  const hr = f.r * (2.6 + 0.6 * fx.faceGlow)
  ctx.globalAlpha = (0.1 + 0.1 * pulse + 0.6 * fx.faceGlow) * a
  ctx.drawImage(softBlob('#7ec8ff'), f.x - hr, f.y - hr, hr * 2, hr * 2)
  ctx.globalAlpha = 1
  drawEye(ctx, w, FACE.wall, f.x, f.y, f.r, fx.faceOpen, 0, (0.45 + 0.5 * fx.faceGlow) * a, 'organic', Math.max(fx.faceGlow, 0.25), irisColor, eyeType)
}

/** The wall eye matched to the face answers with a halo; drawn over the wall. */
export function drawMateHalo(ctx: CanvasRenderingContext2D, w: World, fx: Fx) {
  if (fx.faceMix < 0.02) return
  const m = faceMate(w)
  const mr = EYE_R * (2.4 + 1.2 * fx.faceGlow)
  ctx.globalAlpha = (0.25 + 0.7 * fx.faceGlow) * fx.faceMix
  ctx.drawImage(softBlob('#7ec8ff'), m.x - mr, m.y - mr, mr * 2, mr * 2)
  ctx.globalAlpha = 1
}

export function drawSplats(ctx: CanvasRenderingContext2D, fx: Fx) {
  for (const s of fx.splats) {
    ctx.globalAlpha = Math.max(0, s.life)
    ctx.fillStyle = '#9cd0ff'
    ctx.beginPath(); ctx.arc(s.x, s.y, 3 + 5 * s.life, 0, 7); ctx.fill()
  }
  ctx.globalAlpha = 1
}

export { EYE_R }
