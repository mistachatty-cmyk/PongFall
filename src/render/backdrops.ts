// Shaft backdrops: the scene behind everything in the falling shaft (PongPainter slot `theme.backdrop`). Procedural, parallax with the fall, render-only.
// Painted over the shaft's far wall and under its structure, so girders and pipes still read in front. Reduce Motion draws one still frame.
// Each scene stays under ~80 shapes and makes only a few gradients per frame.
import { rgba, tint } from '../world/palette'

export const BACKDROP_IDS = ['deep-well', 'dusk-fog', 'blueprint', 'night-rain', 'ember-chasm', 'neon-rain', 'biolume', 'crystal-cavern', 'aurora-curtains', 'stormfront', 'starfall-void', 'event-horizon'] as const
export type BackdropId = typeof BACKDROP_IDS[number]
export const backdropId = (v?: string): BackdropId | null => (BACKDROP_IDS as readonly string[]).includes(v ?? '') ? v as BackdropId : null

interface Rect { x: number; y: number; w: number; h: number }
type Scene = (c: CanvasRenderingContext2D, r: Rect, t: number, s: number, reduce: boolean) => void
const rnd = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x) }
const wrap = (v: number, m: number) => ((v % m) + m) % m
const fill = (c: CanvasRenderingContext2D, r: Rect, top: string, bottom: string) => { const g = c.createLinearGradient(0, r.y, 0, r.y + r.h); g.addColorStop(0, top); g.addColorStop(1, bottom); c.fillStyle = g; c.fillRect(r.x, r.y, r.w, r.h) }
/** A point that drifts upward with the fall (parallax `p`) and wraps inside the rect. */
const pt = (r: Rect, i: number, s: number, p: number): [number, number] => [r.x + rnd(i) * r.w, r.y + wrap(rnd(i + 50) * r.h - s * p, r.h)]
const glowDot = (c: CanvasRenderingContext2D, x: number, y: number, rad: number, col: string, a: number) => { const g = c.createRadialGradient(x, y, 0, x, y, rad); g.addColorStop(0, rgba(col, a)); g.addColorStop(1, rgba(col, 0)); c.fillStyle = g; c.fillRect(x - rad, y - rad, rad * 2, rad * 2) }

