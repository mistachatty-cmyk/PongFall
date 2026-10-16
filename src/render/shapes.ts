// Shapes for PongPainter's style slots: paddle bodies, balls and tears. Render-only; they draw with the context's current fillStyle, centred on the
// origin (paddle) or the given point, and the default styles ('bar', 'orb', 'drop') are exactly the original shapes.
export const PADDLE_STYLES = ['bar', 'bevel', 'round', 'neon', 'segmented', 'hazard', 'pixel', 'glass', 'blade', 'ember', 'aurora'] as const
export const BALL_SHAPES = ['orb', 'ring', 'star', 'diamond', 'square', 'eye', 'planet', 'pulse', 'nova', 'orbit'] as const
export const TEAR_SHAPES = ['drop', 'star', 'heart', 'crescent', 'diamond', 'leaf'] as const
export const TRAIL_STYLES = ['line', 'sparks', 'ribbon', 'bubbles', 'pixels', 'flame', 'stars', 'comet', 'rainbow', 'lightning'] as const
export const GIRDER_STYLES = ['plain', 'truss', 'hazard', 'pipe', 'oak', 'glass', 'neon', 'crystal'] as const
export const HUD_FONTS = ['sans', 'mono', 'serif', 'display', 'rounded', 'slab'] as const
export type TrailStyle = typeof TRAIL_STYLES[number]
export type GirderStyle = typeof GIRDER_STYLES[number]
export type HudFont = typeof HUD_FONTS[number]
export type PaddleStyle = typeof PADDLE_STYLES[number]
export type BallShape = typeof BALL_SHAPES[number]
export type TearShape = typeof TEAR_SHAPES[number]
const pick = <T extends string>(list: readonly T[], v: string | undefined, d: T): T => (list as readonly string[]).includes(v ?? '') ? v as T : d
export const paddleStyle = (v?: string): PaddleStyle => pick(PADDLE_STYLES, v, 'bar')
export const ballShape = (v?: string): BallShape => pick(BALL_SHAPES, v, 'orb')
export const trailStyle = (v?: string): TrailStyle => pick(TRAIL_STYLES, v, 'line')
export const girderStyle = (v?: string): GirderStyle => pick(GIRDER_STYLES, v, 'plain')
export const hudFont = (v?: string): HudFont => pick(HUD_FONTS, v, 'sans')
export const tearShape = (v?: string): TearShape => pick(TEAR_SHAPES, v, 'drop')

const clock = () => Date.now() / 1000   // the pack looks that move on their own read the wall clock: render-only, never the sim
const fill = (c: CanvasRenderingContext2D) => (typeof c.fillStyle === 'string' ? c.fillStyle : '#e9f2ff')

