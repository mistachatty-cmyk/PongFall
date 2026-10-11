import { World, FIELD_HALF, EYE_R, WorldEvent, windAt, eyesOpen } from '../sim/world'
import { hash2 } from './fog'

const METAL_A = '#c9d2de', METAL_B = '#8d99ab', METAL_C = '#5a6475'
const BG_PER_WALL = 14

/** Render-only effects: never read by the sim. */
export interface Fx {
  bgReact: number[]                 // 0..1 how awake each background eye is
  splats: Array<{ x: number; y: number; vx: number; vy: number; life: number }>
  windV: number
  windX: number
}
export const createFx = (): Fx => ({ bgReact: new Array(BG_PER_WALL * 2).fill(0), splats: [], windV: 0, windX: 0 })

function bgPos(w: World, wall: -1 | 1, k: number) {
  const period = BG_PER_WALL * 200
  const raw = k * 200 + hash2(k, wall + 3) * 90 - w.scroll * 0.6
  const y = (((raw + period / 2) % period) + period) % period - period / 2
  const x = wall * (FIELD_HALF - 90 - hash2(k, wall + 9) * 230)
  const r = 22 + hash2(k, wall + 21) * 20
  return { x, y, r }
}

/** Feed sim events and time into the render effects. */
export function feedFx(fx: Fx, w: World, events: WorldEvent[], dt: number) {
  for (const e of events) {
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
    if (e.kind === 'crack') for (let i = 0; i < fx.bgReact.length; i += 3) fx.bgReact[i] = Math.max(fx.bgReact[i]!, 0.45)
    if (e.kind === 'squish') {
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * 6.283, sp = 90 + hash2(i, w.tick) * 160
        fx.splats.push({ x: e.wall * (FIELD_HALF - 50), y: e.y, vx: -e.wall * (40 + Math.abs(Math.cos(a)) * sp), vy: Math.sin(a) * sp, life: 1 })
      }
    }
  }
  for (let i = 0; i < fx.bgReact.length; i++) fx.bgReact[i] = Math.max(0, fx.bgReact[i]! - dt * 0.9)
  for (const s of fx.splats) {
    s.vy += 500 * dt; s.x += s.vx * dt; s.y += (s.vy - w.fallV) * dt; s.life -= dt * 1.1
  }
  fx.splats = fx.splats.filter(s => s.life > 0).slice(-120)
  fx.windV += (windAt(w) * 0.6 - fx.windV) * Math.min(1, dt * 0.8)
  fx.windX += fx.windV * dt
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
export function drawEye(ctx: CanvasRenderingContext2D, w: World, wall: -1 | 1, x: number, y: number, r: number, lid: number, flinch: number, dim: number) {
  const shock = w.realT < w.shockUntil
  const fx = x - wall * flinch * 16
  ctx.save()
  ctx.translate(fx, y)
  ctx.scale(1 - 0.32 * flinch, 1 + 0.26 * flinch)
  ctx.globalAlpha = dim
  const rx = r * 1.2, ry = r * 0.9
  ctx.fillStyle = '#e8e4da'
  ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, 7); ctx.fill()
  const look = eyeLook(w, fx, y)
  const ix = Math.cos(look.a) * look.d * r * 0.5, iy = Math.sin(look.a) * look.d * r * 0.4
  ctx.fillStyle = '#2b5f8f'
  ctx.beginPath(); ctx.arc(ix, iy, r * 0.5, 0, 7); ctx.fill()
  ctx.fillStyle = '#05080c'
  ctx.beginPath(); ctx.arc(ix, iy, r * (shock ? 0.22 : 0.34), 0, 7); ctx.fill()
  const cover = 1 - lid * (shock ? 1 : 0.85)
  const lidH = r * 0.95 * cover
  const g = ctx.createLinearGradient(0, -r, 0, r)
  g.addColorStop(0, METAL_A); g.addColorStop(0.5, METAL_B); g.addColorStop(1, METAL_C)
  ctx.fillStyle = g
  ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, 7); ctx.clip()
  ctx.fillRect(-r * 1.3, -r, r * 2.6, lidH)
  ctx.fillRect(-r * 1.3, r - lidH, r * 2.6, lidH)
  if (cover > 0.9) { ctx.strokeStyle = '#2a3140'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-rx, 0); ctx.lineTo(rx, 0); ctx.stroke() }
  ctx.restore()
  ctx.save(); ctx.translate(fx, y); ctx.scale(1 - 0.32 * flinch, 1 + 0.26 * flinch)
  ctx.strokeStyle = '#3a4455'; ctx.lineWidth = 3; ctx.globalAlpha = dim
  ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, 7); ctx.stroke(); ctx.restore()
}

/** The many small eyes deep in the walls: closed until woken, then they react. */
export function drawBackgroundEyes(ctx: CanvasRenderingContext2D, w: World, fx: Fx, vh: number) {
  const woke = eyesOpen(w) ? 1 : 0
  const anyLid = Math.max(...w.eyes.map(e => e.lid))
  for (const wall of [-1, 1] as const) {
    for (let k = 0; k < BG_PER_WALL; k++) {
      const p = bgPos(w, wall, k)
      if (Math.abs(p.y) > vh / 2 + 80) continue
      const idx = k + (wall === 1 ? BG_PER_WALL : 0)
      const twitch = fx.bgReact[idx]! + (woke ? 0 : 0.06 * Math.max(0, Math.sin(w.t * 1.3 + k * 2.1)) * (hash2(k, 5) > 0.7 ? 1 : 0))
      const open = Math.max(anyLid * 0.9, Math.min(1, twitch))
      drawEye(ctx, w, wall, p.x, p.y, p.r, open, 0, 0.42 + 0.2 * open)
    }
  }
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
