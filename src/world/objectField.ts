// The shared machinery behind every in-world menu: objects (hanging plaques, a ball, tethered props) that are drawn inside the live world,
// found with the pointer through the world's own transform, and labelled in sharp screen-space text. Used by the main menu (worldMenu.ts)
// and the pause menu (pauseWorld.ts). Render-only.
import { drawProp, type ArtId } from './propArt'
import { mix, rgba, shade, type Palette } from './palette'

export type Frame = 'arena' | 'world'
export type FieldKind = 'sign' | 'option' | 'toggle' | 'ball' | 'prop'
export interface FieldItem {
  id: string; frame: Frame; kind: FieldKind; x: number; y: number; w: number; h: number; round?: boolean
  title?: string; value?: string; badge?: string; hint?: string; caption?: string; label: string
  selected?: boolean; locked?: boolean; danger?: boolean; art?: ArtId; tint?: string
  /** Extra rotation in radians (a knocked prop spins before it settles). */
  rot?: number
}
export interface FieldConfig {
  reduce: boolean
  dpr(): number
  /** The arena's current centre in shaft coordinates (props are placed relative to it). */
  arena(): { x: number; y: number }
  arenaSize(): { W: number; H: number }
  alpha(): number
  /** The current theme's colours and finish (see look.ts). */
  palette(): Palette
  isHot(id: string): boolean
  layoutArena(W: number, H: number): FieldItem[]
  layoutWorld(t: number): FieldItem[]
}