/** A paddle `len` tall and 14 wide, centred on the origin. */
export function drawPaddleBody(c: CanvasRenderingContext2D, style: PaddleStyle, len: number) {
  const w = 14, x = -w / 2, y = -len / 2
  switch (style) {
    case 'ember': { const t = clock(), g = c.createLinearGradient(0, y, 0, y + len); g.addColorStop(0, '#ffe9a8'); g.addColorStop(0.5 + Math.sin(t * 3) * 0.12, '#ff8a3d'); g.addColorStop(1, '#7a1d08'); c.save(); c.shadowColor = '#ff6a3d'; c.shadowBlur = 10 + Math.sin(t * 5) * 3; c.fillStyle = g; c.beginPath(); c.roundRect(x, y, w, len, 3); c.fill(); c.restore(); c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(x + 2, y + 3, 2, len - 6); return }
    case 'aurora': { const t = clock(), g = c.createLinearGradient(0, y, 0, y + len), o = (t * 0.25) % 1; for (let i = 0; i <= 6; i++) g.addColorStop(i / 6, `hsl(${(150 + ((i / 6 + o) % 1) * 150) % 360},85%,${60 + (i % 2) * 8}%)`); c.save(); c.shadowColor = '#7affc8'; c.shadowBlur = 12; c.fillStyle = g; c.beginPath(); c.roundRect(x, y, w, len, 6); c.fill(); c.restore(); c.fillStyle = 'rgba(255,255,255,.45)'; c.fillRect(-1, y + 4, 2, len - 8); return }
    case 'bar': c.fillRect(x, y, w, len); return
    case 'bevel': { c.fillRect(x, y, w, len); const g = c.createLinearGradient(x, 0, x + w, 0); g.addColorStop(0, 'rgba(255,255,255,.55)'); g.addColorStop(0.4, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(0,0,0,.45)'); c.fillStyle = g; c.fillRect(x, y, w, len); c.fillStyle = 'rgba(255,255,255,.6)'; c.fillRect(x, y, w, 1.5); return }
    case 'round': { c.beginPath(); c.roundRect(x, y, w, len, 7); c.fill(); const g = c.createLinearGradient(x, 0, x + w, 0); g.addColorStop(0, 'rgba(255,255,255,.6)'); g.addColorStop(0.5, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(0,0,0,.4)'); c.fillStyle = g; c.beginPath(); c.roundRect(x, y, w, len, 7); c.fill(); return }
    case 'neon': { const col = fill(c); c.save(); c.shadowColor = col; c.shadowBlur = 14; c.fillStyle = col; c.beginPath(); c.roundRect(x + 3, y, w - 6, len, 4); c.fill(); c.restore(); c.fillStyle = '#ffffff'; c.fillRect(-1, y + 3, 2, len - 6); return }
    case 'segmented': { const n = Math.max(3, Math.round(len / 22)), h = (len - (n - 1) * 3) / n; for (let i = 0; i < n; i++) c.fillRect(x, y + i * (h + 3), w, h); return }
    case 'hazard': { c.save(); c.beginPath(); c.rect(x, y, w, len); c.clip(); c.fillStyle = '#16120a'; c.fillRect(x, y, w, len); c.fillStyle = '#ffcf3a'; for (let d = -w; d < len + w; d += 14) { c.beginPath(); c.moveTo(x, y + d); c.lineTo(x + w, y + d - w); c.lineTo(x + w, y + d - w + 7); c.lineTo(x, y + d + 7); c.fill() } c.restore(); return }
    case 'pixel': { const s = 7, n = Math.ceil(len / s); for (let i = 0; i < n; i++) { const off = (i % 2) * 0; c.fillRect(x + off, y + i * s, i === 0 || i === n - 1 ? w - 4 : w, Math.min(s, len - i * s)) } return }
    case 'glass': { const col = fill(c); c.save(); c.globalAlpha *= 0.35; c.fillRect(x, y, w, len); c.restore(); c.save(); c.strokeStyle = col; c.lineWidth = 2; c.strokeRect(x + 1, y + 1, w - 2, len - 2); c.restore(); return }
    case 'blade': { c.beginPath(); c.moveTo(0, y - 6); c.lineTo(x + w, y + 10); c.lineTo(x + w, -y - 10); c.lineTo(0, -y + 6); c.lineTo(x, -y - 10); c.lineTo(x, y + 10); c.closePath(); c.fill(); c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.moveTo(0, y - 6); c.lineTo(x + w, y + 10); c.lineTo(x + w, -y - 10); c.lineTo(0, -y + 6); c.closePath(); c.fill(); c.fillStyle = 'rgba(0,0,0,.3)'; c.fillRect(-0.7, y - 4, 1.4, len + 8); return }
  }
}

const star = (c: CanvasRenderingContext2D, x: number, y: number, ro: number, ri: number, n: number, rot = -Math.PI / 2) => { c.beginPath(); for (let i = 0; i < n * 2; i++) { const r = i % 2 ? ri : ro, a = rot + (i * Math.PI) / n; c[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * r, y + Math.sin(a) * r) } c.closePath() }

/** The ball, radius `r`, at (x, y). `t` is seconds (for the animated shapes). */
export function drawBallShape(c: CanvasRenderingContext2D, shape: BallShape, x: number, y: number, r: number, t: number) {
  switch (shape) {
    case 'nova': { const col = fill(c); c.save(); c.translate(x, y); c.rotate(t * 1.8); c.strokeStyle = col; c.lineWidth = 2.2; c.lineCap = 'round'; for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4, l = r * (i % 2 ? 1.5 : 2.1) + Math.sin(t * 6 + i) * 1.5; c.beginPath(); c.moveTo(Math.cos(a) * r * 0.7, Math.sin(a) * r * 0.7); c.lineTo(Math.cos(a) * l, Math.sin(a) * l); c.stroke() } c.restore(); c.beginPath(); c.arc(x, y, r * 0.85, 0, 7); c.fill(); c.fillStyle = 'rgba(255,255,255,.8)'; c.beginPath(); c.arc(x - r * 0.25, y - r * 0.25, r * 0.3, 0, 7); c.fill(); return }
    case 'orbit': { const col = fill(c); c.beginPath(); c.arc(x, y, r * 0.8, 0, 7); c.fill(); c.save(); c.fillStyle = col; for (let i = 0; i < 3; i++) { const a = t * (2 + i * 0.5) + (i * Math.PI * 2) / 3, d = r * (1.5 + i * 0.35); c.globalAlpha = 0.9; c.beginPath(); c.arc(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.7, r * (0.3 - i * 0.04), 0, 7); c.fill() } c.restore(); return }
    case 'orb': c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); return
    case 'ring': { const col = fill(c); c.save(); c.strokeStyle = col; c.lineWidth = 4; c.beginPath(); c.arc(x, y, r - 2, 0, 7); c.stroke(); c.restore(); return }
    case 'star': { const rot = -Math.PI / 2 + t * 1.5; star(c, x, y, r * 1.35, r * 0.6, 5, rot); c.fill(); const g = c.createRadialGradient(x - r * 0.3, y - r * 0.4, 1, x, y, r * 1.4); g.addColorStop(0, 'rgba(255,255,255,.75)'); g.addColorStop(1, 'rgba(0,0,0,.35)'); c.fillStyle = g; star(c, x, y, r * 1.35, r * 0.6, 5, rot); c.fill(); return }
    case 'diamond': { c.beginPath(); c.moveTo(x, y - r * 1.3); c.lineTo(x + r, y); c.lineTo(x, y + r * 1.3); c.lineTo(x - r, y); c.closePath(); c.fill(); c.fillStyle = 'rgba(255,255,255,.45)'; c.beginPath(); c.moveTo(x, y - r * 1.3); c.lineTo(x - r, y); c.lineTo(x, y); c.closePath(); c.fill(); c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.moveTo(x, y + r * 1.3); c.lineTo(x + r, y); c.lineTo(x, y); c.closePath(); c.fill(); return }
    case 'square': c.save(); c.translate(x, y); c.rotate(t * 2); c.fillRect(-r * 0.85, -r * 0.85, r * 1.7, r * 1.7); c.restore(); return
    case 'eye': { c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); c.fillStyle = '#1b6fb8'; c.beginPath(); c.arc(x + Math.sin(t * 2) * 2, y, r * 0.55, 0, 7); c.fill(); c.fillStyle = '#05070b'; c.beginPath(); c.arc(x + Math.sin(t * 2) * 2, y, r * 0.25, 0, 7); c.fill(); return }
    case 'planet': { const col = fill(c); c.beginPath(); c.arc(x, y, r * 0.8, 0, 7); c.fill(); c.save(); c.strokeStyle = col; c.lineWidth = 2; c.beginPath(); c.ellipse(x, y, r * 1.5, r * 0.45, -0.4, 0, 7); c.stroke(); c.restore(); return }
    case 'pulse': { const col = fill(c); c.beginPath(); c.arc(x, y, r * 0.7, 0, 7); c.fill(); c.save(); c.strokeStyle = col; for (let i = 0; i < 2; i++) { const k = (t * 1.2 + i * 0.5) % 1; c.globalAlpha = 1 - k; c.lineWidth = 2; c.beginPath(); c.arc(x, y, r * (0.8 + k * 1.2), 0, 7); c.stroke() } c.restore(); return }
  }
}

/** A tear centred on (x, y): the original drop is about 58 tall. */
export function drawTearShape(c: CanvasRenderingContext2D, shape: TearShape, x: number, y: number) {
  switch (shape) {
    case 'drop': c.beginPath(); c.moveTo(x, y - 34); c.quadraticCurveTo(x + 24, y + 6, x, y + 24); c.quadraticCurveTo(x - 24, y + 6, x, y - 34); c.fill(); return
    case 'star': star(c, x, y - 4, 30, 13, 5); c.fill(); return
    case 'heart': c.beginPath(); c.moveTo(x, y + 24); c.bezierCurveTo(x - 36, y - 2, x - 22, y - 30, x, y - 12); c.bezierCurveTo(x + 22, y - 30, x + 36, y - 2, x, y + 24); c.fill(); return
    case 'crescent': c.beginPath(); c.arc(x, y - 4, 24, 0.5, Math.PI * 2 - 0.5); c.arc(x + 11, y - 4, 20, Math.PI * 2 - 0.9, 0.9, true); c.closePath(); c.fill(); return
    case 'diamond': c.beginPath(); c.moveTo(x, y - 34); c.lineTo(x + 20, y - 4); c.lineTo(x, y + 24); c.lineTo(x - 20, y - 4); c.closePath(); c.fill(); return
    case 'leaf': c.beginPath(); c.moveTo(x, y + 26); c.quadraticCurveTo(x - 34, y - 6, x, y - 34); c.quadraticCurveTo(x + 34, y - 6, x, y + 26); c.fill(); return
  }
}

const rnd = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x) }
/** CSS font-family stacks for the HUD score. 'sans' is the original. */
export const HUD_STACKS: Record<HudFont, string> = { sans: 'system-ui', mono: 'ui-monospace,Menlo,Consolas,monospace', serif: 'Georgia,"Times New Roman",serif', display: 'Impact,"Arial Narrow Bold","Arial Black",sans-serif', rounded: '"Trebuchet MS","Segoe UI Rounded",system-ui', slab: '"Rockwell","Courier New",serif' }

