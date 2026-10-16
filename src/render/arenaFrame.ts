// Arena Frames: a physical frame drawn around your arena (inside the arena transform, outside the glass and girders). Each style is a different
// object: riveted angle iron, a starfield, a brass bezel, hazard stripes, neon tube, ice, circuit board, chains, gilded scrollwork, oak.
// Render-only (PongPainter slot `arena.frame`; the value is `style:#colour`, or a plain colour for the simple line frame).
import { mix, rgba, shade, tint } from '../world/palette'

export type FrameStyle = 'line' | 'foundry' | 'deepspace' | 'brass' | 'hazard' | 'neon' | 'ice' | 'circuit' | 'chain' | 'gilded' | 'oak' | 'stained' | 'vines' | 'aurora' | 'plasma' | 'embers' | 'storm' | 'prism'
export const FRAME_STYLES: readonly FrameStyle[] = ['line', 'foundry', 'deepspace', 'brass', 'hazard', 'neon', 'ice', 'circuit', 'chain', 'gilded', 'oak', 'stained', 'vines', 'aurora', 'plasma', 'embers', 'storm', 'prism']
export interface ParsedFrame { style: FrameStyle; color: string }
const HEX = /^#[0-9a-f]{6}$/i
/** `style:#rrggbb`, or a plain `#rrggbb` (the simple line frame). The starter blue means "no frame". Anything else is ignored. */
export function parseFrame(value: string | undefined): ParsedFrame | null {
  if (!value) return null
  const [a, b] = value.includes(':') ? value.split(':') : ['line', value]
  if (!b || !HEX.test(b) || !(FRAME_STYLES as readonly string[]).includes(a!)) return null
  if (a === 'line' && b.toLowerCase() === '#4aa8ff') return null
  return { style: a as FrameStyle, color: b }
}
export const FRAME_PAD = 18

const rr = (c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => { c.beginPath(); c.roundRect(x, y, w, h, r) }
/** The band between the outer and inner rounded rectangles. */
function band(c: CanvasRenderingContext2D, W: number, H: number, pad: number, inset: number, r: number) {
  const ox = -W / 2 - pad, oy = -H / 2 - pad, ow = W + pad * 2, oh = H + pad * 2
  c.beginPath(); c.roundRect(ox, oy, ow, oh, r + 2); c.roundRect(ox + inset, oy + inset, ow - inset * 2, oh - inset * 2, Math.max(1, r - 2)); 
}
const rnd = (n: number) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s) }
const rivets = (c: CanvasRenderingContext2D, W: number, H: number, pad: number, every: number, col: string) => {
  const x0 = -W / 2 - pad / 2, x1 = W / 2 + pad / 2, y0 = -H / 2 - pad / 2, y1 = H / 2 + pad / 2
  const dot = (x: number, y: number) => { c.fillStyle = 'rgba(0,0,0,.5)'; c.beginPath(); c.arc(x, y + 0.8, 2.4, 0, 7); c.fill(); const g = c.createRadialGradient(x - 0.7, y - 0.8, 0.3, x, y, 2.4); g.addColorStop(0, '#fff'); g.addColorStop(0.5, col); g.addColorStop(1, shade(col, -0.3)); c.fillStyle = g; c.beginPath(); c.arc(x, y, 2.2, 0, 7); c.fill() }
  for (let x = x0 + every; x < x1 - every / 2; x += every) { dot(x, y0); dot(x, y1) }
  for (let y = y0 + every; y < y1 - every / 2; y += every) { dot(x0, y); dot(x1, y) }
  for (const [x, y] of [[x0, y0], [x1, y0], [x0, y1], [x1, y1]] as const) dot(x, y)
}
const bevel = (c: CanvasRenderingContext2D) => { c.save(); c.clip('evenodd'); c.strokeStyle = 'rgba(255,255,255,.4)'; c.lineWidth = 2; c.stroke(); c.restore() }

