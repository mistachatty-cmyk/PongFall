// The shaft walls as riveted metal plates, with eye sockets cut into them, so the eyes read as part of the wall.
import { World, FIELD_HALF } from '../sim/world'
import { hash2 } from './fog'

export const WALL_EYE_X = FIELD_HALF + 30   // eye centres sit inside the plates
const INNER = FIELD_HALF - 30               // the wall surface
const PLATE_H = 210

export function drawWalls(ctx: CanvasRenderingContext2D, w: World, vh: number) {
  const top = -vh / 2 - 120, bot = vh / 2 + 120
  const off = w.scroll, base = Math.floor(off / PLATE_H)
  for (const wall of [-1, 1] as const) {
    const x0 = wall === -1 ? -INNER - 450 : INNER
    const inner = wall === -1 ? -INNER : INNER
    const g = ctx.createLinearGradient(inner, 0, inner + wall * 450, 0)
    g.addColorStop(0, '#2c3648'); g.addColorStop(0.35, '#1d2534'); g.addColorStop(1, '#0f141e')
    ctx.fillStyle = g
    ctx.fillRect(x0, top, 450, bot - top)

    // plate seams and rivets (they scroll with the fall, so the wall is clearly moving)
    for (let gy = Math.floor(top / PLATE_H) - 1; gy <= Math.ceil(bot / PLATE_H) + 1; gy++) {
      const y = gy * PLATE_H - (off - base * PLATE_H)
      ctx.fillStyle = 'rgba(6,9,15,0.9)'; ctx.fillRect(x0, y, 450, 3)
      ctx.fillStyle = 'rgba(150,175,215,0.13)'; ctx.fillRect(x0, y + 3, 450, 1.5)
      for (let k = 0; k < 7; k++) {
        const rx = inner + wall * (22 + k * 62)
        for (const ry of [y + 14, y + PLATE_H - 14]) {
          ctx.fillStyle = 'rgba(8,12,20,0.8)'; ctx.beginPath(); ctx.arc(rx + 1, ry + 1.5, 3.6, 0, 7); ctx.fill()
          ctx.fillStyle = 'rgba(120,145,185,0.5)'; ctx.beginPath(); ctx.arc(rx, ry, 3, 0, 7); ctx.fill()
        }
      }
      // grime and rust streaks running down each plate
      for (let k = 0; k < 4; k++) {
        const n = hash2(gy + base + k * 7, wall + 4)
        const sx = inner + wall * (30 + hash2(k, gy + base) * 330)
        ctx.fillStyle = `rgba(${40 + (n > 0.7 ? 40 : 0)},${28 + (n > 0.7 ? 8 : 20)},${22 + (n > 0.7 ? 0 : 24)},${0.1 + 0.12 * n})`
        ctx.fillRect(sx, y + 6, 6 + n * 14, 60 + n * 130)
      }
    }
    // vertical seams
    ctx.fillStyle = 'rgba(6,9,15,0.8)'
    for (const dx of [120, 260]) ctx.fillRect(inner + wall * dx - 1.5, top, 3, bot - top)
    // the lip of the wall, with a shadow cast onto the shaft
    ctx.fillStyle = '#3c485e'; ctx.fillRect(wall === -1 ? inner - 8 : inner, top, 8, bot - top)
    ctx.fillStyle = 'rgba(190,210,245,0.18)'; ctx.fillRect(wall === -1 ? inner - 8 : inner, top, 2, bot - top)
    const sh = ctx.createLinearGradient(inner, 0, inner - wall * 46, 0)
    sh.addColorStop(0, 'rgba(0,0,0,0.5)'); sh.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = sh; ctx.fillRect(wall === -1 ? inner : inner - 46, top, 46, bot - top)
  }
}

/** A recessed, bolted socket cut into the wall plate around an eye. */
export function drawSocket(ctx: CanvasRenderingContext2D, wall: -1 | 1, x: number, y: number, r: number) {
  const rx = r * 1.2 * 1.38, ry = r * 0.9 * 1.45
  ctx.save()
  ctx.translate(x, y)
  // the recess
  const g = ctx.createRadialGradient(0, 0, ry * 0.3, 0, 0, rx)
  g.addColorStop(0, '#05070c'); g.addColorStop(0.8, '#0a0e16'); g.addColorStop(1, '#161d2a')
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, 7); ctx.fill()
  // bevelled rim: light on the top edge, shadow on the bottom
  ctx.lineWidth = 7
  ctx.strokeStyle = '#38445a'; ctx.beginPath(); ctx.ellipse(0, 0, rx + 3, ry + 3, 0, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke()
  ctx.strokeStyle = '#0a0e16'; ctx.beginPath(); ctx.ellipse(0, 0, rx + 3, ry + 3, 0, Math.PI * 0.05, Math.PI * 0.95); ctx.stroke()
  // bolts around the rim
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2 + 0.3
    const bx = Math.cos(a) * (rx + 13), by = Math.sin(a) * (ry + 13)
    ctx.fillStyle = 'rgba(6,9,15,0.9)'; ctx.beginPath(); ctx.arc(bx + 1, by + 1.5, 4.4, 0, 7); ctx.fill()
    ctx.fillStyle = '#5a6a86'; ctx.beginPath(); ctx.arc(bx, by, 4, 0, 7); ctx.fill()
    ctx.strokeStyle = '#1b2230'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(bx - 2.6, by - 1); ctx.lineTo(bx + 2.6, by + 1); ctx.stroke()
  }
  ctx.restore()
  void wall
}