const SCENES: Record<BackdropId, Scene> = {
  'deep-well': (c, r, t, s) => {
    fill(c, r, '#0b1c2e', '#040a12')
    c.strokeStyle = 'rgba(120,180,230,.1)'; c.lineWidth = 3
    for (let k = 0; k < 9; k++) { const y = r.y + wrap(k * 220 - s * 0.12, r.h + 220) - 110, w2 = r.w * (0.4 + 0.1 * Math.sin(k)); c.beginPath(); c.ellipse(0, y, w2, 38, 0, 0, 7); c.stroke() }
  },
  'dusk-fog': (c, r, t, s) => {
    fill(c, r, '#3a2040', '#0b0a1c')
    for (let i = 0; i < 9; i++) { const [x, y] = pt(r, i, s, 0.06); glowDot(c, x + Math.sin(t * 0.2 + i) * 60, y, 260, i % 2 ? '#ff9a7a' : '#a07aff', 0.16) }
  },
  blueprint: (c, r, t, s) => {
    fill(c, r, '#0e2a5a', '#081a3c')
    c.strokeStyle = 'rgba(170,205,255,.16)'; c.lineWidth = 1; c.beginPath()
    for (let x = Math.ceil(r.x / 60) * 60; x < r.x + r.w; x += 60) { c.moveTo(x, r.y); c.lineTo(x, r.y + r.h) }
    for (let y = r.y - wrap(s * 0.1, 60); y < r.y + r.h; y += 60) { c.moveTo(r.x, y); c.lineTo(r.x + r.w, y) }
    c.stroke(); c.strokeStyle = 'rgba(200,225,255,.28)'; c.lineWidth = 1.4
    for (let i = 0; i < 5; i++) { const [x, y] = pt(r, i, s, 0.1); c.strokeRect(x - 40, y - 24, 80, 48); c.beginPath(); c.arc(x, y, 14, 0, 7); c.stroke() }
  },
  'night-rain': (c, r, t, s, reduce) => {
    fill(c, r, '#0a1424', '#050a14')
    c.strokeStyle = 'rgba(170,200,255,.22)'; c.lineWidth = 1.2; c.beginPath()
    for (let i = 0; i < 70; i++) { const x = r.x + rnd(i) * r.w, y = r.y + wrap(rnd(i + 9) * r.h + (reduce ? 0 : t * 700 * (0.7 + rnd(i + 3) * 0.6)), r.h + 60) - 30; c.moveTo(x, y); c.lineTo(x - 5, y + 26) }
    c.stroke()
  },
  'ember-chasm': (c, r, t, s, reduce) => {
    fill(c, r, '#1a0804', '#3a0f06')
    const g = c.createLinearGradient(0, r.y + r.h, 0, r.y + r.h * 0.35); g.addColorStop(0, 'rgba(255,110,40,.5)'); g.addColorStop(1, 'rgba(255,110,40,0)'); c.fillStyle = g; c.fillRect(r.x, r.y, r.w, r.h)
    for (let i = 0; i < 60; i++) { const life = reduce ? rnd(i + 2) : (t * (0.08 + rnd(i) * 0.12) + rnd(i + 2)) % 1, x = r.x + rnd(i + 7) * r.w + Math.sin(life * 9 + i) * 16, y = r.y + r.h - life * r.h; c.fillStyle = rgba(life < 0.5 ? '#ffe9a8' : '#ff7a3d', (1 - life) * 0.85); c.beginPath(); c.arc(x, y, 1 + (1 - life) * 2.2, 0, 7); c.fill() }
  },
  'neon-rain': (c, r, t, s, reduce) => {
    fill(c, r, '#12041e', '#06020c')
    for (let i = 0; i < 46; i++) { const x = r.x + rnd(i) * r.w, len = 60 + rnd(i + 4) * 120, y = r.y + wrap(rnd(i + 9) * r.h + (reduce ? 0 : t * (260 + rnd(i + 5) * 380)), r.h + len) - len, col = i % 3 === 0 ? '#4ff0ff' : i % 3 === 1 ? '#ff4fd8' : '#b07aff'; const g = c.createLinearGradient(0, y, 0, y + len); g.addColorStop(0, rgba(col, 0)); g.addColorStop(1, rgba(col, 0.7)); c.fillStyle = g; c.fillRect(x, y, 2, len) }
  },
  biolume: (c, r, t, s, reduce) => {
    fill(c, r, '#02161c', '#010a0f')
    for (let i = 0; i < 38; i++) { const [x, y] = pt(r, i, s, 0.05 + rnd(i + 3) * 0.08), pulse = reduce ? 0.7 : 0.5 + 0.5 * Math.sin(t * (0.8 + rnd(i) * 1.6) + i); glowDot(c, x + (reduce ? 0 : Math.sin(t * 0.4 + i) * 22), y, 14 + rnd(i + 8) * 26, i % 4 === 0 ? '#7affc8' : '#4fc3ff', 0.15 + 0.5 * pulse) }
  },
  'crystal-cavern': (c, r, t, s, reduce) => {
    fill(c, r, '#1a0f33', '#08041a')
    for (let i = 0; i < 22; i++) { const [x, y] = pt(r, i, s, 0.09), h = 60 + rnd(i + 4) * 120, w2 = 18 + rnd(i + 6) * 30, hue = 250 + rnd(i + 9) * 90; c.fillStyle = `hsla(${hue},70%,${40 + rnd(i) * 20}%,.35)`; c.beginPath(); c.moveTo(x, y - h); c.lineTo(x + w2, y); c.lineTo(x, y + h * 0.25); c.lineTo(x - w2, y); c.closePath(); c.fill(); c.strokeStyle = 'rgba(255,255,255,.18)'; c.lineWidth = 1; c.stroke() }
    const gl = reduce ? 0.3 : wrap(t * 0.12, 1); glowDot(c, r.x + r.w * gl, r.y + r.h * 0.4, 180, '#ffffff', 0.12)
  },
  'aurora-curtains': (c, r, t, s, reduce) => {
    fill(c, r, '#03121c', '#06182a')
    c.globalCompositeOperation = 'lighter'
    for (let k = 0; k < 5; k++) {
      const col = k % 2 ? '#b48aff' : '#6dffc4', cx = r.x + r.w * (0.1 + k * 0.2) + (reduce ? 0 : Math.sin(t * 0.2 + k) * 60)
      const g = c.createLinearGradient(0, r.y, 0, r.y + r.h * 0.8); g.addColorStop(0, rgba(col, 0)); g.addColorStop(0.35, rgba(col, 0.3)); g.addColorStop(1, rgba(col, 0)); c.fillStyle = g
      c.beginPath(); c.moveTo(cx - 90, r.y)
      for (let y = 0; y <= 8; y++) c.lineTo(cx - 90 + Math.sin(y * 0.8 + (reduce ? k : t * 0.5 + k)) * 40, r.y + (r.h * 0.8 * y) / 8)
      for (let y = 8; y >= 0; y--) c.lineTo(cx + 90 + Math.sin(y * 0.8 + (reduce ? k : t * 0.5 + k) + 1) * 40, r.y + (r.h * 0.8 * y) / 8)
      c.closePath(); c.fill()
    }
    c.globalCompositeOperation = 'source-over'
    for (let i = 0; i < 30; i++) { const [x, y] = pt(r, i, s, 0.03); c.fillStyle = 'rgba(255,255,255,.5)'; c.fillRect(x, y, 1.4, 1.4) }
  },
  stormfront: (c, r, t, s, reduce) => {
    fill(c, r, '#1b2433', '#0b101a')
    for (let i = 0; i < 8; i++) { const [x, y] = pt(r, i, s, 0.05); glowDot(c, x + (reduce ? 0 : Math.sin(t * 0.15 + i) * 80), y, 280, '#6a7a95', 0.22) }
    const cyc = reduce ? 0 : Math.floor(t * 0.45), ph = reduce ? 0.2 : (t * 0.45) % 1, on = rnd(cyc + 3) > 0.35, flash = on ? Math.max(0, 1 - ph * 4) : 0
    if (flash > 0) { c.fillStyle = `rgba(190,215,255,${flash * 0.28})`; c.fillRect(r.x, r.y, r.w, r.h); c.strokeStyle = `rgba(255,255,255,${flash})`; c.lineWidth = 2.4; c.beginPath(); let x = r.x + rnd(cyc) * r.w, y = r.y; c.moveTo(x, y); while (y < r.y + r.h * 0.7) { x += (rnd(y + cyc) - 0.5) * 60; y += 40; c.lineTo(x, y) } c.stroke() }
    c.strokeStyle = 'rgba(170,200,255,.16)'; c.lineWidth = 1; c.beginPath()
    for (let i = 0; i < 40; i++) { const x = r.x + rnd(i + 20) * r.w, y = r.y + wrap(rnd(i + 29) * r.h + (reduce ? 0 : t * 800), r.h + 60) - 30; c.moveTo(x, y); c.lineTo(x - 6, y + 28) }
    c.stroke()
  },
  'starfall-void': (c, r, t, s, reduce) => {
    fill(c, r, '#050420', '#02020c')
    for (let i = 0; i < 80; i++) { const [x, y] = pt(r, i, s, 0.04 + rnd(i + 3) * 0.1), tw = reduce ? 0.7 : 0.4 + 0.6 * Math.abs(Math.sin(t * (1 + rnd(i) * 2) + i)); c.fillStyle = i % 9 === 0 ? rgba('#ffd45e', tw) : `rgba(255,255,255,${tw * 0.8})`; c.fillRect(x, y, 1 + rnd(i + 5) * 1.6, 1 + rnd(i + 5) * 1.6) }
    if (!reduce) for (let k = 0; k < 3; k++) { const life = (t * 0.18 + k / 3) % 1, x = r.x + r.w * (0.2 + k * 0.3) + life * 220, y = r.y + life * r.h * 0.8, g = c.createLinearGradient(x, y, x - 90, y - 140); g.addColorStop(0, `rgba(255,255,255,${0.9 * (1 - life)})`); g.addColorStop(1, 'rgba(255,255,255,0)'); c.strokeStyle = g; c.lineWidth = 2; c.beginPath(); c.moveTo(x, y); c.lineTo(x - 90, y - 140); c.stroke() }
  },
  'event-horizon': (c, r, t, s, reduce) => {
    fill(c, r, '#04020a', '#000000')
    const cy = r.y + r.h * 0.45, a = reduce ? 0.4 : t * 0.25
    for (let i = 0; i < 40; i++) { const [x, y] = pt(r, i, s, 0.03); c.fillStyle = 'rgba(255,255,255,.4)'; c.fillRect(x, y, 1.2, 1.2) }
    c.save(); c.translate(0, cy); c.rotate(-0.25)
    for (let k = 0; k < 14; k++) { const rad = 150 + k * 18, hue = 20 + k * 3; c.strokeStyle = `hsla(${hue},95%,${68 - k * 2.5}%,${0.5 - k * 0.025})`; c.lineWidth = 8 - k * 0.4; c.beginPath(); c.ellipse(0, 0, rad * 2.1, rad * 0.5, 0, a + k * 0.2, a + k * 0.2 + Math.PI * 1.6); c.stroke() }
    c.restore()
    const g = c.createRadialGradient(0, cy, 40, 0, cy, 190); g.addColorStop(0, '#000'); g.addColorStop(0.55, '#000'); g.addColorStop(1, rgba(tint('#ffb070', 0), 0)); c.fillStyle = g; c.beginPath(); c.arc(0, cy, 190, 0, 7); c.fill()
    c.strokeStyle = 'rgba(255,230,190,.8)'; c.lineWidth = 2; c.beginPath(); c.arc(0, cy, 96, 0, 7); c.stroke()
  },
}

/** Paint a scene into (x, y, w, h). `scroll` is the shaft's fall position; `t` is seconds. */
export function drawBackdrop(c: CanvasRenderingContext2D, id: BackdropId, x: number, y: number, w: number, h: number, t: number, scroll: number, reduce: boolean): void {
  c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip()
  SCENES[id](c, { x, y, w, h }, reduce ? 3 : t, reduce ? 400 : scroll, reduce)
  c.restore()
}