type Painter = (c: CanvasRenderingContext2D, W: number, H: number, color: string, t: number, reduce: boolean) => void
const P = FRAME_PAD
type PackFrame = 'stained' | 'vines' | 'aurora' | 'plasma' | 'embers' | 'storm' | 'prism'
const BASE_PAINTERS: Record<Exclude<FrameStyle, PackFrame>, Painter> = {
  line: (c, W, H, color) => { c.save(); c.strokeStyle = color; c.lineWidth = 3; c.shadowColor = color; c.shadowBlur = 8; rr(c, -W / 2 - 8, -H / 2 - 8, W + 16, H + 16, 8); c.stroke(); c.restore() },

  foundry: (c, W, H, color, t, reduce) => {
    const pulse = reduce ? 0.7 : 0.55 + 0.25 * Math.sin(t * 1.7)
    band(c, W, H, P, 13, 6); const g = c.createLinearGradient(0, -H / 2 - P, 0, H / 2 + P); g.addColorStop(0, '#4a4f58'); g.addColorStop(0.5, '#2a2d33'); g.addColorStop(1, '#17191d'); c.fillStyle = g; c.fill('evenodd'); bevel(c)
    c.save(); c.shadowColor = color; c.shadowBlur = 16 * pulse; c.strokeStyle = rgba(color, 0.55 + 0.4 * pulse); c.lineWidth = 2.4; rr(c, -W / 2 - P + 13, -H / 2 - P + 13, W + (P - 13) * 2, H + (P - 13) * 2, 4); c.stroke(); c.restore()
    rivets(c, W, H, P, 46, '#c9ced6')
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) { c.fillStyle = '#3a3e46'; c.beginPath(); c.moveTo(sx * (W / 2 + P), sy * (H / 2 + P)); c.lineTo(sx * (W / 2 + P - 30), sy * (H / 2 + P)); c.lineTo(sx * (W / 2 + P), sy * (H / 2 + P - 30)); c.closePath(); c.fill(); c.strokeStyle = 'rgba(0,0,0,.6)'; c.stroke() }
  },

  deepspace: (c, W, H, color, t, reduce) => {
    band(c, W, H, P, 11, 8); const g = c.createLinearGradient(-W / 2, -H / 2, W / 2, H / 2); g.addColorStop(0, '#0a1030'); g.addColorStop(1, '#161040'); c.fillStyle = g; c.fill('evenodd')
    c.save(); c.clip('evenodd')
    for (let i = 0; i < 120; i++) { const x = (rnd(i) - 0.5) * (W + P * 2), y = (rnd(i + 99) - 0.5) * (H + P * 2), tw = reduce ? 0.8 : 0.5 + 0.5 * Math.sin(t * (1 + rnd(i + 7) * 2) + i); c.fillStyle = `rgba(255,255,255,${0.25 + 0.7 * tw * rnd(i + 3)})`; c.fillRect(x, y, 1.2 + rnd(i + 5) * 1.4, 1.2 + rnd(i + 5) * 1.4) }
    c.restore()
    c.save(); c.shadowColor = color; c.shadowBlur = 14; c.strokeStyle = color; c.lineWidth = 1.8; rr(c, -W / 2 - P + 11, -H / 2 - P + 11, W + (P - 11) * 2, H + (P - 11) * 2, 4); c.stroke(); c.restore()
    const a = reduce ? 0.6 : t * 0.35, rx = W / 2 + P / 2, ry = H / 2 + P / 2
    for (let k = 0; k < 3; k++) { const ang = a + k * 2.1, x = Math.max(-rx, Math.min(rx, Math.cos(ang) * rx * 1.5)), y = Math.max(-ry, Math.min(ry, Math.sin(ang) * ry * 1.5)); const gl = c.createRadialGradient(x, y, 0, x, y, 9); gl.addColorStop(0, '#fff'); gl.addColorStop(0.3, color); gl.addColorStop(1, rgba(color, 0)); c.fillStyle = gl; c.fillRect(x - 9, y - 9, 18, 18) }
  },

  brass: (c, W, H, color) => {
    const brass = mix('#c79a3a', color, 0.18)
    band(c, W, H, P, 13, 7); const g = c.createLinearGradient(-W / 2 - P, -H / 2 - P, W / 2 + P, H / 2 + P); g.addColorStop(0, shade(brass, 0.22)); g.addColorStop(0.35, brass); g.addColorStop(0.6, shade(brass, -0.1)); g.addColorStop(1, shade(brass, -0.32)); c.fillStyle = g; c.fill('evenodd'); bevel(c)
    c.strokeStyle = 'rgba(60,35,5,.55)'; c.lineWidth = 1; for (let x = -W / 2; x < W / 2; x += 22) { c.beginPath(); c.moveTo(x, -H / 2 - P + 3); c.lineTo(x, -H / 2 - P + 9); c.moveTo(x, H / 2 + P - 3); c.lineTo(x, H / 2 + P - 9); c.stroke() }
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) { const x = sx * (W / 2 + P / 2), y = sy * (H / 2 + P / 2); const d = c.createRadialGradient(x - 3, y - 3, 1, x, y, 15); d.addColorStop(0, shade(brass, 0.35)); d.addColorStop(0.6, brass); d.addColorStop(1, shade(brass, -0.4)); c.fillStyle = d; c.beginPath(); c.arc(x, y, 14, 0, 7); c.fill(); c.strokeStyle = 'rgba(0,0,0,.55)'; c.stroke(); c.fillStyle = shade(brass, -0.45); c.fillRect(x - 6, y - 1, 12, 2); c.fillRect(x - 1, y - 6, 2, 12) }
  },

  hazard: (c, W, H, color) => {
    band(c, W, H, P, 12, 4); c.fillStyle = '#15120a'; c.fill('evenodd')
    c.save(); c.clip('evenodd'); c.fillStyle = mix('#ffcf3a', color, 0.25)
    const span = W + H + P * 4; for (let d = -span; d < span; d += 34) { c.beginPath(); c.moveTo(-W / 2 - P + d, -H / 2 - P); c.lineTo(-W / 2 - P + d + 17, -H / 2 - P); c.lineTo(-W / 2 - P + d + 17 + H + P * 2, H / 2 + P); c.lineTo(-W / 2 - P + d + H + P * 2, H / 2 + P); c.closePath(); c.fill() }
    c.restore(); bevel(c)
  },

  neon: (c, W, H, color, t, reduce) => {
    const flick = reduce ? 1 : 0.88 + 0.12 * Math.sin(t * 23) * Math.sin(t * 3.1)
    for (const [off, w] of [[10, 2.6], [4, 2.6]] as const) { c.save(); c.shadowColor = color; c.shadowBlur = 18 * flick; c.strokeStyle = rgba(mix(color, '#ffffff', 0.55), 0.92 * flick); c.lineWidth = w; c.lineCap = 'round'; const gap = off === 10 ? 60 : 0; const x = -W / 2 - off, y = -H / 2 - off, w2 = W + off * 2, h2 = H + off * 2
      c.beginPath(); c.moveTo(x + gap + 12, y); c.lineTo(x + w2 - 12, y); c.quadraticCurveTo(x + w2, y, x + w2, y + 12); c.lineTo(x + w2, y + h2 - 12); c.quadraticCurveTo(x + w2, y + h2, x + w2 - 12, y + h2); c.lineTo(x + 12, y + h2); c.quadraticCurveTo(x, y + h2, x, y + h2 - 12); c.lineTo(x, y + 12); c.quadraticCurveTo(x, y, x + 12, y); c.lineTo(x + gap, y); c.stroke(); c.restore() }
    c.fillStyle = '#222'; for (const [x, y] of [[-W / 2 - 12, -H / 2 - 12], [W / 2 + 12, -H / 2 - 12], [-W / 2 - 12, H / 2 + 12], [W / 2 + 12, H / 2 + 12]] as const) { c.fillRect(x - 3, y - 3, 6, 6) }
  },

  ice: (c, W, H, color, t, reduce) => {
    const frost = mix('#dff3ff', color, 0.25)
    band(c, W, H, P, 14, 9); const g = c.createLinearGradient(0, -H / 2 - P, 0, H / 2 + P); g.addColorStop(0, rgba('#ffffff', 0.85)); g.addColorStop(0.5, rgba(frost, 0.5)); g.addColorStop(1, rgba(mix(frost, '#6aa6d8', 0.6), 0.7)); c.fillStyle = g; c.fill('evenodd'); bevel(c)
    c.fillStyle = rgba('#ffffff', 0.8); for (let x = -W / 2 + 10; x < W / 2; x += 26) { const h = 8 + rnd(x) * 16; c.beginPath(); c.moveTo(x - 4, H / 2 + P - 8); c.lineTo(x + 4, H / 2 + P - 8); c.lineTo(x + 0.5, H / 2 + P - 8 + h); c.closePath(); c.fill() }
    for (let i = 0; i < 9; i++) { const k = reduce ? 0.7 : 0.5 + 0.5 * Math.sin(t * 2 + i * 1.7); c.fillStyle = `rgba(255,255,255,${0.3 + 0.7 * k})`; const x = (rnd(i + 4) - 0.5) * (W + P), y = rnd(i) > 0.5 ? -H / 2 - P / 2 : H / 2 + P / 2; c.fillRect(x - 1, y - 4, 2, 8); c.fillRect(x - 4, y - 1, 8, 2) }
  },

  circuit: (c, W, H, color, t, reduce) => {
    band(c, W, H, P, 14, 5); c.fillStyle = '#071410'; c.fill('evenodd'); c.save(); c.clip('evenodd')
    c.strokeStyle = rgba(color, 0.55); c.lineWidth = 1.4
    const trace = (i: number, horiz: boolean, edge: number) => { const len = 40 + rnd(i) * 120, p0 = (rnd(i + 20) - 0.5) * (horiz ? W : H); c.beginPath(); if (horiz) { c.moveTo(p0, edge - 4); c.lineTo(p0 + len, edge - 4); c.lineTo(p0 + len + 8, edge + 2) } else { c.moveTo(edge - 4, p0); c.lineTo(edge - 4, p0 + len); c.lineTo(edge + 2, p0 + len + 8) } c.stroke() }
    for (let i = 0; i < 14; i++) { trace(i, true, -H / 2 - P / 2); trace(i + 40, true, H / 2 + P / 2); trace(i + 80, false, -W / 2 - P / 2); trace(i + 120, false, W / 2 + P / 2) }
    for (let i = 0; i < 26; i++) { const k = reduce ? 0.6 : 0.5 + 0.5 * Math.sin(t * 2.4 + i); const side = i % 4, u = (rnd(i + 9) - 0.5), x = side < 2 ? u * W : (side === 2 ? -1 : 1) * (W / 2 + P / 2), y = side < 2 ? (side === 0 ? -1 : 1) * (H / 2 + P / 2) : u * H; const gl = c.createRadialGradient(x, y, 0, x, y, 8); gl.addColorStop(0, rgba(mix(color, '#ffffff', 0.5), 0.4 + 0.6 * k)); gl.addColorStop(1, rgba(color, 0)); c.fillStyle = gl; c.fillRect(x - 8, y - 8, 16, 16) }
    c.restore(); c.save(); c.strokeStyle = rgba(color, 0.7); c.lineWidth = 1.5; rr(c, -W / 2 - P + 14, -H / 2 - P + 14, W + (P - 14) * 2, H + (P - 14) * 2, 3); c.stroke(); c.restore()
  },

  chain: (c, W, H, color, t, reduce) => {
    band(c, W, H, 12, 8, 4); const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#5b6068'); g.addColorStop(1, '#2a2d33'); c.fillStyle = g; c.fill('evenodd'); bevel(c)
    const link = (x: number, y: number, vertical: boolean, k: number) => { c.save(); c.translate(x, y); if (vertical) c.rotate(Math.PI / 2); c.strokeStyle = k % 2 ? shade(color, -0.1) : mix(color, '#d9dee6', 0.5); c.lineWidth = 3; c.beginPath(); c.ellipse(0, 0, 8, k % 2 ? 3 : 5, 0, 0, 7); c.stroke(); c.restore() }
    const sway = reduce ? 0 : Math.sin(t * 1.3) * 1.5
    for (const sx of [-1, 1]) for (let k = 0; k < 12; k++) link(sx * (W / 2 - 18) + sway * (k / 12), -H / 2 - 12 - k * 7, true, k)
    for (const sy of [-1, 1]) for (let k = 0; k < Math.floor(W / 14); k++) link(-W / 2 + 8 + k * 14, sy * (H / 2 + 6), false, k)
    rivets(c, W, H, 12, 60, '#d9dee6')
  },

  gilded: (c, W, H, color) => {
    const gold = mix('#e8c25a', color, 0.15)
    band(c, W, H, P, 12, 6); const g = c.createLinearGradient(-W / 2 - P, 0, W / 2 + P, 0); g.addColorStop(0, shade(gold, -0.2)); g.addColorStop(0.3, shade(gold, 0.2)); g.addColorStop(0.6, gold); g.addColorStop(1, shade(gold, -0.3)); c.fillStyle = g; c.fill('evenodd'); bevel(c)
    c.strokeStyle = shade(gold, -0.4); c.lineWidth = 1.4
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) { const cx = sx * (W / 2 + P / 2), cy = sy * (H / 2 + P / 2); for (let r = 14; r <= 26; r += 6) { c.beginPath(); c.arc(cx, cy, r, sx < 0 ? (sy < 0 ? 0 : -Math.PI / 2) : (sy < 0 ? Math.PI / 2 : Math.PI), sx < 0 ? (sy < 0 ? Math.PI / 2 : 0) : (sy < 0 ? Math.PI : Math.PI * 1.5)); c.stroke() } c.fillStyle = '#f7f1dc'; c.beginPath(); c.arc(cx, cy, 4.2, 0, 7); c.fill(); c.stroke() }
    c.fillStyle = '#f7f1dc'; for (let x = -W / 2 + 40; x < W / 2 - 20; x += 40) { for (const y of [-H / 2 - P / 2, H / 2 + P / 2]) { c.beginPath(); c.arc(x, y, 2.6, 0, 7); c.fill() } }
  },

  oak: (c, W, H, color) => {
    const wood = mix('#8a5a2e', color, 0.15)
    band(c, W, H, P, 14, 5); const g = c.createLinearGradient(0, -H / 2 - P, 0, H / 2 + P); g.addColorStop(0, shade(wood, 0.15)); g.addColorStop(1, shade(wood, -0.25)); c.fillStyle = g; c.fill('evenodd'); c.save(); c.clip('evenodd')
    c.strokeStyle = 'rgba(40,20,5,.35)'; c.lineWidth = 1; for (let i = 0; i < 60; i++) { const y = -H / 2 - P + rnd(i) * (H + P * 2); c.beginPath(); c.moveTo(-W / 2 - P, y); c.bezierCurveTo(-W / 4, y + rnd(i + 3) * 6 - 3, W / 4, y + rnd(i + 8) * 6 - 3, W / 2 + P, y + rnd(i + 5) * 4 - 2); c.stroke() }
    for (let i = 0; i < 40; i++) { const x = -W / 2 - P + rnd(i + 77) * (W + P * 2); c.beginPath(); c.moveTo(x, -H / 2 - P); c.lineTo(x + rnd(i) * 4 - 2, -H / 2 - P + 14); c.moveTo(x, H / 2 + P); c.lineTo(x + rnd(i) * 4 - 2, H / 2 + P - 14); c.stroke() }
    c.restore(); bevel(c)
    c.strokeStyle = 'rgba(0,0,0,.55)'; c.lineWidth = 2; for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) { const x = sx * (W / 2 + P / 2), y = sy * (H / 2 + P / 2); c.fillStyle = shade(wood, -0.3); c.beginPath(); c.arc(x, y, 4, 0, 7); c.fill(); c.stroke() }
  },
}

