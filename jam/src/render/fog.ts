// Drifting fog banks, in the style of 616 Survivor's: hash-seeded grid cells with soft blobs,
// drawn from a cached offscreen gradient (per-frame gradients are far too slow).
import { World, FIELD_HALF } from '../sim/world'

const blobs = new Map<string, HTMLCanvasElement>()
export function softBlob(color: string): HTMLCanvasElement {
  let c = blobs.get(color)
  if (c) return c
  c = document.createElement('canvas'); c.width = c.height = 128
  const g = c.getContext('2d')!
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  grad.addColorStop(0, color); grad.addColorStop(0.45, color + '99'); grad.addColorStop(1, color + '00')
  g.fillStyle = grad; g.fillRect(0, 0, 128, 128)
  if (blobs.size > 32) blobs.clear()
  blobs.set(color, c)
  return c
}

export function hash2(x: number, y: number) {
  let h = (Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263)) >>> 0
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

const CELL = 460
export function drawFog(ctx: CanvasRenderingContext2D, w: World, windX: number, vw: number, vh: number, layer: 'back' | 'front') {
  const pf = layer === 'back' ? 0.55 : 1.4
  const density = Math.max(0.25, Math.min(1.2, 0.35 + w.fallV / 220)) * (layer === 'back' ? 0.9 : 0.55)
  const off = w.scroll * pf
  const base = Math.floor(off / CELL)
  const rem = off - base * CELL
  const rows = Math.ceil(vh / 2 / CELL) + 2
  const sprite = softBlob('#9db3cf')
  const span = FIELD_HALF + 500
  for (let gy = -rows; gy <= rows; gy++) {
    const gyAbs = gy + base
    for (let gx = -Math.ceil(span / CELL); gx <= Math.ceil(span / CELL); gx++) {
      const n = hash2(gx + (layer === 'front' ? 91 : 0), gyAbs)
      if (n > 0.62) continue
      const x = gx * CELL + ((w.t * (5 + n * 9) + windX * (0.5 + n)) % (CELL * 2)) - CELL * 0.5 + n * 120
      if (Math.abs(x) > span + 200) continue
      const y = gy * CELL - rem + Math.sin(w.t / 5 + gyAbs * 2.2) * 26
      const rx = 230 + n * 220, ry = 70 + n * 70
      ctx.globalAlpha = (0.09 + n * 0.15) * density
      ctx.drawImage(sprite, x - rx, y - ry, rx * 2, ry * 2)
    }
  }
  ctx.globalAlpha = 1
}
