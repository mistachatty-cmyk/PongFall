// PongPainter effects that happen at a moment or hang on the arena: hit styles (`ball.impactStyle`), score celebrations (`score.burst`), frame corner
// ornaments (`arena.corners`) and ceiling lights (`arena.lights`). Render-only: `feedFx` queues a "pop" from a sim event and the renderer ages it.
// Reduce Motion draws one still frame of each instead of animating. Particle counts stay small (<= 40 per pop, <= 24 pops alive).
import { rgba } from '../world/palette'

export const IMPACT_STYLES = ['ring', 'sparks', 'confetti', 'shockwave', 'ink', 'lightning', 'stardust'] as const
export const BURST_STYLES = ['confetti', 'stars', 'hearts', 'fireworks', 'petals', 'meteors'] as const
export const CORNER_STYLES = ['bolts', 'gems', 'stars', 'vines', 'wings', 'flames', 'crowns'] as const
export const LIGHT_STYLES = ['lanterns', 'fairy', 'neon', 'spotlights', 'chandelier', 'prismbar'] as const
export type ImpactStyle = typeof IMPACT_STYLES[number]
export type BurstStyle = typeof BURST_STYLES[number]
export type CornerStyle = typeof CORNER_STYLES[number]
export type LightStyle = typeof LIGHT_STYLES[number]
const pick = <T extends string>(list: readonly T[], v: string | undefined): T | null => (list as readonly string[]).includes(v ?? '') ? v as T : null
export const impactStyle = (v?: string) => pick(IMPACT_STYLES, v)
export const burstStyle = (v?: string) => pick(BURST_STYLES, v)
export const cornerStyle = (v?: string) => pick(CORNER_STYLES, v)
export const lightStyle = (v?: string) => pick(LIGHT_STYLES, v)

/** A queued effect: where it is (arena coordinates), what it is, how old (seconds) and a seed for its random shapes. */
export interface Pop { kind: 'hit' | 'score'; x: number; y: number; age: number; seed: number; boosted?: boolean }
export const MAX_POPS = 24
export const POP_LIFE: Record<Pop['kind'], number> = { hit: 0.7, score: 1.6 }
export function queuePop(pops: Pop[], p: Omit<Pop, 'age'>): void { pops.push({ ...p, age: 0 }); if (pops.length > MAX_POPS) pops.splice(0, pops.length - MAX_POPS) }
export function agePops(pops: Pop[], dt: number): Pop[] { for (const p of pops) p.age += dt; return pops.filter(p => p.age < POP_LIFE[p.kind]) }

const rnd = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x) }
const PALETTE = ['#ff5a7a', '#ffd45e', '#6dffc4', '#4fc3ff', '#b07aff', '#ff9a5a']
const star5 = (c: CanvasRenderingContext2D, x: number, y: number, ro: number, ri: number, rot = -Math.PI / 2) => { c.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? ri : ro, a = rot + (i * Math.PI) / 5; c[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * r, y + Math.sin(a) * r) } c.closePath() }
const heart = (c: CanvasRenderingContext2D, x: number, y: number, s: number) => { c.beginPath(); c.moveTo(x, y + s); c.bezierCurveTo(x - s * 1.4, y - s * 0.1, x - s * 0.7, y - s, x, y - s * 0.35); c.bezierCurveTo(x + s * 0.7, y - s, x + s * 1.4, y - s * 0.1, x, y + s); c.fill() }