// ---- LokPack frames: rarer, animated (reduce motion freezes them on a pleasing still) ----
/** A point `f` (0..1) of the way round the middle of the frame band. */
const around = (W: number, H: number, f: number): [number, number] => {
  const hx = W / 2 + P / 2, hy = H / 2 + P / 2, pw = hx * 2, ph = hy * 2, per = 2 * (pw + ph); let d = ((f % 1) + 1) % 1 * per
  if (d < pw) return [-hx + d, -hy]; d -= pw
  if (d < ph) return [hx, -hy + d]; d -= ph
  if (d < pw) return [hx - d, hy]; d -= pw
  return [-hx, hy - d]
}
const bandBase = (c: CanvasRenderingContext2D, W: number, H: number, inset: number, top: string, bottom: string) => {
  band(c, W, H, P, inset, 7); const g = c.createLinearGradient(0, -H / 2 - P, 0, H / 2 + P); g.addColorStop(0, top); g.addColorStop(1, bottom); c.fillStyle = g; c.fill('evenodd'); c.save(); c.clip('evenodd')
}
const bolt = (c: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, seed: number, jag: number) => {
  c.beginPath(); c.moveTo(x0, y0)
  for (let i = 1; i < 9; i++) { const f = i / 9; c.lineTo(x0 + (x1 - x0) * f + (rnd(seed + i) - 0.5) * jag, y0 + (y1 - y0) * f + (rnd(seed + i + 40) - 0.5) * jag) }
  c.lineTo(x1, y1); c.stroke()
}
const PACK_PAINTERS: Record<PackFrame, Painter> = {
  stained: (c, W, H, color) => {
    bandBase(c, W, H, 12, '#1a1424', '#0c0a14')
    const n = 36
    for (let i = 0; i < n; i++) {
      const [x, y] = around(W, H, i / n), [x2, y2] = around(W, H, (i + 1) / n), hue = (i * 47 + rnd(i) * 40) % 360
      c.fillStyle = `hsla(${hue},70%,${48 + rnd(i + 9) * 14}%,.85)`; c.beginPath(); c.arc((x + x2) / 2, (y + y2) / 2, P * 0.52, 0, 7); c.fill()
      c.strokeStyle = 'rgba(12,8,16,.9)'; c.lineWidth = 2.2; c.stroke()
    }
    c.fillStyle = rgba(color, 0.12); c.fillRect(-W, -H, W * 2, H * 2); c.restore(); bevel(c)
  },
  vines: (c, W, H, color, t, reduce) => {
    bandBase(c, W, H, 12, '#2a2f2a', '#14180f')
    const sway = reduce ? 0 : t, n = 90
    c.strokeStyle = shade(color, -0.15); c.lineWidth = 2.6; c.lineCap = 'round'; c.beginPath()
    for (let i = 0; i <= n; i++) { const f = i / n, [x, y] = around(W, H, f), o = Math.sin(f * 60 + sway * 1.2) * 4; i ? c.lineTo(x + o * 0.6, y + o) : c.moveTo(x + o * 0.6, y + o) }
    c.stroke()
    for (let i = 0; i < 46; i++) { const f = (i + 0.5) / 46, [x, y] = around(W, H, f), a = f * 40 + Math.sin(sway * 1.4 + i) * 0.35; c.save(); c.translate(x, y); c.rotate(a); c.fillStyle = i % 5 === 0 ? '#ff9ad5' : shade(color, (rnd(i) - 0.5) * 0.2); c.beginPath(); c.ellipse(5, 0, i % 5 === 0 ? 3.4 : 6, 2.6, 0, 0, 7); c.fill(); c.restore() }
    c.restore(); bevel(c)
  },
  aurora: (c, W, H, color, t, reduce) => {
    bandBase(c, W, H, 11, '#0a2c3c', '#0b1a2e')
    const span = W + P * 2, x0 = -W / 2 - P, shift = reduce ? 0.3 * span : ((t * 38) % span), col2 = tint(color, 70)
    c.globalCompositeOperation = 'lighter'
    for (const [dx, hue] of [[0, color], [span * 0.45, col2], [span * 0.8, shade(color, 0.1)]] as const) for (const k of [-1, 0]) {
      const sx = x0 + ((shift + dx) % span) + k * span, g = c.createLinearGradient(sx, 0, sx + span * 0.6, 0)
      g.addColorStop(0, rgba(hue, 0)); g.addColorStop(0.5, rgba(hue, 0.95)); g.addColorStop(1, rgba(hue, 0)); c.fillStyle = g; c.fillRect(sx, -H, span * 0.6, H * 2)
    }
    c.globalCompositeOperation = 'source-over'
    for (let i = 0; i < 40; i++) { const x = (rnd(i) - 0.5) * span, y = (rnd(i + 70) - 0.5) * (H + P * 2); c.fillStyle = `rgba(255,255,255,${0.2 + 0.6 * (reduce ? 0.5 : 0.5 + 0.5 * Math.sin(t * 2 + i))})`; c.fillRect(x, y, 1.3, 1.3) }
    c.restore(); bevel(c)
  },
  plasma: (c, W, H, color, t, reduce) => {
    bandBase(c, W, H, 13, '#120a1e', '#07040d')
    const inner = (g: number) => { c.save(); c.shadowColor = color; c.shadowBlur = g; c.strokeStyle = rgba(color, 0.9); c.lineWidth = 3; rr(c, -W / 2 - P + 13, -H / 2 - P + 13, W + (P - 13) * 2, H + (P - 13) * 2, 4); c.stroke(); c.restore() }
    c.restore(); inner(14)
    c.save(); c.lineCap = 'round'; c.shadowColor = '#fff'; c.shadowBlur = 8
    for (let k = 0; k < 3; k++) {
      const head = reduce ? 0.1 + k * 0.33 : (t * 0.09 + k / 3) % 1
      c.strokeStyle = k % 2 ? '#ffffff' : tint(color, 40); c.lineWidth = 1.8; c.beginPath()
      for (let i = 0; i <= 26; i++) { const [x, y] = around(W, H, head - i * 0.0035), j = (rnd(i + k * 31 + Math.floor(t * 18)) - 0.5) * (reduce ? 2 : 7); i ? c.lineTo(x + j, y + j) : c.moveTo(x + j, y + j) }
      c.stroke()
    }
    c.restore(); bevel(c)
  },
  embers: (c, W, H, color, t, reduce) => {
    bandBase(c, W, H, 12, '#2a1308', '#120603')
    const glow = reduce ? 0.7 : 0.6 + 0.3 * Math.sin(t * 2.3)
    const g = c.createLinearGradient(0, H / 2 + P, 0, -H / 2 - P); g.addColorStop(0, rgba(color, glow)); g.addColorStop(0.55, rgba(color, 0.12)); g.addColorStop(1, rgba(color, 0)); c.fillStyle = g; c.fillRect(-W, -H, W * 2, H * 2)
    for (let i = 0; i < 70; i++) {
      const life = reduce ? rnd(i + 3) : (t * (0.25 + rnd(i) * 0.35) + rnd(i + 9)) % 1, [bx, by] = around(W, H, rnd(i + 5))
      c.fillStyle = rgba(life < 0.5 ? '#ffe9a8' : color, (1 - life) * 0.95); c.beginPath(); c.arc(bx + Math.sin(life * 9 + i) * 5, by - life * 34, 1.1 + (1 - life) * 1.5, 0, 7); c.fill()
    }
    c.restore(); bevel(c)
  },
  storm: (c, W, H, color, t, reduce) => {
    bandBase(c, W, H, 12, '#262e3a', '#10141b')
    const cyc = reduce ? 0 : Math.floor(t * 1.6), phase = reduce ? 0.2 : (t * 1.6) % 1, flash = Math.max(0, 1 - phase * 3)
    c.fillStyle = rgba(color, flash * 0.22); c.fillRect(-W, -H, W * 2, H * 2)
    c.lineCap = 'round'; c.lineJoin = 'round'
    for (let b = 0; b < 2; b++) {
      const [x0, y0] = around(W, H, rnd(cyc * 2 + b) ), [x1, y1] = around(W, H, rnd(cyc * 2 + b + 7))
      c.save(); c.globalAlpha = reduce ? 0.8 : Math.max(0.05, 1 - phase * 1.4); c.shadowColor = color; c.shadowBlur = 14; c.strokeStyle = '#ffffff'; c.lineWidth = 2; bolt(c, x0, y0, x1, y1, cyc * 13 + b * 5, 26); c.restore()
    }
    c.restore()
    c.save(); c.strokeStyle = rgba(color, 0.7 + flash * 0.3); c.shadowColor = color; c.shadowBlur = 6 + flash * 14; c.lineWidth = 2; rr(c, -W / 2 - P + 12, -H / 2 - P + 12, W + (P - 12) * 2, H + (P - 12) * 2, 4); c.stroke(); c.restore()
    rivets(c, W, H, P, 52, '#9aa6b8'); bevel(c)
  },
  prism: (c, W, H, _color, t, reduce) => {
    band(c, W, H, P, 12, 7); c.save(); c.clip('evenodd')
    const rot = reduce ? 0.6 : t * 0.35
    if (typeof c.createConicGradient === 'function') {
      const g = c.createConicGradient(rot, 0, 0); for (let i = 0; i <= 12; i++) g.addColorStop(i / 12, `hsl(${(i * 30) % 360},85%,${i % 2 ? 62 : 74}%)`); c.fillStyle = g
    } else c.fillStyle = '#cfe8ff'
    c.fillRect(-W, -H, W * 2, H * 2)
    c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 1
    for (let i = 0; i < 44; i++) { const [x, y] = around(W, H, i / 44); c.beginPath(); c.moveTo(x, y); c.lineTo(x + (i % 2 ? 9 : -9), y + (i % 3 ? 9 : -9)); c.stroke() }
    const [gx, gy] = around(W, H, reduce ? 0.2 : (t * 0.07) % 1), gl = c.createRadialGradient(gx, gy, 0, gx, gy, 46); gl.addColorStop(0, 'rgba(255,255,255,.95)'); gl.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gl; c.fillRect(gx - 46, gy - 46, 92, 92)
    c.restore(); bevel(c)
    c.save(); c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 1.6; rr(c, -W / 2 - P + 12, -H / 2 - P + 12, W + (P - 12) * 2, H + (P - 12) * 2, 4); c.stroke(); c.restore()
  },
}
const PAINTERS: Record<FrameStyle, Painter> = { ...BASE_PAINTERS, ...PACK_PAINTERS }

export function drawArenaFrame(c: CanvasRenderingContext2D, W: number, H: number, frame: ParsedFrame, t: number, reduce: boolean) {
  c.save(); c.setLineDash([]); c.globalAlpha = 1; c.shadowBlur = 0
  PAINTERS[frame.style](c, W, H, frame.color, t, reduce)
  c.restore()
}
