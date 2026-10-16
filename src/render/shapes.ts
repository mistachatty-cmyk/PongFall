// Shapes for PongPainter's style slots: paddle bodies, balls and tears. Render-only; they draw with the context's current fillStyle, centred on the
// origin (paddle) or the given point, and the default styles ('bar', 'orb', 'drop') are exactly the original shapes.
export const PADDLE_STYLES = ['bar', 'bevel', 'round', 'neon', 'segmented', 'hazard', 'pixel', 'glass', 'blade'] as const
export const BALL_SHAPES = ['orb', 'ring', 'star', 'diamond', 'square', 'eye', 'planet', 'pulse'] as const
export const TEAR_SHAPES = ['drop', 'star', 'heart', 'crescent', 'diamond', 'leaf'] as const
export type PaddleStyle = typeof PADDLE_STYLES[number]
export type BallShape = typeof BALL_SHAPES[number]
export type TearShape = typeof TEAR_SHAPES[number]
const pick = <T extends string>(list: readonly T[], v: string | undefined, d: T): T => (list as readonly string[]).includes(v ?? '') ? v as T : d
export const paddleStyle = (v?: string): PaddleStyle => pick(PADDLE_STYLES, v, 'bar')
export const ballShape = (v?: string): BallShape => pick(BALL_SHAPES, v, 'orb')
export const tearShape = (v?: string): TearShape => pick(TEAR_SHAPES, v, 'drop')

const fill = (c: CanvasRenderingContext2D) => (typeof c.fillStyle === 'string' ? c.fillStyle : '#e9f2ff')

/** A paddle `len` tall and 14 wide, centred on the origin. */
export function drawPaddleBody(c: CanvasRenderingContext2D, style: PaddleStyle, len: number) {
  const w = 14, x = -w / 2, y = -len / 2
  switch (style) {
    case 'bar': c.fillRect(x, y, w, len); return
    case 'bevel': c.fillRect(x, y, w, len); c.fillStyle = 'rgba(255,255,255,.45)'; c.fillRect(x, y, 3, len); c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(x + w - 3, y, 3, len); return
    case 'round': c.beginPath(); c.roundRect(x, y, w, len, 7); c.fill(); return
    case 'neon': { const col = fill(c); c.save(); c.shadowColor = col; c.shadowBlur = 14; c.fillStyle = col; c.beginPath(); c.roundRect(x + 3, y, w - 6, len, 4); c.fill(); c.restore(); c.fillStyle = '#ffffff'; c.fillRect(-1, y + 3, 2, len - 6); return }
    case 'segmented': { const n = Math.max(3, Math.round(len / 22)), h = (len - (n - 1) * 3) / n; for (let i = 0; i < n; i++) c.fillRect(x, y + i * (h + 3), w, h); return }
    case 'hazard': { c.save(); c.beginPath(); c.rect(x, y, w, len); c.clip(); c.fillStyle = '#16120a'; c.fillRect(x, y, w, len); c.fillStyle = '#ffcf3a'; for (let d = -w; d < len + w; d += 14) { c.beginPath(); c.moveTo(x, y + d); c.lineTo(x + w, y + d - w); c.lineTo(x + w, y + d - w + 7); c.lineTo(x, y + d + 7); c.fill() } c.restore(); return }
    case 'pixel': { const s = 7, n = Math.ceil(len / s); for (let i = 0; i < n; i++) { const off = (i % 2) * 0; c.fillRect(x + off, y + i * s, i === 0 || i === n - 1 ? w - 4 : w, Math.min(s, len - i * s)) } return }
    case 'glass': { const col = fill(c); c.save(); c.globalAlpha *= 0.35; c.fillRect(x, y, w, len); c.restore(); c.save(); c.strokeStyle = col; c.lineWidth = 2; c.strokeRect(x + 1, y + 1, w - 2, len - 2); c.restore(); return }
    case 'blade': c.beginPath(); c.moveTo(0, y - 6); c.lineTo(x + w, y + 10); c.lineTo(x + w, -y - 10); c.lineTo(0, -y + 6); c.lineTo(x, -y - 10); c.lineTo(x, y + 10); c.closePath(); c.fill(); return
  }
}

const star = (c: CanvasRenderingContext2D, x: number, y: number, ro: number, ri: number, n: number, rot = -Math.PI / 2) => { c.beginPath(); for (let i = 0; i < n * 2; i++) { const r = i % 2 ? ri : ro, a = rot + (i * Math.PI) / n; c[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * r, y + Math.sin(a) * r) } c.closePath() }

/** The ball, radius `r`, at (x, y). `t` is seconds (for the animated shapes). */
export function drawBallShape(c: CanvasRenderingContext2D, shape: BallShape, x: number, y: number, r: number, t: number) {
  switch (shape) {
    case 'orb': c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); return
    case 'ring': { const col = fill(c); c.save(); c.strokeStyle = col; c.lineWidth = 4; c.beginPath(); c.arc(x, y, r - 2, 0, 7); c.stroke(); c.restore(); return }
    case 'star': star(c, x, y, r * 1.35, r * 0.6, 5, -Math.PI / 2 + t * 1.5); c.fill(); return
    case 'diamond': c.beginPath(); c.moveTo(x, y - r * 1.3); c.lineTo(x + r, y); c.lineTo(x, y + r * 1.3); c.lineTo(x - r, y); c.closePath(); c.fill(); return
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
