// The pause menu inside the match's own world. Pausing pulls the camera back from your arena and the choices appear as objects around it: the ball is
// Resume, a gear is Settings, a door leads out. Same interface as the old pause card (core/pauseMenu.ts), which stays as the fallback for ?menu=classic.
// Render-only: the sim is paused (or, online, keeps running) exactly as before; nothing here reaches it.
import type { Camera } from '../render/draw'
import type { PauseItem } from '../core/pauseMenu'
import { createObjectField, type FieldItem } from './objectField'
import type { ArtId } from './propArt'
import { isPortrait } from './menuModel'

/** Which object stands for which pause choice. The first match wins; anything unknown becomes a book. */
const ART_FOR: [RegExp, ArtId][] = [
  [/^save/i, 'save'], [/^restart/i, 'restart'], [/arena sides/i, 'wardrobe'], [/^settings/i, 'gear'], [/keyboard/i, 'keys'], [/^music/i, 'jukebox'],
  [/^rules/i, 'book'], [/dev notes/i, 'cassette'], [/^(main menu|leave)/i, 'exit'], [/^reset/i, 'flask'],
]
export const artForPause = (label: string): ArtId => ART_FOR.find(([re]) => re.test(label))?.[1] ?? 'book'
/** Short names for the objects (the pause labels are written for buttons). */
const SHORT = (label: string): string => label.replace(/\s*\(.*\)\s*$/, '').replace(/^Rules and how it works$/, 'Rules').replace(/^Reset settings to defaults$/, 'Reset settings')

export interface PauseWorldOptions {
  arena(): { x: number; y: number }
  arenaSize(): { W: number; H: number }
  reduce(): boolean
  /** One line about the match (mode, difficulty, score) drawn under the title. */
  info(): string
}

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

