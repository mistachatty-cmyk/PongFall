// A dialog inside the world: the camera pulls back from your arena and the choices become objects around it (balls on the arena floor, small tethered
// objects beside it), with a title and a few lines of text drawn sharp in screen space. Used by the pause menu (pauseWorld.ts) and the end-of-match
// choices (endWorld.ts). Render-only: nothing here reaches the sim.
import { drawAmbient } from './ambient'
import type { Camera } from '../render/draw'
import { createObjectField, type FieldItem } from './objectField'
import type { ArtId } from './propArt'
import { isPortrait } from './menuModel'
import { trText } from '../core/autoL10n'
import { lookPalette } from './look'
import { mix } from './palette'

export interface DialogItem {
  label: string; run: () => void
  /** 'ball' objects sit on the arena floor (the main choices); the rest hang around the arena. */
  kind?: 'ball' | 'prop'
  /** Text in the ball (a short word) and under it. */
  value?: string; caption?: string
  art?: ArtId; hint?: string; danger?: boolean; tint?: string
}
export interface DialogText { title: string; sub?: string; kicker?: string; copy?: string; recap?: string[]; info?: () => string }
export interface DialogOptions { arena(): { x: number; y: number }; arenaSize(): { W: number; H: number }; reduce(): boolean }
export interface PresentOptions { /** Esc inside the dialog. */ escape?: () => void; /** Focus the first choice (end screens: Enter takes it). */ focus?: boolean; /** Choices fall in from above. */ drop?: boolean }

/** Where object `i` of `n` sits relative to the arena's centre, in shaft units. Wide screens: two columns beside the arena. Tall screens: rows above and below. */
export function pausePlacement(i: number, n: number, W: number, H: number, portrait: boolean): { x: number; y: number } {
  if (portrait) {
    const perRow = 3, row = Math.floor(i / perRow), col = i % perRow
    const inRow = Math.min(perRow, n - row * perRow)
    const x = (col - (inRow - 1) / 2) * 230
    const above = row % 2 === 0, depth = Math.floor(row / 2)
    return { x, y: (above ? -1 : 1) * (H / 2 + 150 + depth * 190) }
  }
  const left = i % 2 === 0, k = Math.floor(i / 2), perSide = Math.ceil(n / 2)
  const rows = left ? perSide : n - perSide
  return { x: (left ? -1 : 1) * (W / 2 + 230), y: (k - (rows - 1) / 2) * 175 }
}

/** The camera zoom that frames the arena and all its objects. */
export function pauseZoom(n: number, W: number, H: number, cw: number, ch: number): number {
  if (isPortrait(cw, ch)) {
    const rows = Math.ceil(n / 3), up = Math.ceil(rows / 2)
    return Math.min(cw / 760, ch / (H + 2 * (150 + (up - 1) * 190) + 260))
  }
  const perSide = Math.ceil(n / 2)
  return Math.min(cw / (W + 2 * 400), ch / Math.max(H + 240, perSide * 175 + 220))
}

/** Greedy line breaking for drawn text. Words wrap at spaces; text without spaces (Japanese, Chinese) wraps between characters. */
export function wrapLines(text: string, maxW: number, measure: (s: string) => number): string[] {
  const out: string[] = []
  const tokens = text.includes(' ') ? text.split(' ') : Array.from(text)
  const glue = text.includes(' ') ? ' ' : ''
  let line = ''
  for (const tk of tokens) {
    const next = line ? line + glue + tk : tk
    if (line && measure(next) > maxW) { out.push(line); line = tk } else line = next
  }
  if (line) out.push(line)
  return out
}