const rr = (c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => { c.beginPath(); c.roundRect(x - w / 2, y - h / 2, w, h, r) }

export function createObjectField(cfg: FieldConfig) {
  const frames: Record<Frame, DOMMatrix | null> = { arena: null, world: null }
  let items: FieldItem[] = []
  let worldArena = { x: 0, y: 0 }       // where the arena was when the world layer last drew (it moves, and plunges when a match ends)

  const drawBall = (c: CanvasRenderingContext2D, it: FieldItem, hot: boolean, t: number) => {
    const bob = cfg.reduce ? 0 : Math.sin(t * 2.2) * 4, pulse = cfg.reduce ? 0.5 : 0.5 + 0.5 * Math.sin(t * 2.6)
    const r = (hot ? 43 : 35)
    const P = cfg.palette(), glowC = it.tint ?? P.accent
    const glow = c.createRadialGradient(it.x, it.y + bob, 4, it.x, it.y + bob, r * 2.2); glow.addColorStop(0, rgba(glowC, 0.34 + 0.18 * pulse)); glow.addColorStop(1, rgba(glowC, 0))
    c.fillStyle = glow; c.fillRect(it.x - r * 2.4, it.y + bob - r * 2.4, r * 4.8, r * 4.8)
    const g = c.createRadialGradient(it.x - r * 0.3, it.y + bob - r * 0.35, 2, it.x, it.y + bob, r); g.addColorStop(0, '#ffffff'); g.addColorStop(0.55, it.tint ?? mix(P.accent, '#ffffff', 0.7)); g.addColorStop(1, it.tint ?? shade(P.accent, -0.12))
    c.fillStyle = g; c.beginPath(); c.arc(it.x, it.y + bob, r, 0, 7); c.fill()
    if (it.tint) { const sh = c.createRadialGradient(it.x, it.y + bob, r * 0.4, it.x, it.y + bob, r); sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,.38)'); c.fillStyle = sh; c.beginPath(); c.arc(it.x, it.y + bob, r, 0, 7); c.fill() }
    c.strokeStyle = hot ? P.plaque.hot : it.tint ?? 'rgba(255,255,255,.7)'; c.lineWidth = 3; c.beginPath(); c.arc(it.x, it.y + bob, r + 7 + pulse * 3, 0, 7); c.stroke()
    it.y += bob
  }

  const arenaLayer = (c: CanvasRenderingContext2D, info: { W: number; H: number; t: number }) => {
    frames.arena = c.getTransform()
    const list = cfg.layoutArena(info.W, info.H)
    items = items.filter(i => i.frame !== 'arena').concat(list)
    c.globalAlpha = cfg.alpha()
    const P = cfg.palette().plaque
    const chains = (it: FieldItem, fromY: number) => { c.strokeStyle = rgba(P.rim, 0.85); c.lineWidth = 2; c.setLineDash([]); for (const s of [-1, 1]) { c.beginPath(); c.moveTo(it.x + s * it.w * 0.34, fromY); c.lineTo(it.x + s * it.w * 0.34, it.y - it.h / 2 + 2); c.stroke(); for (let k = 0; k < 6; k++) { const yy = fromY + (it.y - it.h / 2 - fromY) * (k + 0.5) / 6; c.fillStyle = k % 2 ? 'rgba(0,0,0,.35)' : rgba(P.rim, 0.9); c.fillRect(it.x + s * it.w * 0.34 - 1.6, yy - 2, 3.2, 4) } } }
    const signs = list.filter(i => i.kind === 'sign')
    for (const it of signs) chains(it, -info.H / 2)
    const opts = list.filter(i => i.kind === 'option')
    opts.forEach(it => { const sign = signs.find(s => s.x === it.x); const prev = opts.filter(o2 => o2.x === it.x && o2.y < it.y).sort((a, b) => b.y - a.y)[0]; chains(it, prev ? prev.y + prev.h / 2 : sign ? sign.y + sign.h / 2 : -info.H / 2) })
    for (const it of list) {
      const hot = cfg.isHot(it.id)
      if (it.kind === 'ball') { drawBall(c, it, hot, info.t); continue }
      const top = it.locked ? P.locked : it.danger ? mix(P.top, '#5a1426', 0.55) : P.top, bottom = it.locked ? shade(P.locked, -0.04) : it.danger ? mix(P.bottom, '#2a0a12', 0.6) : P.bottom
      const w = it.w * (hot ? 1.04 : 1), h = it.h * (hot ? 1.04 : 1), x0 = it.x - w / 2, y0 = it.y - h / 2
      const grad = c.createLinearGradient(0, y0, 0, y0 + h); grad.addColorStop(0, top); grad.addColorStop(1, bottom)
      rr(c, it.x, it.y, w, h, 9); c.fillStyle = grad; c.fill()
      // lit upper edge, shadowed lower edge: light comes from above
      c.save(); rr(c, it.x, it.y, w, h, 9); c.clip()
      c.fillStyle = 'rgba(255,255,255,.1)'; c.fillRect(x0, y0, w, h * 0.42)
      c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(x0, y0, w, 1.6); c.fillStyle = 'rgba(0,0,0,.4)'; c.fillRect(x0, y0 + h - 2.2, w, 2.2)
      if (P.finish === 'glass') { c.fillStyle = 'rgba(255,255,255,.12)'; c.beginPath(); c.moveTo(x0, y0 + h); c.lineTo(x0 + w * 0.45, y0); c.lineTo(x0 + w * 0.6, y0); c.lineTo(x0 + w * 0.15, y0 + h); c.fill() }
      c.restore()
      rr(c, it.x, it.y, w, h, 9)
      c.lineWidth = it.selected ? 3.2 : 2.2; c.setLineDash(it.locked ? [7, 5] : []); c.strokeStyle = hot ? P.hot : it.selected ? P.gold : it.locked ? P.lockedEdge : it.danger ? P.danger : P.edge; c.stroke(); c.setLineDash([])
      for (const s of [-1, 1]) { c.fillStyle = 'rgba(0,0,0,.45)'; c.beginPath(); c.arc(it.x + s * (it.w / 2 - 9), it.y - it.h / 2 + 9.6, 2.7, 0, 7); c.fill(); c.fillStyle = P.rim; c.beginPath(); c.arc(it.x + s * (it.w / 2 - 9), it.y - it.h / 2 + 9, 2.4, 0, 7); c.fill(); c.fillStyle = 'rgba(255,255,255,.6)'; c.beginPath(); c.arc(it.x + s * (it.w / 2 - 9.7), it.y - it.h / 2 + 8.3, 0.9, 0, 7); c.fill() }
    }
    c.globalAlpha = 1
  }

  const worldLayer = (c: CanvasRenderingContext2D, info: { t: number; arenaX: number; arenaY: number }) => {
    frames.world = c.getTransform(); worldArena = { x: info.arenaX, y: info.arenaY }
    const list = cfg.layoutWorld(info.t)
    items = items.filter(i => i.frame !== 'world').concat(list)
    const { W, H } = cfg.arenaSize()
    c.save(); c.translate(info.arenaX, info.arenaY)
    c.globalAlpha = cfg.alpha()
    for (const it of list) {
      const hot = cfg.isHot(it.id), s = hot ? 1.1 : 1
      if (it.kind === 'ball') { drawBall(c, it, hot, info.t); continue }
      // a faint tether back to the nearest corner of your arena: these objects belong to it
      const PL = cfg.palette(); c.strokeStyle = hot ? rgba(PL.plaque.hot, 0.55) : rgba(PL.plaque.rim, 0.28); c.lineWidth = 3; c.setLineDash([10, 12])
      c.beginPath(); c.moveTo(it.x, it.y); c.lineTo(Math.max(-W / 2, Math.min(W / 2, it.x)), Math.sign(it.y) * H / 2); c.stroke(); c.setLineDash([])
      const sway = cfg.reduce ? 0 : Math.sin(info.t * 0.9 + it.x * 0.01) * 0.04
      c.save(); c.translate(it.x, it.y); c.rotate(sway + (it.rot ?? 0)); c.scale(s, s)
      if (hot) { const g = c.createRadialGradient(0, 0, 8, 0, 0, it.w * 0.85); g.addColorStop(0, rgba(it.danger ? PL.danger : PL.plaque.hot, 0.3)); g.addColorStop(1, rgba(PL.plaque.hot, 0)); c.fillStyle = g; c.fillRect(-it.w, -it.w, it.w * 2, it.w * 2) }
      if (it.art) drawProp(c, it.art, it.w, info.t, PL, hot, cfg.reduce)
      c.restore()
    }
    c.restore(); c.globalAlpha = 1
  }

  const project = (it: FieldItem): { x: number; y: number; k: number; a: number } | null => {
    const m = frames[it.frame]; if (!m) return null
    const a = worldArena, dpr = cfg.dpr()
    const wx = it.frame === 'world' ? a.x + it.x : it.x, wy = it.frame === 'world' ? a.y + it.y : it.y
    const p = m.transformPoint(new DOMPoint(wx, wy))
    return { x: p.x / dpr, y: p.y / dpr, k: Math.hypot(m.a, m.b) / dpr, a: Math.atan2(m.b, m.a) }
  }

  /** Labels, values and the tooltip, in screen space (call after the world has been drawn). `tipId` is the hovered or focused object. */
  const drawText = (ctx: CanvasRenderingContext2D, cw: number, ch: number, tipId: string | null) => {
    ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.globalAlpha = cfg.alpha()
    const PP = cfg.palette(), P = PP.plaque, light = P.finish === 'paper'
    for (const it of items) {
      const p0 = project(it); if (!p0) continue
      const hot = cfg.isHot(it.id)
      ctx.save(); ctx.translate(p0.x, p0.y); ctx.rotate(it.frame === 'arena' ? p0.a : 0)   // text turns with the plaque it is written on
      const p = { x: 0, y: 0, k: p0.k }
      if (it.kind === 'sign' || it.kind === 'toggle') {
        const fs = Math.max(10, Math.min(17, it.h * p.k * 0.34))
        ctx.fillStyle = P.sub; ctx.font = `700 ${Math.max(8, fs * 0.62)}px ui-monospace,monospace`; ctx.fillText(it.title ?? '', p.x, p.y - it.h * p.k * 0.22)
        ctx.fillStyle = hot && !light ? '#ffffff' : it.danger ? P.danger : P.text; ctx.font = `800 ${fs}px system-ui`; ctx.fillText(it.value ?? '', p.x, p.y + it.h * p.k * 0.16)
      } else if (it.kind === 'option') {
        const fs = Math.max(10, Math.min(16, it.h * p.k * 0.42))
        ctx.fillStyle = it.locked ? '#7f8da3' : it.selected ? (light ? P.edge : P.gold) : P.text; ctx.font = `700 ${fs}px system-ui`
        ctx.fillText((it.locked ? '🔒 ' : '') + (it.value ?? ''), p.x, p.y - (it.badge ? it.h * p.k * 0.12 : 0))
        if (it.badge) { ctx.fillStyle = light ? P.edge : P.gold; ctx.font = `600 ${Math.max(8, fs * 0.62)}px ui-monospace,monospace`; ctx.fillText(it.badge, p.x, p.y + it.h * p.k * 0.26) }
      } else if (it.kind === 'ball') {
        const long = (it.value ?? '').length > 5
        const fs = Math.max(10, Math.min(16, (long ? 20 : 28) * p.k))
        ctx.fillStyle = shade(PP.ink, -0.02); ctx.font = `900 ${fs}px system-ui`; ctx.fillText(it.value ?? '', p.x, p.y)
        if (it.caption) { ctx.fillStyle = hot ? '#fff' : rgba(PP.steel[0], 0.9); ctx.font = `700 ${Math.max(10, fs * 0.72)}px system-ui`; ctx.fillText(it.caption, p.x, p.y + 66 * p.k + 10) }
      } else if (it.kind === 'prop') {
        ctx.fillStyle = hot ? '#ffffff' : it.danger ? PP.danger : rgba(PP.steel[0], 0.85); ctx.font = `${hot ? 800 : 700} ${Math.max(10, Math.min(15, 18 * p.k * 1.3))}px system-ui`; ctx.shadowColor = '#000'; ctx.shadowBlur = 6
        ctx.fillText(it.title ?? '', p.x, p.y + it.h * p.k * 0.62 + 8); ctx.shadowBlur = 0
      }
      ctx.restore()
    }
    const tip = items.find(i => i.id === tipId && i.hint)
    if (tip) {
      const p = project(tip)
      if (p) {
        const text = tip.hint!, title = tip.title ?? ''
        ctx.font = '700 13px system-ui'; const wd = Math.max(ctx.measureText(text).width, ctx.measureText(title).width) + 26
        const bx = Math.min(cw - wd / 2 - 8, Math.max(wd / 2 + 8, p.x)), by = Math.max(60, p.y - tip.h * p.k * 0.75 - 40)
        ctx.fillStyle = rgba(PP.deep, 0.95); ctx.strokeStyle = P.hot; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.roundRect(bx - wd / 2, by - 24, wd, 48, 8); ctx.fill(); ctx.stroke()
        ctx.fillStyle = mix(P.hot, '#ffffff', 0.35); ctx.font = '800 11px ui-monospace,monospace'; ctx.fillText(title.toUpperCase(), bx, by - 8)
        ctx.fillStyle = '#f2f7ff'; ctx.font = '600 13px system-ui'; ctx.fillText(text, bx, by + 10)
      }
    }
    ctx.restore()
  }

  /** The object under a pointer event, found through the same transforms the world was drawn with. */
  const hit = (e: { clientX: number; clientY: number }, canvas: HTMLCanvasElement): FieldItem | null => {
    const r = canvas.getBoundingClientRect()
    const px = (e.clientX - r.left) * (canvas.width / r.width), py = (e.clientY - r.top) * (canvas.height / r.height)
    const a = worldArena
    for (let k = items.length - 1; k >= 0; k--) {
      const it = items[k]!; const m = frames[it.frame]; if (!m) continue
      const q = m.inverse().transformPoint(new DOMPoint(px, py))
      const cx = it.frame === 'world' ? a.x + it.x : it.x, cy = it.frame === 'world' ? a.y + it.y : it.y
      const dx = q.x - cx, dy = q.y - cy
      if (it.kind === 'ball' ? Math.hypot(dx, dy) <= 44 : Math.abs(dx) <= it.w / 2 && Math.abs(dy) <= it.h / 2) return it
    }
    return null
  }
  return { arenaLayer, worldLayer, drawText, hit, items: () => items }
}
export type ObjectField = ReturnType<typeof createObjectField>