/** Draw one hit effect. `k` is its age as 0..1. */
function drawHit(c: CanvasRenderingContext2D, style: ImpactStyle, p: Pop, k: number, tint: string): void {
  const a = 1 - k, big = p.boosted ? 1.5 : 1
  c.save(); c.translate(p.x, p.y)
  switch (style) {
    case 'ring': c.globalAlpha = a * 0.8; c.strokeStyle = tint; c.lineWidth = 3 * a + 1; c.beginPath(); c.arc(0, 0, (8 + k * 34) * big, 0, 7); c.stroke(); break
    case 'sparks': c.strokeStyle = tint; c.lineWidth = 2; c.lineCap = 'round'; for (let i = 0; i < 12; i++) { const ang = rnd(p.seed + i) * 6.283, d0 = 6 + k * 40 * (0.5 + rnd(i + 9)), d1 = d0 + 9 * a; c.globalAlpha = a; c.beginPath(); c.moveTo(Math.cos(ang) * d0, Math.sin(ang) * d0); c.lineTo(Math.cos(ang) * d1, Math.sin(ang) * d1); c.stroke() } break
    case 'confetti': for (let i = 0; i < 16; i++) { const ang = rnd(p.seed + i) * 6.283, d = 8 + k * 48 * (0.4 + rnd(i + 5)), fall = k * k * 26; c.globalAlpha = a; c.fillStyle = PALETTE[i % PALETTE.length]!; c.save(); c.translate(Math.cos(ang) * d, Math.sin(ang) * d + fall); c.rotate(k * 9 + i); c.fillRect(-2.5, -1.5, 5, 3); c.restore() } break
    case 'shockwave': for (let j = 0; j < 2; j++) { const kk = Math.max(0, k - j * 0.15); c.globalAlpha = a * (j ? 0.4 : 0.85); c.strokeStyle = tint; c.lineWidth = 4 * (1 - kk) + 1; c.beginPath(); c.ellipse(0, 0, (6 + kk * 62) * big, (6 + kk * 62) * big * 0.55, 0, 0, 7); c.stroke() } break
    case 'ink': for (let i = 0; i < 9; i++) { const ang = rnd(p.seed + i) * 6.283, d = (4 + k * 22) * (0.5 + rnd(i + 3)); c.globalAlpha = a * 0.9; c.fillStyle = tint; c.beginPath(); c.arc(Math.cos(ang) * d, Math.sin(ang) * d, (1 + rnd(i + 7) * 5) * (1 - k * 0.5), 0, 7); c.fill() } c.globalAlpha = a; c.beginPath(); c.arc(0, 0, 6 * (1 - k * 0.4), 0, 7); c.fill(); break
    case 'lightning': c.strokeStyle = '#ffffff'; c.shadowColor = tint; c.shadowBlur = 10; c.lineWidth = 2; c.lineJoin = 'round'; for (let b = 0; b < 4; b++) { c.globalAlpha = a; const ang = rnd(p.seed + b) * 6.283; c.beginPath(); c.moveTo(0, 0); for (let s = 1; s <= 5; s++) { const d = s * 9 * (0.6 + k), j = (rnd(p.seed + b * 9 + s) - 0.5) * 12; c.lineTo(Math.cos(ang) * d - Math.sin(ang) * j, Math.sin(ang) * d + Math.cos(ang) * j) } c.stroke() } break
    case 'stardust': for (let i = 0; i < 14; i++) { const ang = rnd(p.seed + i) * 6.283, d = 6 + k * 44 * (0.4 + rnd(i + 4)); c.globalAlpha = a; c.fillStyle = i % 3 ? '#fff3b0' : tint; star5(c, Math.cos(ang) * d, Math.sin(ang) * d, 3 + rnd(i) * 3, 1.4, k * 4 + i); c.fill() } break
  }
  c.restore()
}