/** Behind the ball: `ux, uy` is the unit direction it is moving, `length` how long the tail is. Draws with the given colour. 'line' is the original tail. */
export function drawTrail(c: CanvasRenderingContext2D, style: TrailStyle, x: number, y: number, ux: number, uy: number, length: number, color: string, t: number) {
  c.save(); c.lineCap = 'round'; c.strokeStyle = color; c.fillStyle = color
  switch (style) {
    case 'comet': { const g = c.createLinearGradient(x, y, x - ux * length * 1.8, y - uy * length * 1.8); g.addColorStop(0, color); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; const px = -uy, py = ux; c.beginPath(); c.moveTo(x + px * 7, y + py * 7); c.lineTo(x - ux * length * 1.8, y - uy * length * 1.8); c.lineTo(x - px * 7, y - py * 7); c.closePath(); c.fill(); for (let i = 0; i < 8; i++) { const k = ((i / 8) + t * 1.4) % 1; c.globalAlpha = (1 - k) * 0.9; c.fillStyle = '#ffffff'; c.fillRect(x - ux * length * 1.7 * k + (rnd(i) - 0.5) * 12, y - uy * length * 1.7 * k + (rnd(i + 20) - 0.5) * 12, 2, 2) } break }
    case 'rainbow': { c.lineWidth = 4; for (let b = 0; b < 6; b++) { c.strokeStyle = `hsl(${(b * 60 + t * 120) % 360},90%,62%)`; c.globalAlpha = 0.85; c.beginPath(); for (let i = 0; i <= 14; i++) { const f = i / 14, wob = Math.sin(t * 8 + f * 7) * 3 * f, off = (b - 2.5) * 3 * (1 - f * 0.5); c[i ? 'lineTo' : 'moveTo'](x - ux * length * 1.6 * f - uy * (off + wob), y - uy * length * 1.6 * f + ux * (off + wob)) } c.stroke() } break }
    case 'lightning': { c.lineWidth = 2; c.shadowColor = color; c.shadowBlur = 10; for (let b = 0; b < 3; b++) { c.globalAlpha = 0.95 - b * 0.25; c.strokeStyle = b === 0 ? '#ffffff' : color; c.beginPath(); c.moveTo(x, y); for (let i = 1; i <= 9; i++) { const f = i / 9, j = (rnd(i + b * 17 + Math.floor(t * 24)) - 0.5) * 16 * f; c.lineTo(x - ux * length * 1.5 * f - uy * j, y - uy * length * 1.5 * f + ux * j) } c.stroke() } break }
    case 'line': for (let n = 3; n >= 1; n--) { c.globalAlpha = 0.08 + (4 - n) * 0.035; c.lineWidth = 2 + (4 - n) * 1.5; c.beginPath(); c.moveTo(x - ux * length * n / 3, y - uy * length * n / 3); c.lineTo(x - ux * length * (n + 0.8) / 3, y - uy * length * (n + 0.8) / 3); c.stroke() } break
    case 'sparks': for (let i = 0; i < 14; i++) { const k = (i + (t * 6 % 1)) / 14, jx = (rnd(i + Math.floor(t * 6)) - 0.5) * 16, jy = (rnd(i + 50 + Math.floor(t * 6)) - 0.5) * 16; c.globalAlpha = (1 - k) * 0.9; c.fillRect(x - ux * length * 1.3 * k + jx * k - 1, y - uy * length * 1.3 * k + jy * k - 1, 2.4 - k, 2.4 - k) } break
    case 'ribbon': { c.lineWidth = 5; for (let k = 0; k < 2; k++) { c.globalAlpha = 0.5 - k * 0.2; c.beginPath(); for (let i = 0; i <= 12; i++) { const f = i / 12, wob = Math.sin(t * 9 + f * 6 + k * 2) * 7 * f; const px = x - ux * length * 1.5 * f - uy * wob, py = y - uy * length * 1.5 * f + ux * wob; if (i) c.lineTo(px, py); else c.moveTo(px, py) } c.stroke() } break }
    case 'bubbles': for (let i = 0; i < 7; i++) { const k = ((i / 7) + t * 0.8) % 1; c.globalAlpha = (1 - k) * 0.8; c.lineWidth = 1.5; c.beginPath(); c.arc(x - ux * length * 1.4 * k + Math.sin(i * 3 + t * 4) * 4, y - uy * length * 1.4 * k - k * 10, 2 + (1 - k) * 4, 0, 7); c.stroke() } break
    case 'pixels': for (let i = 1; i <= 7; i++) { c.globalAlpha = 0.8 - i * 0.1; const px = Math.round((x - ux * length * i / 6) / 4) * 4, py = Math.round((y - uy * length * i / 6) / 4) * 4, sz = 10 - i; c.fillRect(px - sz / 2, py - sz / 2, sz, sz) } break
    case 'flame': for (let i = 0; i < 9; i++) { const k = i / 9, f = 1 - k; const px = x - ux * length * 1.5 * k + (rnd(i + Math.floor(t * 20)) - 0.5) * 8 * k, py = y - uy * length * 1.5 * k - 4 * k; const g = c.createRadialGradient(px, py, 0, px, py, 12 * f + 2); g.addColorStop(0, '#fff6c8'); g.addColorStop(0.4, color); g.addColorStop(1, 'rgba(255,60,0,0)'); c.globalAlpha = 0.85 * f; c.fillStyle = g; c.fillRect(px - 14, py - 14, 28, 28) } break
    case 'stars': for (let i = 1; i <= 5; i++) { c.globalAlpha = 0.9 - i * 0.14; star(c, x - ux * length * i / 3.5, y - uy * length * i / 3.5, 7 - i, 3 - i * 0.3, 4, t * 2 + i); c.fill() } break
  }
  c.restore()
}

