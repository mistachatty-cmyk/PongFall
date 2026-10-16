// The shared machinery behind every in-world menu: objects (hanging plaques, a ball, tethered props) that are drawn inside the live world,
// found with the pointer through the world's own transform, and labelled in sharp screen-space text. Used by the main menu (worldMenu.ts)
// and the pause menu (pauseWorld.ts). Render-only.
import { propImage, type ArtId } from './propArt'

export type Frame = 'arena' | 'world'
export type FieldKind = 'sign' | 'option' | 'toggle' | 'ball' | 'prop'
export interface FieldItem {
  id: string; frame: Frame; kind: FieldKind; x: number; y: number; w: number; h: number; round?: boolean
  title?: string; value?: string; badge?: string; hint?: string; caption?: string; label: string
  selected?: boolean; locked?: boolean; danger?: boolean; art?: ArtId
}
export interface FieldConfig {
  reduce: boolean
  dpr(): number
  /** The arena's current centre in shaft coordinates (props are placed relative to it). */
  arena(): { x: number; y: number }
  arenaSize(): { W: number; H: number }
  alpha(): number
  isHot(id: string): boolean
  layoutArena(W: number, H: number): FieldItem[]
  layoutWorld(t: number): FieldItem[]
}
export const ACCENT = '#6fb1ff', HOT = '#8cece6', GOLD = '#ffe08a', DANGER = '#ff9aa8'