/** Draw a score celebration (arena coordinates, `p` at the arena centre or the scored side). */
function drawBurst(c: CanvasRenderingContext2D, style: BurstStyle, p: Pop, k: number): void {
  const a = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3
  c.save(); c.translate(p.x, p.y)
  switch (style) {
    case 'confetti': for (let i = 0; i < 40; i++) { const vx = (rnd(p.seed + i) - 0.5) * 520, vy = -200 - rnd(p.seed + i + 40) * 260, t = k * 1.6; c.globalAlpha = a; c.fillStyle = PALETTE[i % PALETTE.length]!; c.save(); c.translate(vx * t * 0.6, vy * t + 520 * t * t * 0.5); c.rotate(t * 8 + i); c.fillRect(-3, -2, 6, 4); c.restore() } break
    case 'stars': for (let i = 0; i < 18; i++) { const ang = (i / 18) * 6.283, d = 20 + k * 220 * (0.6 + rnd(i) * 0.5); c.globalAlpha = a; c.fillStyle = i % 2 ? '#ffd45e' : '#fff3b0'; star5(c, Math.cos(ang) * d, Math.sin(ang) * d, 9 - k * 4, 4, k * 5); c.fill() } break
    case 'hearts': for (let i = 0; i < 14; i++) { const x = (rnd(p.seed + i) - 0.5) * 260, y = 60 - k * 240 * (0.6 + rnd(i + 5) * 0.6); c.globalAlpha = a; c.fillStyle = i % 2 ? '#ff5a8a' : '#ff9ab8'; heart(c, x + Math.sin(k * 8 + i) * 8, y, 7 + rnd(i + 9) * 6) } break
    case 'fireworks': for (let f = 0; f < 3; f++) { const kk = Math.max(0, Math.min(1, (k - f * 0.18) / 0.6)); if (kk <= 0) continue; const cx = (f - 1) * 150, cy = -70 - (f % 2) * 40; for (let i = 0; i < 18; i++) { const ang = (i / 18) * 6.283, d = kk * 70; c.globalAlpha = (1 - kk) * a; c.fillStyle = PALETTE[(i + f * 2) % PALETTE.length]!; c.beginPath(); c.arc(cx + Math.cos(ang) * d, cy + Math.sin(ang) * d + kk * kk * 24, 2.4, 0, 7); c.fill() } } break
    case 'petals': for (let i = 0; i < 28; i++) { const x = (rnd(p.seed + i) - 0.5) * 360 + Math.sin(k * 5 + i) * 20, y = -120 + k * 260 * (0.6 + rnd(i + 3) * 0.6); c.globalAlpha = a * 0.9; c.fillStyle = i % 3 ? '#ffb3d1' : '#ffd9e6'; c.save(); c.translate(x, y); c.rotate(k * 4 + i); c.beginPath(); c.ellipse(0, 0, 6, 3, 0, 0, 7); c.fill(); c.restore() } break
    case 'meteors': for (let i = 0; i < 7; i++) { const x0 = -200 + i * 70 + rnd(i) * 30, t = Math.max(0, k * 1.3 - i * 0.07), x = x0 + t * 160, y = -200 + t * 320; if (t <= 0 || t > 1) continue; const g = c.createLinearGradient(x, y, x - 70, y - 110); g.addColorStop(0, rgba('#ffffff', 0.9 * a)); g.addColorStop(1, rgba('#ffb070', 0)); c.strokeStyle = g; c.lineWidth = 3; c.beginPath(); c.moveTo(x, y); c.lineTo(x - 70, y - 110); c.stroke() } break
  }
  c.restore()
}

/** Draw every live pop. `styles` are the painter values (null/unknown = none). Call inside the arena transform. */
export function drawPops(c: CanvasRenderingContext2D, pops: readonly Pop[], impact: string | undefined, burst: string | undefined, tint: string, reduce: boolean): void {
  const hs = impactStyle(impact), bs = burstStyle(burst)
  if (!hs && !bs) return
  for (const p of pops) {
    const k = Math.min(1, p.age / POP_LIFE[p.kind])
    if (p.kind === 'hit' && hs) drawHit(c, hs, p, reduce ? 0.35 : k, tint)
    else if (p.kind === 'score' && bs) drawBurst(c, bs, p, reduce ? 0.5 : k)
  }
}
/** A still preview of one effect (for cards): age fixed mid-way. */
export function drawPopPreview(c: CanvasRenderingContext2D, kind: 'hit' | 'score', style: string, tint: string): void {
  const p: Pop = { kind, x: 0, y: 0, age: 0, seed: 7 }
  if (kind === 'hit') { const s = impactStyle(style); if (s) drawHit(c, s, p, 0.4, tint) } else { const s = burstStyle(style); if (s) drawBurst(c, s, p, 0.45) }
}

