import { World, windAt } from '../sim/world'
import { hash2 } from './fog'

/** Gust streamlines: curved ribbons that drift with the wind and rise with the fall. World space. */
export function drawGusts(ctx: CanvasRenderingContext2D, w: World, windX: number, vw: number, vh: number, reduce: boolean) {
  const wind = windAt(w)
  const k = Math.min(1, Math.abs(wind) / Math.max(1, w.tune.windStrength))
  if (k < 0.05) return
  const dir = Math.sign(wind) || 1
  const N = reduce ? 4 : 9
  const period = vh + 500
  ctx.lineCap = 'round'
  for (let i = 0; i < N; i++) {
    const n = hash2(i, 61), m = hash2(i, 67)
    const y = ((m * period - w.scroll * (0.9 + n * 0.6)) % period + period) % period - period / 2 - 250
    const len = 160 + n * 260
    const x0 = (((hash2(i, 71) * 2 - 1) * vw * 0.5 + windX * (0.6 + n)) % (vw + len)) - vw / 2
    ctx.strokeStyle = `rgba(190,220,255,${0.05 + 0.16 * k * n})`
    ctx.lineWidth = 2 + n * 3
    ctx.beginPath()
    ctx.moveTo(x0, y)
    ctx.bezierCurveTo(x0 + dir * len * 0.3, y - 26 * n, x0 + dir * len * 0.65, y + 30 * n, x0 + dir * len, y - 8)
    ctx.stroke()
  }
}

/** Small wind gauge in screen space. */
export function drawWindGauge(ctx: CanvasRenderingContext2D, w: World, x: number, y: number) {
  const wind = windAt(w)
  const k = Math.max(-1, Math.min(1, wind / Math.max(1, w.tune.windStrength)))
  ctx.save(); ctx.translate(x, y)
  ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(-36, -2, 72, 4)
  ctx.fillStyle = '#9cd0ff'; ctx.fillRect(0, -2, 36 * k, 4)
  ctx.beginPath(); ctx.moveTo(36 * k, -7); ctx.lineTo(36 * k + 8 * (k >= 0 ? 1 : -1), 0); ctx.lineTo(36 * k, 7); ctx.fill()
  ctx.restore()
}

/** A physical crosswind vent, shown on the shaft wall that currently carries the gust. */
export function drawWindVent(ctx: CanvasRenderingContext2D, w: World, reduce: boolean) {
  if (!w.modifiers.includes('wind-vents')) return
  const side = w.ventSide, x = side * 378, y = w.ventY
  const pulse = reduce ? 0.65 : 0.2 + 0.8 * Math.max(0, Math.sin(w.t * 1.55 + w.ventPhase))
  ctx.save(); ctx.translate(x, y)
  ctx.fillStyle = '#101925'; ctx.strokeStyle = '#65819b'; ctx.lineWidth = 3
  ctx.fillRect(-23, -58, 46, 116); ctx.strokeRect(-23, -58, 46, 116)
  ctx.strokeStyle = '#293f54'; ctx.lineWidth = 2
  for (let row = -3; row <= 3; row++) { ctx.beginPath(); ctx.moveTo(-16, row * 12); ctx.lineTo(16, row * 12); ctx.stroke() }
  ctx.globalAlpha = 0.25 + pulse * 0.55; ctx.strokeStyle = '#73ddff'; ctx.fillStyle = '#9beaff'; ctx.shadowColor = '#57d8ff'; ctx.shadowBlur = reduce ? 0 : 14
  for (let row = -1; row <= 1; row++) {
    const yy = row * 15
    ctx.beginPath(); ctx.moveTo(side * 31, yy - 5); ctx.lineTo(-side * 43, yy); ctx.lineTo(side * 31, yy + 5); ctx.stroke()
  }
  ctx.globalAlpha = 0.14 + pulse * 0.18; ctx.lineWidth = reduce ? 8 : 18
  ctx.beginPath(); ctx.moveTo(-side * 30, 0); ctx.lineTo(-side * 220, 0); ctx.stroke()
  ctx.restore()
}