const rr = (c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => { c.beginPath(); c.roundRect(x - w / 2, y - h / 2, w, h, r) }

export function createObjectField(cfg: FieldConfig) {
  const frames: Record<Frame, DOMMatrix | null> = { arena: null, world: null }
  let items: FieldItem[] = []

  const arenaLayer = (c: CanvasRenderingContext2D, info: { W: number; H: number; t: number }) => {
    frames.arena = c.getTransform()
    const list = cfg.layoutArena(info.W, info.H)
    items = items.filter(i => i.frame !== 'arena').concat(list)
    c.globalAlpha = cfg.alpha()
    const chains = (it: FieldItem, fromY: number) => { c.strokeStyle = 'rgba(190,210,240,.55)'; c.lineWidth = 2; c.setLineDash([]); for (const s of [-1, 1]) { c.beginPath(); c.moveTo(it.x + s * it.w * 0.34, fromY); c.lineTo(it.x + s * it.w * 0.34, it.y - it.h / 2 + 2); c.stroke() } }
    const signs = list.filter(i => i.kind === 'sign')
    for (const it of signs) chains(it, -info.H / 2)
    const opts = list.filter(i => i.kind === 'option')
    opts.forEach(it => { const sign = signs.find(s => s.x === it.x); const prev = opts.filter(o2 => o2.x === it.x && o2.y < it.y).sort((a, b) => b.y - a.y)[0]; chains(it, prev ? prev.y + prev.h / 2 : sign ? sign.y + sign.h / 2 : -info.H / 2) })
    for (const it of list) {
      const hot = cfg.isHot(it.id)
      if (it.kind === 'ball') {
        const bob = cfg.reduce ? 0 : Math.sin(info.t * 2.2) * 4, pulse = cfg.reduce ? 0.5 : 0.5 + 0.5 * Math.sin(info.t * 2.6)
        const r = (hot ? 43 : 35)
        const glow = c.createRadialGradient(it.x, it.y + bob, 4, it.x, it.y + bob, r * 2.2); glow.addColorStop(0, `rgba(160,210,255,${0.34 + 0.18 * pulse})`); glow.addColorStop(1, 'rgba(160,210,255,0)')
        c.fillStyle = glow; c.fillRect(it.x - r * 2.4, it.y + bob - r * 2.4, r * 4.8, r * 4.8)
        const g = c.createRadialGradient(it.x - r * 0.3, it.y + bob - r * 0.35, 2, it.x, it.y + bob, r); g.addColorStop(0, '#ffffff'); g.addColorStop(0.55, '#cfe6ff'); g.addColorStop(1, '#7fb4ee')
        c.fillStyle = g; c.beginPath(); c.arc(it.x, it.y + bob, r, 0, 7); c.fill()
        c.strokeStyle = hot ? HOT : 'rgba(255,255,255,.7)'; c.lineWidth = 3; c.beginPath(); c.arc(it.x, it.y + bob, r + 7 + pulse * 3, 0, 7); c.stroke()
        it.y += bob
        continue
      }
      const grad = c.createLinearGradient(0, it.y - it.h / 2, 0, it.y + it.h / 2); grad.addColorStop(0, it.locked ? '#171d2b' : it.danger ? '#2a1520' : '#18263d'); grad.addColorStop(1, it.locked ? '#10141f' : it.danger ? '#1a0d14' : '#0e1829')
      rr(c, it.x, it.y, it.w * (hot ? 1.04 : 1), it.h * (hot ? 1.04 : 1), 9); c.fillStyle = grad; c.fill()
      c.lineWidth = it.selected ? 3.2 : 2.2; c.setLineDash(it.locked ? [7, 5] : []); c.strokeStyle = hot ? HOT : it.selected ? GOLD : it.locked ? '#56627a' : it.danger ? DANGER : ACCENT; c.stroke(); c.setLineDash([])
      c.fillStyle = 'rgba(255,255,255,.06)'; rr(c, it.x, it.y - it.h * 0.24, it.w - 8, it.h * 0.34, 6); c.fill()
      c.fillStyle = 'rgba(160,190,230,.55)'; for (const s of [-1, 1]) { c.beginPath(); c.arc(it.x + s * (it.w / 2 - 9), it.y - it.h / 2 + 9, 2.4, 0, 7); c.fill() }
    }
    c.globalAlpha = 1
  }

  const worldLayer = (c: CanvasRenderingContext2D, info: { t: number; arenaX: number; arenaY: number }) => {
    frames.world = c.getTransform()
    const list = cfg.layoutWorld(info.t)
    items = items.filter(i => i.frame !== 'world').concat(list)
    const { W, H } = cfg.arenaSize()
    c.save(); c.translate(info.arenaX, info.arenaY)
    c.globalAlpha = cfg.alpha()
    for (const it of list) {
      const hot = cfg.isHot(it.id), s = hot ? 1.1 : 1
      // a faint tether back to the nearest corner of your arena: these objects belong to it
      c.strokeStyle = hot ? 'rgba(140,236,230,.55)' : 'rgba(150,175,210,.22)'; c.lineWidth = 3; c.setLineDash([10, 12])
      c.beginPath(); c.moveTo(it.x, it.y); c.lineTo(Math.max(-W / 2, Math.min(W / 2, it.x)), Math.sign(it.y) * H / 2); c.stroke(); c.setLineDash([])
      const sway = cfg.reduce ? 0 : Math.sin(info.t * 0.9 + it.x * 0.01) * 0.04
      c.save(); c.translate(it.x, it.y); c.rotate(sway); c.scale(s, s)
      if (hot) { const g = c.createRadialGradient(0, 0, 8, 0, 0, it.w * 0.85); g.addColorStop(0, it.danger ? 'rgba(255,154,168,.3)' : 'rgba(140,236,230,.3)'); g.addColorStop(1, 'rgba(140,236,230,0)'); c.fillStyle = g; c.fillRect(-it.w, -it.w, it.w * 2, it.w * 2) }
      c.shadowColor = 'rgba(0,0,0,.6)'; c.shadowBlur = 14; c.shadowOffsetY = 6
      const img = it.art ? propImage(it.art) : null
      if (img) c.drawImage(img, -it.w / 2, -it.h / 2, it.w, it.h)
      c.restore()
    }
    c.restore(); c.globalAlpha = 1
  }

  const project = (it: FieldItem): { x: number; y: number; k: number; a: number } | null => {
    const m = frames[it.frame]; if (!m) return null
    const a = cfg.arena(), dpr = cfg.dpr()
    const wx = it.frame === 'world' ? a.x + it.x : it.x, wy = it.frame === 'world' ? a.y + it.y : it.y
    const p = m.transformPoint(new DOMPoint(wx, wy))
    return { x: p.x / dpr, y: p.y / dpr, k: Math.hypot(m.a, m.b) / dpr, a: Math.atan2(m.b, m.a) }
  }

  /** Labels, values and the tooltip, in screen space (call after the world has been drawn). `tipId` is the hovered or focused object. */
  const drawText = (ctx: CanvasRenderingContext2D, cw: number, ch: number, tipId: string | null) => {
    ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.globalAlpha = cfg.alpha()
    for (const it of items) {
      const p0 = project(it); if (!p0) continue
      const hot = cfg.isHot(it.id)
      ctx.save(); ctx.translate(p0.x, p0.y); ctx.rotate(it.frame === 'arena' ? p0.a : 0)   // text turns with the plaque it is written on
      const p = { x: 0, y: 0, k: p0.k }
      if (it.kind === 'sign' || it.kind === 'toggle') {
        const fs = Math.max(10, Math.min(17, it.h * p.k * 0.34))
        ctx.fillStyle = '#8fb4e6'; ctx.font = `700 ${Math.max(8, fs * 0.62)}px ui-monospace,monospace`; ctx.fillText(it.title ?? '', p.x, p.y - it.h * p.k * 0.22)
        ctx.fillStyle = hot ? '#ffffff' : it.danger ? DANGER : '#eaf3ff'; ctx.font = `800 ${fs}px system-ui`; ctx.fillText(it.value ?? '', p.x, p.y + it.h * p.k * 0.16)
      } else if (it.kind === 'option') {
        const fs = Math.max(10, Math.min(16, it.h * p.k * 0.42))
        ctx.fillStyle = it.locked ? '#7f8da3' : it.selected ? GOLD : '#eaf3ff'; ctx.font = `700 ${fs}px system-ui`
        ctx.fillText((it.locked ? '🔒 ' : '') + (it.value ?? ''), p.x, p.y - (it.badge ? it.h * p.k * 0.12 : 0))
        if (it.badge) { ctx.fillStyle = '#ffe08a'; ctx.font = `600 ${Math.max(8, fs * 0.62)}px ui-monospace,monospace`; ctx.fillText(it.badge, p.x, p.y + it.h * p.k * 0.26) }
      } else if (it.kind === 'ball') {
        const long = (it.value ?? '').length > 5
        const fs = Math.max(10, Math.min(16, (long ? 20 : 28) * p.k))
        ctx.fillStyle = '#0b1320'; ctx.font = `900 ${fs}px system-ui`; ctx.fillText(it.value ?? '', p.x, p.y)
        if (it.caption) { ctx.fillStyle = hot ? '#fff' : 'rgba(210,230,255,.82)'; ctx.font = `700 ${Math.max(10, fs * 0.72)}px system-ui`; ctx.fillText(it.caption, p.x, p.y + 66 * p.k + 10) }
      } else if (it.kind === 'prop') {
        ctx.fillStyle = hot ? '#ffffff' : it.danger ? DANGER : 'rgba(190,210,240,.78)'; ctx.font = `${hot ? 800 : 700} ${Math.max(10, Math.min(15, 18 * p.k * 1.3))}px system-ui`; ctx.shadowColor = '#000'; ctx.shadowBlur = 6
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
        ctx.fillStyle = 'rgba(6,14,24,.94)'; ctx.strokeStyle = HOT; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.roundRect(bx - wd / 2, by - 24, wd, 48, 8); ctx.fill(); ctx.stroke()
        ctx.fillStyle = '#9fe6e1'; ctx.font = '800 11px ui-monospace,monospace'; ctx.fillText(title.toUpperCase(), bx, by - 8)
        ctx.fillStyle = '#e9f4ff'; ctx.font = '600 13px system-ui'; ctx.fillText(text, bx, by + 10)
      }
    }
    ctx.restore()
  }

  /** The object under a pointer event, found through the same transforms the world was drawn with. */
  const hit = (e: { clientX: number; clientY: number }, canvas: HTMLCanvasElement): FieldItem | null => {
    const r = canvas.getBoundingClientRect()
    const px = (e.clientX - r.left) * (canvas.width / r.width), py = (e.clientY - r.top) * (canvas.height / r.height)
    const a = cfg.arena()
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