/** Ornaments in the four corners of the frame. (W, H) are the frame's outer size, centred on the origin. */
export function drawCorners(c: CanvasRenderingContext2D, style: string | undefined, W: number, H: number, t: number, reduce: boolean): void {
  const s = cornerStyle(style); if (!s) return
  const time = reduce ? 1 : t
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
    c.save(); c.translate(sx * W / 2, sy * H / 2); c.scale(sx, sy)
    switch (s) {
      case 'bolts': { const g = c.createRadialGradient(-1, -1, 0.5, 0, 0, 7); g.addColorStop(0, '#fff'); g.addColorStop(0.5, '#c9ced6'); g.addColorStop(1, '#4a4f58'); c.fillStyle = g; c.beginPath(); c.arc(0, 0, 6, 0, 7); c.fill(); c.strokeStyle = 'rgba(0,0,0,.6)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-3.5, 0); c.lineTo(3.5, 0); c.stroke(); break }
      case 'gems': { const g = c.createLinearGradient(-7, -7, 7, 7); g.addColorStop(0, '#fff'); g.addColorStop(0.4, '#6dffc4'); g.addColorStop(1, '#0a6a4a'); c.fillStyle = g; c.beginPath(); c.moveTo(0, -9); c.lineTo(8, 0); c.lineTo(0, 9); c.lineTo(-8, 0); c.closePath(); c.fill(); c.strokeStyle = 'rgba(255,255,255,.7)'; c.stroke(); if (!reduce) { c.globalAlpha = 0.5 + 0.5 * Math.sin(time * 3 + sx + sy); c.fillStyle = '#fff'; c.fillRect(-1, -6, 2, 2) } break }
      case 'stars': c.fillStyle = '#ffd45e'; c.shadowColor = '#ffb347'; c.shadowBlur = reduce ? 0 : 8; star5(c, 0, 0, 9 + (reduce ? 0 : Math.sin(time * 2 + sx * 2 + sy) * 1.2), 4, time * 0.4); c.fill(); break
      case 'vines': c.strokeStyle = '#6fdc7a'; c.lineWidth = 2.4; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, 0); c.bezierCurveTo(14, -2, 18, 10, 30, 8); c.moveTo(0, 0); c.bezierCurveTo(-2, 14, 10, 18, 8, 30); c.stroke(); c.fillStyle = '#9af09f'; for (const [lx, ly] of [[14, 4], [24, 9], [4, 14], [9, 24]] as const) { c.beginPath(); c.ellipse(lx, ly, 4.5, 2.4, 0.6, 0, 7); c.fill() } break
      case 'wings': c.fillStyle = '#eef3ff'; c.strokeStyle = 'rgba(120,140,180,.8)'; c.lineWidth = 1; for (let i = 0; i < 4; i++) { const len = 30 - i * 5, flap = reduce ? 0 : Math.sin(time * 2 + i) * 0.04; c.save(); c.rotate(-0.15 - i * 0.2 + flap); c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(len * 0.5, -5, len, -1); c.quadraticCurveTo(len * 0.5, 4, 0, 2); c.closePath(); c.fill(); c.stroke(); c.restore() } break
      case 'flames': for (let i = 0; i < 4; i++) { const f = reduce ? 0.6 : 0.5 + 0.5 * Math.sin(time * 9 + i * 1.7 + sx), h = 14 + f * 10 - i * 2; const g = c.createLinearGradient(0, 0, 0, -h); g.addColorStop(0, '#ff6a3d'); g.addColorStop(0.6, '#ffb347'); g.addColorStop(1, 'rgba(255,230,160,0)'); c.fillStyle = g; c.beginPath(); c.moveTo(i * 5 - 2, 0); c.quadraticCurveTo(i * 5 + 1, -h * 0.6, i * 5 + 3, -h); c.quadraticCurveTo(i * 5 + 6, -h * 0.5, i * 5 + 6, 0); c.fill() } break
      case 'crowns': c.fillStyle = '#ffc857'; c.strokeStyle = '#8a5a08'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-8, 5); c.lineTo(-8, -6); c.lineTo(-4, -1); c.lineTo(0, -9); c.lineTo(4, -1); c.lineTo(8, -6); c.lineTo(8, 5); c.closePath(); c.fill(); c.stroke(); c.fillStyle = '#ff5a7a'; c.beginPath(); c.arc(0, 1, 1.8, 0, 7); c.fill(); break
    }
    c.restore()
  }
}