export function createWorldDialog(host: HTMLElement, canvas: HTMLCanvasElement, o: DialogOptions, tag = 'pause-menu') {
  const overlay = document.createElement('div')
  overlay.setAttribute('data-pf', tag); overlay.dataset.world = '1'
  overlay.style.cssText = 'position:absolute;inset:0;z-index:20;display:none;touch-action:none'
  const sr = document.createElement('div')
  sr.setAttribute('role', 'dialog'); sr.setAttribute('aria-modal', 'true')
  sr.style.cssText = 'position:absolute;left:-9999px;top:0;width:1px;height:1px;overflow:hidden'
  const live = document.createElement('div'); live.setAttribute('role', 'status'); live.style.cssText = sr.style.cssText
  overlay.append(sr, live); host.appendChild(overlay)

  let list: DialogItem[] = [], text: DialogText = { title: '' }, shown = false, blend = 0, age = 0, drop = false
  let esc: (() => void) | undefined
  let hover: string | null = null, focus: string | null = null
  let cw = 1, ch = 1, dpr = 1

  const balls = () => list.map((it, i) => ({ it, i })).filter(x => x.it.kind === 'ball')
  const props = () => list.map((it, i) => ({ it, i })).filter(x => x.it.kind !== 'ball')
  const field = createObjectField({
    reduce: o.reduce(), dpr: () => dpr, arena: o.arena, arenaSize: o.arenaSize, alpha: () => blend, palette: lookPalette,
    isHot: id => hover === id || focus === id,
    layoutArena: () => [],
    layoutWorld: t => {
      const { W, H } = o.arenaSize(), ps = props(), portrait = isPortrait(cw, ch)
      const bs = balls(), rise = drop && !o.reduce() ? Math.max(0, 1 - Math.min(1, age / 0.8)) : 0
      const ballItems: FieldItem[] = bs.map(({ it, i }, k) => ({
        id: `p:${i}`, frame: 'world', kind: 'ball', x: (k - (bs.length - 1) / 2) * Math.min(W * 0.34, 190), y: H / 2 - 52 - rise * rise * 520, w: 76, h: 76, round: true,
        value: it.value ?? 'GO', caption: it.caption ?? it.label.toUpperCase(), label: it.label, hint: it.hint, tint: it.tint, danger: it.danger,
      }))
      return ballItems.concat(ps.map(({ it, i }, k) => {
        const p = pausePlacement(k, ps.length, W, H, portrait)
        return {
          id: `p:${i}`, frame: 'world' as const, kind: 'prop' as const, x: p.x, y: p.y + (o.reduce() ? 0 : Math.sin(t * 0.8 + k * 1.7) * 7), w: 128, h: 128,
          art: it.art ?? 'book', title: it.caption ?? it.label, hint: it.hint, label: it.label, danger: it.danger,
        }
      }))
    },
  })

  const run = (id: string) => { const it = list[Number(id.slice(2))]; if (it) it.run() }
  const hit = (e: PointerEvent) => field.hit(e, canvas)
  overlay.addEventListener('pointermove', e => { const it = hit(e); hover = it?.id ?? null; overlay.style.cursor = it ? 'pointer' : 'default' })
  overlay.addEventListener('pointerleave', () => { hover = null })
  overlay.addEventListener('pointerdown', e => { e.stopPropagation(); const it = hit(e); if (it) { e.preventDefault(); run(it.id) } })
  overlay.addEventListener('keydown', e => {
    if (e.key === 'Escape' && esc) { e.preventDefault(); e.stopPropagation(); esc(); return }
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowDown' && e.key !== 'ArrowLeft' && e.key !== 'ArrowUp') return
    e.preventDefault()
    const btns = Array.from(sr.querySelectorAll('button')), at = btns.indexOf(document.activeElement as HTMLButtonElement), dir = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1
    btns[(at + dir + btns.length) % btns.length]?.focus()
  })

  const smooth = (x: number) => x * x * (3 - 2 * x)
  return {
    isOpen: () => shown,
    /** True while the dialog is open or still easing out (the world keeps drawing its objects and the pulled-back camera). */
    active: () => shown || blend > 0.004,
    present(t: DialogText, items: DialogItem[], p: PresentOptions = {}) {
      list = items.map(it => ({ kind: 'prop', ...it })); text = t; esc = p.escape; drop = !!p.drop; age = 0
      if (!shown) blend = Math.min(blend, 0.001)
      shown = true; overlay.style.display = 'block'
      sr.setAttribute('aria-label', t.title)
      sr.replaceChildren(...list.map((it, i) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = it.label; b.setAttribute('aria-label', it.hint ? `${it.label}. ${it.hint}` : it.label); b.dataset.id = `p:${i}`; b.onfocus = () => { focus = b.dataset.id! }; b.onblur = () => { if (focus === b.dataset.id) focus = null }; b.onclick = () => it.run(); return b }))
      live.textContent = [t.title, t.copy].filter(Boolean).join('. ')
      if (p.focus) sr.querySelector('button')?.focus({ preventScroll: true })
    },
    hide() { shown = false; overlay.style.display = 'none'; hover = null; focus = null; esc = undefined },
    destroy() { overlay.remove() },
    layers: { arena: field.arenaLayer, world: field.worldLayer },
    /** Eases the pull-back and applies it to the camera for this frame. Returns the function that puts the camera back afterwards. */
    apply(cam: Camera, w: number, h: number, dt: number): () => void {
      cw = w; ch = h; dpr = window.devicePixelRatio || 1; age += dt
      const goal = shown ? 1 : 0
      blend = o.reduce() ? goal : blend + (goal - blend) * Math.min(1, dt * 6)
      if (Math.abs(goal - blend) < 0.004) blend = goal
      const base = cam.zoom
      if (blend > 0) {
        const { W, H } = o.arenaSize(), fit = Math.min(1.1, pauseZoom(Math.max(1, props().length), W, H, w, h))
        cam.zoom = base + (fit - base) * smooth(blend)
      }
      return () => { cam.zoom = base }
    },
    /** Title, lines of text, labels and the tooltip, in sharp screen space. Call after the world has been drawn. */
    drawText(ctx: CanvasRenderingContext2D) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      drawAmbient(ctx, lookPalette().anim, cw, ch, performance.now() / 1000, lookPalette(), o.reduce())
      if (cw >= 600 || text.copy) {
        ctx.save(); ctx.textAlign = 'center'; ctx.globalAlpha = blend; ctx.shadowColor = 'rgba(0,0,0,.85)'; ctx.shadowBlur = 12
        const wide = cw >= 600, maxW = Math.min(620, cw - 32)
        const title = trText(text.title)
        const copyFont = '600 14px system-ui'
        ctx.font = copyFont
        const copy = text.copy ? wrapLines(trText(text.copy), maxW, s => ctx.measureText(s).width).slice(0, 5) : []
        const info = text.info?.() ?? ''
        const recap = text.recap?.length ? text.recap.map(trText).join('   ·   ') : ''
        const lines = (text.kicker ? 1 : 0) + 1 + (text.sub ? 1 : 0) + copy.length + (recap ? 1 : 0) + (info && wide ? 1 : 0)
        let y = ch - (wide ? 36 : 28) - (lines - 1) * 20 - 18 - (text.kicker ? 14 : 0)
        if (text.kicker) { ctx.fillStyle = '#ffe08a'; ctx.font = '800 11px ui-monospace,monospace'; ctx.fillText(trText(text.kicker), cw / 2, y); y += 34 }
        ctx.fillStyle = '#e9f2ff'; ctx.font = `900 ${Math.max(20, Math.min(34, cw * 0.03))}px system-ui`; ctx.fillText(title, cw / 2, y); y += 26
        if (text.sub) { ctx.shadowBlur = 8; ctx.fillStyle = mix(lookPalette().accent, '#ffffff', 0.45); ctx.font = '700 13px system-ui'; ctx.fillText(text.sub, cw / 2, y); y += 20 }
        ctx.shadowBlur = 8
        for (const l of copy) { ctx.fillStyle = '#c9d9ee'; ctx.font = copyFont; ctx.fillText(l, cw / 2, y); y += 20 }
        if (recap) { ctx.fillStyle = '#d8e8fb'; ctx.font = '700 12px ui-monospace,monospace'; ctx.fillText(recap, cw / 2, y); y += 20 }
        if (info && wide) { ctx.fillStyle = '#7f98b8'; ctx.font = '600 12px ui-monospace,monospace'; ctx.fillText(info, cw / 2, y) }
        ctx.restore()
      }
      field.drawText(ctx, cw, ch, hover)
    },
  }
}
export type WorldDialog = ReturnType<typeof createWorldDialog>
