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