/** Lights hanging from the ceiling of the arena. (W, H) are the arena's inner size; the top edge is y = -H / 2. */
export function drawLights(c: CanvasRenderingContext2D, style: string | undefined, W: number, H: number, t: number, reduce: boolean): void {
  const s = lightStyle(style); if (!s) return
  const time = reduce ? 1 : t, top = -H / 2
  c.save()
  switch (s) {
    case 'lanterns': for (let i = 0; i < 4; i++) { const x = -W / 2 + W * (i + 0.5) / 4, sw = reduce ? 0 : Math.sin(time * 1.2 + i * 1.7) * 3, len = 22 + (i % 2) * 14; c.strokeStyle = 'rgba(180,190,210,.6)'; c.lineWidth = 1; c.beginPath(); c.moveTo(x, top); c.lineTo(x + sw, top + len); c.stroke(); const g = c.createRadialGradient(x + sw, top + len + 8, 1, x + sw, top + len + 8, 30); g.addColorStop(0, 'rgba(255,200,110,.55)'); g.addColorStop(1, 'rgba(255,200,110,0)'); c.fillStyle = g; c.fillRect(x + sw - 30, top + len - 22, 60, 60); c.fillStyle = '#ffb347'; c.beginPath(); c.roundRect(x + sw - 6, top + len, 12, 16, 4); c.fill(); c.fillStyle = '#fff3b0'; c.fillRect(x + sw - 3, top + len + 4, 6, 8) } break
    case 'fairy': c.strokeStyle = 'rgba(200,210,230,.5)'; c.lineWidth = 1; c.beginPath(); for (let x = -W / 2; x <= W / 2; x += 8) { const y = top + 8 + Math.sin((x / W) * Math.PI * 4) * 6 + 4; x === -W / 2 ? c.moveTo(x, y) : c.lineTo(x, y) } c.stroke(); for (let i = 0; i < 18; i++) { const x = -W / 2 + W * (i + 0.5) / 18, y = top + 12 + Math.sin((x / W) * Math.PI * 4) * 6, tw = reduce ? 0.8 : 0.5 + 0.5 * Math.sin(time * 3 + i * 0.9); c.fillStyle = `hsla(${(i * 47) % 360},90%,70%,${0.4 + 0.6 * tw})`; c.shadowColor = c.fillStyle as string; c.shadowBlur = 8; c.beginPath(); c.arc(x, y, 2.6, 0, 7); c.fill() } break
    case 'neon': { const p = reduce ? 0.8 : 0.7 + 0.3 * Math.sin(time * 3); c.shadowColor = '#ff4fd8'; c.shadowBlur = 12 * p; c.strokeStyle = `rgba(255,79,216,${p})`; c.lineWidth = 3; c.beginPath(); c.moveTo(-W / 2 + 12, top + 7); c.lineTo(W / 2 - 12, top + 7); c.stroke(); c.shadowColor = '#4ff0ff'; c.strokeStyle = `rgba(79,240,255,${p})`; c.lineWidth = 1.6; c.beginPath(); c.moveTo(-W / 2 + 12, top + 12); c.lineTo(W / 2 - 12, top + 12); c.stroke(); break }
    case 'spotlights': for (let i = 0; i < 3; i++) { const x = -W / 3 + (i * W) / 3, ang = reduce ? 0.2 * (i - 1) : Math.sin(time * 0.7 + i * 2) * 0.3; c.save(); c.translate(x, top + 4); c.rotate(ang); const g = c.createLinearGradient(0, 0, 0, H * 0.9); g.addColorStop(0, 'rgba(255,255,230,.28)'); g.addColorStop(1, 'rgba(255,255,230,0)'); c.fillStyle = g; c.beginPath(); c.moveTo(-5, 0); c.lineTo(5, 0); c.lineTo(60, H * 0.9); c.lineTo(-60, H * 0.9); c.closePath(); c.fill(); c.fillStyle = '#9aa6b8'; c.fillRect(-7, -4, 14, 9); c.restore() } break
    case 'chandelier': { const sw = reduce ? 0 : Math.sin(time * 0.9) * 4; c.translate(sw, 0); c.strokeStyle = '#c9a85a'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(0, top); c.lineTo(0, top + 18); c.stroke(); c.beginPath(); c.arc(0, top + 30, 16, Math.PI, 0); c.stroke(); for (let i = -2; i <= 2; i++) { const x = i * 9, fl = reduce ? 1 : 0.8 + 0.2 * Math.sin(time * 8 + i); c.fillStyle = '#fff3b0'; c.shadowColor = '#ffd45e'; c.shadowBlur = 10 * fl; c.beginPath(); c.ellipse(x, top + 24 - Math.abs(i) * 1.5, 2, 4 * fl, 0, 0, 7); c.fill() } break }
    case 'prismbar': { const g = c.createLinearGradient(-W / 2, 0, W / 2, 0), o = reduce ? 0.2 : (time * 0.12) % 1; for (let i = 0; i <= 8; i++) g.addColorStop(i / 8, `hsl(${((i / 8 + o) % 1) * 360},90%,65%)`); c.fillStyle = g; c.shadowColor = '#fff'; c.shadowBlur = 8; c.fillRect(-W / 2 + 10, top + 4, W - 20, 5); c.globalAlpha = 0.18; const h = c.createLinearGradient(0, top + 9, 0, top + 70); h.addColorStop(0, '#fff'); h.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = h; c.fillRect(-W / 2 + 10, top + 9, W - 20, 62); break }
  }
  c.restore()
}