export function createPauseWorld(host: HTMLElement, canvas: HTMLCanvasElement, o: PauseWorldOptions) {
  const overlay = document.createElement('div')
  overlay.setAttribute('data-pf', 'pause-menu'); overlay.dataset.world = '1'
  overlay.style.cssText = 'position:absolute;inset:0;z-index:20;display:none;touch-action:none'
  const sr = document.createElement('div')
  sr.setAttribute('role', 'dialog'); sr.setAttribute('aria-modal', 'true'); sr.setAttribute('aria-label', 'Paused')
  sr.style.cssText = 'position:absolute;left:-9999px;top:0;width:1px;height:1px;overflow:hidden'
  overlay.appendChild(sr); host.appendChild(overlay)

  let list: PauseItem[] = [], title = 'Paused', sub = '', shown = false, blend = 0
  let hover: string | null = null, focus: string | null = null
  let cw = 1, ch = 1, dpr = 1

  const field = createObjectField({
    reduce: o.reduce(), dpr: () => dpr, arena: o.arena, arenaSize: o.arenaSize, alpha: () => blend,
    isHot: id => hover === id || focus === id,
    layoutArena: (_W, H) => list.length ? [{
      id: 'p:0', frame: 'arena', kind: 'ball', x: 0, y: H / 2 - 52, w: 76, h: 76, round: true, value: 'GO', caption: SHORT(list[0]!.label).toUpperCase(),
      label: list[0]!.label, hint: list[0]!.hint ?? 'Back into the fall',
    } satisfies FieldItem] : [],
    layoutWorld: t => {
      const { W, H } = o.arenaSize(), rest = list.slice(1), portrait = isPortrait(cw, ch)
      return rest.map((it, i) => {
        const p = pausePlacement(i, rest.length, W, H, portrait)
        return {
          id: `p:${i + 1}`, frame: 'world' as const, kind: 'prop' as const, x: p.x, y: p.y + (o.reduce() ? 0 : Math.sin(t * 0.8 + i * 1.7) * 7), w: 104, h: 104,
          art: artForPause(it.label), title: SHORT(it.label), hint: it.hint, label: it.label, danger: it.danger,
        }
      })
    },
  })

  const index = (id: string) => Number(id.slice(2))
  const run = (id: string) => { const it = list[index(id)]; if (it) it.run() }
  const hit = (e: PointerEvent) => field.hit(e, canvas)
  overlay.addEventListener('pointermove', e => { const it = hit(e); hover = it?.id ?? null; overlay.style.cursor = it ? 'pointer' : 'default' })
  overlay.addEventListener('pointerleave', () => { hover = null })
  overlay.addEventListener('pointerdown', e => { e.stopPropagation(); const it = hit(e); if (it) { e.preventDefault(); run(it.id) } })
  overlay.addEventListener('keydown', e => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowDown' && e.key !== 'ArrowLeft' && e.key !== 'ArrowUp') return
    e.preventDefault()
    const btns = Array.from(sr.querySelectorAll('button')), at = btns.indexOf(document.activeElement as HTMLButtonElement), dir = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1
    btns[(at + dir + btns.length) % btns.length]?.focus()
  })

  const smooth = (x: number) => x * x * (3 - 2 * x)
  return {
    isOpen: () => shown,
    /** True while the menu is open or still easing out (the world should keep drawing its objects and the pulled-back camera). */
    active: () => shown || blend > 0.004,
    show(items: PauseItem[], t = 'Paused', s = 'P or Esc to resume', _extra?: HTMLElement) {
      list = items; title = t; sub = s; shown = true; overlay.style.display = 'block'
      sr.setAttribute('aria-label', t)
      sr.replaceChildren(...items.map((it, i) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = it.label; b.setAttribute('aria-label', it.hint ? `${it.label}. ${it.hint}` : it.label); b.dataset.id = `p:${i}`; b.onfocus = () => { focus = b.dataset.id! }; b.onblur = () => { if (focus === b.dataset.id) focus = null }; b.onclick = () => it.run(); return b }))
    },
    hide() { shown = false; overlay.style.display = 'none'; hover = null; focus = null },
    destroy() { overlay.remove() },
    layers: { arena: field.arenaLayer, world: field.worldLayer },
    /** Eases the pull-back and applies it to the camera for this frame. Returns the function that puts the camera back afterwards. */
    apply(cam: Camera, w: number, h: number, dt: number): () => void {
      cw = w; ch = h; dpr = window.devicePixelRatio || 1
      const goal = shown ? 1 : 0
      blend = o.reduce() ? goal : blend + (goal - blend) * Math.min(1, dt * 6)
      if (Math.abs(goal - blend) < 0.004) blend = goal
      const base = cam.zoom
      if (blend > 0) {
        const { W, H } = o.arenaSize(), fit = Math.min(1.1, pauseZoom(Math.max(1, list.length - 1), W, H, w, h))
        cam.zoom = base + (fit - base) * smooth(blend)
      }
      return () => { cam.zoom = base }
    },
    /** Title, match line, labels and the tooltip, in sharp screen space. Call after the world has been drawn. */
    drawText(ctx: CanvasRenderingContext2D) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.save(); ctx.textAlign = 'center'; ctx.globalAlpha = blend; ctx.shadowColor = 'rgba(0,0,0,.85)'; ctx.shadowBlur = 12
      if (cw < 600) { ctx.restore(); field.drawText(ctx, cw, ch, hover); return }   // on a phone the pulled-back world says it already
      const y0 = ch - 74
      ctx.fillStyle = '#e9f2ff'; ctx.font = `900 ${Math.max(20, Math.min(34, cw * 0.03))}px system-ui`; ctx.fillText(title.toUpperCase(), cw / 2, y0)
      ctx.shadowBlur = 8; ctx.fillStyle = '#9fc4ee'; ctx.font = '700 13px system-ui'; ctx.fillText(sub, cw / 2, y0 + 22)
      ctx.fillStyle = '#7f98b8'; ctx.font = '600 12px ui-monospace,monospace'; ctx.fillText(o.info(), cw / 2, y0 + 42)
      ctx.restore()
      field.drawText(ctx, cw, ch, hover)
    },
  }
}
export type PauseWorld = ReturnType<typeof createPauseWorld>