/** Extra detail drawn on a girder (top edge y, thickness T) after the plain girder. 'plain' draws nothing. */
export function drawGirderStyle(c: CanvasRenderingContext2D, style: GirderStyle, W: number, y: number, T: number) {
  if (style === 'plain') return
  const x0 = -W / 2 - 14, w = W + 28
  c.save(); c.beginPath(); c.rect(x0, y, w, T); c.clip()
  switch (style) {
    case 'neon': { const t = clock(), pulse = 0.65 + 0.3 * Math.sin(t * 3); c.fillStyle = '#080612'; c.fillRect(x0, y, w, T); c.shadowColor = '#ff4fd8'; c.shadowBlur = 12 * pulse; c.strokeStyle = `rgba(255,79,216,${pulse})`; c.lineWidth = 2.4; c.beginPath(); c.moveTo(x0, y + 2); c.lineTo(x0 + w, y + 2); c.moveTo(x0, y + T - 2); c.lineTo(x0 + w, y + T - 2); c.stroke(); c.shadowColor = '#4ff0ff'; c.strokeStyle = '#4ff0ff'; c.lineWidth = 1.4; c.beginPath(); const run = (t * 90) % 60; for (let x = x0 - 60 + run; x < x0 + w; x += 60) { c.moveTo(x, y + T / 2); c.lineTo(x + 26, y + T / 2) } c.stroke(); break }
    case 'crystal': { const t = clock(), g = c.createLinearGradient(0, y, 0, y + T); g.addColorStop(0, 'rgba(210,235,255,.85)'); g.addColorStop(0.5, 'rgba(120,170,230,.55)'); g.addColorStop(1, 'rgba(40,70,130,.8)'); c.fillStyle = g; c.fillRect(x0, y, w, T); c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = 1; c.beginPath(); for (let x = x0; x < x0 + w; x += T * 1.3) { c.moveTo(x, y + T); c.lineTo(x + T * 0.65, y); c.lineTo(x + T * 1.3, y + T) } c.stroke(); const gl = x0 + ((t * 80) % (w + 160)) - 80, gg = c.createLinearGradient(gl, 0, gl + 80, 0); gg.addColorStop(0, 'rgba(255,255,255,0)'); gg.addColorStop(0.5, 'rgba(255,255,255,.85)'); gg.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gg; c.fillRect(gl, y, 80, T); break }
    case 'truss': { c.strokeStyle = 'rgba(200,215,240,.7)'; c.lineWidth = 2; c.beginPath(); for (let x = x0; x < x0 + w; x += T) { c.moveTo(x, y + T); c.lineTo(x + T / 2, y + 1); c.lineTo(x + T, y + T) } c.stroke(); c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(x0, y, w, 1.5); c.fillStyle = 'rgba(0,0,0,.4)'; c.fillRect(x0, y + T - 2, w, 2); break }
    case 'hazard': { c.fillStyle = '#16120a'; c.fillRect(x0, y, w, T); c.fillStyle = '#ffcf3a'; for (let x = x0 - T; x < x0 + w + T; x += T * 1.7) { c.beginPath(); c.moveTo(x, y + T); c.lineTo(x + T, y); c.lineTo(x + T + T * 0.85, y); c.lineTo(x + T * 0.85, y + T); c.fill() } c.fillStyle = 'rgba(255,255,255,.25)'; c.fillRect(x0, y, w, 1.5); break }
    case 'pipe': { const g = c.createLinearGradient(0, y, 0, y + T); g.addColorStop(0, '#5a6678'); g.addColorStop(0.3, '#d4dcec'); g.addColorStop(0.55, '#7a889d'); g.addColorStop(1, '#2a3040'); c.fillStyle = g; c.fillRect(x0, y, w, T); c.fillStyle = 'rgba(0,0,0,.45)'; for (let x = x0 + 40; x < x0 + w; x += 90) c.fillRect(x, y, 5, T); c.fillStyle = 'rgba(255,255,255,.4)'; for (let x = x0 + 45; x < x0 + w; x += 90) c.fillRect(x, y, 1.5, T); break }
    case 'oak': { const g = c.createLinearGradient(0, y, 0, y + T); g.addColorStop(0, '#b0794a'); g.addColorStop(1, '#6a4020'); c.fillStyle = g; c.fillRect(x0, y, w, T); c.strokeStyle = 'rgba(40,20,5,.4)'; c.lineWidth = 1; for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(x0, y + 3 + i * 3.5); c.bezierCurveTo(x0 + w / 3, y + 2 + i * 3.5 + Math.sin(i) * 2, x0 + w * 2 / 3, y + 4 + i * 3.5, x0 + w, y + 3 + i * 3.5); c.stroke() } break }
    case 'glass': { c.fillStyle = 'rgba(160,210,255,.35)'; c.fillRect(x0, y, w, T); c.fillStyle = 'rgba(255,255,255,.5)'; c.fillRect(x0, y, w, 1.5); c.strokeStyle = 'rgba(255,255,255,.25)'; c.lineWidth = 3; c.beginPath(); for (let x = x0 - T; x < x0 + w; x += 60) { c.moveTo(x, y + T); c.lineTo(x + T * 1.6, y) } c.stroke(); break }
  }
  c.restore()
}
