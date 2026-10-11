import { World, FIELD_HALF } from '../sim/world'
import { hash2 } from './fog'

/** Three depths of falling panels: far (slow), mid, and near speed streaks. */
export function drawBackground(ctx: CanvasRenderingContext2D, w: World, vw: number, vh: number) {
  const layers = [
    { tile: 380, par: 0.3, a: '#0e1320', b: '#121a29' },
    { tile: 220, par: 1, a: '#161c28', b: '#1d2535' },
  ]
  for (const L of layers) {
    const off = w.scroll * L.par
    const base = Math.floor(off / L.tile)
    const rem = off - base * L.tile
    const rows = Math.ceil(vh / 2 / L.tile) + 1
    const cols = Math.ceil(Math.min(vw / 2, FIELD_HALF) / L.tile) + 1
    for (let gy = -rows; gy <= rows; gy++) {
      for (let gx = -cols; gx <= cols; gx++) {
        const x = gx * L.tile
        if (Math.abs(x) > FIELD_HALF) continue
        ctx.fillStyle = hash2(gx, gy + base) > 0.66 ? L.b : L.a
        ctx.fillRect(x + 4, gy * L.tile - rem + 4, L.tile - 8, L.tile - 8)
      }
    }
  }
}

/** Near streaks: thin vertical lines that stretch with the fall speed. */
export function drawStreaks(ctx: CanvasRenderingContext2D, w: World, vh: number) {
  const len = 30 + w.fallV * 0.55
  const period = vh + 600
  ctx.lineWidth = 2
  for (let i = 0; i < 46; i++) {
    const n = hash2(i, 7), m = hash2(i, 13)
    const x = (n * 2 - 1) * FIELD_HALF
    const y = (((m * period - w.scroll * (1.6 + n)) % period) + period) % period - period / 2
    ctx.strokeStyle = `rgba(150,190,240,${0.04 + 0.1 * Math.min(1, w.fallV / 300) * m})`
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + len * (0.5 + n)); ctx.stroke()
  }
}
